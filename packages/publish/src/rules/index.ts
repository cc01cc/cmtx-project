/**
 * Rule 系统
 *
 * @module rules
 * @description
 * CMTX Rule 系统，提供统一的文档处理接口。
 */

export { autocorrectRule } from './built-in/autocorrect-rule.js';
export {
    convertImagesRule,
    uploadImagesRule,
} from './built-in/image-rules.js';

// 导出内置 Rules
export {
    builtInRules,
    imageRules,
    metadataRules,
    textRules,
} from './built-in/index.js';
export {
    frontmatterDateRule,
    frontmatterIdRule,
    frontmatterTitleRule,
    frontmatterUpdatedRule,
} from './built-in/metadata-rules.js';
// 导出具体 Rules（方便单独使用）
export {
    promoteHeadingsRule,
    stripFrontmatterRule,
    textReplaceRule,
} from './built-in/text-rules.js';
// 导出引擎
export {
    createDefaultRuleEngine,
    createRuleEngine,
    RuleEngine,
    RuleExecutionError,
} from './engine.js';
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
} from './rule-types.js';
