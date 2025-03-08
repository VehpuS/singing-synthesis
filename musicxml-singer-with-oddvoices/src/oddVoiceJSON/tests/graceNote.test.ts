import { describe, expect, it } from "vitest";

import { createSplitOddVoiceJsonInputsFromMusicXml } from "..";
import { parseXmlText } from "../../musicXmlParsing/xmlHelpers";

import GRACE_NOTE from "./graceNote.musicxml?raw";
import { size } from "lodash";

const EXPECTED_EVENTS_VOICE_1 = [
    [
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
            frequency: 293.6647679174076,
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
            time: 0.75,
            frequency: 0,
            formantShift: 1,
            phonemeSpeed: 1,
        },
        {
            type: "empty",
            time: 0.75,
            frequency: 0,
            formantShift: 1,
            phonemeSpeed: 1,
        },
        {
            type: "noteOff",
            time: 1.25,
            frequency: 0,
            formantShift: 1,
            phonemeSpeed: 1,
        },
        {
            type: "empty",
            time: 1.25,
            frequency: 0,
            formantShift: 1,
            phonemeSpeed: 1,
        },
        {
            type: "noteOff",
            time: 1.5,
            frequency: 0,
            formantShift: 1,
            phonemeSpeed: 1,
        },
        {
            type: "empty",
            time: 1.5,
            frequency: 0,
            formantShift: 1,
            phonemeSpeed: 1,
        },
    ],
];

describe("graceNote", () => {
    it("Generates the correct outputs for graceNote.musicxml", () => {
        const outputs = createSplitOddVoiceJsonInputsFromMusicXml(parseXmlText(GRACE_NOTE));

        expect(size(outputs)).toBe(1);

        const [voice1] = outputs;

        expect(voice1.splitParams).toEqual({
            partIdx: 0,
            partName: "Tenor",
            voice: 1,
            chordLevel: 1,
            largestChordLvl: 1,
            numVoices: 1,
        });

        expect(voice1.output.lyrics).toBe("you");

        expect(voice1.output.events).toEqual(EXPECTED_EVENTS_VOICE_1);
    });
});
