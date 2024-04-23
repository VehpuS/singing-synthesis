import { render } from "@testing-library/react";
import { describe, it, vi } from "vitest";

import { PartLyrics } from "./PartLyrics";

describe("PartLyrics", () => {
    it("renders the PartLyrics component", () => {
        render(
            <PartLyrics
                splitIndex={0}
                output={{
                    lyrics: "",
                    events: [],
                }}
                setOddVoiceOutputs={vi.fn()}
            />
        );

        // screen.debug();
    });
});
