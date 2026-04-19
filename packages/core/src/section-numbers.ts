/**
 * Markdown 章节编号模块
 *
 * @module section-numbers
 * @description
 * 提供 Markdown 文档章节标题的自动编号功能，支持添加、更新和移除章节编号。
 *
 * @remarks
 * ## 功能概述
 *
 * 本模块专注于处理 Markdown 文档的章节编号：
 * - 添加章节编号 - 为标题自动添加层级编号（如 1.1. 标题）
 * - 更新章节编号 - 重新计算并更新现有编号
 * - 移除章节编号 - 删除所有章节编号
 *
 * ## 核心功能
 *
 * ### 章节编号操作
 * - {@link addSectionNumbers} - 为 Markdown 文档添加章节编号
 * - {@link removeSectionNumbers} - 移除 Markdown 文档的章节编号
 *
 * ## 技术特点
 *
 * - 采用正则表达式架构，与图片处理保持一致
 * - 不依赖外部 AST 解析库
 * - 支持层级编号（如 1.1.1.）
 * - 高性能，低依赖
 *
 * ## 参考
 *
 * 本模块的实现参考了 Markdown All in One 扩展的设计：
 * - 仓库: https://github.com/yzhang-gh/vscode-markdown
 * - 版本: v3.6.3
 * - License: MIT License
 *
 * @see {@link SectionNumbersOptions} - 章节编号选项
 * @see {@link SectionNumbersResult} - 章节编号结果
 */

import { extractSectionHeadings } from './metadata.js';
import type { SectionNumbersOptions, SectionNumbersResult } from './types.js';

/**
 * 为 Markdown 文档添加章节编号
 *
 * @param markdown - Markdown 文本
 * @param options - 章节编号选项
 * @returns 章节编号结果
 *
 * @example
 * ```typescript
 * const md = `# Title
 * ## Section 1
 * ### Subsection
 * ## Section 2`;
 *
 * const result = addSectionNumbers(md);
 * console.log(result.content);
 * // # 1. Title
 * // ## 1.1. Section 1
 * // ### 1.1.1. Subsection
 * // ## 1.2. Section 2
 * ```
 * @public
 * @category 章节编号
 */
export function addSectionNumbers(
    markdown: string,
    options: SectionNumbersOptions = {}
): SectionNumbersResult {
    const { minLevel = 1, maxLevel = 6, startLevel = 1, separator = '.' } = options;

    const lines = markdown.split(/\r?\n/g);
    // 使用传入的 minLevel/maxLevel 提取标题，避免提取不需要的标题
    const filteredHeadings = extractSectionHeadings(markdown, { minLevel, maxLevel });

    if (filteredHeadings.length === 0) {
        return {
            content: markdown,
            modified: false,
            headingsCount: 0,
        };
    }

    // 计算实际的起始层级
    const actualStartLevel = Math.max(
        startLevel,
        Math.min(...filteredHeadings.map((h) => h.level))
    );

    // 计数器数组，用于跟踪每个层级的编号
    const counters = [0, 0, 0, 0, 0, 0];

    // 从前往后处理，正确计算章节编号
    for (let i = 0; i < filteredHeadings.length; i++) {
        const heading = filteredHeadings[i];
        const level = heading.level;
        const lineIndex = heading.lineIndex;

        // 递增当前层级的计数器
        counters[level - 1]++;
        // 重置更低层级的计数器
        for (let j = level; j < 6; j++) {
            counters[j] = 0;
        }

        // 构建章节编号字符串
        const numberParts: string[] = [];
        for (let l = actualStartLevel; l <= level; l++) {
            numberParts.push(String(counters[l - 1]));
        }
        const sectionNumber = numberParts.join(separator) + separator;

        // 更新行内容
        const line = lines[lineIndex];
        // 匹配标题行，移除已有的编号（如果存在）
        const newLine = line.replace(
            /^(#{1,6}\s+)(?:(?:\d+\.)+\s+)?(.*)$/,
            `$1${sectionNumber} $2`
        );
        lines[lineIndex] = newLine;
    }

    return {
        content: lines.join('\n'),
        modified: true,
        headingsCount: filteredHeadings.length,
    };
}

/**
 * 移除 Markdown 文档的章节编号
 *
 * @param markdown - Markdown 文本
 * @param options - 章节编号选项
 * @returns 章节编号结果
 *
 * @example
 * ```typescript
 * const md = `# 1. Title
 * ## 1.1. Section 1
 * ### 1.1.1. Subsection`;
 *
 * const result = removeSectionNumbers(md);
 * console.log(result.content);
 * // # Title
 * // ## Section 1
 * // ### Subsection
 * ```
 * @public
 * @category 章节编号
 */
export function removeSectionNumbers(
    markdown: string,
    options: SectionNumbersOptions = {}
): SectionNumbersResult {
    const { minLevel = 1, maxLevel = 6 } = options;

    const lines = markdown.split(/\r?\n/g);
    const headings = extractSectionHeadings(markdown, { minLevel: 1, maxLevel: 6 });

    // 过滤指定范围的标题
    const filteredHeadings = headings.filter((h) => h.level >= minLevel && h.level <= maxLevel);

    if (filteredHeadings.length === 0) {
        return {
            content: markdown,
            modified: false,
            headingsCount: 0,
        };
    }

    let modifiedCount = 0;

    // 从后向前处理（移除操作不需要保持顺序，从后向前更安全）
    for (let i = filteredHeadings.length - 1; i >= 0; i--) {
        const heading = filteredHeadings[i];
        const lineIndex = heading.lineIndex;
        const line = lines[lineIndex];

        // 移除章节编号
        const newLine = line.replace(/^(#{1,6}\s+)(?:(?:\d+\.)+\s+)?(.*)$/, '$1$2');

        if (newLine !== line) {
            modifiedCount++;
        }
        lines[lineIndex] = newLine;
    }

    return {
        content: lines.join('\n'),
        modified: modifiedCount > 0,
        headingsCount: filteredHeadings.length,
    };
}
