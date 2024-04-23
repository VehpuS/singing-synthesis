import { render } from "@testing-library/react";
import { describe, it } from "vitest";

import { PartDownloads } from "./PartDownloads";

describe("PartDownloads", () => {
    it("renders the PartDownloads component", () => {
        render(
            <PartDownloads
                output={{ events: [], lyrics: "" }}
                splitParams={{
                    partIdx: 0,
                    partName: "Soprano",
                    voice: 1,
                    numVoices: 1,
                    chordLevel: 1,
                    largestChordLvl: 1,
                }}
            />
        );

        // screen.debug();
    });
});
