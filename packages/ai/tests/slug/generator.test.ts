import { describe, it, expect } from "vitest";
import { SLUG_PROMPT_TEMPLATE } from "../../src/slug/generator.js";

describe("SLUG_PROMPT_TEMPLATE", () => {
    it("interpolates title correctly", () => {
        const result = SLUG_PROMPT_TEMPLATE.replace("{title}", "Hello World").replace(
            "{content}",
            "",
        );
        expect(result).toContain("Hello World");
    });

    it("interpolates content correctly", () => {
        const result = SLUG_PROMPT_TEMPLATE.replace("{title}", "Test").replace(
            "{content}",
            "Some content here",
        );
        expect(result).toContain("Some content here");
    });
});
