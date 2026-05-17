/**
 * CMTX 配置模块
 *
 * @module config
 * @description
 * 提供 CMTX 配置文件的加载、保存、验证和模板生成功能。
 */

// ==================== 配置加载器 ====================
export { ConfigLoader, loadConfigFromFile, loadConfigFromString } from "./loader.js";
// ==================== 配置模板 ====================
export { generateDefaultConfig } from "./template.js";
// ==================== 配置类型 ====================
export type {
    AIConfig,
    AIModelConfig,
    AIProvider,
    CmtxConfig,
    CmtxPresignedUrlConfig,
    CmtxPresignedUrlDomain,
    CmtxStorageConfig,
    PresetConfig,
    ReplaceConfig,
} from "./types.js";
// ==================== 预签名 URL 解析器 ====================
export {
    resolvePresignedUrlOptions,
    type PresignedUrlResolvedOptions,
} from "./presigned-resolver.js";
// ==================== 配置验证器 ====================
export { type ConfigValidationError, ValidationResult, validateConfig } from "./validator.js";
