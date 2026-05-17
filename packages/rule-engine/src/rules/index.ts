/**
 * Rule 系统
 *
 * @module rules
 * @description
 * CMTX Rule 系统，提供统一的文档处理接口。
 */

// 注意：builtInRules 不再导出，请通过字符串 ID 使用 engine.executeRule("rule-id")
// export { builtInRules } from "./built-in/index.js";
export { createDefaultRuleEngine, createRuleEngine, RuleEngine } from "./engine.js";
// 导出类型
export type {
    FrontmatterRuleConfig,
    GlobalRulesConfig,
    ImageProcessRuleConfig,
    PresetConfig,
    Rule,
    RuleConfig,
    RuleContext,
    RuleResult,
    SimplePreset,
    TextReplaceRuleConfig,
} from "./rule-types.js";
