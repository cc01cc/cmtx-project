export type AIProvider = "deepseek" | "alibaba" | "openai-compatible";

export interface AIModelConfig {
    provider: AIProvider;
    model: string;
    apiKey: string;
    baseURL?: string;
    timeout?: number;
    maxRetries?: number;
}

export interface AIConfig {
    models: Record<string, AIModelConfig>;
    defaultModel?: string;
}
