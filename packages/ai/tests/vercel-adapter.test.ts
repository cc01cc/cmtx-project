import { describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
    generateText: vi.fn(),
}));

import { generateText } from "ai";
import { generateWithModel } from "../src/providers/vercel-adapter.js";

describe("generateWithModel", () => {
    it("returns text when generateText succeeds", async () => {
        vi.mocked(generateText).mockResolvedValueOnce({
            text: "hello-world",
            reasoningText: undefined,
            usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        } as never);

        const result = await generateWithModel(
            { provider: "deepseek", model: "deepseek-chat", apiKey: "sk-test-key" },
            "test",
        );

        expect(result).toBe("hello-world");
    });

    it("falls back to reasoningText when text is empty", async () => {
        vi.mocked(generateText).mockResolvedValueOnce({
            text: "",
            reasoningText: "fallback-reasoning-slug",
            usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        } as never);

        const result = await generateWithModel(
            { provider: "deepseek", model: "deepseek-chat", apiKey: "sk-test-key" },
            "test",
        );

        expect(result).toBe("fallback-reasoning-slug");
    });

    it("returns empty string when both text and reasoningText are empty", async () => {
        vi.mocked(generateText).mockResolvedValueOnce({
            text: "",
            reasoningText: undefined,
            usage: { inputTokens: 10, outputTokens: 0, totalTokens: 10 },
        } as never);

        const result = await generateWithModel(
            { provider: "deepseek", model: "deepseek-chat", apiKey: "sk-test-key" },
            "test",
        );

        expect(result).toBe("");
    });
});
