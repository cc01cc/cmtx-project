import { describe, expect, it } from "vitest";
import { frontmatterMapRule } from "../src/rules/built-in/frontmatter-map-rule.js";
import type { RuleContext } from "../src/rules/rule-types.js";

function makeContext(document: string): RuleContext {
    return { document, filePath: "test.md", services: {} as never };
}

describe("frontmatter-map-rule", () => {
    it("should rename a field", () => {
        const doc = "---\nvisibility: draft\n---\n# Hello";
        const result = frontmatterMapRule.execute(makeContext(doc), {
            mappings: [{ from: "visibility", to: "status" }],
        });
        expect(result.modified).toBe(true);
        expect(result.content).toContain("status: draft");
    });

    it("should transform field values", () => {
        const doc = "---\nvisibility: private\n---\n# Hello";
        const result = frontmatterMapRule.execute(makeContext(doc), {
            mappings: [
                {
                    from: "visibility",
                    to: "status",
                    transform: { draft: "draft", private: "draft" },
                },
            ],
        });
        expect(result.content).toContain("status: draft");
    });

    it("should add fields that are missing", () => {
        const doc = "---\ntitle: Test\n---\n# Hello";
        const result = frontmatterMapRule.execute(makeContext(doc), {
            add: { platform: "prototype", version: "v1" },
        });
        expect(result.modified).toBe(true);
        expect(result.content).toContain("platform: prototype");
        expect(result.content).toContain("version: v1");
    });

    it("should not overwrite existing fields with add", () => {
        const doc = "---\nplatform: custom\n---\n# Hello";
        const result = frontmatterMapRule.execute(makeContext(doc), {
            add: { platform: "prototype" },
        });
        expect(result.modified).toBe(false);
    });

    it("should do nothing when no mappings match", () => {
        const doc = "---\ntitle: Test\n---\n# Hello";
        const result = frontmatterMapRule.execute(makeContext(doc), {
            mappings: [{ from: "missing_field", to: "new_field" }],
        });
        expect(result.modified).toBe(false);
    });

    it("should handle document without front matter", () => {
        const doc = "# Just a heading";
        const result = frontmatterMapRule.execute(makeContext(doc), {
            add: { platform: "prototype" },
        });
        // Should add front matter
        expect(result.content).toContain("platform: prototype");
    });
});
