import { render } from "@testing-library/react";
import { describe, it } from "vitest";
import { PartAudio } from "./PartAudio";

describe("PartAudio", () => {
    it("renders the PartAudio component with no audio and no lyrics events", () => {
        render(<PartAudio lyricsEvents={[]} />);

        // screen.debug();
    });
});
