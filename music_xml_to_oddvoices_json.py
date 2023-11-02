import argparse
from dataclasses import dataclass
from enum import Enum
import json
import os
from pprint import pformat
from typing import List, NamedTuple, Optional, Tuple, cast
import xml.etree.ElementTree as ET

from tqdm import tqdm

from music_xml_parsing import (
    convert_music_xml_element_to_hertz,
    parse_vocal_parts_from_root,
)
from oddvoice_helpers import EventType, OddVoiceJSONEvent
from xml_helpers import clone_xml_el_with_changes, get_element_children, read_xml_path


class SplitParams(NamedTuple):
    part_idx: int
    part_name: str
    voice: int | str
    chord_lvl: int
    largest_chord_lvl: int

    def get_file_suffix(self) -> str:
        return (
            f"part_{self.part_idx}_{self.part_name}-"
            f"voice_{self.voice}-"
            f"chord_{self.chord_lvl}"
        )


@dataclass
class OddVoiceJSON:
    lyrics: str
    events: List[OddVoiceJSONEvent]


def create_oddvoice_part(
    xml_node: ET.Element,
    params: SplitParams,
) -> OddVoiceJSON:
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

    parts = xml_node.findall("part")
    base_part = parts[params.part_idx]

    found_segment = False

    part_json = OddVoiceJSON(
        lyrics="",
        events=[],
    )
    time_elapsed = 0

    base_part_children = get_element_children(base_part)
    for part_child in tqdm(
        base_part_children, "Measures", total=len(base_part_children)
    ):
        if part_child.tag != "measure":
            # Not a measure
            continue

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
                chord_start_idx = measure_child_idx
                curr_chord_lvl = 0

                if rest_el is not None:
                    duration_el = measure_child.find("duration")
                    assert duration_el is not None and duration_el.text, ET.tostring(
                        measure_child, encoding="utf8"
                    )
                    duration = float(duration_el.text)
                    part_json.events.append(
                        OddVoiceJSONEvent(
                            event_type=EventType.Empty,
                            time=time_elapsed,
                        )
                    )
                    time_elapsed += duration / 4

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
                # Found the chord we want to split
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

                # If there is no lyric for the chord, use the lyric we found for another voice
                if not lyric_for_chord:
                    lyric_for_chord = lyric_before_segment

                lyric_before_segment = None

                new_voice_measure_child_children: List[ET.Element] = []
                has_lyric = False
                for c in get_element_children(measure_child):
                    if c.tag != "chord":
                        new_voice_measure_child_children.append(c)
                        if c.tag == "lyric":
                            has_lyric = True

                if lyric_for_chord and not has_lyric:
                    new_voice_measure_child_children.append(lyric_for_chord)

                new_lyrics_parts = []
                for c in new_voice_measure_child_children:
                    text_el = c.find("text")
                    if text_el is None:
                        continue
                    text_in_c = text_el.text
                    if text_in_c and f"{text_in_c}".strip() != "":
                        new_lyrics_parts.append(text_in_c)

                part_json.lyrics = " ".join(
                    [part_json.lyrics] + new_lyrics_parts
                ).strip()

                duration_el = measure_child.find("duration")
                assert duration_el is not None and duration_el.text
                duration = float(duration_el.text)
                frequency = convert_music_xml_element_to_hertz(measure_child)
                tqdm.write(
                    f"Note on {measure_child_idx} with duration {duration} and frequency {frequency}"
                )
                part_json.events.append(
                    OddVoiceJSONEvent(
                        event_type=EventType.SetTargetFrequency,
                        time=time_elapsed,
                        frequency=frequency,
                    )
                )
                part_json.events.append(
                    OddVoiceJSONEvent(
                        event_type=EventType.NoteOn,
                        time=time_elapsed,
                    )
                )
                part_json.events.append(
                    OddVoiceJSONEvent(
                        event_type=EventType.NoteOff,
                        time=time_elapsed + duration / 4,
                    )
                )
                time_elapsed += duration / 4

    return part_json


def create_split_music_xml_node(
    music_xml_path: str,
    output_dir: str = "",
) -> List[Tuple[str, OddVoiceJSON, SplitParams]]:
    parsed_xml = read_xml_path(music_xml_path)
    parts_details = parse_vocal_parts_from_root(parsed_xml)

    splits_to_generate: List[SplitParams] = []
    for p in parts_details:
        for voice_idx in range(len(p.voices)):
            for chord_lvl in range(1, p.largest_chord_per_voice[voice_idx] + 1):
                splits_to_generate.append(
                    SplitParams(
                        part_idx=p.part_idx,
                        part_name=p.part_name,
                        voice=p.voices[voice_idx],
                        chord_lvl=chord_lvl,
                        largest_chord_lvl=p.largest_chord_per_voice[voice_idx],
                    )
                )

    splits: List[Tuple[str, OddVoiceJSON, SplitParams]] = []
    for split_params in tqdm(splits_to_generate, "Split"):
        base_output_path = music_xml_path
        if output_dir:
            base_output_path = os.path.join(
                output_dir, os.path.basename(base_output_path)
            )
        oddvoice_part = create_oddvoice_part(parsed_xml, split_params)
        splits.append(
            (
                f"{base_output_path.replace('.xml', '')}-{split_params.get_file_suffix()}.json",
                oddvoice_part,
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
        for split_name, split_json, _split_params in tqdm(splits, "Output Files"):
            if len(split_json.events) > 0:
                with open(split_name, "w") as f:
                    f.write(
                        json.dumps(
                            dict(
                                lyrics=split_json.lyrics,
                                events=[
                                    dict(
                                        type=e.event_type.value,
                                        time=e.time,
                                        frequency=e.frequency,
                                        formantShift=e.formantShift,
                                        phonemeSpeed=e.phonemeSpeed,
                                    )
                                    for e in split_json.events
                                ],
                            )
                        )
                    )
