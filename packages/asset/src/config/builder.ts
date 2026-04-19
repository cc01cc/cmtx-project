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

export { TransferConfigBuilder } from '../transfer/types.js';
export { ConfigBuilder } from '../upload/types.js';

// 配置加载与验证
export {
    ConfigLoader,
    createConfigLoader,
    loadConfigFromFile,
    loadConfigFromString,
} from './loader.js';

export type { ConfigValidationResult as ValidationResult } from './validator.js';

export {
    ConfigValidator,
    createConfigValidator,
    ValidationError,
    validateConfig,
    validateConfigOrThrow,
} from './validator.js';
