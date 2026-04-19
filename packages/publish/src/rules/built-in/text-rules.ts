/**
 * 文本替换 Rules
 *
 * @module text-rules
 * @description
 * 提供文本替换相关的 Rules，如移除 frontmatter、标题层级转换等。
 */

import type { Rule, RuleContext, RuleResult } from '../rule-types.js';

/**
 * 移除 frontmatter Rule
 */
export const stripFrontmatterRule: Rule = {
    id: 'strip-frontmatter',
    name: '移除 frontmatter',
    description: '移除文档开头的 YAML frontmatter',

    execute(context: RuleContext): RuleResult {
        const { document } = context;

        // 匹配 frontmatter 正则（支持 \r\n 和 \n 换行符）
        const frontmatterRegex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*(?:[\r\n]|$)/;
        const match = document.match(frontmatterRegex);

        if (!match) {
            return {
                content: document,
                modified: false,
                messages: ['文档没有 frontmatter'],
            };
        }

        const newContent = document.replace(frontmatterRegex, '');

        return {
            content: newContent,
            modified: true,
            messages: [`移除了 frontmatter（${match[0].length} 字符）`],
        };
    },
};

/**
 * 标题层级提升 Rule 配置
 */
interface PromoteHeadingsConfig {
    /** 提升的级数，默认为 1 */
    levels?: number;
}

/**
 * 标题层级提升 Rule
 */
export const promoteHeadingsRule: Rule = {
    id: 'promote-headings',
    name: '标题层级提升',
    description: '将标题层级提升（如 h2→h1, h3→h2）',

    execute(context: RuleContext, config?: PromoteHeadingsConfig): RuleResult {
        const { document } = context;
        const levels = config?.levels ?? 1;

        if (levels <= 0) {
            return {
                content: document,
                modified: false,
                messages: ['提升级数必须大于 0'],
            };
        }

        let newContent = document;
        const messages: string[] = [];

        // 从低级别到高级别处理（H2→H1, 然后 H3→H2, ...）
        // 这样新产生的标题不会被后续处理重复匹配
        for (let i = 2; i <= 6; i++) {
            const targetLevel = Math.max(1, i - levels);
            if (targetLevel === i) continue;

            const regex = new RegExp(`^#{${i}} (.+)$`, 'gm');
            const replacement = `${'#'.repeat(targetLevel)} $1`;

            const matches = newContent.match(regex);
            if (matches) {
                messages.push(`h${i} → h${targetLevel}: ${matches.length} 个`);
            }

            newContent = newContent.replace(regex, replacement);
        }

        const modified = newContent !== document;

        return {
            content: newContent,
            modified,
            messages: modified ? messages : ['没有需要调整的标题'],
        };
    },
};

/**
 * 通用文本替换 Rule 配置
 */
interface TextReplaceConfig {
    /** 正则表达式 */
    match: string;

    /** 替换字符串 */
    replace: string;

    /** 正则标志 */
    flags?: string;
}

/**
 * 通用文本替换 Rule
 */
export const textReplaceRule: Rule = {
    id: 'text-replace',
    name: '文本替换',
    description: '使用正则表达式替换文本',

    execute(context: RuleContext, config?: TextReplaceConfig): RuleResult {
        const { document } = context;

        if (!config?.match) {
            return {
                content: document,
                modified: false,
                messages: ['缺少 match 配置'],
            };
        }

        const { match, replace = '', flags = 'gm' } = config;

        try {
            const regex = new RegExp(match, flags);
            const matches = document.match(regex);

            if (!matches) {
                return {
                    content: document,
                    modified: false,
                    messages: ['没有匹配的内容'],
                };
            }

            const newContent = document.replace(regex, replace);

            return {
                content: newContent,
                modified: true,
                messages: [`替换了 ${matches.length} 处`],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                content: document,
                modified: false,
                messages: [`正则表达式错误: ${message}`],
            };
        }
    },
};

/**
 * 导出所有文本替换 Rules
 */
export const textRules: Rule[] = [stripFrontmatterRule, promoteHeadingsRule, textReplaceRule];
