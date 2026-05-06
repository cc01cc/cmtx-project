import { extractFrontmatterField, upsertFrontmatterFields } from "@cmtx/core";
import type { Logger } from "@cmtx/core";
import type { AIModelConfig } from "@cmtx/ai";
import { generateSlug } from "@cmtx/ai";
import type { Rule, RuleContext, RuleResult } from "../rule-types.js";

type SlugStrategy = "ai" | "extract" | "transform";

interface FrontmatterSlugConfig {
    strategy: SlugStrategy;
    ai?: { useModel: string; temperature?: number; maxTokens?: number };
    extract?: { fromField: string };
    transform?: { fromField: string; separator?: string; lowercase?: boolean; maxLength?: number };
}

const dummyLogger: Logger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };

function skip(document: string, strategy: string, msg: string): RuleResult {
    return {
        content: document,
        modified: false,
        messages: [`frontmatter-slug [${strategy}]: ${msg}`],
    };
}

function done(document: string, strategy: string, slug: string): RuleResult {
    const result = upsertFrontmatterFields(document, { slug });
    return {
        content: result.markdown,
        modified: result.success && result.markdown !== document,
        messages: [`frontmatter-slug [${strategy}]: slug = "${slug}"`],
    };
}

function transformToSlug(value: string, config: FrontmatterSlugConfig["transform"]): string {
    let slug = value;
    const { separator = "-", lowercase = true, maxLength } = config ?? {};
    if (lowercase) slug = slug.toLowerCase();
    slug = slug
        .replace(/\s+/g, separator)
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    return maxLength ? slug.slice(0, maxLength) : slug;
}

async function extractSlug(
    document: string,
    config: FrontmatterSlugConfig["extract"],
): Promise<string | undefined> {
    return extractFrontmatterField(document, config?.fromField ?? "title") ?? undefined;
}

async function generateAISlug(
    context: RuleContext,
    config: FrontmatterSlugConfig,
    logger: Logger,
): Promise<string | undefined> {
    const modelId = config.ai?.useModel;
    logger.debug?.(`[frontmatter-slug/generateAISlug] modelId="${modelId}"`);
    if (!modelId) {
        logger.debug?.("[frontmatter-slug/generateAISlug] modelId 为空，返回 undefined");
        return undefined;
    }

    const aiService = (context.services as any).get("aiService") as
        | { getModelConfig: (id: string) => AIModelConfig | undefined }
        | undefined;
    logger.debug?.(`[frontmatter-slug/generateAISlug] aiService=${aiService ? "找到" : "未找到"}`);
    if (!aiService) return undefined;

    const modelConfig = aiService.getModelConfig(modelId);
    logger.debug?.(
        `[frontmatter-slug/generateAISlug] modelConfig(id="${modelId}")=${modelConfig ? "找到" : "未找到"}`,
    );
    if (!modelConfig) return undefined;

    const title = extractFrontmatterField(context.document, "title") ?? "";
    logger.debug?.(`[frontmatter-slug] AI 请求: model=${modelId}, title="${title}"`);
    try {
        const slug = await generateSlug(modelConfig, title, context.document, {
            temperature: config.ai?.temperature,
            maxTokens: config.ai?.maxTokens,
        });
        logger.debug?.(`[frontmatter-slug] AI 原始响应: "${slug}"`);
        return slug;
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const apiErr = error as {
            statusCode?: number;
            responseBody?: string;
            data?: unknown;
            url?: string;
        };
        logger.debug?.(`[frontmatter-slug] AI 请求失败，回退 transform: ${msg}`);
        if (apiErr.statusCode !== undefined || apiErr.responseBody !== undefined) {
            logger.debug?.(
                `[frontmatter-slug] AI 错误详情: statusCode=${apiErr.statusCode ?? "N/A"}, url=${apiErr.url ?? "N/A"}, responseBody=${apiErr.responseBody ?? "N/A"}`,
            );
        }
        const fallback = extractFrontmatterField(context.document, "title");
        return fallback ? transformToSlug(fallback, { fromField: "title" }) : undefined;
    }
}

type StrategyHandler = (
    context: RuleContext,
    config: FrontmatterSlugConfig,
    logger: Logger,
) => Promise<string | undefined>;

const strategies: Record<SlugStrategy, StrategyHandler> = {
    async extract(context, config, _logger) {
        return extractSlug(context.document, config.extract);
    },
    async transform(context, config, _logger) {
        const raw = await extractSlug(context.document, config.transform);
        return raw ? transformToSlug(raw, config.transform) : undefined;
    },
    async ai(context, config, logger) {
        return generateAISlug(context, config, logger);
    },
};

export const frontmatterSlugRule: Rule = {
    id: "frontmatter-slug",
    name: "Front Matter Slug 生成",
    description: "生成或提取 frontmatter 中的 slug 字段，支持 AI 生成、字段提取、转换三种策略",

    async execute(context: RuleContext, config?: FrontmatterSlugConfig): Promise<RuleResult> {
        const { document } = context;
        const strategy = config?.strategy ?? "transform";
        const logger = (context.logger as Logger | undefined) ?? dummyLogger;

        logger.info?.(`[frontmatter-slug] 策略: ${strategy}`);

        const slug = await strategies[strategy](context, config ?? { strategy }, logger);

        if (!slug) {
            const reason =
                strategy === "ai"
                    ? "AI 生成失败（检查 useModel 配置或 AI 服务是否注册）"
                    : `未找到字段 "${config?.[strategy]?.fromField ?? "title"}"`;
            return skip(document, strategy, reason);
        }

        return done(document, strategy, slug);
    },
};
