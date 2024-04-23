import { render } from "@testing-library/react";
import { describe, it } from "vitest";

import { CopyIconButton } from ".";

describe("CopyIconButton", () => {
    it("renders the CopyIconButton component", () => {
        render(<CopyIconButton text="test" />);

        // screen.debug();
    });
});
