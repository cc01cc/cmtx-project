/**
 * Rule 系统
 *
 * @module rules
 * @description
 * CMTX Rule 系统，提供统一的文档处理接口。
 */

export { autocorrectRule } from "./built-in/autocorrect-rule.js";
export { convertImagesRule, transferImagesRule, uploadImagesRule } from "./built-in/image-rules.js";

// 导出内置 Rules
export { builtInRules, imageRules, metadataRules, textRules } from "./built-in/index.js";

export {
    frontmatterDateRule,
    frontmatterIdRule,
    frontmatterTitleRule,
    frontmatterUpdatedRule,
} from "./built-in/metadata-rules.js";
// 导出具体 Rules（方便单独使用）
export {
    promoteHeadingsRule,
    stripFrontmatterRule,
    textReplaceRule,
} from "./built-in/text-rules.js";
// 导出引擎
export {
    createDefaultRuleEngine,
    createRuleEngine,
    RuleEngine,
    RuleExecutionError,
} from "./engine.js";
// 导出类型
export type {
    CallbackService,
    CallbackServiceConfig,
    CoreContext,
    CounterService,
    CounterServiceConfig,
    FrontmatterRuleConfig,
    GlobalRulesConfig,
    ImageProcessRuleConfig,
    IStorageAdapter,
    PresetConfig,
    PresignedUrlService,
    PresignedUrlServiceConfig,
    Rule,
    RuleConfig,
    RuleContext,
    RuleResult,
    ServiceRegistry,
    ServiceTypeMap,
    SimplePreset,
    TextReplaceRuleConfig,
} from "./rule-types.js";
// 重新导出 service-registry 中的类型
export type { BuiltInServiceId } from "./service-registry.js";
// 导出本地服务
export {
    createCallbackService,
    createCounterService,
    createFileSystemService,
    createServiceRegistry,
    FileSystemServiceImpl,
    ServiceRegistryImpl,
} from "./services/index.js";
// 从 @cmtx/asset 重新导出 Service 创建函数（供应用层使用）
export { createAssetService, createCoreService } from "@cmtx/asset";
