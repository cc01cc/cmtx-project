// ==================== 元数据相关 (来自 normalize) ====================

/**
 * @category 外部服务
 */
export type { IStorageAdapter } from "@cmtx/storage";
// ==================== 平台适配相关 ====================
export { formatForPublish } from "./format-for-publish.js";
// ==================== 加密 ID 相关 ====================
export {
    createFF1Cipher,
    decryptString,
    encryptString,
    ensureWasmLoaded,
    FF1CipherWASM,
    isEncryptionAvailable,
    loadWASM,
    prepareFPEKey,
} from "./metadata/fpe-ff1.js";
export { IdGenerator } from "./metadata/id-generator.js";
export type { IsUniqueIdOptions } from "./metadata/id-validator.js";
export { isUniqueId } from "./metadata/id-validator.js";
export { LuhnAlgorithm } from "./metadata/luhn.js";
export { MarkdownFileQuery } from "./metadata/markdown-file-query.js";
export { MarkdownMetadataExtractor } from "./metadata/markdown-metadata-extractor.js";
export { MetadataRegistry } from "./metadata/metadata-registry.js";
export {
    adaptMarkdown,
    getRegisteredPresets,
    registerPreset,
    renderMarkdown,
    unregisterPreset,
    validateMarkdown,
} from "./preset/registry.js";
// ==================== 图片处理相关 ====================
export { processImagesForPublish } from "./process-images.js";
// ==================== 规则引擎相关 ====================
export type {
    GlobalRulesConfig,
    PresetConfig,
    Rule,
    RuleConfig,
    RuleContext,
    RuleResult,
    SimplePreset,
} from "./rules/index.js";
// 新的 Rule 系统
export {
    convertImagesRule,
    createAssetService,
    createCallbackService,
    // 外部服务
    createCoreService,
    createCounterService,
    createDefaultRuleEngine,
    createRuleEngine,
    createServiceRegistry,
    frontmatterDateRule,
    frontmatterIdRule,
    frontmatterTitleRule,
    frontmatterUpdatedRule,
    imageRules,
    metadataRules,
    promoteHeadingsRule,
    RuleEngine,
    RuleExecutionError,
    ServiceRegistryImpl,
    stripFrontmatterRule,
    textReplaceRule,
    textRules,
    uploadImagesRule,
} from "./rules/index.js";
// 从 service-registry.ts 导出类型
export type {
    BuiltInServiceId,
    CallbackService,
    CallbackServiceConfig,
    CoreContext,
    CounterService,
    CounterServiceConfig,
    PresignedUrlService,
    PresignedUrlServiceConfig,
    Service,
    ServiceRegistry,
    ServiceTypeMap,
} from "./rules/service-registry.js";
// ==================== 内部 Service 类型（仅供 Rule 引擎使用）====================
/**
 * @category 内部服务
 */
export type { AssetService, AssetServiceConfig } from "./rules/services/asset-service-wrapper.js";
/**
 * @category 内部服务
 */
export type { CoreService, CoreServiceConfig } from "./rules/services/core-service-wrapper.js";
// ==================== 类型导出 ====================
export type {
    AdaptDirectoryResult,
    AdaptedFileResult,
    AdaptResult,
    AutoMetadataOptions,
    DocumentState,
    EncryptedIdOptions,
    EncryptedIdValidationResult,
    ExtractOptions,
    FF1EncryptOptions,
    FF1IdOptions,
    FormatForPublishOptions,
    FormatForPublishResult,
    ListOptions,
    MarkdownMetadata,
    ProcessImagesOptions,
    ProcessImagesResult,
    QueryFilter,
    RenderDirectoryOptions,
    RenderDirectoryResult,
    RenderedFileResult,
    RenderFileOptions,
    RenderResult,
    ValidateDirectoryOptions,
    ValidatedFileResult,
    ValidateFileOptions,
    ValidationIssue,
    ValidationLevel,
    ValidationSummary,
} from "./types.js";
