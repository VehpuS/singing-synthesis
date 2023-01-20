import argparse
from itertools import product
import os
from pprint import pformat
from typing import List, NamedTuple, Tuple, cast

from tqdm import tqdm

from music_xml_parsing import MUSIC_XML_PREFIX, TempoSection, get_tempo_sections_from_singing_parts, has_note, merge_attributes_nodes, merge_print_nodes, parse_vocal_parts_from_root, root_to_part_name_list
from xml_helpers import XmlNode, read_as_xml_node


class SplitParams(NamedTuple):
    part_idx: int
    part_name: str
    voice: int | str
    tempo_segment: Tuple[TempoSection, TempoSection | None]
    chord_lvl: int
    largest_chord_lvl: int

    def get_file_suffix(self) -> str:
        return (f'part_{self.part_idx}_{self.part_name}-'
                f'voice_{self.voice}-'
                f'chord_{self.chord_lvl}-'
                f'pidx_{self.tempo_segment[0].part_child_idx}_'
                f'midx_{self.tempo_segment[0].measure_child_idx}_'
                f'tempo_{self.tempo_segment[0].tempo}')


def create_music_xml_split(
    xml_node: XmlNode,
    params: SplitParams,
) -> XmlNode:
    base_part_list = cast(XmlNode, xml_node['part-list'])
    assert type(base_part_list) != list
    part_name_children = [c for c in base_part_list.children if 'part-name' in c]
    split_part_name_child = part_name_children[params.part_idx]
    assert cast(XmlNode, split_part_name_child['part-name']
                ).text == params.part_name, f"Missing part name {params.part_name}"
    split_part_list = base_part_list.clone_with_changes(new_children=[split_part_name_child])

    parts = ([cast(XmlNode, xml_node['part'])]
             if type(xml_node['part']) == XmlNode
             else cast(List[XmlNode], xml_node['part']))
    base_part = cast(XmlNode, parts[params.part_idx])
    assert type(base_part) != list

    start_tempo_segment = params.tempo_segment[0]
    end_tempo_segment = params.tempo_segment[1]

    split_part_children: List[XmlNode] = []
    # first_print: XmlNode | None = None
    found_segment = False
    first_print: XmlNode | None = None
    first_attributes: XmlNode | None = None
    for part_child_idx, part_child in tqdm(enumerate(base_part.children),
                                           "Measures", total=len(base_part.children)):
        if part_child.tag != 'measure':
            # Not a measure
            split_part_children.append(part_child)
            continue
        if (start_tempo_segment.part_child_idx > part_child_idx or
            (end_tempo_segment and end_tempo_segment.part_child_idx < part_child_idx)):
            # Not a measure in the tempo segment
            if not found_segment and 'print' in part_child:
                first_print = merge_print_nodes(first_print, part_child['print'])
            if not found_segment and 'attributes' in part_child:
                first_attributes = merge_attributes_nodes(first_attributes, part_child['attributes'])
            continue
        voice_measure_children: List[XmlNode] = []
        curr_chord_lvl = 1
        lyric_before_segment: XmlNode | None = None
        chord_start_idx = -1
        for measure_child_idx, measure_child in enumerate(part_child.children):
            if 'lyric' in measure_child and not found_segment:
                lyrics = measure_child['lyric']
                if type(lyrics) == XmlNode:
                    lyric_before_segment = cast(XmlNode, lyrics)
                elif len(lyrics) > 0:
                    lyric_before_segment = cast(List[XmlNode], lyrics)[0]

            if measure_child.tag != 'note' or 'rest' in measure_child:
                # Not a note / is a rest
                voice_measure_children.append(measure_child)  # type: ignore
                chord_start_idx = measure_child_idx
                curr_chord_lvl = 0
                continue
            elif (start_tempo_segment.part_child_idx == part_child_idx and
                  start_tempo_segment.measure_child_idx > measure_child_idx):
                # Before the starting note of the tempo segment
                continue
            elif (end_tempo_segment and
                  end_tempo_segment.part_child_idx == part_child_idx and
                  end_tempo_segment.measure_child_idx <= measure_child_idx):
                # After the ending note of the tempo segment
                continue

            found_segment = True
            if (
                type(measure_child.voice) == XmlNode and
                cast(XmlNode, measure_child.voice).text != params.voice
            ):
                # Wrong voice
                continue

            # chord detection https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chord/
            if 'chord' in measure_child:
                curr_chord_lvl += 1
            else:
                chord_start_idx = measure_child_idx
                curr_chord_lvl = 1
            
            if curr_chord_lvl == params.chord_lvl:
                chord_sub_el = part_child.clone_with_changes(
                    new_children=part_child.children[chord_start_idx: chord_start_idx + params.largest_chord_lvl + 1]
                ) if chord_start_idx > 0 else None
                lyric_for_chord = (chord_sub_el.find(".//lyric")
                                    if chord_sub_el is not None
                                    else None)

                if not lyric_for_chord:
                    lyric_for_chord = lyric_before_segment

                lyric_before_segment = None

                new_voice_measure_child_children: List[XmlNode] = []
                has_lyric = False
                for c in measure_child.children:
                    if c.tag != 'chord':
                        new_voice_measure_child_children.append(c)
                        if c.tag == 'lyric':
                            has_lyric = True
                    
                if lyric_for_chord and not has_lyric:
                    new_voice_measure_child_children.append(lyric_for_chord)

                voice_measure_children.append(measure_child.clone_with_changes(  # type: ignore
                    new_children=new_voice_measure_child_children
                ))

        if found_segment and (first_print or first_attributes):
            voice_measure_children = (([first_print] if first_print else []) + 
                                      ([first_attributes] if first_attributes else []) +
                                      voice_measure_children)
            first_print = None
            first_attributes = None

        if len(voice_measure_children) > 0:
            new_measure = part_child.clone_with_changes(
                new_children=voice_measure_children
            )
            split_part_children.append(new_measure)
    
    split_part = base_part.clone_with_changes(new_children=split_part_children)

    new_root_children = []
    pushed_split_part = False
    for child in xml_node.children:
        if child.tag == "part-list":
            new_root_children.append(split_part_list)
        elif child.tag == 'part':
            if not pushed_split_part:
                new_root_children.append(split_part)
                pushed_split_part = True
        else:
            new_root_children.append(child)

    return xml_node.clone_with_changes(new_children=new_root_children)


def create_split_music_xml_node(
    music_xml_path: str,
    output_dir: str='',
) -> List[Tuple[str, XmlNode, SplitParams]]:
    parsed_xml = read_as_xml_node(music_xml_path)
    parts_details = parse_vocal_parts_from_root(parsed_xml)
    tempos = get_tempo_sections_from_singing_parts(parsed_xml)

    splits_to_generate: List[SplitParams] = []
    for p in parts_details:
        part_params = product(range(len(p.voices)), zip(tempos, tempos[1:] + [None]),)
        for voice_idx, tempo_segment in part_params:
            for chord_lvl in range(1, p.largest_chord_per_voice[voice_idx] + 1):
                splits_to_generate.append(SplitParams(
                    part_idx=p.part_idx,
                    part_name=p.part_name,
                    voice=p.voices[voice_idx],
                    tempo_segment=tempo_segment,
                    chord_lvl=chord_lvl,
                    largest_chord_lvl=p.largest_chord_per_voice[voice_idx],
                ))

    splits: List[Tuple[str, XmlNode, SplitParams]] = []
    for split_params in tqdm(splits_to_generate, "Split"):
        base_output_path = music_xml_path
        if output_dir:
            base_output_path = os.path.join(
                output_dir,
                os.path.basename(base_output_path)
            )
        splits.append((f"{music_xml_path.replace('.xml', '')}-{split_params.get_file_suffix()}.xml",
                       create_music_xml_split(parsed_xml, split_params),
                       split_params,))

    return splits


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Script to generate splits from an input MusicXML file")
    parser.add_argument("input_file", help="MusicXML file to split")
    parser.add_argument("--dry_run", action="store_true", help="If passed, split results will be printed rather than saved to new XML files")
    parser.add_argument("--output_dir", default=None, help="Output to a different directory than the input file, if passed")
    args = parser.parse_args()
    output_dir = (os.path.dirname(args.input_file)
                  if args.output_dir is None
                  else args.output_dir)
    splits = create_split_music_xml_node(args.input_file, output_dir)
    if args.dry_run:
        tqdm.write(pformat(splits))
    else:
        for split_name, split_node, _split_params in tqdm(splits, "Output Files"):
            if has_note(split_node):
                split_node(split_name, prefix_str=MUSIC_XML_PREFIX)
