// ==================== 元数据相关 (来自 normalize) ====================

// ==================== 平台适配相关 ====================
export { formatForPublish } from './format-for-publish.js';
export type { CounterStore } from './metadata/counter-store.js';
export {
    DEFAULT_COUNTER_PATH,
    FileCounterStore,
    MemoryCounterStore,
} from './metadata/counter-store.js';
// ==================== 加密 ID 相关 ====================
export {
    createFF1Cipher,
    decryptString,
    encryptString,
    ensureWasmLoaded,
    FF1Cipher,
    FF1CipherWASM,
    isEncryptionAvailable,
    loadWASM,
    prepareFPEKey,
} from './metadata/fpe-ff1.js';
export { IdGenerator } from './metadata/id-generator.js';
export type { IsUniqueIdOptions } from './metadata/id-validator.js';
export { isUniqueId } from './metadata/id-validator.js';
export { LuhnAlgorithm } from './metadata/luhn.js';
export { MarkdownFileQuery } from './metadata/markdown-file-query.js';
export { MarkdownMetadataExtractor } from './metadata/markdown-metadata-extractor.js';
export { MetadataRegistry } from './metadata/metadata-registry.js';
export {
    adaptMarkdown,
    getPlatformAdapter,
    getPlatformRules,
    getRegisteredPlatforms,
    getSupportedPlatforms,
    registerPlatform,
    registerPlatformFromFile,
    renderMarkdown,
    unregisterPlatform,
    validateMarkdown,
} from './platform/registry.js';

// ==================== 图片处理相关 ====================
export { processImagesForPublish } from './process-images.js';

// ==================== 规则引擎相关 ====================
export { applyAdaptRules } from './rules/apply.js';
export type {
    GlobalRulesConfig,
    PresetConfig,
    Rule,
    RuleConfig,
    RuleContext,
    RuleResult,
    SimplePreset,
} from './rules/index.js';
// 新的 Rule 系统
export {
    builtInRules,
    convertImagesRule,
    createDefaultRuleEngine,
    createRuleEngine,
    frontmatterDateRule,
    frontmatterIdRule,
    frontmatterTitleRule,
    frontmatterUpdatedRule,
    imageRules,
    metadataRules,
    promoteHeadingsRule,
    RuleEngine,
    RuleExecutionError,
    stripFrontmatterRule,
    textReplaceRule,
    textRules,
    uploadImagesRule,
} from './rules/index.js';
export { parseAdaptConfig } from './rules/parse.js';
export { validateAdaptConfig } from './rules/validate.js';

// ==================== 类型导出 ====================
export type {
    AdaptConfig,
    AdaptDirectoryOptions,
    AdaptDirectoryResult,
    AdaptedFileResult,
    AdaptFileOptions,
    AdaptPlatform,
    AdaptResult,
    AdaptRule,
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
    PlatformAdapter,
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
} from './types.js';
