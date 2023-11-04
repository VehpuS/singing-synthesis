export function parseXmlText(xmlText: string): Element {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    return xmlDoc.documentElement;
  } catch (error) {
    throw new Error(`Error reading XML: ${error}`);
  }
}

export async function readXmlPath(xmlPath: string): Promise<Element> {
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

export function getXmlChildren(el: Element): Element[] {
  return Array.from(el.children);
}

export function cloneXmlElWithChanges(
  baseEl: Element,
  {
    newTag,
    newAttrib,
    newText,
    newChildren,
  }: {
    newTag?: string | null,
    newAttrib?: Record<string, string> | null,
    newText?: string | null,
    newChildren?: Element[] | null,
  }
): Element {
  const newEl = document.createElement(newTag || baseEl.tagName);

  if (newAttrib) {
    for (const [attrName, attrValue] of Object.entries(newAttrib)) {
      newEl.setAttribute(attrName, attrValue);
    }
  } else {
    const attribs = Array.from(baseEl.attributes);
    for (const attribute of attribs) {
      newEl.setAttribute(attribute.name, attribute.value);
    }
  }

  newEl.textContent = newText || baseEl.textContent;

  if (newChildren) {
    newChildren.forEach((child) => newEl.appendChild(child.cloneNode(true)));
  } else {
    getXmlChildren(baseEl).forEach((child) => newEl.appendChild(child.cloneNode(true)));
  }

  return newEl;
}
