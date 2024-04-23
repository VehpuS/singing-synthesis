import { render } from "@testing-library/react";
import { describe, it } from "vitest";

import { PhonemeGuide } from ".";

describe("PhonemeGuide", () => {
    it("renders the PhonemeGuide component", () => {
        render(<PhonemeGuide />);

        // screen.debug();
    });
});
