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
export { createRuleEngineContext } from "./rule-context.js";
export type { CreateRuleEngineContextOptions, RuleEngineContextResult } from "./rule-context.js";
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
    createCallbackService,
    createCoreService,
    createCounterService,
    createDefaultRuleEngine,
    createFileSystemService,
    createRuleEngine,
    createServiceRegistry,
    frontmatterDateRule,
    frontmatterIdRule,
    frontmatterSlugRule,
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
    transferImagesRule,
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
    FileSystemService,
    FileSystemServiceConfig,
    AssetRef,
    PresignedUrlService,
    PresignedUrlServiceConfig,
    Service,
    ServiceRegistry,
    ServiceTypeMap,
} from "./rules/service-registry.js";
// ==================== Service 类型（从 @cmtx/asset 统一导入）====================
/**
 * @category 内部服务
 */
export type {
    CoreService,
    CoreServiceConfig,
    DownloadAssetsService,
    DownloadAssetsServiceConfig,
    StorageDomainConfig,
    TransferAssetsService,
    TransferAssetsServiceConfig,
    UploadResult,
    UploadService,
    UploadServiceConfig,
} from "@cmtx/asset";
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
