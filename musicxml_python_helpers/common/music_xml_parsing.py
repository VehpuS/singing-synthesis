import xml.etree.ElementTree as ET
from typing import List, Literal, NamedTuple, Collection, cast

from tqdm import tqdm

from common.xml_helpers import clone_xml_el_with_changes, get_element_children

MUSIC_XML_PREFIX = '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">'
MusicXMLStep = Literal["C", "D", "E", "F", "G", "A", "B"]


def root_to_part_name_list(root: ET.Element) -> List[str]:
    return [str(el.text) for el in root.findall("part-list/score-part/part-name")]


def root_to_percussion_indices(root: ET.Element):
    return [
        index
        for index, el in enumerate(root.findall("part/measure[1]/attributes/clef/sign"))
        if (el.text == "percussion")
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


def parse_vocal_parts_from_root(root: ET.Element) -> List[MusicXMLPart]:
    part_names = root_to_part_name_list(root)
    parts = root.findall("part")

    parsed_parts: List[MusicXMLPart] = []
    for part_idx, (part_name, part_node) in enumerate(zip(part_names, parts)):
        clef_sign = part_node.find("measure[1]/attributes/clef/sign")
        if part_name is None or clef_sign is None or clef_sign.text == "percussion":
            tqdm.write(f"Skipping part {part_name} with clef {clef_sign}")
            continue

        voices: List[str] = list(
            set(
                [
                    v.text
                    for v in part_node.findall(".//voice")
                    if v is not None and v.text
                ]
            )
        )

        if len(voices) == 0:
            tqdm.write(f"Found no voices in part {part_name}")
            continue

        largest_chord_per_voice = [1] * len(voices)

        for v_idx, voice in tqdm(enumerate(voices), desc="Voices"):
            voice_children: List[ET.Element] = []
            for part_child in tqdm(
                get_element_children(part_node), desc="Part children"
            ):
                if part_child.tag != "measure":
                    tqdm.write(f"Adding non measure {part_child.tag} to voice {voice}")
                    voice_children.append(part_child)  # type: ignore
                    continue
                voice_measure_children: List[ET.Element] = []
                for measure_child in get_element_children(part_child):
                    if measure_child.tag != "note":
                        voice_measure_children.append(measure_child)
                    voice_elements = measure_child.findall("voice")
                    if len(voice_elements) != 1:
                        continue
                    voice_el = voice_elements[0]
                    if voice_el is not None and voice_el.text == voice:
                        tqdm.write(
                            f"Adding {measure_child.tag} to voice {voice} in measure {part_child.attrib['number']}"
                        )
                        voice_measure_children.append(measure_child)

                # chord detection https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chord/
                curr_chord_size = 1
                for measure_child in voice_measure_children:
                    tqdm.write(f"Looking for chords in {measure_child.tag}")
                    if measure_child.tag != "note":
                        curr_chord_size = 0
                    elif measure_child.find("chord") is not None:
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
    root: ET.Element,
    default_tempo: float = DEFAULT_TEMPO,
) -> List[TempoSection]:
    IMPLICIT_TEMPO_SECTION = TempoSection(0, 0, default_tempo)

    tempo_sections: List[TempoSection] = []
    part_names = root_to_part_name_list(root)
    parts = root.findall("part")

    for part_name, part_node in zip(part_names, parts):
        clef_sign = part_node.find("measure[1]/attributes/clef/sign")
        if part_name is None or clef_sign is None or clef_sign.text == "percussion":
            continue

        found_starting_tempo = False
        part_tempos = []
        for part_child_idx, part_child in enumerate(get_element_children(part_node)):
            if part_child.tag != "measure":
                continue

            for measure_child_idx, measure_child in enumerate(
                get_element_children(part_child)
            ):
                if measure_child.tag != "direction":
                    if not found_starting_tempo:
                        tqdm.write(
                            f"Adding implicit starting tempo - found {measure_child.tag} before <direction>"
                        )
                        found_starting_tempo = True
                        part_tempos.append(IMPLICIT_TEMPO_SECTION)
                    continue

                tqdm.write("Looking for direction tempos")
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
    tempo_sections.sort(key=lambda s: s[:2])
    return tempo_sections


def has_note(
    xml_node: ET.Element,
) -> bool:
    """Return true if node has non resting notes"""
    return xml_node.find(".//note") is not None and len(
        xml_node.findall(".//note")
    ) != len(xml_node.findall(".//note/rest"))


def merge_nodes(
    curr_node: ET.Element | None,
    new_node: ET.Element,
    tags_to_merge: List[str],
    co_exclusive_tags: List[Collection[str]] = [],
    _tags_to_append: List[str] = [],  # TODO
):
    if curr_node is None:
        return new_node

    new_children: List[ET.Element] = []
    for tag in tags_to_merge:
        new_node_tag_children = new_node.findall(tag)
        tag_children = (
            new_node_tag_children
            if len(new_node_tag_children) > 0
            else curr_node.findall(tag)
        )
        new_children.extend(tag_children)

    new_children_tags = [c.tag for c in new_children]
    for co_exclusive_group in co_exclusive_tags:
        co_exclusive_tags_in_children = [
            tag for tag in co_exclusive_group if tag in new_children_tags
        ]
        if len(co_exclusive_tags_in_children) <= 1:
            continue
        tag_to_keep = co_exclusive_tags_in_children[0]
        for tag in co_exclusive_tags_in_children:
            if new_node.find(tag) is not None:
                tag_to_keep = tag
                break

        new_children = [
            c
            for c in new_children
            if c.tag == tag_to_keep or c.tag not in co_exclusive_tags
        ]

    return clone_xml_el_with_changes(new_node, new_children=new_children)


def merge_print_nodes(
    curr_node: ET.Element | None, node_or_nodes_to_merge: ET.Element | List[ET.Element,]
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
        ET.Element,
        node_or_nodes_to_merge[-1]
        if type(node_or_nodes_to_merge) is list
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
    curr_node: ET.Element | None, node_or_nodes_to_merge: ET.Element | List[ET.Element,]
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
        ET.Element,
        node_or_nodes_to_merge[-1]
        if type(node_or_nodes_to_merge) is list
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


def convert_midi_note_to_hertz(midi_note: float) -> float:
    return 440 * 2.0 ** ((midi_note - 69) / 12)


def convert_music_xml_element_to_hertz(
    el: ET.Element,
) -> float:
    pitch_el = el.find("pitch")
    assert pitch_el is not None
    step_el = pitch_el.find("step")
    assert step_el is not None and step_el.text
    step = cast(MusicXMLStep, step_el.text)
    octave_el = pitch_el.find("octave")
    assert octave_el is not None and octave_el.text
    octave = int(octave_el.text)
    alter_el = pitch_el.find("alter")
    alter = 0
    if alter_el is not None and alter_el.text:
        alter = int(alter_el.text)
    return convert_music_pitch_params_to_hertz(step, octave, alter)


def convert_music_pitch_params_to_hertz(
    step: MusicXMLStep, octave: int, alter: int
) -> float:
    """<pitch><step>A</step><alter>-1</alter><octave>2</octave></pitch>"""
    midi_note = (
        12 * (int(octave) + 1)
        + {
            "C": 0,
            "D": 2,
            "E": 4,
            "F": 5,
            "G": 7,
            "A": 9,
            "B": 11,
        }[step]
        + alter
    )
    return convert_midi_note_to_hertz(midi_note)


def duration_to_seconds(
    duration: float,
    divisions: float,
    tempo: float,
) -> float:
    """Convert MusicXML duration units to seconds."""
    return duration * 60.0 / divisions / tempo


if __name__ == "__main__":
    from common.xml_helpers import read_xml_path

    tempo_example_root = read_xml_path("./chord-example.xml")
    tqdm.write(str(parse_vocal_parts_from_root(tempo_example_root)))
    tqdm.write(str(get_tempo_sections_from_singing_parts(tempo_example_root)))
