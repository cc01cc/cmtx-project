import { describe, expect, it } from "vitest";
import { fmValidateRule } from "../src/rules/built-in/fm-validate-rule.js";
import type { RuleContext } from "../src/rules/rule-types.js";

function makeContext(document: string): RuleContext {
    return { document, filePath: "test.md", services: {} as never };
}

describe("fm-validate-rule", () => {
    it("should pass if required field exists and matches pattern", () => {
        const doc = "---\nid: FB-000001\n---\n# Hello";
        const result = fmValidateRule.execute(makeContext(doc), {
            key: "id",
            pattern: "^FB-[0-9]{6}$",
        });
        expect(result.modified).toBe(false);
        expect(result.messages?.[0]).toContain("OK");
    });

    it("should throw if required field is missing", () => {
        const doc = "---\ntitle: Test\n---\n# Hello";
        expect(() =>
            fmValidateRule.execute(makeContext(doc), { key: "id", pattern: "^FB-[0-9]{6}$" }),
        ).toThrow("required field 'id' is missing");
    });

    it("should throw if field value does not match pattern", () => {
        const doc = "---\nid: invalid\n---\n# Hello";
        expect(() =>
            fmValidateRule.execute(makeContext(doc), { key: "id", pattern: "^FB-[0-9]{6}$" }),
        ).toThrow("does not match pattern");
    });

    it("should pass if optional field is missing", () => {
        const doc = "---\ntitle: Test\n---\n# Hello";
        const result = fmValidateRule.execute(makeContext(doc), {
            key: "slug",
            pattern: "^[a-z0-9-]+$",
            required: false,
        });
        expect(result.modified).toBe(false);
        expect(result.messages?.[0]).toContain("optional");
    });

    it("should validate slug format", () => {
        const doc = "---\nslug: my-article\n---\n# Hello";
        const result = fmValidateRule.execute(makeContext(doc), {
            key: "slug",
            pattern: "^[a-z0-9-]+$",
        });
        expect(result.messages?.[0]).toContain("OK");
    });

    it("should throw on missing key config", () => {
        const doc = "---\nid: FB-000001\n---\n# Hello";
        const result = fmValidateRule.execute(makeContext(doc), {});
        expect(result.messages?.[0]).toContain("missing 'key' config");
    });

    it("should handle document without front matter", () => {
        const doc = "# Just a heading\n\nSome content.";
        expect(() =>
            fmValidateRule.execute(makeContext(doc), { key: "id", pattern: "^FB-[0-9]{6}$" }),
        ).toThrow("required field 'id' is missing");
    });
});
