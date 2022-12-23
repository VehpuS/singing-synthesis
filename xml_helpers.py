from __future__ import annotations

from typing import Any, Dict, List, NamedTuple, Union
import xml.etree.ElementTree as ET


class XmlElement(NamedTuple):
    '''A virtual element, used to create virtual XML nodes that can be saved'''
    tag: str
    attrib: Dict[str, Any]
    text: str
    children: List[Union[ET.Element, XmlElement]]

    def __getitem__(
        self,
        index: Union[int, slice],  # child index / slice of indices to access
    ) -> Union[ET.Element, XmlElement, List[Union[ET.Element, XmlElement]]]:
        ''''''
        return self.children[index]

    def __iter__(self):
        i = 0
        try:
            while True:
                v = self[i]
                yield v
                i += 1
        except IndexError:
            return

    def __contains__(self, value):
        for v in self:
            if v is value or v == value:
                return True
        return False

    def __reversed__(self):
        for i in reversed(range(len(self))):
            yield self[i]

    def index(self, value, start=0, stop=None):
        '''S.index(value, [start, [stop]]) -> integer -- return first index of value.'''
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

    def count(self, value):
        '''S.count(value) -> integer -- return number of occurrences of value'''
        return sum(1 for v in self if v is value or v == value)

    def __len__(self):
        return len(self.children)


class XmlNode(NamedTuple):
    '''A helper class to make navigating xml files in python nicer (for someone unused to the python parser :P)'''
    el: Union[ET.Element, XmlElement]
    children: List[XmlNode]

    def _get_attribute(
        self,
        k: str,  # Tag name to match children against
    ) -> Union[XmlNode, List[XmlNode]]:
        relevant_children = [c for c in self.children if c.el.tag == k]
        if len(relevant_children) == 0:
            raise IndexError()
        if len(relevant_children) == 1:
            return relevant_children[0]
        else:
            return relevant_children

    def __getattr__(
        self,
        k: str,  # Tag name to match children against
    ) -> Union[XmlNode, List[XmlNode]]:
        '''Support using class attributes to access an elements children'''
        return self._get_attribute(k)

    def __getitem__(
        self,
        k: Union[int, slice, str],  # child index / slice of indices to access / tag
    ) -> Union[XmlNode, List[XmlNode]]:
        '''Support indexing the class to access an elements children'''
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
        '''A summarized representation of the node'''
        children_str = (', '.join([c.el.tag for c in self.children])
                        if len(self.children) > 0
                        else (self.el.text or ""))
        return f"<{self.el.tag}" + (
            (">" + children_str + f"</{self.el.tag}>")
            if children_str
            else "/>"
        )

    def __str__(self):
        '''The full string value of the subtree'''
        children_str = ('\n'.join([str(c) for c in self.children])
                        if len(self.children) > 0
                        else (self.el.text or ""))
        attributes_str = " ".join([
            f'{k}="{v}"'
            for k, v in
            self.el.attrib.items()
        ])
        return f"<{self.el.tag}" + (f" {attributes_str}" if attributes_str else "") + (
            (">" + "\n" + children_str + "\n" + f"</{self.el.tag}>"))

    def __call__(
        self,
        output_file: str,  # File to output the XML node to as an XML document
        prefix_str: str="",  # Prefix to the XML tree, i.e. a DOCTYPE specification
    ):
        '''Export the XmlNode to a file'''
        prefix = f'<?xml version="1.0" encoding="UTF-8"?>{prefix_str}'
        contents = str(self).replace('\n', '')
        with open(output_file, 'w') as f:
            f.write(prefix + contents)


def read_xml_path(
    xml_path: str,  # Path to an XML file
) -> ET.Element:
    '''Read an xml file and parse it'''
    # Read the XML file into memory
    with open(xml_path, 'r') as f:
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
    '''Convert an XML element into the XmlNode class'''
    root_tag = root.tag
    children: List[XmlNode] = []
    root_node = XmlNode(root, children)

    node_dict: Dict[str, XmlNode] = {}
    node_dict[root_tag] = root_node

    els_to_convert: List[_XMLConversionParams] = []
    els_to_convert.extend([
        _XMLConversionParams(root_tag, el) for el in list(root)
    ])

    for iter_num in range(max_els):
        if len(els_to_convert) <= 0:
            break

        parent_id, el = els_to_convert.pop(0)
        new_el = XmlNode(el, [])
        node_id = f"{parent_id}-{el.tag}-{iter_num}"
        node_dict[node_id] = new_el

        parent_node = node_dict[parent_id]
        parent_children = parent_node.children
        parent_children.append(new_el)

        node_dict[parent_id] = XmlNode(parent_node.el, parent_children)
        els_to_convert.extend([
            _XMLConversionParams(node_id, child_el) for child_el in list(el)
        ])

    return node_dict[root_tag]


def read_as_xml_node(
    xml_path: str,  # Path to an XML file
) -> XmlNode:
    '''Read an XML file and convert it to the XmlNode class.'''
    return create_xml_node(read_xml_path(xml_path))
