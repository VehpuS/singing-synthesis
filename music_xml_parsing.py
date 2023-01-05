import random
import xml.etree.ElementTree as ET
from typing import List, NamedTuple, Set, Union, cast

from xml_helpers import XmlNode, create_xml_node

MUSIC_XML_PREFIX = '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">'

def root_to_part_name_list(root: ET.Element | XmlNode):
    return [el.text for el in root.findall("part-list/score-part/part-name")]


def root_to_percussion_indices(root: ET.Element | XmlNode):
    return [index for index, el in enumerate(root.findall("part/measure[1]/attributes/clef/sign"))
            if el.text == 'percussion']

DEFAULT_TEMPO = 120.0  # https://musescore.org/en/node/16635

class TempoSection(NamedTuple):
    part_child_idx: int
    measure_child_idx: int
    tempo: float

class MusicXMLPart(NamedTuple):
    part_name: str
    part_idx: int
    voices: List[str]
    largest_chord_per_voice: List[int]

def parse_vocal_parts_from_root(root_el: ET.Element | XmlNode) -> List[MusicXMLPart]:
    root: XmlNode = (create_xml_node(root_el)
                     if type( root_el) != XmlNode
                     else root_el)

    part_names = root_to_part_name_list(root)
    parts = root.findall('part')

    parsed_parts: List[MusicXMLPart] = []
    for part_idx, (part_name, part) in enumerate(zip(part_names, parts)):
        clef_sign = part.find('measure[1]/attributes/clef/sign')
        if part_name is None or clef_sign is None or clef_sign.text == 'percussion':
            continue

        voices: List[str] = list(set([v.text for v in part.findall('.//voice') if v is not None and v.text]))

        if len(voices) == 0:
            continue

        largest_chord_per_voice = [1] * len(voices)

        part_node = create_xml_node(part)

        for v_idx, voice in enumerate(voices):
            voice_children: List[XmlNode] = []
            for part_child in part_node.children:
                if part_child.tag != 'measure':
                    voice_children.append(part_child)
                    continue
                voice_measure_children: List[XmlNode] = []
                for measure_child in part_child.children:
                    if measure_child.tag != 'note' or (
                        type(measure_child.voice) == XmlNode and
                        cast(XmlNode, measure_child.voice).text == voice
                    ):
                        voice_measure_children.append(measure_child)

                # chord detection https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chord/
                curr_chord_size = 1
                for measure_child in voice_measure_children:
                    if measure_child.tag != 'note':
                        curr_chord_size = 0
                        continue

                    if 'chord' in measure_child:
                        curr_chord_size += 1
                        largest_chord_per_voice[v_idx] = max(largest_chord_per_voice[v_idx], curr_chord_size)
                    else:
                        curr_chord_size = 1

        parsed_parts.append(MusicXMLPart(
            part_name=part_name,
            part_idx=part_idx,
            voices=voices,
            largest_chord_per_voice=largest_chord_per_voice,
        ))

    return parsed_parts


def get_tempo_sections_from_singing_parts(root_el: ET.Element, default_tempo: float = DEFAULT_TEMPO) -> Set[float]:
    root: XmlNode = (create_xml_node(root_el)
                     if type(root_el) != XmlNode
                     else root_el)

    IMPLICIT_TEMPO_SECTION = TempoSection(0, 0, default_tempo)

    tempo_sections: List[TempoSection] = []
    part_names = root_to_part_name_list(root)
    parts = root.findall('part')

    for part_name, part_node in zip(part_names, parts):
        clef_sign = part_node.find('measure[1]/attributes/clef/sign')
        if part_name is None or clef_sign is None or clef_sign.text == 'percussion':
            continue

        found_starting_tempo = False
        part_tempos = []
        for part_child_idx, part_child in enumerate(part_node.children):
            if part_child.tag != 'measure':
                continue

            for measure_child_idx, measure_child in enumerate(part_child.children):
                if measure_child.tag != 'direction':
                    if not found_starting_tempo:
                        found_starting_tempo = True
                        part_tempos.append(IMPLICIT_TEMPO_SECTION)
                    continue

                direction_tempos = [float(s.attrib['tempo'])
                                    for s in measure_child.findall('.//sound')
                                    if 'tempo' in s.attrib]
                assert len(
                    direction_tempos) <= 1, f"Got {len(direction_tempos)} tempo marks in measure {str(measure_child)}"
                if len(direction_tempos) == 1:
                    part_tempos.append(TempoSection(part_child_idx=part_child_idx,
                                                    measure_child_idx=measure_child_idx,
                                                    tempo=direction_tempos[0]))
                    found_starting_tempo = True

        tempo_sections.extend(part_tempos)
    random.shuffle(tempo_sections)
    tempo_sections.sort(key=lambda s: s[:2])
    return tempo_sections


if __name__ == "__main__":
    from xml_helpers import read_as_xml_node
    tempo_example_root = read_as_xml_node('./tempo-example.xml')
    print(parse_vocal_parts_from_root(tempo_example_root))
    print(get_tempo_sections_from_singing_parts(tempo_example_root))
