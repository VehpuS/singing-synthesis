import { render } from "@testing-library/react";
import { describe, it } from "vitest";

import { AboutSection } from "../AboutSection";

describe("AboutSection", () => {
    it("renders the AboutSection component", () => {
        render(<AboutSection />);

        // screen.debug();
    });
});
