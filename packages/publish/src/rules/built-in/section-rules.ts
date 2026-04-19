/**
 * 章节编号 Rules
 *
 * @module section-rules
 * @description
 * 提供章节编号相关的 Rules，支持添加/更新和移除章节编号。
 *
 * @remarks
 * ## 参考
 *
 * 本模块的实现参考了 Markdown All in One 扩展的设计：
 * - 仓库: https://github.com/yzhang-gh/vscode-markdown
 * - 版本: v3.6.3
 * - License: MIT License
 */

import { addSectionNumbers, removeSectionNumbers } from '@cmtx/core';
import type { Rule, RuleContext, RuleResult } from '../rule-types.js';

/**
 * 章节编号 Rule 配置
 */
interface SectionNumbersConfig {
    /** 最小标题等级，默认 1 */
    minLevel?: number;
    /** 最大标题等级，默认 6 */
    maxLevel?: number;
    /** 起始层级，默认 1 */
    startLevel?: number;
    /** 分隔符，默认 '.' */
    separator?: string;
}

/**
 * 添加/更新章节编号 Rule
 */
export const addSectionNumbersRule: Rule = {
    id: 'add-section-numbers',
    name: '添加/更新章节编号',
    description: '为 Markdown 标题自动添加层级编号（如 1.1. 标题）',

    execute(context: RuleContext, config?: SectionNumbersConfig): RuleResult {
        const { document } = context;

        const result = addSectionNumbers(document, {
            minLevel: config?.minLevel,
            maxLevel: config?.maxLevel,
            startLevel: config?.startLevel,
            separator: config?.separator,
        });

        return {
            content: result.content,
            modified: result.modified,
            messages: result.modified
                ? [`已为 ${result.headingsCount} 个标题添加/更新章节编号`]
                : ['没有需要添加章节编号的标题'],
        };
    },
};

/**
 * 移除章节编号 Rule
 */
export const removeSectionNumbersRule: Rule = {
    id: 'remove-section-numbers',
    name: '移除章节编号',
    description: '移除 Markdown 标题中的章节编号',

    execute(context: RuleContext, config?: SectionNumbersConfig): RuleResult {
        const { document } = context;

        const result = removeSectionNumbers(document, {
            minLevel: config?.minLevel,
            maxLevel: config?.maxLevel,
        });

        return {
            content: result.content,
            modified: result.modified,
            messages: result.modified
                ? [`已从 ${result.headingsCount} 个标题移除章节编号`]
                : ['没有找到章节编号'],
        };
    },
};

/**
 * 导出所有章节编号 Rules
 */
export const sectionRules: Rule[] = [addSectionNumbersRule, removeSectionNumbersRule];
