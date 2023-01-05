from itertools import product
from typing import List, NamedTuple
from music_xml_parsing import get_tempos_from_singing_parts, parse_vocal_parts_from_root
from xml_helpers import XmlNode, create_xml_node, read_xml_path


class SplitParams(NamedTuple):
    part_idx: int
    voice: int | str
    tempo: float
    chord_level_idx: int

def create_split_music_xml_node(music_xml_path: str) -> List[XmlNode]:
    parsed_xml = read_xml_path(music_xml_path)
    parts_details = parse_vocal_parts_from_root(parsed_xml)
    tempos = get_tempos_from_singing_parts(parsed_xml)

    print("parts_details", parts_details)
    print("tempos", tempos)

    splits_to_generate: List[SplitParams] = []
    for p in parts_details:
        for voice_idx, tempo,  in product(range(len(p.voices)), list(tempos),):
            for chord_level_idx in range(p.largest_chord_per_voice[voice_idx]):
                splits_to_generate.append(SplitParams(
                    part_idx=p.part_idx,
                    voice=p.voices[voice_idx],
                    tempo=tempo,
                    chord_level_idx=chord_level_idx,
                ))

    for split_params in splits_to_generate:
        print("split_params", split_params)

    split_node = create_xml_node(parsed_xml)
    return [split_node] * len(splits_to_generate)
