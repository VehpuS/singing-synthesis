import { render } from "@testing-library/react";
import { describe, it, vi } from "vitest";

import { UploadButton } from ".";

describe("UploadButton", () => {
    it("renders the UploadButton component", () => {
        render(
            <UploadButton
                isLoadingVoice={false}
                setOddVoiceOutputs={vi.fn()}
                setRawFile={vi.fn()}
                resetAudioOutputs={vi.fn()}
            />
        );

        // screen.debug();
    });
});
