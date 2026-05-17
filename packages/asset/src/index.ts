/**
 * @cmtx/asset - Markdown 资产管理
 *
 * @packageDocumentation
 * @module @cmtx/asset
 *
 * @description
 * 提供 Markdown 图片资产生命周期管理功能，包括：
 * - 从云端下载图片到本地
 * - 本地图片上传到对象存储
 * - 远程图片在存储间转移
 * - 自动替换 Markdown 中的图片引用
 * - 云存储 URL 检测（支持阿里云 OSS、腾讯云 COS、AWS S3）
 *
 * @remarks
 * ## 子模块
 *
 * ### Download 模块
 * 用于将 Markdown 中引用的远程图片下载到本地
 *
 * ```typescript
 * import { createDownloadService } from "@cmtx/asset/download";
 * ```
 *
 * ### Upload 模块
 * 用于将 Markdown 中引用的本地图片上传到对象存储
 *
 * ```typescript
 * import { executeUploadPipeline, ConfigBuilder } from "@cmtx/asset/upload";
 * ```
 *
 * ### Transfer 模块
 * 用于将 Markdown 中引用的远程图片从一个存储转移到另一个存储
 *
 * ```typescript
 * import { transferRemoteImages, TransferConfigBuilder } from "@cmtx/asset/transfer";
 * ```
 *
 * ### Transfer 模块
 * 用于将 Markdown 中引用的远程图片从一个存储转移到另一个存储
 *
 * ```typescript
 * import { TransferConfigBuilder, transferRemoteImages } from "@cmtx/asset/transfer";
 * ```
 *
 * ## 快速开始
 *
 * ```typescript
 * // 下载远程图片
 * import { createDownloadService } from "@cmtx/asset/download";
 *
 * const service = createDownloadService({
 *   options: { outputDir: './images/' }
 * });
 * const result = await service.downloadFromMarkdown("./article.md");
 *
 * // 上传本地图片
 * import { ConfigBuilder } from "@cmtx/asset/upload";
 * import { detectStorageUrl } from "@cmtx/storage";
 * ```
 */

// Delete 模块导出
export { DeleteService, resolveBaseDirectory } from "./delete/index.js";

// Service 层导出（统一 Service 定义点）
export type {
    DownloadServiceConfig,
    SimpleDownloadResult,
    StorageDomainConfig,
    TransferResult,
    TransferServiceConfig,
    UploadResult,
    UploadServiceConfig,
} from "./services/index.js";
export {
    createDownloadService,
    createTransferService,
    createUploadService,
    DownloadService,
    TransferService,
    UploadService,
} from "./services/index.js";
export type { Service } from "./services/index.js";

// ==================== Config 模块导出（配置管理）====================

export type {
    AIConfig,
    AIModelConfig,
    AIProvider,
    CmtxConfig,
    CmtxPresignedUrlConfig,
    CmtxPresignedUrlDomain,
    CmtxStorageConfig,
    ConfigValidationError,
    PresetConfig,
    PresignedUrlResolvedOptions,
    ReplaceConfig,
    ValidationResult,
} from "./config/index.js";
export { IdGenerator } from "./id-generator.js";
export type {
    EncryptedIdOptions,
    EncryptedIdValidationResult,
    FF1EncryptOptions,
} from "./id-generator.js";
export {
    ConfigLoader,
    generateDefaultConfig,
    loadConfigFromFile,
    loadConfigFromString,
    resolvePresignedUrlOptions,
    validateConfig,
} from "./config/index.js";
