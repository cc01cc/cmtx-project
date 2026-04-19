/**
 * 元数据处理 Rules
 *
 * @module metadata-rules
 * @description
 * 提供元数据处理相关的 Rules，如 frontmatter 操作、ID 生成等。
 */

import { convertHeadingToFrontmatter, upsertFrontmatterFields } from '@cmtx/core';
import type { Rule, RuleContext, RuleResult } from '../rule-types.js';

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
    id: 'frontmatter-title',
    name: '标题转 frontmatter',
    description: '将文档的一级标题转换为 frontmatter 的 title 字段',

    execute(context: RuleContext, config?: ConvertTitleConfig): RuleResult {
        const { document } = context;
        const headingLevel = config?.headingLevel ?? 1;

        const newContent = convertHeadingToFrontmatter(document, { headingLevel });

        const modified = newContent !== document;

        return {
            content: newContent,
            modified,
            messages: modified ? ['已将标题转换为 frontmatter'] : ['没有找到指定级别的标题'],
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
    id: 'frontmatter-date',
    name: '添加发布日期',
    description: '在 frontmatter 中添加 date 字段（当前日期）',

    execute(context: RuleContext, config?: FrontmatterDateConfig): RuleResult {
        const { document } = context;
        const fieldName = config?.fieldName ?? 'date';
        const today = new Date().toISOString().split('T')[0];

        const result = upsertFrontmatterFields(document, { [fieldName]: today });

        const modified = result.updated.length > 0 || result.added.length > 0;

        return {
            content: result.markdown,
            modified,
            messages: modified ? [`添加/更新 ${fieldName}: ${today}`] : [`${fieldName} 字段已存在`],
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
    id: 'frontmatter-updated',
    name: '添加更新日期',
    description: '在 frontmatter 中添加/更新 updated 字段',

    execute(context: RuleContext, config?: FrontmatterUpdatedConfig): RuleResult {
        const { document } = context;
        const fieldName = config?.fieldName ?? 'updated';
        const today = new Date().toISOString().split('T')[0];

        const result = upsertFrontmatterFields(document, { [fieldName]: today });

        const modified = result.updated.length > 0 || result.added.length > 0;

        return {
            content: result.markdown,
            modified,
            messages: modified ? [`添加/更新 ${fieldName}: ${today}`] : [`${fieldName} 字段已存在`],
        };
    },
};

/**
 * 生成 ID Rule 配置
 */
interface GenerateIdConfig {
    /** 加密密钥 */
    encryptionKey?: string;
}

/**
 * 生成 ID Rule
 * TODO: 需要实现实际 ID 生成逻辑
 */
export const frontmatterIdRule: Rule = {
    id: 'frontmatter-id',
    name: '生成加密 ID',
    description: '在 frontmatter 中生成加密的唯一 ID',

    execute(context: RuleContext, config?: GenerateIdConfig): RuleResult {
        const { document } = context;
        const encryptionKey = config?.encryptionKey;

        if (!encryptionKey) {
            return {
                content: document,
                modified: false,
                messages: ['缺少 encryptionKey 配置'],
            };
        }

        // TODO: 实现 ID 生成逻辑
        // 1. 检查 frontmatter 是否已有 id
        // 2. 使用 IdGenerator 生成加密 ID
        // 3. 添加到 frontmatter

        return {
            content: document,
            modified: false,
            messages: ['ID 生成功能待实现'],
        };
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
