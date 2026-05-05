/**
 * CMTX 配置模块
 *
 * @module config
 * @description
 * 提供 CMTX 配置文件的加载、保存、验证和模板生成功能。
 */

// ==================== 环境变量替换 ====================
export { substituteEnvVars, substituteEnvVarsInObject } from "../utils/env-substitution.js";
// ==================== 配置加载器 ====================
export {
    ConfigLoader,
    ensureConfig,
    getConfigDirPath,
    getConfigFilePath,
    type LoaderOptions,
    loadConfigFromFile,
    loadConfigFromString,
    saveConfigToFile,
} from "./loader.js";
// ==================== 配置模板 ====================
export { DEFAULT_CONFIG_TEMPLATE, generateDefaultConfig } from "./template.js";
// ==================== 配置类型 ====================
export type {
    CmtxConfig,
    CmtxPresignedUrlConfig,
    CmtxPresignedUrlDomain,
    CmtxStorageConfig,
    PresetConfig,
    PresetConfigFull,
    ReplaceConfig,
    RuleStepConfig,
} from "./types.js";
export { DEFAULT_CONFIG } from "./types.js";
// ==================== 预签名 URL 解析器 ====================
export {
    resolvePresignedUrlOptions,
    type PresignedUrlResolvedOptions,
} from "./presigned-resolver.js";
// ==================== 配置验证器 ====================
export {
    type ConfigValidationError,
    ConfigValidator,
    formatValidationErrors,
    validateConfig,
    validateConfigOrThrow,
} from "./validator.js";
