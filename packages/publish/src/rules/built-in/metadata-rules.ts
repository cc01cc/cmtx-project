/**
 * 元数据处理 Rules
 *
 * @module metadata-rules
 * @description
 * 提供元数据处理相关的 Rules，如 frontmatter 操作、ID 生成等。
 */

import {
    convertHeadingToFrontmatter,
    extractFrontmatterField,
    upsertFrontmatterFields,
} from "@cmtx/core";
import { createHash } from "node:crypto";
import { createFF1Cipher, encrypt_string, prepareFPEKey } from "@cmtx/fpe-wasm";
import { ensureWasmLoaded } from "../../metadata/fpe-ff1.js";
import { LuhnAlgorithm } from "../../metadata/luhn.js";
import type { Rule, RuleContext, RuleResult } from "../rule-types.js";
import type { CounterService } from "../service-registry.js";

/**
 * 标题转 frontmatter Rule 配置
 */
interface ConvertTitleConfig {
    /** 标题级别，默认为 1 */
    headingLevel?: number;
}

/**
 * 标题转 frontmatter Rule
 */
export const frontmatterTitleRule: Rule = {
    id: "frontmatter-title",
    name: "标题转 frontmatter",
    description: "将文档的一级标题转换为 frontmatter 的 title 字段",

    execute(context: RuleContext, config?: ConvertTitleConfig): RuleResult {
        const { document } = context;
        const headingLevel = config?.headingLevel ?? 1;

        const newContent = convertHeadingToFrontmatter(document, { headingLevel });

        const modified = newContent !== document;

        return {
            content: newContent,
            modified,
            messages: modified ? ["已将标题转换为 frontmatter"] : ["没有找到指定级别的标题"],
        };
    },
};

/**
 * 添加 date Rule 配置
 */
interface FrontmatterDateConfig {
    /** 字段名称，默认为 "date" */
    fieldName?: string;
}

/**
 * 添加 date Rule
 */
export const frontmatterDateRule: Rule = {
    id: "frontmatter-date",
    name: "添加发布日期",
    description: "在 frontmatter 中添加 date 字段（当前日期，仅初始化一次）",

    execute(context: RuleContext, config?: FrontmatterDateConfig): RuleResult {
        const { document } = context;
        const fieldName = config?.fieldName ?? "date";

        // 检查是否已存在 date 字段，如果已存在则跳过（仅初始化一次）
        const existingValue = extractFrontmatterField(document, fieldName);
        if (existingValue !== undefined) {
            return {
                content: document,
                modified: false,
                messages: [`${fieldName} 字段已存在 (${existingValue})，跳过`],
            };
        }

        const today = new Date().toISOString().split("T")[0];
        const result = upsertFrontmatterFields(document, { [fieldName]: today });

        const modified = result.added.length > 0;

        return {
            content: result.markdown,
            modified,
            messages: modified ? [`添加 ${fieldName}: ${today}`] : [`${fieldName} 字段已存在`],
        };
    },
};

/**
 * 添加 updated Rule 配置
 */
interface FrontmatterUpdatedConfig {
    /** 字段名称，默认为 "updated" */
    fieldName?: string;
}

/**
 * 添加 updated Rule
 */
export const frontmatterUpdatedRule: Rule = {
    id: "frontmatter-updated",
    name: "添加更新日期",
    description: "在 frontmatter 中添加/更新 updated 字段（总是更新为当前日期）",

    execute(context: RuleContext, config?: FrontmatterUpdatedConfig): RuleResult {
        const { document } = context;
        const fieldName = config?.fieldName ?? "updated";
        const today = new Date().toISOString().split("T")[0];

        // 检查是否已存在字段，用于区分"添加"和"更新"消息
        const existingValue = extractFrontmatterField(document, fieldName);
        const result = upsertFrontmatterFields(document, { [fieldName]: today });

        const modified = result.updated.length > 0 || result.added.length > 0;
        const message =
            existingValue !== undefined
                ? `更新 ${fieldName}: ${today} (原值：${existingValue})`
                : `添加 ${fieldName}: ${today}`;

        return {
            content: result.markdown,
            modified,
            messages: modified ? [message] : [`${fieldName} 字段已存在且值相同`],
        };
    },
};

/**
 * 生成 ID Rule 配置
 */
interface GenerateIdConfig {
    /** 加密密钥（必需） */
    encryptionKey?: string;

    /** ID 策略，默认 'counter' */
    strategy?: "counter" | "filepath" | "content";

    /** 字段名称，默认为 "id" */
    fieldName?: string;

    /** 计数器配置（仅当 strategy='counter' 时使用） */
    counter?: {
        /** 计数器名称 */
        name?: string;
        /** ID 长度 */
        length?: number;
        /** 进制数 */
        radix?: number;
        /** 前缀 */
        prefix?: string;
        /** 是否添加校验码 */
        withChecksum?: boolean;
    };

    /** 获取下一个计数器值的回调（可选，用于在规则内部递增计数器） */
    getNextCounterValue?: () => Promise<number>;
}

async function getNextCounter(
    config: GenerateIdConfig | undefined,
    services: RuleContext["services"],
): Promise<number | undefined> {
    if (config?.getNextCounterValue) {
        return await config.getNextCounterValue();
    }
    const counterService = services.get<CounterService>("counter");
    if (counterService) {
        return counterService.next();
    }
    return undefined;
}

async function generateIdByCounter(
    config: GenerateIdConfig | undefined,
    encryptionKey: string,
    services: RuleContext["services"],
): Promise<string> {
    const nextCounterValue = await getNextCounter(config, services);
    if (nextCounterValue === undefined) {
        throw new Error("缺少计数器服务或 nextCounterValue，请由应用层提供");
    }

    const { length = 6, radix = 36, prefix = "", withChecksum = false } = config?.counter ?? {};

    const targetInputLength = withChecksum ? length - 1 : length;
    const radixString = nextCounterValue
        .toString(radix)
        .toUpperCase()
        .padStart(targetInputLength, "0");

    const key = prepareFPEKey(encryptionKey);
    const cipher = createFF1Cipher(key, radix);

    let result = encrypt_string(cipher, radixString);

    if (withChecksum) {
        result += LuhnAlgorithm.calculateChecksum(result, radix);
    }

    return prefix ? `${prefix}${result}` : result;
}

function generateIdInput(
    strategy: string,
    filePath: string,
    baseDirectory: string | undefined,
    document: string,
): string {
    switch (strategy) {
        case "filepath": {
            const baseDir = baseDirectory ?? "";
            const relativePath = baseDir
                ? filePath.replace(baseDir, "").replace(/^[/\\]/, "")
                : filePath;
            return relativePath.replace(/[/\\]/g, "-").replace(/\.[^/.]+$/, "");
        }
        case "content": {
            return createHash("sha256").update(document).digest("hex").slice(0, 16);
        }
        default:
            throw new Error(`不支持的 ID 策略: ${String(strategy)}`);
    }
}

async function generateIdByStrategy(
    strategy: string,
    encryptionKey: string,
    filePath: string,
    baseDirectory: string | undefined,
    document: string,
): Promise<string> {
    const key = prepareFPEKey(encryptionKey);
    const cipher = createFF1Cipher(key, 36);
    const input = generateIdInput(strategy, filePath, baseDirectory, document);
    return encrypt_string(cipher, input);
}

/**
 * 从文档中提取现有的 frontmatter ID
 */
function extractFrontmatterId(document: string): string | undefined {
    const frontmatterRegex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*(?:[\r\n]|$)/;
    const match = document.match(frontmatterRegex);
    if (!match) {
        return undefined;
    }

    const frontmatter = match[1];
    const idRegex = /^id:\s*["']?([^"'\r\n]+)["']?\s*$/m;
    const idMatch = frontmatter.match(idRegex);
    return idMatch?.[1]?.trim();
}

/**
 * 生成 ID Rule
 */
export const frontmatterIdRule: Rule = {
    id: "frontmatter-id",
    name: "生成加密 ID",
    description: "在 frontmatter 中生成加密的唯一 ID",

    async execute(context: RuleContext, config?: GenerateIdConfig): Promise<RuleResult> {
        const { document, filePath, baseDirectory, services } = context;
        const { strategy = "counter", encryptionKey, fieldName = "id" } = config ?? {};

        // 确保 WASM 已加载（防御性检查，不依赖应用层预先加载）
        try {
            await ensureWasmLoaded();
        } catch (error) {
            return {
                content: document,
                modified: false,
                messages: [
                    `WASM 加载失败：${error instanceof Error ? error.message : String(error)}`,
                ],
            };
        }

        if (!encryptionKey) {
            return {
                content: document,
                modified: false,
                messages: ["缺少 encryptionKey 配置"],
            };
        }

        // 检查 frontmatter 是否已有 id
        const existingId = extractFrontmatterId(document);
        if (existingId) {
            return {
                content: document,
                modified: false,
                messages: [`ID 已存在：${existingId}`],
            };
        }

        try {
            let encryptedId: string;

            if (strategy === "counter") {
                encryptedId = await generateIdByCounter(config, encryptionKey, services);
            } else {
                const effectiveStrategy = strategy ?? "filepath";
                encryptedId = await generateIdByStrategy(
                    effectiveStrategy,
                    encryptionKey,
                    filePath,
                    baseDirectory,
                    document,
                );
            }

            // 添加到 frontmatter
            const result = upsertFrontmatterFields(document, {
                [fieldName]: encryptedId,
            });

            const modified = result.added.length > 0 || result.updated.length > 0;

            return {
                content: result.markdown,
                modified,
                messages: modified ? [`生成 ID: ${encryptedId}`] : ["ID 已存在"],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                content: document,
                modified: false,
                messages: [`ID 生成失败：${message}`],
            };
        }
    },
};

/**
 * 导出所有元数据处理 Rules
 */
export const metadataRules: Rule[] = [
    frontmatterTitleRule,
    frontmatterDateRule,
    frontmatterUpdatedRule,
    frontmatterIdRule,
];
