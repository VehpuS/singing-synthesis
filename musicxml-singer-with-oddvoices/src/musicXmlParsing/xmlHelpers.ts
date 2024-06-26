import { filter, find, first, includes, isArray, isPlainObject, keys } from "lodash";
import { X2jOptions, XMLParser } from "fast-xml-parser";

import { MusicXmlJson, OrderedXMLNode, TextNode } from "./types";

export function parseXmlTextToElement(xmlText: string): Element {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    return xmlDoc.documentElement;
  } catch (error) {
    throw new Error(`Error reading XML: ${error}`);
  }
}

const options: X2jOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '',
  allowBooleanAttributes: true,
  alwaysCreateTextNode: true,
  ignoreDeclaration: false,
  isArray: (tagName: string) => includes(['part', 'score-part', 'measure', 'credit', 'note'], tagName),
  trimValues: true,
  preserveOrder: true,
};

export function parseXmlText(xmlText: string): MusicXmlJson {
  try {
    const parser = new XMLParser(options);
    return parser.parse(xmlText);

  } catch (error) {
    throw new Error(`Error reading XML: ${error}`);
  }
}

export async function readXmlPath(xmlPath: string): Promise<MusicXmlJson> {
  try {
    const response = await fetch(xmlPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch XML: ${response.status} ${response.statusText}`);
    }
    const xmlText = await response.text();
    return parseXmlText(xmlText);
  } catch (error) {
    throw new Error(`Error reading XML: ${error}`);
  }
}

export const isOrderedXMLNode = <El extends OrderedXMLNode<string, object, object>>(el: unknown): el is El => {
  if (!el || !isPlainObject(el)) {
    return false;
  }
  const tagNameCandidates = (filter(keys(el), (key) => key !== ':@'));
  return tagNameCandidates.length === 1 && isArray(el[first(tagNameCandidates) as keyof typeof el]);
}

export const getTagName = <ElementType extends OrderedXMLNode<string, object>>(el: ElementType | unknown): string | undefined => isOrderedXMLNode(el)
  ? first(filter(keys(el), (key) => key !== ':@'))
  : undefined;

export const getAllChildren = <
  Tag extends string = string,
  El extends OrderedXMLNode<Tag, object> = OrderedXMLNode<Tag, object>
>(el: El | unknown): El[Tag] => {
  const tagName = getTagName(el) as Tag;
  if (!tagName) {
    return [] as unknown as El[Tag];
  }
  return (el as El)[tagName];
}

export const findChildByTagName = <
  ChildTag extends string,
  ChildType extends Record<ChildTag, unknown> = Record<ChildTag, unknown>
  >(el: unknown, childTag: ChildTag): ChildType | undefined => {
  if (!isOrderedXMLNode(el)) {
    return undefined;
  }
  const children = getAllChildren(el);
  return find(children, (child): child is ChildType => getTagName(child) === childTag);
}

export const getTextNode = <Tag extends string = string, El extends OrderedXMLNode<Tag, TextNode> = OrderedXMLNode<Tag, TextNode>,>(el: El | undefined): string | undefined => {
  if (!isOrderedXMLNode(el)) {
    return undefined;
  }
  const children = getAllChildren(el);
  return find(children, (child): child is TextNode => Boolean((child as TextNode)['#text']))?.['#text'];
}

export const getAttributeValue = (el: unknown, attribute: string): string | undefined => {
  if (!isOrderedXMLNode(el)) {
    return undefined;
  }
  return ((el)[':@'] as Record<string, string>)?.[attribute];
}

export const findAllChildrenByTagName = <
  ChildTag extends string,
  ChildType extends OrderedXMLNode<ChildTag> = OrderedXMLNode<ChildTag>,
  El extends OrderedXMLNode<string, ChildType> = OrderedXMLNode<string, ChildType>,
>(el: El | unknown, childTag: ChildTag): ChildType[] => {
  if (!isOrderedXMLNode(el)) {
    return [];
  }
  const children = getAllChildren(el);
  return filter(children, (el): el is ChildType => Boolean((el as ChildType)?.[childTag as keyof ChildType]));
}
