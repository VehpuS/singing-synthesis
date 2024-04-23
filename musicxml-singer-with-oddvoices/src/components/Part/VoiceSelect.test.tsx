import { render } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import { VoiceSelect } from "./VoiceSelect";
import { Voice } from "../../oddvoices/oddvoicesUtils";

describe("VoiceSelect", () => {
    it("renders the VoiceSelect component", () => {
        render(<VoiceSelect splitIndex={0} setCustomVoicePerPart={vi.fn()} customVoiceForPart={Voice.air} />);

        // screen.debug();
    });
});
