/**
 * 配置构建器
 *
 * @module config/builder
 * @description
 * 提供统一的配置构建器，支持上传和传输配置。
 *
 * @remarks
 * 这个模块重新导出 upload 和 transfer 的配置构建器，
 * 方便用户从统一入口导入。
 */

export { TransferConfigBuilder } from "../transfer/types.js";
export { ConfigBuilder } from "../upload/types.js";
// 环境变量替换
export { substituteEnvVars, substituteEnvVarsInObject } from "../utils/env-substitution.js";
// 配置加载与验证
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
// 配置模板
export { DEFAULT_CONFIG_TEMPLATE, generateDefaultConfig } from "./template.js";
// 配置类型
export type {
    CmtxConfig,
    CmtxPresignedUrlConfig,
    CmtxPresignedUrlDomain,
    CmtxResizeConfig,
    CmtxResizeDomain,
    CmtxStorageConfig,
    CmtxUploadConfig,
    PresetConfig,
    PresetConfigFull,
    RuleStepConfig,
} from "./types.js";
export type {
    ConfigValidationError,
    ConfigValidationError as ValidationResult,
} from "./validator.js";
export { ConfigValidator, formatValidationErrors, validateConfig } from "./validator.js";
