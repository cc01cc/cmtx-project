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
import { ensureWasmLoaded } from "../../metadata/fpe-ff1.js";
import { IdGenerator } from "../../metadata/id-generator.js";
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
export interface GenerateIdConfig {
    /** ID 生成模板，如 "{counter_global}", "{ff1}", "{sha256_8}" */
    template: string;

    /** 字段名称，默认为 "id" */
    fieldName?: string;

    /** 最终 ID 前缀，追加到渲染结果的头部 */
    prefix?: string;

    /** FF1 加密配置（仅当 template 含 {ff1} 时生效） */
    ff1?: {
        /** 引用 counter 中的 id */
        useCounter: string;
        /** 加密密钥 */
        encryptionKey: string;
        /** 是否添加 Luhn 校验码 */
        withChecksum?: boolean;
        /** FF1 输出长度，优先于 counter[useCounter].length（默认继承 counter 配置） */
        length?: number;
        /** FF1 进制 2-36，优先于 counter[useCounter].radix（默认继承 counter 配置） */
        radix?: number;
    };

    /** 读取计数器当前值（不含递增） */
    peekCounterValue?: (counterId: string) => Promise<number>;

    /** 渲染完成后递增计数器 */
    commitCounterValue?: (counterId: string) => Promise<void>;

    /** 计数器格式配置，key 为 counter id（如 global、blog） */
    counter?: Record<string, { length?: number; radix?: number }>;
}

/**
 * 从文档中提取指定字段的值
 */
function extractField(document: string, fieldName: string): string | undefined {
    const frontmatterRegex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*(?:[\r\n]|$)/;
    const match = document.match(frontmatterRegex);
    if (!match) {
        return undefined;
    }

    const frontmatter = match[1];
    const fieldRegex = new RegExp(`^${fieldName}:\\s*["']?([^"'\\r\\n]+)["']?\\s*$`, "m");
    const fieldMatch = frontmatter.match(fieldRegex);
    return fieldMatch?.[1]?.trim();
}

function hasFf1InTemplate(template: string): boolean {
    return /\{ff1\}/.test(template);
}

function collectCounterIds(template: string, ff1: GenerateIdConfig["ff1"]): string[] {
    const ids = new Set<string>();
    for (const m of template.matchAll(/\{counter_(\w+)\}/g)) ids.add(m[1]);
    if (ff1?.useCounter) ids.add(ff1.useCounter);
    return Array.from(ids);
}

async function peekCounter(
    counterId: string,
    config: GenerateIdConfig | undefined,
    services: RuleContext["services"],
): Promise<number> {
    if (config?.peekCounterValue) return await config.peekCounterValue(counterId);
    const cs = services.get<CounterService>("counter");
    return cs ? cs.current(counterId) : 0;
}

async function commitCounter(
    counterId: string,
    config: GenerateIdConfig | undefined,
    services: RuleContext["services"],
): Promise<void> {
    if (config?.commitCounterValue) {
        await config.commitCounterValue(counterId);
        return;
    }
    services.get<CounterService>("counter")?.next(counterId);
}

function counterConfig(
    counterId: string,
    opts: { counter?: Record<string, { length?: number; radix?: number }> },
): { length: number; radix: number } {
    const cfg = opts.counter?.[counterId];
    return { length: cfg?.length ?? 6, radix: cfg?.radix ?? 36 };
}

function renderTemplateVariables(
    template: string,
    opts: {
        generator: IdGenerator;
        counterValues: Record<string, number>;
        counter?: Record<string, { length?: number; radix?: number }>;
        ff1?: GenerateIdConfig["ff1"];
        document: string;
    },
): string {
    let result = template.replace(/\{counter_(\w+)\}/g, (_, id) => {
        const cc = counterConfig(id, opts);
        return opts.generator.generateCounterValue(opts.counterValues[id] ?? 0, cc);
    });
    if (opts.ff1) {
        const cc = counterConfig(opts.ff1.useCounter, opts);
        const ff1Length = opts.ff1.length ?? cc.length;
        const ff1Radix = opts.ff1.radix ?? cc.radix;
        const v = opts.generator.generateCounterValue(
            opts.counterValues[opts.ff1.useCounter] ?? 0,
            { length: ff1Length, radix: ff1Radix },
        );
        result = result.replace(
            /\{ff1\}/g,
            opts.generator.encryptFF1(v.length < 4 ? v.padEnd(4, "0") : v, opts.ff1.encryptionKey, {
                radix: ff1Radix,
                withChecksum: opts.ff1.withChecksum,
            }),
        );
    }
    result = result.replace(/\{(sha256|sha1|md5)_(\d+)\}/g, (_, a, n) =>
        opts.generator.generateHashFromBody(opts.document, a, parseInt(n, 10)),
    );
    result = result.replace(/\{uuid\}/g, () => opts.generator.generateUUID());
    return result;
}

export const frontmatterIdRule: Rule = {
    id: "frontmatter-id",
    name: "生成 ID",
    description: "在 frontmatter 中生成 ID（支持 template 组合变量）",

    async execute(context: RuleContext, config?: GenerateIdConfig): Promise<RuleResult> {
        const { document, services } = context;
        const { template, fieldName = "id", prefix = "", ff1 } = config ?? {};

        if (!template)
            return { content: document, modified: false, messages: ["缺少 template 配置"] };

        if (hasFf1InTemplate(template)) {
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
            if (!ff1?.encryptionKey)
                return {
                    content: document,
                    modified: false,
                    messages: ["template 包含 {ff1} 但缺少 ff1.encryptionKey 配置"],
                };
            if (ff1.useCounter && config?.counter && !(ff1.useCounter in config.counter))
                return {
                    content: document,
                    modified: false,
                    messages: [`ff1.useCounter "${ff1.useCounter}" 未在 counter 中定义`],
                };
        }

        if (extractField(document, fieldName))
            return { content: document, modified: false, messages: [`${fieldName} 已存在`] };

        try {
            const generator = new IdGenerator();
            const needed = collectCounterIds(template, ff1);
            const counterValues: Record<string, number> = {};
            for (const id of needed) counterValues[id] = await peekCounter(id, config, services);

            let rendered = renderTemplateVariables(template, {
                generator,
                counterValues,
                counter: config?.counter,
                ff1,
                document,
            });
            if (prefix) rendered = `${prefix}${rendered}`;

            const result = upsertFrontmatterFields(document, { [fieldName]: rendered });
            for (const id of needed) await commitCounter(id, config, services);

            return {
                content: result.markdown,
                modified: result.success,
                messages: [`生成 ID: ${rendered}`],
            };
        } catch (error) {
            return {
                content: document,
                modified: false,
                messages: [
                    `ID 生成失败：${error instanceof Error ? error.message : String(error)}`,
                ],
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
