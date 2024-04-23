import { render } from "@testing-library/react";
import { describe, it } from "vitest";

import { MediaControls } from ".";

describe("MediaControls", () => {
    it("renders the MediaControls component", () => {
        render(<MediaControls />);

        // screen.debug();
    });
});
