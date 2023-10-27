from __future__ import annotations

from typing import Any, Dict, List, NamedTuple, Union
import xml.etree.ElementTree as ET


class XmlNode(NamedTuple):
    """A helper class to make navigating xml files in python nicer and to create virtual XML nodes that can be saved"""

    tag: str
    attrib: Dict[str, Any]
    XML_TEXT: str | None
    children: List[XmlNode]

    def __iter__(self):
        i = 0
        try:
            while True:
                v = self[i]
                yield v
                i += 1
        except IndexError:
            return

    def __reversed__(self):
        for i in reversed(range(len(self))):
            yield self[i]

    def index(self, value, start=0, stop=None):
        """S.index(value, [start, [stop]]) -> integer -- return first index of value."""
        if start is not None and start < 0:
            start = max(len(self) + start, 0)
        if stop is not None and stop < 0:
            stop += len(self)

        i = start
        while stop is None or i < stop:
            try:
                v = self[i]
                if v is value or v == value:
                    return i
            except IndexError:
                break
            i += 1
        raise ValueError

    def tag_index(
        self,
        value: str,
        start: int = 0,
        stop: int | None = None,
    ) -> int:
        children_tags = [c.tag for c in self.children]
        return (
            children_tags.index(value, start, stop)
            if stop
            else children_tags.index(value, start)
        )

    def count(self, value):
        """S.count(value) -> integer -- return number of occurrences of value"""
        return sum(1 for v in self if v is value or v == value)

    def tag_count(
        self,
        value: str,
    ) -> int:
        children_tags = [c.tag for c in self.children]
        return children_tags.count(value)

    def __len__(self):
        return len(self.children)

    def _get_attribute(
        self,
        k: str,  # Tag name to match children against
    ) -> Union[XmlNode, List[XmlNode]]:
        relevant_children = [c for c in self.children if c.tag == k]
        if len(relevant_children) == 0:
            raise IndexError()
        if len(relevant_children) == 1:
            return relevant_children[0]
        else:
            return relevant_children

    def find(self, *args, **kwargs):
        el = ET.fromstring(str(self).replace("\n", ""))
        found = el.find(*args, **kwargs)
        return create_xml_node(found) if found is not None else found

    def findall(self, *args, **kwargs):
        el = ET.fromstring(str(self).replace("\n", ""))
        return [create_xml_node(fel) for fel in el.findall(*args, **kwargs)]

    def __getattr__(
        self,
        k: str,  # Tag name to match children against
    ) -> Union[XmlNode, List[XmlNode]]:
        """Support using class attributes to access an elements children"""
        return self._get_attribute(k)

    def __getitem__(
        self,
        k: Union[int, slice, str],  # child index / slice of indices to access / tag
    ) -> Union[XmlNode, List[XmlNode]]:
        """Support indexing the class to access an elements children"""
        if type(k) == int or type(k) == slice:
            return self.children[k]  # type: ignore
        elif type(k) == str:
            return self._get_attribute(k)  # type: ignore
        else:
            raise IndexError()

    def __contains__(
        self,
        k: Union[int, slice, str],  # child index / slice of indices to access / tag
    ) -> bool:
        try:
            self[k]
            return True
        except IndexError:
            return False

    def __repr__(self):
        """A summarized representation of the node"""
        children_str = (
            ", ".join([c.tag for c in self.children])
            if len(self.children) > 0
            else (self.XML_TEXT or "")
        )
        return f"<{self.tag}" + (
            (">" + children_str + f"</{self.tag}>") if children_str else "/>"
        )

    def __str__(self):
        """The full string value of the subtree"""
        children_str = (
            "\n".join([str(c) for c in self.children])
            if len(self.children) > 0
            else (self.XML_TEXT or "")
        )
        attributes_str = " ".join([f'{k}="{v}"' for k, v in self.attrib.items()])
        return (
            f"<{self.tag}"
            + (f" {attributes_str}" if attributes_str else "")
            + ((">" + "\n" + children_str + "\n" + f"</{self.tag}>"))
        )

    def __call__(
        self,
        output_file: str,  # File to output the XML node to as an XML document
        prefix_str: str = "",  # Prefix to the XML tree, i.e. a DOCTYPE specification
    ):
        """Export the XmlNode to a file"""
        prefix = f'<?xml version="1.0" encoding="UTF-8"?>{prefix_str}'
        contents = str(self).replace("\n", "")
        with open(output_file, "w") as f:
            f.write(prefix + contents)

    def clone_with_changes(
        self,
        new_tag: str | None = None,
        new_attrib: Dict[str, str] | None = None,
        new_text: str | None = None,
        new_children: List[XmlNode] | None = None,
    ) -> XmlNode:
        """Create a new XmlNode instance with changes based on the current one"""
        return XmlNode(
            tag=new_tag if new_tag is not None else self.tag,
            attrib=new_attrib if new_attrib is not None else self.attrib,
            XML_TEXT=new_text if new_text is not None else self.XML_TEXT,
            children=new_children if new_children is not None else self.children,
        )


def read_xml_path(
    xml_path: str,  # Path to an XML file
) -> ET.Element:
    """Read an xml file and parse it"""
    # Read the XML file into memory
    with open(xml_path, "r") as f:
        xml = f.read()
    # Parse the XML file
    return ET.fromstring(xml)


class _XMLConversionParams(NamedTuple):
    parent_id: str
    el: ET.Element


def create_xml_node(
    root: ET.Element,  # Parsed XML file
    max_els: int = 9999999,  # Stopping condition for the parsing (to avoid infinite loops)
) -> XmlNode:
    """Convert an XML element into the XmlNode class"""
    root_tag = root.tag
    children: List[XmlNode] = []
    root_node = XmlNode(
        tag=root.tag,
        attrib=root.attrib,
        XML_TEXT=root.text,
        children=children,
    )

    node_dict: Dict[str, XmlNode] = {}
    node_dict[root_tag] = root_node

    els_to_convert: List[_XMLConversionParams] = []
    els_to_convert.extend([_XMLConversionParams(root_tag, el) for el in list(root)])

    for iter_num in range(max_els):
        if len(els_to_convert) <= 0:
            break

        parent_id, el = els_to_convert.pop(0)
        new_el = XmlNode(
            tag=el.tag,
            attrib=el.attrib,
            XML_TEXT=el.text,
            children=[],
        )
        node_id = f"{parent_id}-{el.tag}-{iter_num}"
        node_dict[node_id] = new_el

        parent_node = node_dict[parent_id]
        parent_children = parent_node.children
        parent_children.append(new_el)

        node_dict[parent_id] = XmlNode(
            tag=parent_node.tag,
            attrib=parent_node.attrib,
            XML_TEXT=parent_node.XML_TEXT,
            children=parent_children,
        )
        els_to_convert.extend(
            [_XMLConversionParams(node_id, child_el) for child_el in list(el)]
        )

    return node_dict[root_tag]


def read_as_xml_node(
    xml_path: str,  # Path to an XML file
) -> XmlNode:
    """Read an XML file and convert it to the XmlNode class."""
    return create_xml_node(read_xml_path(xml_path))
