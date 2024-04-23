import { describe, expect, it } from "vitest";

import { createSplitOddVoiceJsonInputsFromMusicXml } from "..";
import { parseXmlText } from "../../musicXmlParsing/xmlHelpers";

import WHEN_IM_64_OOOO_TEST from "./lyricsSpanningMultipleNotesAndOoos.musicxml?raw";

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
        frequency: 698.4564628660078,
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
        type: "setTargetFrequency",
        time: 0.8823529411764706,
        frequency: 622.2539674441618,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 1.3235294117647058,
        frequency: 554.3652619537442,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 1.7647058823529411,
        frequency: 415.3046975799451,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 2.6470588235294117,
        frequency: 466.1637615180899,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 3.5294117647058822,
        frequency: 349.2282314330039,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 5.294117647058823,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "empty",
        time: 5.294117647058823,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 5.735294117647059,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 5.735294117647059,
        frequency: 698.4564628660078,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 5.735294117647059,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 6.617647058823529,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 6.617647058823529,
        frequency: 622.2539674441618,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 6.617647058823529,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 7.0588235294117645,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 7.0588235294117645,
        frequency: 466.1637615180899,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 7.0588235294117645,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 7.5,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 7.5,
        frequency: 523.2511306011972,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 7.5,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 7.9411764705882355,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 7.9411764705882355,
        frequency: 622.2539674441618,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 7.9411764705882355,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 8.382352941176471,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 8.382352941176471,
        frequency: 554.3652619537442,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 8.382352941176471,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 8.823529411764707,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 8.823529411764707,
        frequency: 523.2511306011972,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 8.823529411764707,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 9.264705882352942,
        frequency: 554.3652619537442,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 9.705882352941178,
        frequency: 523.2511306011972,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 10.147058823529413,
        frequency: 622.2539674441618,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 10.588235294117649,
        frequency: 523.2511306011972,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 11.029411764705884,
        frequency: 554.3652619537442,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 11.47058823529412,
        frequency: 523.2511306011972,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 11.911764705882355,
        frequency: 622.2539674441618,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 12.35294117647059,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "setTargetFrequency",
        time: 12.35294117647059,
        frequency: 466.1637615180899,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOn",
        time: 12.35294117647059,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
    {
        type: "noteOff",
        time: 14.117647058823533,
        frequency: 0,
        formantShift: 1,
        phonemeSpeed: 1,
    },
];

describe("lyricsSpanningMultipleNotesAndOoos", () => {
    it("Handles lyrics that span multiple notes and ooo+ lyrics correctly (lyricsSpanningMultipleNotesAndOoos.musicxml)", () => {
        const outputs = createSplitOddVoiceJsonInputsFromMusicXml(parseXmlText(WHEN_IM_64_OOOO_TEST));

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

        expect(voice1.output.lyrics).toBe("Oo Youll be Youll be ol der too Ah");

        expect(voice1.output.events).toEqual(EXPECTED_EVENTS_VOICE_1);
    });
});
