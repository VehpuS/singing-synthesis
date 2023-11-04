import argparse
from itertools import product
import os
from pprint import pformat
from typing import List, NamedTuple, Optional, Tuple, cast
import xml.etree.ElementTree as ET

from tqdm import tqdm

from common.music_xml_parsing import (
    MUSIC_XML_PREFIX,
    TempoSection,
    get_tempo_sections_from_singing_parts,
    has_note,
    merge_attributes_nodes,
    merge_print_nodes,
    parse_vocal_parts_from_root,
)
from common.xml_helpers import (
    clone_xml_el_with_changes,
    export_xml_el_to_file,
    get_element_children,
    read_xml_path,
)


class SplitParams(NamedTuple):
    part_idx: int
    part_name: str
    voice: int | str
    tempo_segment: Tuple[TempoSection, TempoSection | None]
    chord_lvl: int
    largest_chord_lvl: int

    def get_file_suffix(self) -> str:
        return (
            f"part_{self.part_idx}_{self.part_name}-"
            f"voice_{self.voice}-"
            f"chord_{self.chord_lvl}-"
            f"pidx_{self.tempo_segment[0].part_child_idx}_"
            f"midx_{self.tempo_segment[0].measure_child_idx}_"
            f"tempo_{self.tempo_segment[0].tempo}"
        )


def create_music_xml_split(
    xml_node: ET.Element,
    params: SplitParams,
) -> ET.Element:
    base_part_list = xml_node.find("part-list")
    assert base_part_list is not None

    part_name_children: List[Tuple[str, ET.Element]] = []
    for part_name_child in get_element_children(base_part_list):
        part_name_child_text_el = part_name_child.find("part-name")
        part_name: Optional[str] = (
            part_name_child_text_el.text
            if part_name_child_text_el is not None
            else None
        )
        if part_name:
            part_name_children.append((part_name, part_name_child))

    split_part_name_child_tuple = part_name_children[params.part_idx]
    tqdm.write(
        f"split_part_name_child={split_part_name_child_tuple[1]}. Text={split_part_name_child_tuple[0]}"
    )
    assert (
        split_part_name_child_tuple[0] == params.part_name
    ), f"Wrong part name {params.part_name} at index {params.part_idx}. Found parts {[p[0] for p in part_name_children]}"
    split_part_list = clone_xml_el_with_changes(
        base_part_list, new_children=[split_part_name_child_tuple[1]]
    )

    parts = xml_node.findall("part")
    base_part = parts[params.part_idx]

    start_tempo_segment = params.tempo_segment[0]
    end_tempo_segment = params.tempo_segment[1]

    split_part_children: List[ET.Element] = []
    found_segment = False
    first_print: ET.Element | None = None
    first_attributes: ET.Element | None = None

    base_part_children = get_element_children(base_part)
    for part_child_idx, part_child in tqdm(
        enumerate(base_part_children), "Measures", total=len(base_part_children)
    ):
        if part_child.tag != "measure":
            # Not a measure
            split_part_children.append(part_child)
            continue
        if start_tempo_segment.part_child_idx > part_child_idx or (
            end_tempo_segment and end_tempo_segment.part_child_idx < part_child_idx
        ):
            # Not a measure in the tempo segment
            print_el = part_child.find("print")
            if not found_segment and print_el is not None:
                first_print = merge_print_nodes(first_print, print_el)

            attributes_el = part_child.find("attributes")
            if not found_segment and attributes_el is not None:
                first_attributes = merge_attributes_nodes(
                    first_attributes, attributes_el
                )
            continue
        voice_measure_children: List[ET.Element] = []
        curr_chord_lvl = 1
        lyric_before_segment: ET.Element | None = None
        chord_start_idx = -1
        part_child_children = get_element_children(part_child)
        for measure_child_idx, measure_child in enumerate(part_child_children):
            # The lyrics can be assigned to another voice, so we need to keep track of the first occurrence
            lyric_el = measure_child.find("lyric")
            if lyric_el is not None and not found_segment:
                lyric_before_segment = lyric_el

            rest_el = measure_child.find("rest")
            if measure_child.tag != "note" or rest_el is not None:
                # Not a note / is a rest
                voice_measure_children.append(measure_child)  # type: ignore
                chord_start_idx = measure_child_idx
                curr_chord_lvl = 0
                continue
            elif (
                start_tempo_segment.part_child_idx == part_child_idx
                and start_tempo_segment.measure_child_idx > measure_child_idx
            ):
                # Before the starting note of the tempo segment
                continue
            elif (
                end_tempo_segment
                and end_tempo_segment.part_child_idx == part_child_idx
                and end_tempo_segment.measure_child_idx <= measure_child_idx
            ):
                # After the ending note of the tempo segment
                continue

            found_segment = True
            voice_el = measure_child.find("voice")
            if voice_el is not None and voice_el.text != params.voice:
                # Wrong voice
                continue

            # chord detection https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chord/
            chord_el = measure_child.find("chord")
            if chord_el is not None:
                curr_chord_lvl += 1
            else:
                chord_start_idx = measure_child_idx
                curr_chord_lvl = 1

            if curr_chord_lvl == params.chord_lvl:
                chord_sub_el = (
                    clone_xml_el_with_changes(
                        part_child,
                        new_children=part_child_children[
                            chord_start_idx : chord_start_idx
                            + params.largest_chord_lvl
                            + 1
                        ],
                    )
                    if chord_start_idx > 0
                    else None
                )
                lyric_for_chord = (
                    chord_sub_el.find(".//lyric") if chord_sub_el is not None else None
                )

                if not lyric_for_chord:
                    lyric_for_chord = lyric_before_segment

                lyric_before_segment = None

                new_voice_measure_child_children: List[ET.Element] = []
                has_lyric = False
                measure_child_children = get_element_children(measure_child)
                for c in measure_child_children:
                    if c.tag != "chord":
                        new_voice_measure_child_children.append(c)
                        if c.tag == "lyric":
                            has_lyric = True

                if lyric_for_chord and not has_lyric:
                    new_voice_measure_child_children.append(lyric_for_chord)

                voice_measure_children.append(
                    clone_xml_el_with_changes(
                        measure_child, new_children=new_voice_measure_child_children
                    )
                )

        if found_segment and (first_print or first_attributes):
            voice_measure_children = (
                ([first_print] if first_print else [])
                + ([first_attributes] if first_attributes else [])
                + voice_measure_children
            )
            first_print = None
            first_attributes = None

        if len(voice_measure_children) > 0:
            new_measure = clone_xml_el_with_changes(
                part_child, new_children=voice_measure_children
            )
            split_part_children.append(new_measure)

    split_part = clone_xml_el_with_changes(base_part, new_children=split_part_children)

    new_root_children = []
    pushed_split_part = False
    for child in get_element_children(xml_node):
        if child.tag == "part-list":
            new_root_children.append(split_part_list)
        elif child.tag == "part":
            if not pushed_split_part:
                new_root_children.append(split_part)
                pushed_split_part = True
        else:
            new_root_children.append(child)

    return clone_xml_el_with_changes(xml_node, new_children=new_root_children)


def create_split_music_xml_node(
    music_xml_path: str,
    output_dir: str = "",
) -> List[Tuple[str, ET.Element, SplitParams]]:
    parsed_xml = read_xml_path(music_xml_path)
    parts_details = parse_vocal_parts_from_root(parsed_xml)
    tempos = get_tempo_sections_from_singing_parts(parsed_xml)

    splits_to_generate: List[SplitParams] = []
    for p in parts_details:
        part_params = product(
            range(len(p.voices)),
            cast(
                List[Tuple[TempoSection, TempoSection | None]],
                zip(tempos, tempos[1:] + [None]),
            ),
        )
        for voice_idx, tempo_segment in part_params:
            for chord_lvl in range(1, p.largest_chord_per_voice[voice_idx] + 1):
                splits_to_generate.append(
                    SplitParams(
                        part_idx=p.part_idx,
                        part_name=p.part_name,
                        voice=p.voices[voice_idx],
                        tempo_segment=tempo_segment,
                        chord_lvl=chord_lvl,
                        largest_chord_lvl=p.largest_chord_per_voice[voice_idx],
                    )
                )

    splits: List[Tuple[str, ET.Element, SplitParams]] = []
    for split_params in tqdm(splits_to_generate, "Split"):
        base_output_path = music_xml_path
        if output_dir:
            base_output_path = os.path.join(
                output_dir, os.path.basename(base_output_path)
            )
        splits.append(
            (
                f"{base_output_path.replace('.xml', '')}-{split_params.get_file_suffix()}.xml",
                create_music_xml_split(parsed_xml, split_params),
                split_params,
            )
        )

    return splits


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Script to generate splits from an input MusicXML file"
    )
    parser.add_argument("input_file", help="MusicXML file to split")
    parser.add_argument(
        "--dry_run",
        action="store_true",
        help="If passed, split results will be printed rather than saved to new XML files",
    )
    parser.add_argument(
        "--output_dir",
        default=None,
        help="Output to a different directory than the input file, if passed",
    )
    args = parser.parse_args()
    output_dir = (
        os.path.dirname(args.input_file) if args.output_dir is None else args.output_dir
    )
    splits = create_split_music_xml_node(args.input_file, output_dir)
    if args.dry_run:
        tqdm.write(pformat(splits))
    else:
        for split_name, split_node, _split_params in tqdm(splits, "Output Files"):
            if has_note(split_node):
                tqdm.write(f"Exporting to {split_name}")
                export_xml_el_to_file(
                    split_node, split_name, prefix_str=MUSIC_XML_PREFIX
                )
