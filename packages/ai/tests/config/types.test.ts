import type { AIModelConfig, AIConfig } from "../../src/config/types.js";

describe("AI config types", () => {
    it("creates a valid deepseek model config", () => {
        const config: AIModelConfig = {
            provider: "deepseek",
            model: "deepseek-v4-flash",
            apiKey: "${CMTX_DEEPSEEK_API_KEY}",
            timeout: 30000,
            maxRetries: 3,
        };
        expect(config.provider).toBe("deepseek");
        expect(config.model).toBe("deepseek-v4-flash");
    });

    it("creates a valid alibaba model config", () => {
        const config: AIModelConfig = {
            provider: "alibaba",
            model: "qwen3-flash",
            apiKey: "${QWEN_API_KEY}",
        };
        expect(config.provider).toBe("alibaba");
        expect(config.model).toBe("qwen3-flash");
    });

    it("creates a valid openai-compatible model config", () => {
        const config: AIModelConfig = {
            provider: "openai-compatible",
            model: "deepseek-chat",
            baseURL: "https://api.deepseek.com/v1",
            apiKey: "${CMTX_DEEPSEEK_API_KEY}",
        };
        expect(config.provider).toBe("openai-compatible");
        expect(config.baseURL).toBe("https://api.deepseek.com/v1");
    });

    it("creates a complete AIConfig", () => {
        const config: AIConfig = {
            models: {
                "deepseek-v4-flash": {
                    provider: "deepseek",
                    model: "deepseek-v4-flash",
                    apiKey: "${CMTX_DEEPSEEK_API_KEY}",
                },
                "qwen3-flash": {
                    provider: "alibaba",
                    model: "qwen3-flash",
                    apiKey: "${CMTX_QWEN_API_KEY}",
                },
            },
            defaultModel: "deepseek-v4-flash",
        };
        expect(config.defaultModel).toBe("deepseek-v4-flash");
        expect(Object.keys(config.models)).toHaveLength(2);
    });
});
