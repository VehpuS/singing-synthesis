from __future__ import annotations

from typing import Dict, List
import xml.etree.ElementTree as ET


def read_xml_path(
    xml_path: str,  # Path to an XML file
) -> ET.Element:
    """Read an xml file and parse it"""
    # Read the XML file into memory
    with open(xml_path, "r") as f:
        xml = f.read()
    # Parse the XML file
    return ET.fromstring(xml)


def get_element_children(
    el: ET.Element,
) -> List[ET.Element]:
    """Get the children of an XML element"""
    return [child for child in list(el) if child is not el]


def clone_xml_el_with_changes(
    base_el: ET.Element,
    new_tag: str | None = None,
    new_attrib: Dict[str, str] | None = None,
    new_text: str | None = None,
    new_children: List[ET.Element] | None = None,
) -> ET.Element:
    """Create a new ET.Element instance with changes based on the current one"""
    new_el = ET.Element(new_tag or base_el.tag)
    attrib_content = base_el.attrib or new_attrib
    if attrib_content:
        new_el.attrib = attrib_content
    text_content = new_text or base_el.text
    if text_content:
        new_el.text = text_content

    children_to_add = new_children or list(base_el.iter())[1:]
    if len(children_to_add) > 0:
        new_el.extend(children_to_add)
    return new_el


def export_xml_el_to_file(
    el: ET.Element,
    output_file: str,  # File to output the XML node to as an XML document
    prefix_str: str = "",  # Prefix to the XML tree, i.e. a DOCTYPE specification
    encoding="UTF-8",
):
    """Export the XmlNode to a file with the option to add special prefixes"""
    prefix = f'<?xml version="1.0" encoding="{encoding}"?>{prefix_str}'
    tree = ET.ElementTree(el)
    with open(output_file, "wb") as f:
        f.write(prefix.encode(encoding))
        tree.write(f, encoding=encoding, xml_declaration=False)
