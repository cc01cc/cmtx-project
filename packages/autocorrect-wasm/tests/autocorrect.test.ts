import { describe, expect, it } from "vitest";
import { formatForType, formatText, lintForType } from "../src/autocorrect.js";

describe("autocorrect functions", () => {
    describe("formatText", () => {
        it("should format plain text with AutoCorrect rules", () => {
            const result = formatText("学习如何用Rust构建Application");
            expect(result).toContain("Rust");
            expect(result).toContain("Application");
        });

        it("should handle empty string", () => {
            const result = formatText("");
            expect(result).toBe("");
        });

        it("should handle strings without mixed content", () => {
            const result = formatText("纯中文文本");
            expect(result).toBe("纯中文文本");
        });

        it("should handle English only text", () => {
            const result = formatText("Hello World");
            expect(result).toBe("Hello World");
        });
    });

    describe("formatForType", () => {
        it("should format content for specific file type", () => {
            const result = formatForType("# Hello World", "markdown");
            expect(typeof result).toBe("string");
        });

        it("should handle different file types", () => {
            const mdResult = formatForType("test", "md");
            const tsResult = formatForType("test", "ts");
            expect(typeof mdResult).toBe("string");
            expect(typeof tsResult).toBe("string");
        });

        it("should handle empty content", () => {
            const result = formatForType("", "markdown");
            // formatForType returns JSON string when wasm returns object
            expect(typeof result).toBe("string");
        });
    });

    describe("lintForType", () => {
        it("should lint content and return results", () => {
            const result = lintForType("学习如何用Rust构建Application", "markdown");
            expect(result).toBeDefined();
        });

        it("should return LintResult object for clean content", () => {
            const result = lintForType("纯中文文本", "markdown");
            expect(result).toBeDefined();
            expect(typeof result).toBe("object");
            expect(result).toHaveProperty("filepath");
            expect(result).toHaveProperty("lines");
            expect(result).toHaveProperty("error");
        });
    });
});
