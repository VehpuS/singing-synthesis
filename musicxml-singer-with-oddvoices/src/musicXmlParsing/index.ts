import { compact, first, flatMap, forEach, map, times, uniq } from "lodash";

import { MeasureAttributes, MeasureDirection, MeasureNote, MeasureSound, MusicXMLStep, ScorePart, ScorePartMeasures, Measure, TempoSection, stepValues, Lyric, ScorePartwise } from "./types";
import { findAllChildrenByTagName, findChildByTagName, getAllChildren, getAttributeValue, getTagName, getTextNode, isOrderedXMLNode } from "./xmlHelpers";

export const DEFAULT_TEMPO = 120.0;

class MusicXMLPart {
    constructor(
        public partName: string,
        public partIdx: number,
        public voices: string[],
        public largestChordPerVoice: number[]
    ) { }
}

export function scorePartwiseToPartNameList(scorePartwise: ScorePartwise): string[] {
    const partList = findChildByTagName(scorePartwise, "part-list");
    const scoreParts = findAllChildrenByTagName<"score-part", ScorePart>(partList, "score-part");
    return compact(map(
        scoreParts,
        (el) => getTextNode(findChildByTagName(el, "part-name"))
    ));
}

export const getClefSignFromPart = (part: ScorePartMeasures): string | undefined => {
    const partMeasures = getAllChildren<'part', ScorePartMeasures>(part);
    const firstMeasure = first(partMeasures);
    const attributes = findChildByTagName(firstMeasure, "attributes");
    const clef = findChildByTagName(attributes, "clef");
    const sign = findChildByTagName(clef, "sign");
    const signText = getTextNode(sign);
    return signText;
}

export function rootToPercussionIndices(scorePartwise: ScorePartwise): number[] {
    const indices: number[] = [];
    const allPartMeasures = findAllChildrenByTagName<"part", ScorePartMeasures>(scorePartwise, "part");
    const clefSigns = flatMap(allPartMeasures, (partMeasures) => {
        const signText = getClefSignFromPart(partMeasures);
        return signText ? [signText] : [];
    });

    forEach(clefSigns, (el, index) => {
        if (el === "percussion") {
            indices.push(index);
        }
    });

    return indices;
}

export function parseVocalPartsFromRoot(scorePartwise: ScorePartwise): MusicXMLPart[] {
    const partNames = scorePartwiseToPartNameList(scorePartwise);
    const parts = findAllChildrenByTagName<"part", ScorePartMeasures>(scorePartwise, "part");

    const parsedParts: MusicXMLPart[] = [];

    for (let partIdx = 0; partIdx < partNames.length; partIdx++) {
        const partName = partNames[partIdx];
        const partNode = parts[partIdx];
        const clefSign = getClefSignFromPart(partNode)

        if (!partName || !clefSign || clefSign === "percussion") {
            console.log(`Skipping part ${partName} with clef ${clefSign}`);
            continue;
        }

        const partNodeChildren = getAllChildren<'part', ScorePartMeasures>(partNode);

        const voices = uniq(compact(
            flatMap(
                partNodeChildren,
                (measure) => map(findAllChildrenByTagName<"note", MeasureNote>(measure, "note"), (el) => getTextNode(findChildByTagName(el, "voice")))
            )
        ));

        if (voices.length === 0) {
            console.log(`Found no voices in part ${partName}`);
            continue;
        }

        const largestChordPerVoice = times(voices.length, () => 1);

        for (let vIdx = 0; vIdx < voices.length; vIdx++) {
            const voice = (voices[vIdx]);
            console.log(`Starting to analyze voice ${voice} at index ${vIdx + 1}/${voices.length}`)

            for (const partChild of partNodeChildren) {
                if (!isMeasure(partChild)) {
                    console.log(`Skipping non-measure ${getTagName(partChild)} to voice ${voice}`);
                    continue;
                }

                const allMeasureChildren = getAllChildren<'measure', Measure>(partChild);
                const voiceMeasureChildren: typeof allMeasureChildren = [];

                for (const measureChild of allMeasureChildren) {
                    if (!isMeasureNote(measureChild)) {
                        voiceMeasureChildren.push(measureChild);
                        continue;
                    }

                    const voiceElements = findAllChildrenByTagName(measureChild, "voice");

                    if (voiceElements.length !== 1) {
                        continue;
                    }

                    const voiceEl = first(voiceElements);
                    if (getTextNode<"voice">(voiceEl) === voice) {
                        console.log(`Adding ${getTagName(measureChild)} to voice ${voice} in measure ${getAttributeValue(partChild, 'number')}`, { partChild });
                        voiceMeasureChildren.push(measureChild);
                    }
                }

                let currChordSize = 1;

                for (const measureChild of voiceMeasureChildren) {
                    console.log(`Looking for chords in ${getTagName(measureChild)}`);

                    if (!isMeasureNote(measureChild)) {
                        currChordSize = 0;
                    } else if (findChildByTagName(measureChild, "chord")) {
                        currChordSize++;
                        largestChordPerVoice[vIdx] = Math.max(largestChordPerVoice[vIdx], currChordSize);
                    } else {
                        currChordSize = 1;
                    }
                }

            }
            
            console.log(`Largest chord for voice ${voice}: ${largestChordPerVoice[vIdx]}`)
            parsedParts.push(
                new MusicXMLPart(partName, partIdx, voices, largestChordPerVoice)
            );
        }
    }

    return parsedParts;
}

export function getTempoSectionsFromSingingParts(
    scorePartwise: ScorePartwise,
    defaultTempo = DEFAULT_TEMPO
): TempoSection[] {
    const IMPLICIT_TEMPO_SECTION = new TempoSection(0, 0, defaultTempo);
    const tempoSections: TempoSection[] = [];
    const partNames = scorePartwiseToPartNameList(scorePartwise);
    const parts = findAllChildrenByTagName<"part", ScorePartMeasures>(scorePartwise, "part")

    for (let partIdx = 0; partIdx < partNames.length; partIdx++) {
        const partName = partNames[partIdx];
        if (!partName) {
            continue;
        }
        const partNode = parts[partIdx];
        const partMeasures = findAllChildrenByTagName<"measure", Measure>(partNode, "measure")
        if (!partMeasures) {
            continue;
        }
        const firstMeasure = first(partMeasures);
        if (!firstMeasure) {
            continue;
        }
        const attributes = findChildByTagName(firstMeasure, "attributes");
        if (!attributes) {
            continue;
        }
        const clefNode = findChildByTagName(attributes, "clef");
        if (!clefNode) {
            continue;
        }
        const clefSign = findChildByTagName(clefNode, "sign");
        if (!clefSign) {
            continue;
        }

        const clefSignText = findChildByTagName(clefSign, "#text");
        if (!clefSignText || getTagName(clefSignText) === "percussion") {
            continue;
        }

        let foundStartingTempo = false;
        const partTempos: TempoSection[] = [];

        for (let measureIdx = 0; measureIdx < partMeasures.length; measureIdx++) {
            const currentMeasure = partMeasures[measureIdx];


            const partMeasuresChildren = getAllChildren<"measure", Measure>(currentMeasure);
            if ((partMeasuresChildren || []).length === 0) {
                continue;
            }

            for (let measureChildIdx = 0; measureChildIdx < partMeasuresChildren.length; measureChildIdx++) {
                const measureChild = partMeasuresChildren[measureChildIdx];

                if (!isMeasureDirection(measureChild)) {
                    if (!foundStartingTempo) {
                        console.log(
                            `Adding implicit starting tempo - found ${getTagName(measureChild)} before <direction>`
                        );
                        foundStartingTempo = true;
                        partTempos.push(IMPLICIT_TEMPO_SECTION);
                    }
                    continue;
                }

                console.log("Looking for direction tempos");
                const soundElements = findAllChildrenByTagName<"sound", MeasureSound>(measureChild, "sound");
                const tempoStrings = compact(map(
                    soundElements,
                    (s) => getAttributeValue(s, "tempo")
                ));
                const directionTempos = map(tempoStrings, (t) => parseFloat(t));

                if (directionTempos.length > 0) {
                    partTempos.push(
                        // TODO: Handle multiple tempos in one measure
                        new TempoSection(measureIdx, measureChildIdx, first(directionTempos)!)
                    );
                    foundStartingTempo = true;
                }
            }
        }

        tempoSections.push(...partTempos);
    }

    tempoSections.sort((a, b) => {
        if (a.measureIdx === b.measureIdx) {
            return a.measureChildIdx - b.measureChildIdx;
        }
        return a.measureIdx - b.measureIdx;
    });

    return tempoSections;
}

function convertMidiNoteToHertz(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export function convertMusicXmlElementToHertz(el: MeasureNote): number {
    const pitchEl = findChildByTagName(el, "pitch")
    if (!pitchEl) {
        throw new Error("Pitch element not found");
    }
    const stepEl = findChildByTagName(pitchEl, "step");
    const step = getTextNode(stepEl) as MusicXMLStep | undefined;
    if (!step) {
        throw new Error("Step element not found");
    }

    const octaveEl = findChildByTagName(pitchEl, "octave");
    const octaveText = getTextNode(octaveEl);
    if (!octaveText) {
        throw new Error("Octave element not found");
    }
    const octave = parseInt(octaveText, 10);

    const alterEl = findChildByTagName(pitchEl, "alter");
    const alterText = getTextNode(alterEl);
    const alter = alterText ? parseInt(alterText || "0", 10) : 0;

    return convertMusicPitchParamsToHertz(step, octave, alter);
}

export function convertMusicPitchParamsToHertz(step: MusicXMLStep, octave: number, alter: number): number {
    const midiNote = 12 * (octave + 1) + stepValues[step] + alter;
    return convertMidiNoteToHertz(midiNote);
}

export function durationToSeconds(duration: number, divisions: number, tempo: number): number {
    return (duration * 60.0) / divisions / tempo;
}

export const isMeasure = (el: any): el is Measure => isOrderedXMLNode(el) && getTagName(el) === "measure";

export const isMeasureAttributes = (el: any): el is MeasureAttributes => isOrderedXMLNode(el) && getTagName(el) === "attributes";

export const isMeasureDirection = (el: any): el is MeasureDirection => isOrderedXMLNode(el) && getTagName(el) === "direction";

export const isMeasureNote = (el: any): el is MeasureNote => isOrderedXMLNode(el) && getTagName(el) === "note";

export const isLyric = (el: any): el is Lyric => isOrderedXMLNode(el) && getTagName(el) === "lyric";