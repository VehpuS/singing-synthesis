import random
import xml.etree.ElementTree as ET
from typing import List, NamedTuple, Collection, Set, Union, cast

from tqdm import tqdm

from xml_helpers import XmlNode, create_xml_node

MUSIC_XML_PREFIX = '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">'


def root_to_part_name_list(root: ET.Element | XmlNode) -> List[str]:
    return [
        str(el.XML_TEXT if isinstance(el, XmlNode) else el.text)
        for el in root.findall("part-list/score-part/part-name")
    ]


def root_to_percussion_indices(root: ET.Element | XmlNode):
    return [
        index
        for index, el in enumerate(root.findall("part/measure[1]/attributes/clef/sign"))
        if (
            el.XML_TEXT == "percussion"
            if isinstance(el, XmlNode)
            else (el.text == "percussion")
        )
    ]


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
    root: XmlNode = (
        create_xml_node(cast(ET.Element, root_el))
        if type(root_el) is not XmlNode
        else cast(XmlNode, root_el)
    )

    part_names = root_to_part_name_list(root)
    parts = root.findall("part")

    parsed_parts: List[MusicXMLPart] = []
    for part_idx, (part_name, part_node) in enumerate(zip(part_names, parts)):
        clef_sign = part_node.find("measure[1]/attributes/clef/sign")
        if part_name is None or clef_sign is None or clef_sign.XML_TEXT == "percussion":
            continue

        voices: List[str] = list(
            set(
                [
                    v.XML_TEXT
                    for v in part_node.findall(".//voice")
                    if v is not None and v.XML_TEXT
                ]
            )
        )

        if len(voices) == 0:
            continue

        largest_chord_per_voice = [1] * len(voices)

        for v_idx, voice in enumerate(voices):
            voice_children: List[XmlNode] = []
            for part_child in part_node.children:
                if part_child.tag != "measure":
                    voice_children.append(part_child)  # type: ignore
                    continue
                voice_measure_children: List[XmlNode] = []
                for measure_child in part_child.children:
                    if measure_child.tag != "note" or (
                        type(measure_child.voice) is XmlNode
                        and cast(XmlNode, measure_child.voice).XML_TEXT == voice
                    ):
                        voice_measure_children.append(measure_child)

                # chord detection https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chord/
                curr_chord_size = 1
                for measure_child in voice_measure_children:
                    if measure_child.tag != "note":
                        curr_chord_size = 0
                    elif "chord" in measure_child:
                        curr_chord_size += 1
                        largest_chord_per_voice[v_idx] = max(
                            largest_chord_per_voice[v_idx], curr_chord_size
                        )
                    else:
                        curr_chord_size = 1

        parsed_parts.append(
            MusicXMLPart(
                part_name=part_name,
                part_idx=part_idx,
                voices=voices,
                largest_chord_per_voice=largest_chord_per_voice,
            )
        )

    return parsed_parts


def get_tempo_sections_from_singing_parts(
    root_el: ET.Element | XmlNode,
    default_tempo: float = DEFAULT_TEMPO,
) -> List[TempoSection]:
    root: XmlNode = (
        create_xml_node(cast(ET.Element, root_el))
        if type(root_el) != XmlNode
        else cast(XmlNode, root_el)
    )

    IMPLICIT_TEMPO_SECTION = TempoSection(0, 0, default_tempo)

    tempo_sections: List[TempoSection] = []
    part_names = root_to_part_name_list(root)
    parts = root.findall("part")

    for part_name, part_node in zip(part_names, parts):
        clef_sign = part_node.find("measure[1]/attributes/clef/sign")
        if part_name is None or clef_sign is None or clef_sign.XML_TEXT == "percussion":
            continue

        found_starting_tempo = False
        part_tempos = []
        for part_child_idx, part_child in enumerate(part_node.children):
            if part_child.tag != "measure":
                continue

            for measure_child_idx, measure_child in enumerate(part_child.children):
                if measure_child.tag != "direction":
                    if not found_starting_tempo:
                        found_starting_tempo = True
                        part_tempos.append(IMPLICIT_TEMPO_SECTION)
                    continue

                direction_tempos = [
                    float(s.attrib["tempo"])
                    for s in measure_child.findall(".//sound")
                    if "tempo" in s.attrib
                ]
                assert (
                    len(direction_tempos) <= 1
                ), f"Got {len(direction_tempos)} tempo marks in measure {str(measure_child)}"
                if len(direction_tempos) == 1:
                    part_tempos.append(
                        TempoSection(
                            part_child_idx=part_child_idx,
                            measure_child_idx=measure_child_idx,
                            tempo=direction_tempos[0],
                        )
                    )
                    found_starting_tempo = True

        tempo_sections.extend(part_tempos)
    random.shuffle(tempo_sections)
    tempo_sections.sort(key=lambda s: s[:2])
    return tempo_sections


def has_note(
    xml_node: XmlNode,
) -> bool:
    """Return true if node has non resting notes"""
    return xml_node.find(".//note") is not None and len(
        xml_node.findall(".//note")
    ) != len(xml_node.findall(".//note/rest"))


def merge_nodes(
    curr_node: XmlNode | None,
    new_node: XmlNode,
    tags_to_merge: List[str],
    co_exclusive_tags: List[Collection[str]] = [],
    _tags_to_append: List[str] = [],  # TODO
):
    if curr_node is None:
        return new_node

    new_children: List[XmlNode] = []
    for tag in tags_to_merge:
        new_child: XmlNode | List[XmlNode] = []
        if tag in new_node:
            new_child = new_node[tag]
        elif tag in curr_node:
            new_child = curr_node[tag]

        if type(new_child) is list:
            new_children.extend(cast(List[XmlNode], new_child))
        else:
            new_children.append(cast(XmlNode, new_child))

    new_children_tags = [c.tag for c in new_children]
    for co_exclusive_group in co_exclusive_tags:
        co_exclusive_tags_in_children = [
            tag for tag in co_exclusive_group if tag in new_children_tags
        ]
        if len(co_exclusive_tags_in_children) <= 1:
            continue
        tag_to_keep = co_exclusive_tags_in_children[0]
        for tag in co_exclusive_tags_in_children:
            if tag in new_node:
                tag_to_keep = tag
                break

        new_children = [
            c
            for c in new_children
            if c.tag == tag_to_keep or c.tag not in co_exclusive_tags
        ]

    return new_node.clone_with_changes(new_children=new_children)


def merge_print_nodes(
    curr_node: XmlNode | None, node_or_nodes_to_merge: XmlNode | List[XmlNode,]
):
    """
    In this order
        <page-layout> (Optional)
        <system-layout> (Optional)
        <staff-layout> (Zero or more times)
    <measure-layout> (Optional)
    <measure-numbering> (Optional)
    <part-name-display> (Optional)
    <part-abbreviation-display> (Optional)
    """
    # https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/print
    node_to_merge = cast(
        XmlNode,
        node_or_nodes_to_merge[-1]
        if type(node_or_nodes_to_merge) == list
        else node_or_nodes_to_merge,
    )

    tags_to_merge = [
        "page-layout",
        "system-layout",
        "staff-layout",
        "measure-layout",
        "measure-numbering",
        "part-name-display",
        "part-abbreviation-display",
    ]
    return merge_nodes(
        curr_node=curr_node, new_node=node_to_merge, tags_to_merge=tags_to_merge
    )


def merge_attributes_nodes(
    curr_node: XmlNode | None, node_or_nodes_to_merge: XmlNode | List[XmlNode,]
):
    """
    In this order
        <footnote> (Optional)
        <level> (Optional)
    <divisions> (Optional)
    <key> (Zero or more times)
    <time> (Zero or more times)
    <staves> (Optional)
    <part-symbol> (Optional)
    <instruments> (Optional)
    <clef> (Zero or more times)
    <staff-details> (Zero or more times)
    Exactly one of the following
        <transpose> (Zero or more times)
        <for-part> (Zero or more times)
    <directive> (Zero or more times)
    <measure-style> (Zero or more times)
    """
    # https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/attributes
    node_to_merge = cast(
        XmlNode,
        node_or_nodes_to_merge[-1]
        if type(node_or_nodes_to_merge) == list
        else node_or_nodes_to_merge,
    )

    tags_to_merge = [
        "footnote",
        "level",
        "divisions",
        "key",
        "time",
        "staves",
        "part-symbol",
        "instruments",
        "clef",
        "staff-details",
        "transpose",
        "for-part",
        "directive",
        "measure-style",
    ]

    co_exclusive_tags: List[Collection[str]] = [("transpose", "for-parts")]

    return merge_nodes(
        curr_node=curr_node,
        new_node=node_to_merge,
        tags_to_merge=tags_to_merge,
        co_exclusive_tags=co_exclusive_tags,
    )


if __name__ == "__main__":
    from xml_helpers import read_as_xml_node

    tempo_example_root = read_as_xml_node("./tempo-example.xml")
    tqdm.write(str(parse_vocal_parts_from_root(tempo_example_root)))
    tqdm.write(str(get_tempo_sections_from_singing_parts(tempo_example_root)))
