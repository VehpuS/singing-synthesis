import { describe, expect, it } from "vitest";

import { createSplitOddVoiceJsonInputsFromMusicXml } from "..";
import { parseXmlText } from "../../musicXmlParsing/xmlHelpers";

import HIGH_AHHH_TEST from "./highAhhh.musicxml?raw";

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
        frequency: 739.9888454232689,
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
        time: 3,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 3,
        frequency: 987.7666025122483,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 3,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 3.5,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 3.5,
        frequency: 880,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 3.5,
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
    {
        type: "setTargetFrequency",
        time: 4,
        frequency: 830.6093951598903,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 4,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 8,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 8,
        frequency: 880,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 8,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 11.75,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 11.75,
        frequency: 987.7666025122483,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 11.75,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 12,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 12,
        frequency: 830.6093951598903,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 12,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 16,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 16,
        frequency: 739.9888454232689,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 16,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 18,
        frequency: 739.9888454232689,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 19.75,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 19.75,
        frequency: 698.4564628660078,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 19.75,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 20,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 20,
        frequency: 659.2551138257398,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 20,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 24,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 24,
        frequency: 739.9888454232689,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 24,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 26,
        frequency: 739.9888454232689,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 28,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 28,
        frequency: 1108.7305239074883,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 28,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 28.5,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 28.5,
        frequency: 987.7666025122483,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 28.5,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 32,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
];

describe("highAhhh", () => {
    it("Generates the correct outputs for highAhhh.musicxml", () => {
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

        expect(voice1.output.lyrics).toBe("ah a a ah ah a ah a a ah a a ah");

        expect(voice1.output.events).toEqual(EXPECTED_EVENTS_VOICE_1);
    });
});
