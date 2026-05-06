import { generateWithModel } from "../providers/vercel-adapter.js";
import type { AIModelConfig } from "../config/types.js";

export interface SlugOptions {
    temperature?: number;
    maxTokens?: number;
}

const SLUG_SYSTEM_PROMPT =
    "You are a URL slug generator. Do NOT use chain-of-thought or reasoning. " +
    "Output only the slug itself, no explanation. " +
    "Use lowercase letters, numbers, and hyphens only. " +
    "Convert Chinese and other non-ASCII characters to pinyin or ASCII equivalents. " +
    "Remove special characters. Max 30 characters.";

export const SLUG_PROMPT_TEMPLATE = `Generate a URL-friendly slug from the following title and optional content.

Title: {title}
Content: {content}`;

export async function generateSlug(
    modelConfig: AIModelConfig,
    title: string,
    content?: string,
    options?: SlugOptions,
): Promise<string> {
    const prompt = SLUG_PROMPT_TEMPLATE.replace("{title}", title).replace(
        "{content}",
        content ?? "",
    );

    let slug = await generateWithModel(modelConfig, prompt, {
        system: SLUG_SYSTEM_PROMPT,
        temperature: options?.temperature ?? 0.3,
        maxTokens: options?.maxTokens ?? 300,
    });

    slug = slug.trim();

    // Remove surrounding quotes if the model added them
    if (
        (slug.startsWith('"') && slug.endsWith('"')) ||
        (slug.startsWith("'") && slug.endsWith("'"))
    ) {
        slug = slug.slice(1, -1);
    }

    return slug;
}
