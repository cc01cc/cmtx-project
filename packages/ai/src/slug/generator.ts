import { generateWithModel } from "../providers/vercel-adapter.js";
import type { AIModelConfig } from "../config/types.js";

/**
 * Slug 生成选项
 * @public
 */
export interface SlugOptions {
    /** 温度参数（默认 0.3） */
    temperature?: number;
    /** 最大 token 数（默认 300） */
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

/**
 * 使用 AI 生成 URL Slug
 *
 * 将标题（及可选内容）转换为 URL 友好的 slug。
 * 非 ASCII 字符（如中文）会自动转换为拼音或 ASCII 等价物。
 *
 * @param modelConfig - AI 模型配置
 * @param title - 标题
 * @param content - 可选的内容（用于上下文）
 * @param options - 可选的生成选项
 * @returns URL slug
 *
 * @example
 * ```typescript
 * const slug = await generateSlug(
 *   { provider: "deepseek", model: "deepseek-chat", apiKey: "sk-xxx" },
 *   "我的第一篇博客文章",
 * );
 * // "wo-de-di-yi-pian-bo-ke-wen-zhang"
 * ```
 * @public
 */
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
