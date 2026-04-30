/**
 * 多组正则表达式替换功能
 *
 * @module multi-regex
 * @description
 * 提供多组正则表达式顺序替换功能，支持批量文本处理。
 *
 * @remarks
 * ## 功能概述
 *
 * 实现简单的多组正则表达式替换功能，按顺序应用多个替换规则。
 * 每个规则包含匹配模式和替换字符串，支持捕获组引用。
 *
 * ## 核心特性
 *
 * - **多规则支持**：一次调用可应用多个替换规则
 * - **顺序执行**：按规则数组顺序依次应用
 * - **捕获组支持**：替换字符串支持 $1, $2 等捕获组引用
 * - **详细统计**：提供每个规则的应用次数统计
 * - **灵活输入**：支持字符串和RegExp对象作为模式
 *
 * ## 使用示例
 *
 * ```typescript
 * import { replaceWithMultipleRegex } from '@cmtx/core/multi-regex';
 *
 * const text = 'Hello World!';
 * const result = replaceWithMultipleRegex(text, {
 *   rules: [
 *     { pattern: /World/g, replacement: 'Universe' },
 *     { pattern: /Hello/g, replacement: 'Hi' }
 *   ]
 * });
 *
 * console.log(result.newText); // "Hi Universe!"
 * console.log(result.totalReplacements); // 2
 * ```
 *
 * @see {@link MultiRegexRule} - 替换规则定义
 * @see {@link MultiRegexOptions} - 替换选项配置
 * @see {@link MultiRegexResult} - 替换结果类型
 */

import type {
    FindMatchesResult,
    MatchResult,
    MatchStatistics,
    MultiRegexFindOptions,
    MultiRegexOptions,
    MultiRegexResult,
    MultiRegexRule,
    RuleApplyDetail,
} from "./types.js";

/**
 * 多组正则表达式替换主函数 (MVP版本)
 *
 * @param text - 待处理的文本
 * @param options - 替换选项
 * @returns 替换结果
 *
 * @remarks
 * 按顺序应用每个替换规则，返回最终文本和统计信息。
 * 规则默认按数组顺序执行，但如果提供了order参数，则按order数值升序执行。
 * 前一个规则的结果会影响后续规则的匹配。
 *
 * @example
 * ```typescript
 * // 基本用法（按数组顺序）
 * const result = replaceWithMultipleRegex('abc def', {
 *   rules: [
 *     { pattern: /abc/g, replacement: 'xyz' },
 *     { pattern: /def/g, replacement: 'uvw' }
 *   ]
 * });
 * // result.newText === 'xyz uvw'
 *
 * // 使用order参数控制执行顺序
 * const result2 = replaceWithMultipleRegex('first second', {
 *   rules: [
 *     { pattern: /second/g, replacement: 'third', order: 2 },
 *     { pattern: /first/g, replacement: 'second', order: 1 }
 *   ]
 * });
 * // result2.newText === 'second third'
 *
 * // 混合使用（有order的优先，无order的按原顺序）
 * const result3 = replaceWithMultipleRegex('test', {
 *   rules: [
 *     { pattern: /test/g, replacement: 'step1' },           // order: undefined (最后执行)
 *     { pattern: /step2/g, replacement: 'final', order: 2 },
 *     { pattern: /step1/g, replacement: 'step2', order: 1 }
 *   ]
 * });
 * // result3.newText === 'final'
 * ```
 * @public
 */
export function replaceWithMultipleRegex(
    text: string,
    options: MultiRegexOptions,
): MultiRegexResult {
    let currentText = text;
    let totalReplacements = 0;
    const ruleDetails: RuleApplyDetail[] = [];

    // 根据order参数排序规则，如果没有order则按数组原始顺序
    const sortedRules = [...options.rules].sort((a, b) => {
        // 有order的规则优先，数值越小优先级越高
        // 无order的规则按原始数组顺序（使用数组索作为后备）
        const orderA = a.order;
        const orderB = b.order;

        // 如果都有order，按order排序
        if (orderA !== undefined && orderB !== undefined) {
            return orderA - orderB;
        }

        // 如果只有A有order，A优先
        if (orderA !== undefined && orderB === undefined) {
            return -1;
        }

        // 如果只有B有order，B优先
        if (orderA === undefined && orderB !== undefined) {
            return 1;
        }

        // 都没有order，保持原始顺序
        return 0;
    });

    // 按排序后的顺序应用每个规则
    for (const rule of sortedRules) {
        const ruleId =
            rule.id || `rule-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const { newText, replacementCount } = applySingleRule(currentText, rule);

        currentText = newText;
        totalReplacements += replacementCount;

        ruleDetails.push({
            ruleId,
            appliedCount: replacementCount,
        });
    }

    return {
        newText: currentText,
        totalReplacements,
        ruleDetails,
    };
}

/**
 * 应用单个规则
 *
 * @param text - 文本
 * @param rule - 规则
 * @returns 应用结果，包含新文本和替换次数
 *
 * @internal
 * @remarks
 * 将规则模式转换为全局正则表达式，应用替换并统计次数。
 * 如果输入是字符串，则创建全局正则表达式。
 * 如果输入是RegExp对象，则确保包含全局标志。
 */
function applySingleRule(
    text: string,
    rule: MultiRegexRule,
): { newText: string; replacementCount: number } {
    // 确保正则表达式具有全局标志
    const regex =
        typeof rule.pattern === "string"
            ? new RegExp(rule.pattern, "g") // 字符串模式默认全局
            : rule.pattern; // 直接使用传入的RegExp对象
    let count = 0;
    const newText = text.replace(regex, (...args) => {
        count++;
        // args 包含匹配的字符串和所有捕获组
        return rule.replacement.replaceAll(/\$(\d+)/g, (_, numStr) => {
            const groupIndex = Number.parseInt(numStr, 10);
            return args[groupIndex] || `$${numStr}`;
        });
    });

    return {
        newText,
        replacementCount: count,
    };
}

// ==================== 查询匹配功能 ====================

/**
 * 查找所有匹配项（不执行替换）
 *
 * @param text - 待处理的文本
 * @param options - 查询选项
 * @returns 匹配结果，包含所有匹配项和统计信息
 *
 * @remarks
 * 此方法只查找匹配项，不执行任何替换操作。
 * 支持与替换功能相同的order参数排序规则。
 *
 * @example
 * ```typescript
 * const result = findAllMatches('Hello World! Hello Universe!', {
 *   rules: [
 *     { pattern: /Hello (\w+)!/g, id: 'greeting' },
 *     { pattern: /World/g, id: 'world', order: 1 }
 *   ]
 * });
 *
 * console.log(result.matches.length); // 3
 * console.log(result.statistics['greeting'].count); // 2
 * ```
 * @public
 */
export function findAllMatches(text: string, options: MultiRegexFindOptions): FindMatchesResult {
    const matches: MatchResult[] = [];
    const statistics: Record<string, MatchStatistics> = {};

    // 使用与替换功能相同的排序逻辑
    const sortedRules = [...options.rules].sort((a, b) => {
        const orderA = a.order;
        const orderB = b.order;

        if (orderA !== undefined && orderB !== undefined) {
            return orderA - orderB;
        }
        if (orderA !== undefined) return -1;
        if (orderB !== undefined) return 1;
        return 0;
    });

    // 为每个规则查找匹配项
    sortedRules.forEach((rule, ruleIndex) => {
        const ruleId = rule.id || `rule-${ruleIndex}`;
        const regex =
            typeof rule.pattern === "string" ? new RegExp(rule.pattern, "g") : rule.pattern;

        // 初始化统计信息
        statistics[ruleId] = {
            count: 0,
            sampleMatches: [],
            order: rule.order ?? ruleIndex,
        };

        // 查找所有匹配项
        let match: RegExpExecArray | null;
        const regexCopy = new RegExp(regex.source, regex.flags); // 创建副本避免状态干扰

        while ((match = regexCopy.exec(text)) !== null) {
            const matchResult: MatchResult = {
                matchedText: match[0],
                index: match.index,
                endIndex: match.index + match[0].length,
                groups: [...match],
                ruleId,
                ruleOrder: ruleIndex,
            };

            matches.push(matchResult);
            statistics[ruleId].count++;

            // 保存样本（最多5个）
            if (statistics[ruleId].sampleMatches.length < 5) {
                statistics[ruleId].sampleMatches.push(match[0]);
            }

            // 避免无限循环（对于零宽度匹配）
            if (match.index === regexCopy.lastIndex) {
                regexCopy.lastIndex++;
            }
        }
    });

    // 按在文本中的位置排序所有匹配项
    matches.sort((a, b) => a.index - b.index);

    return {
        matches,
        statistics,
        originalText: text,
    };
}
