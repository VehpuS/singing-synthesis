import { describe, expect, it } from "vitest";

import { createSplitOddVoiceJsonInputsFromMusicXml } from "..";
import { parseXmlText } from "../../musicXmlParsing/xmlHelpers";

import TO_ALL_THE_STRANGEST_PLACES_TEST from "./toAllTheStrangestPlaces.musicxml?raw";

const EXPECTED_EVENTS_VOICE_1 = [
    {
        type: "noteOff",
        time: 0,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "empty",
        time: 0,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 0.25,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 0.25,
        frequency: 830.6093951598903,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 0.25,
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
        frequency: 830.6093951598903,
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
        time: 0.75,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 0.75,
        frequency: 830.6093951598903,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 0.75,
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
        frequency: 830.6093951598903,
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
        time: 1.25,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 1.25,
        frequency: 830.6093951598903,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
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
        type: "setTargetFrequency",
        time: 1.5,
        frequency: 830.6093951598903,
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
        time: 1.75,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 1.75,
        frequency: 830.6093951598903,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 1.75,
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
        frequency: 739.9888454232689,
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
        time: 4,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
];

describe("toAllTheStrangestPlaces", () => {
    it("Generates the correct outputs for toAllTheStrangestPlaces.musicxml", () => {
        const outputs = createSplitOddVoiceJsonInputsFromMusicXml(parseXmlText(TO_ALL_THE_STRANGEST_PLACES_TEST));

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

        expect(voice1.output.lyrics).toBe("To all the strang est place ce s");

        expect(voice1.output.events).toEqual(EXPECTED_EVENTS_VOICE_1);
    });
});
