import { compact, first, flatMap, map, times, uniq } from "lodash";

import {
    MeasureAttributes,
    MeasureDirection,
    MeasureNote,
    MusicXMLStep,
    ScorePart,
    ScorePartMeasures,
    Measure,
    stepValues,
    Lyric,
    ScorePartwise,
    OrderedXMLNode,
    TextNode,
} from "./types";
import {
    findAllChildrenByTagName,
    findChildByTagName,
    getAllChildren,
    getAttributeValue,
    getTagName,
    getTextNode,
    isOrderedXMLNode,
} from "./xmlHelpers";

export const DEFAULT_TEMPO = 120.0;

class MusicXMLPart {
    constructor(
        public partName: string,
        public partIdx: number,
        public voices: string[],
        public largestChordPerVoice: number[]
    ) {}
}

export function scorePartwiseToPartNameList(scorePartwise: ScorePartwise): string[] {
    const partList = findChildByTagName(scorePartwise, "part-list");
    const scoreParts = findAllChildrenByTagName<"score-part", ScorePart>(partList, "score-part");
    return compact(
        map(scoreParts, (el) => getTextNode(findChildByTagName(el, "part-name") as OrderedXMLNode<string, TextNode>))
    );
}

export const getClefSignFromPart = (part: ScorePartMeasures): string | undefined => {
    const partMeasures = getAllChildren<"part", ScorePartMeasures>(part);
    const firstMeasure = first(partMeasures);
    const attributes = findChildByTagName(firstMeasure, "attributes");
    const clef = findChildByTagName(attributes, "clef");
    const sign = findChildByTagName(clef, "sign");
    const signText = getTextNode(sign as OrderedXMLNode<string, TextNode>);
    return signText;
};

export function parseVocalPartsFromRoot(scorePartwise: ScorePartwise): MusicXMLPart[] {
    const partNames = scorePartwiseToPartNameList(scorePartwise);
    const parts = findAllChildrenByTagName<"part", ScorePartMeasures>(scorePartwise, "part");

    const parsedParts: MusicXMLPart[] = [];

    for (let partIdx = 0; partIdx < partNames.length; partIdx++) {
        const partName = partNames[partIdx];
        const partNode = parts[partIdx];
        const clefSign = getClefSignFromPart(partNode);

        if (!partName || !clefSign || clefSign === "percussion") {
            console.log(`Skipping part ${partName} with clef ${clefSign}`);
            continue;
        }

        const partNodeChildren = getAllChildren<"part", ScorePartMeasures>(partNode);

        const voices = uniq(
            compact(
                flatMap(partNodeChildren, (measure) =>
                    map(findAllChildrenByTagName<"note", MeasureNote>(measure, "note"), (el) =>
                        getTextNode(findChildByTagName(el, "voice") as OrderedXMLNode<string, TextNode>)
                    )
                )
            )
        );

        if (voices.length === 0) {
            console.log(`Found no voices in part ${partName}`);
            continue;
        }

        const largestChordPerVoice = times(voices.length, () => 1);

        for (let vIdx = 0; vIdx < voices.length; vIdx++) {
            const voice = voices[vIdx];
            console.log(`Starting to analyze voice ${voice} at index ${vIdx + 1}/${voices.length}`);

            for (const partChild of partNodeChildren) {
                if (!isMeasure(partChild)) {
                    console.log(`Skipping non-measure ${getTagName(partChild)} to voice ${voice}`);
                    continue;
                }

                const allMeasureChildren = getAllChildren<"measure", Measure>(partChild);
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
                        console.log(
                            `Adding ${getTagName(measureChild)} to voice ${voice} in measure ${getAttributeValue(
                                partChild,
                                "number"
                            )}`,
                            { partChild }
                        );
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

            console.log(`Largest chord for voice ${voice}: ${largestChordPerVoice[vIdx]}`);
            parsedParts.push(new MusicXMLPart(partName, partIdx, voices, largestChordPerVoice));
        }
    }

    return parsedParts;
}

function convertMidiNoteToHertz(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export function convertMusicXmlElementToHertz(el: MeasureNote): {
    frequency: number;
    isUnpitched: boolean;
    step: MusicXMLStep;
    octave: number;
    alter: number;
} {
    const pitchEl = findChildByTagName(el, "pitch");
    const unpitchedEl = !pitchEl ? findChildByTagName(el, "unpitched") : undefined;
    if (!pitchEl && !unpitchedEl) {
        console.error("Pitch / unpitched element not found", { el });
        throw new Error("Pitch / unpitched element not found");
    }
    const stepEl = pitchEl ? findChildByTagName(pitchEl, "step") : findChildByTagName(unpitchedEl, "display-step");
    const step = getTextNode(stepEl as OrderedXMLNode<string, TextNode>) as MusicXMLStep | undefined;
    if (!step) {
        console.error("Step element not found", { el });
        throw new Error("Step element not found");
    }

    const octaveEl = pitchEl ? findChildByTagName(pitchEl, "octave") : findChildByTagName(unpitchedEl, "display-octave");
    const octaveText = getTextNode(octaveEl as OrderedXMLNode<string, TextNode>);
    if (!octaveText) {
        console.error("Octave element not found", { el });
        throw new Error("Octave element not found");
    }
    const octave = parseInt(octaveText, 10);

    const alterEl = pitchEl
        ? findChildByTagName(pitchEl, "alter")
        // Technically, display-alter is not a valid element, but it is may be used in some MusicXML files (considering I would have possibly used it myself)
        : findAllChildrenByTagName(unpitchedEl, "display-alter");
    const alterText = getTextNode(alterEl as OrderedXMLNode<string, TextNode>);
    const alter = alterText ? parseInt(alterText || "0", 10) : 0;

    return {
        frequency: convertMusicPitchParamsToHertz(step, octave, alter),
        isUnpitched: Boolean(unpitchedEl),
        step,
        octave,
        alter,
    };
}

export function convertMusicPitchParamsToHertz(step: MusicXMLStep, octave: number, alter: number): number {
    const midiNote = 12 * (octave + 1) + stepValues[step] + alter;
    return convertMidiNoteToHertz(midiNote);
}

export function durationToSeconds(duration: number, divisions: number, tempo: number): number {
    return (duration * 60.0) / divisions / tempo;
}

export const isMeasure = (el: unknown): el is Measure => isOrderedXMLNode(el) && getTagName(el) === "measure";

export const isMeasureAttributes = (el: unknown): el is MeasureAttributes =>
    isOrderedXMLNode(el) && getTagName(el) === "attributes";

export const isMeasureDirection = (el: unknown): el is MeasureDirection =>
    isOrderedXMLNode(el) && getTagName(el) === "direction";

export const isMeasureNote = (el: unknown): el is MeasureNote => isOrderedXMLNode(el) && getTagName(el) === "note";

export const isLyric = (el: unknown): el is Lyric => isOrderedXMLNode(el) && getTagName(el) === "lyric";
