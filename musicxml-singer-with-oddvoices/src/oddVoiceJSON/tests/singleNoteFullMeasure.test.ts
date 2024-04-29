import { describe, expect, it } from "vitest";

import { createSplitOddVoiceJsonInputsFromMusicXml } from "..";
import { parseXmlText } from "../../musicXmlParsing/xmlHelpers";

import SINGLE_NOTE_FULL_MEASURE_TEST from "./singleNoteFullMeasure.musicxml?raw";

const EXPECTED_EVENTS_VOICE_1 = [
    {
        type: "noteOff",
        time: 0,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 0,
        frequency: 415.3046975799451,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 0,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 4,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
];

describe("singleNoteFullMeasure", () => {
    it("Parses notation with a single note across a measure (singleNoteFullMeasure.musicxml)", () => {
        const outputs = createSplitOddVoiceJsonInputsFromMusicXml(parseXmlText(SINGLE_NOTE_FULL_MEASURE_TEST));

        expect(outputs.length).toBe(1);

        const [voice1] = outputs;

        expect(voice1.splitParams).toEqual({
            partIdx: 0,
            partName: "Voice",
            voice: 1,
            chordLevel: 1,
            largestChordLvl: 1,
            numVoices: 1,
        });

        expect(voice1.output.lyrics).toBe("ahh");

        expect(voice1.output.events).toEqual(EXPECTED_EVENTS_VOICE_1);
    });
});
