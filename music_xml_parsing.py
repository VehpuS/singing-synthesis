import xml.etree.ElementTree as ET
from typing import Any, Dict, List, NamedTuple, Set, Union, cast

from xml_helpers import XmlElement, XmlNode, create_xml_node

MUSIC_XML_PREFIX = '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">'

def root_to_part_name_list(root: ET.Element):
    return [el.text for el in root.findall("part-list/score-part/part-name")]


def root_to_percussion_indices(root: ET.Element):
    return [index for index, el in enumerate(root.findall("part/measure[1]/attributes/clef/sign"))
            if el.text == 'percussion']

DEFAULT_TEMPO = 120  # https://musescore.org/en/node/16635

class TempoSection(NamedTuple):
    tempo: Union[int, float]
    start_measure: int
    direction_index: int
    end_measure: int

class MusicXMLPart(NamedTuple):
    part_name: str
    part_idx: int
    voices: List[str]
    largest_chord_per_voice: List[int]

def parse_vocal_parts_from_root(root: ET.Element) -> List[MusicXMLPart]:
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

        # TODO: add support for multiple voices
        assert len(voices) == 1, "Missing support for multiple voices"

        largest_chord_per_voice = [1] * len(voices)

        part_node = create_xml_node(part)

        for v_idx, voice in enumerate(voices):
            voice_children: List[XmlNode] = []
            for part_child in part_node.children:
                if part_child.el.tag != 'measure':
                    voice_children.append(part_child)
                    continue
                voice_measure_children: List[XmlNode] = []
                for measure_child in part_child.children:
                    if measure_child.el.tag != 'note' or (
                        type(measure_child.voice) == XmlNode and
                        cast(XmlNode, measure_child.voice).el.text == voice
                    ):
                        voice_measure_children.append(measure_child)
                    else:
                        # TODO: insert rests if the measure is partial when we have multiple voices
                        raise NotImplementedError()
                # voice_measure = XmlNode(
                #     el=XmlElement(
                #         tag=part_child.tag or 'measure',
                #         attrib=part_child.attrib or {},
                #         text=part_child.text or "",
                #         children=voice_measure_children,
                #     ),
                #     children=[],  # TODO: build children for XmlElement based nodes...
                # )
                curr_chord_size = 1
                for measure_child in part_child.children:
                    if measure_child.el.tag != 'note':
                        curr_chord_size = 0
                        continue

                    if 'chord' in measure_child:
                        curr_chord_size += 1
                        largest_chord_per_voice[v_idx] = max(largest_chord_per_voice[v_idx], curr_chord_size)
                    else:
                        curr_chord_size = 1
                    

            # TODO: chord detection https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chord/

        parsed_parts.append(MusicXMLPart(
            part_name=part_name,
            part_idx=part_idx,
            voices=voices,
            largest_chord_per_voice=largest_chord_per_voice,
        ))

    return parsed_parts

def get_tempos_from_singing_parts(root: ET.Element) -> Set[float]:
    tempos: Set[float] = set([])
    part_names = root_to_part_name_list(root)
    parts = root.findall('part')

    for part_name, part in zip(part_names, parts):
        clef_sign = part.find('measure[1]/attributes/clef/sign')
        if part_name is None or clef_sign is None or clef_sign.text == 'percussion':
            continue

        part_tempos = set([float(s.attrib['tempo'])
                      for s in part.findall('.//measure/direction/sound')
                      if 'tempo' in s.attrib])
        tempos = tempos.union(part_tempos)
    return tempos
