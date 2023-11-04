import { compact, filter, first, forEach, includes, map } from "lodash";

import { cloneXmlElWithChanges, getXmlChildren } from './xmlHelpers';

export const DEFAULT_TEMPO = 120.0;

type MusicXMLStep = "C" | "D" | "E" | "F" | "G" | "A" | "B";

class TempoSection {
    constructor(
        public partChildIdx: number,
        public measureChildIdx: number,
        public tempo: number
    ) { }
}

class MusicXMLPart {
    constructor(
        public partName: string,
        public partIdx: number,
        public voices: string[],
        public largestChordPerVoice: number[]
    ) { }
}

export function rootToPartNameList(root: Element): string[] {
    return map(
        Array.from(root.querySelectorAll("part-list score-part part-name")),
        (el) => el.textContent || ""
    );
}

export function rootToPercussionIndices(root: Element): number[] {
    const indices: number[] = [];
    const clefSigns = Array.from(root.querySelectorAll("part measure:nth-child(1) attributes clef sign"));

    forEach(clefSigns, (el, index) => {
        if (el.textContent === "percussion") {
            indices.push(index);
        }
    });

    return indices;
}

export function parseVocalPartsFromRoot(root: Element): MusicXMLPart[] {
    const partNames = rootToPartNameList(root);
    const parts = Array.from(root.querySelectorAll("part"));

    const parsedParts: MusicXMLPart[] = [];

    for (let partIdx = 0; partIdx < partNames.length; partIdx++) {
        const partName = partNames[partIdx];
        const partNode = parts[partIdx];
        const clefSign = partNode.querySelector("measure:nth-child(1) attributes clef sign");

        if (!partName || !clefSign || clefSign.textContent === "percussion") {
            console.log(`Skipping part ${partName} with clef ${clefSign?.textContent}`);
            continue;
        }

        const voices = compact(
            map(
                Array.from(partNode.querySelectorAll("voice")),
                (v) => v.textContent
            )
        );

        if (voices.length === 0) {
            console.log(`Found no voices in part ${partName}`);
            continue;
        }

        const largestChordPerVoice = Array(voices.length).fill(1);

        for (let vIdx = 0; vIdx < voices.length; vIdx++) {
            const voice = voices[vIdx];

            for (const partChild of getXmlChildren(partNode)) {
                if (partChild.tagName !== "measure") {
                    console.log(`Skipping non-measure ${partChild.tagName} to voice ${voice}`);
                    continue;
                }

                const voiceMeasureChildren: Element[] = [];

                for (const measureChild of getXmlChildren(partChild)) {
                    if (measureChild.tagName !== "note") {
                        voiceMeasureChildren.push(measureChild);
                    }

                    const voiceElements = Array.from(measureChild.querySelectorAll("voice"));

                    if (voiceElements.length !== 1) {
                        continue;
                    }

                    const voiceEl = first(voiceElements);
                    if (voiceEl?.textContent === voice) {
                        console.log(`Adding ${measureChild.tagName} to voice ${voice} in measure ${partChild.getAttribute('number')}`);
                        voiceMeasureChildren.push(measureChild);
                    }
                }

                let currChordSize = 1;

                for (const measureChild of voiceMeasureChildren) {
                    console.log(`Looking for chords in ${measureChild.tagName}`);

                    if (measureChild.tagName !== "note") {
                        currChordSize = 0;
                    } else if (measureChild.querySelector("chord")) {
                        currChordSize++;
                        largestChordPerVoice[vIdx] = Math.max(largestChordPerVoice[vIdx], currChordSize);
                    } else {
                        currChordSize = 1;
                    }
                }
            }

            parsedParts.push(
                new MusicXMLPart(partName, partIdx, voices, largestChordPerVoice)
            );
        }
    }

    return parsedParts;
}

export function getTempoSectionsFromSingingParts(
    root: Element,
    defaultTempo = DEFAULT_TEMPO
): TempoSection[] {
    const IMPLICIT_TEMPO_SECTION = new TempoSection(0, 0, defaultTempo);
    const tempoSections: TempoSection[] = [];
    const partNames = rootToPartNameList(root);
    const parts = Array.from(root.querySelectorAll("part"));

    for (let partIdx = 0; partIdx < partNames.length; partIdx++) {
        const partName = partNames[partIdx];
        const partNode = parts[partIdx];
        const clefSign = partNode.querySelector("measure:nth-child(1) attributes clef sign");

        if (!partName || !clefSign || clefSign.textContent === "percussion") {
            continue;
        }

        let foundStartingTempo = false;
        const partTempos: TempoSection[] = [];

        for (let partChildIdx = 0; partChildIdx < getXmlChildren(partNode).length; partChildIdx++) {
            const partChild = getXmlChildren(partNode)[partChildIdx];

            if (partChild.tagName !== "measure") {
                continue;
            }

            for (let measureChildIdx = 0; measureChildIdx < getXmlChildren(partChild).length; measureChildIdx++) {
                const measureChild = getXmlChildren(partChild)[measureChildIdx];

                if (measureChild.tagName !== "direction") {
                    if (!foundStartingTempo) {
                        console.log(
                            `Adding implicit starting tempo - found ${measureChild.tagName} before <direction>`
                        );
                        foundStartingTempo = true;
                        partTempos.push(IMPLICIT_TEMPO_SECTION);
                    }
                    continue;
                }

                console.log("Looking for direction tempos");
                const soundElements = Array.from(measureChild.querySelectorAll("sound"));
                const tempoStrings = compact(map(
                    soundElements,
                    (s) => s.getAttribute("tempo")
                ));
                const directionTempos = map(tempoStrings, (t) => parseFloat(t));

                if (directionTempos.length > 0) {
                    partTempos.push(
                        new TempoSection(partChildIdx, measureChildIdx, first(directionTempos)!)
                    );
                    foundStartingTempo = true;
                }
            }
        }

        tempoSections.push(...partTempos);
    }

    tempoSections.sort((a, b) => {
        if (a.partChildIdx === b.partChildIdx) {
            return a.measureChildIdx - b.measureChildIdx;
        }
        return a.partChildIdx - b.partChildIdx;
    });

    return tempoSections;
}

export function hasNote(xmlNode: Element): boolean {
    return xmlNode.querySelector("note") !== null && xmlNode.querySelectorAll("note").length !== xmlNode.querySelectorAll("note rest").length;
}

function mergeNodes(
    currNode: Element | null,
    newNode: Element,
    tagsToMerge: string[],
    coExclusiveTags: string[][] = []
): Element {
    if (currNode === null) {
        return newNode;
    }

    let newChildren: Element[] = [];

    for (const tag of tagsToMerge) {
        const newTagChildren = Array.from(newNode.querySelectorAll(tag));
        const tagChildren = newTagChildren.length > 0 ? newTagChildren : Array.from(currNode.querySelectorAll(tag));
        newChildren.push(...tagChildren);
    }

    const newChildrenTags = map(newChildren, (c) => c.tagName);

    for (const coExclusiveGroup of coExclusiveTags) {
        const coExclusiveTagsInChildren = filter(
            coExclusiveGroup,
            (tag) => includes(newChildrenTags, tag),
        );

        if (coExclusiveTagsInChildren.length <= 1) {
            continue;
        }

        let tagToKeep = coExclusiveTagsInChildren[0];

        for (const tag of coExclusiveTagsInChildren) {
            if (newNode.querySelector(tag) !== null) {
                tagToKeep = tag;
                break;
            }
        }

        newChildren = filter(newChildren, (c) => c.tagName === tagToKeep || !includes(coExclusiveGroup, c.tagName));
    }

    return cloneXmlElWithChanges(newNode, { newChildren });
}

export function mergePrintNodes(currNode: Element | null, nodeOrNodesToMerge: Element | Element[]): Element {
    const nodeToMerge = Array.isArray(nodeOrNodesToMerge) ? nodeOrNodesToMerge[nodeOrNodesToMerge.length - 1] : nodeOrNodesToMerge;
    const tagsToMerge = [
        "page-layout",
        "system-layout",
        "staff-layout",
        "measure-layout",
        "measure-numbering",
        "part-name-display",
        "part-abbreviation-display"
    ];

    return mergeNodes(currNode, nodeToMerge, tagsToMerge);
}

export function mergeAttributesNodes(currNode: Element | null, nodeOrNodesToMerge: Element | Element[]): Element {
    const nodeToMerge = Array.isArray(nodeOrNodesToMerge) ? nodeOrNodesToMerge[nodeOrNodesToMerge.length - 1] : nodeOrNodesToMerge;
    const tagsToMerge = [
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
        "measure-style"
    ];

    const coExclusiveTags = [["transpose", "for-part"]];

    return mergeNodes(currNode, nodeToMerge, tagsToMerge, coExclusiveTags);
}

function convertMidiNoteToHertz(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export function convertMusicXmlElementToHertz(el: Element): number {
    const pitchEl = el.querySelector("pitch");
    if (!pitchEl) {
        throw new Error("Pitch element not found");
    }
    const stepEl = pitchEl.querySelector("step");
    if (!stepEl?.textContent) {
        throw new Error("Step element not found");
    }
    const step = stepEl.textContent as MusicXMLStep;
    const octaveEl = pitchEl.querySelector("octave");
    if (!octaveEl?.textContent) {
        throw new Error("Octave element not found");
    }
    const octave = parseInt(octaveEl.textContent, 10);
    const alterEl = pitchEl.querySelector("alter");
    const alter = alterEl ? parseInt(alterEl.textContent || "0", 10) : 0;

    return convertMusicPitchParamsToHertz(step, octave, alter);
}

export function convertMusicPitchParamsToHertz(step: MusicXMLStep, octave: number, alter: number): number {
    const stepValues: { [key in MusicXMLStep]: number } = {
        C: 0,
        D: 2,
        E: 4,
        F: 5,
        G: 7,
        A: 9,
        B: 11,
    };

    const midiNote =
        12 * (octave + 1) + stepValues[step] + alter;
    return convertMidiNoteToHertz(midiNote);
}

export function durationToSeconds(duration: number, divisions: number, tempo: number): number {
    return (duration * 60.0) / divisions / tempo;
}

// // Example usage:
// async function main() {
//     const xmlPath = 'your_music_xml_file.xml';
//     const xmlDoc = await readXmlPath(xmlPath);

//     // Use the functions from the module as needed
//     const vocalParts = parseVocalPartsFromRoot(xmlDoc);
//     const tempoSections = getTempoSectionsFromSingingParts(xmlDoc);
//     // ...
// }

// main();
