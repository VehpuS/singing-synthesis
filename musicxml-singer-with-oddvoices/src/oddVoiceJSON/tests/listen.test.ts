import { describe, expect, it } from "vitest";

import { createSplitOddVoiceJsonInputsFromMusicXml } from "..";
import { parseXmlText } from "../../musicXmlParsing/xmlHelpers";

import HIGH_AHHH_TEST from "./listen.musicxml?raw";

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
        frequency: 622.2539674441618,
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
        time: 0.5,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 0.5,
        frequency: 622.2539674441618,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 0.5,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 1,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 1,
        frequency: 493.8833012561241,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 1,
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
        type: "setTargetFrequency",
        time: 1.5,
        frequency: 493.8833012561241,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 1.5,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 2,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 2,
        frequency: 622.2539674441618,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 2,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 2.75,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 2.75,
        frequency: 554.3652619537442,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 2.75,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 3.75,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "empty",
        time: 3.75,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
];

describe("listen", () => {
    it("Generates the correct outputs for listen.musicxml", () => {
        const outputs = createSplitOddVoiceJsonInputsFromMusicXml(parseXmlText(HIGH_AHHH_TEST));

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

        expect(voice1.output.lyrics).toBe("liss sen what I say oh");

        expect(voice1.output.events).toEqual(EXPECTED_EVENTS_VOICE_1);
    });
});
