import { render } from "@testing-library/react";
import { describe, it, vi } from "vitest";

import { Part } from ".";

describe("Part", () => {
    it("renders the Part component", () => {
        render(
            <Part
                splitIndex={0}
                output={{
                    lyrics: "",
                    events: [],
                }}
                splitParams={{
                    partIdx: 0,
                    partName: "Soprano",
                    voice: 1,
                    chordLevel: 1,
                    largestChordLvl: 1,
                    numVoices: 1,
                }}
                lyricsEvents={[]}
                setOddVoiceOutputs={vi.fn()}
                setCustomVoicePerPart={vi.fn()}
            />
        );

        // screen.debug();
    });
});
