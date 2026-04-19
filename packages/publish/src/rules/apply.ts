import type { AdaptResult, AdaptRule } from '../types.js';

/**
 * 依次执行规则列表，返回最终文本和执行摘要。
 *
 * @public
 */
export function applyAdaptRules(content: string, rules: AdaptRule[]): AdaptResult {
    let result = content;
    const appliedRuleNames: string[] = [];

    for (const rule of rules) {
        const regex = new RegExp(rule.match, rule.flags ?? 'gm');
        const nextResult = result.replace(regex, rule.replace);

        if (nextResult !== result) {
            appliedRuleNames.push(rule.name ?? rule.match);
        }

        result = nextResult;
    }

    return {
        content: result,
        changed: result !== content,
        appliedRuleNames,
    };
}
