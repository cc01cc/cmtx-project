import { generateText } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createAlibaba } from "@ai-sdk/alibaba";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AIModelConfig } from "../config/types.js";

export interface GenerateOptions {
    system?: string;
    temperature?: number;
    maxTokens?: number;
}

function createModel(config: AIModelConfig) {
    switch (config.provider) {
        case "deepseek":
            return createDeepSeek({ apiKey: config.apiKey, baseURL: config.baseURL })(config.model);
        case "alibaba":
            return createAlibaba({ apiKey: config.apiKey, baseURL: config.baseURL })(config.model);
        case "openai-compatible": {
            const provider = createOpenAICompatible({
                name: "custom",
                baseURL: config.baseURL ?? "",
                apiKey: config.apiKey,
            });
            return provider(config.model);
        }
    }
}

export async function generateWithModel(
    modelConfig: AIModelConfig,
    prompt: string,
    options?: GenerateOptions,
): Promise<string> {
    console.debug(
        `[vercel-adapter/generateWithModel] provider=${modelConfig.provider}, model=${modelConfig.model}, apiKey=${modelConfig.apiKey ? `sk-****${modelConfig.apiKey.slice(-4)}` : "MISSING"}, baseURL=${modelConfig.baseURL ?? "(default)"}`,
    );

    const model = createModel(modelConfig);

    const providerOptions: Record<string, Record<string, unknown>> = {};
    if (modelConfig.provider === "deepseek") {
        providerOptions.deepseek = { thinking: { type: "disabled" } };
    }

    const result = await generateText({
        model,
        system: options?.system,
        prompt,
        temperature: options?.temperature,
        maxOutputTokens: options?.maxTokens,
        maxRetries: modelConfig.maxRetries ?? 2,
        providerOptions: providerOptions as any,
    });

    console.debug(
        `[vercel-adapter/generateWithModel] 成功: result.text="${result.text}", result.reasoningText="${result.reasoningText ?? "(无)"}", usage=${JSON.stringify(result.usage)}`,
    );

    if (result.text) {
        return result.text;
    }

    if (result.reasoningText) {
        console.debug(
            `[vercel-adapter/generateWithModel] text 为空，降级使用 reasoningText: "${result.reasoningText}"`,
        );
        return result.reasoningText;
    }

    return "";
}
