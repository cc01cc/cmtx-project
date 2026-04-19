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
 * import { uploadLocalImageInMarkdown, ConfigBuilder } from "@cmtx/asset/upload";
 * ```
 *
 * ### Transfer 模块
 * 用于将 Markdown 中引用的远程图片从一个存储转移到另一个存储
 *
 * ```typescript
 * import { transferRemoteImages, TransferConfigBuilder } from "@cmtx/asset/transfer";
 * ```
 *
 * ### Utils 模块
 * 提供云存储 URL 检测工具函数
 *
 * ```typescript
 * import { detectStorageUrl, isSignedUrl, isStorageUrl } from "@cmtx/asset";
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
 * import { uploadLocalImageInMarkdown, ConfigBuilder } from "@cmtx/asset/upload";
 *
 * const result = await uploadLocalImageInMarkdown("/path/to/article.md", config);
 *
 * // 转移远程图片
 * import { transferRemoteImages, TransferConfigBuilder } from "@cmtx/asset/transfer";
 *
 * const result = await transferRemoteImages("/path/to/article.md", transferConfig);
 *
 * // 检测云存储 URL
 * import { detectStorageUrl } from "@cmtx/asset";
 *
 * const result = detectStorageUrl('https://mybucket.oss-cn-hangzhou.aliyuncs.com/image.png');
 * console.log(result.provider); // 'aliyun'
 * console.log(result.bucket); // 'mybucket'
 * console.log(result.region); // 'cn-hangzhou'
 * ```
 */

// Download 模块导出
export type {
    DownloadFilter,
    DownloadItem,
    DownloadOptions,
    DownloadProgress,
    DownloadResult,
    InternalDownloadConfig,
    NamingVariables,
    ParsedUrlInfo,
} from './download/index.js';
export {
    createDownloadService,
    DEFAULT_NAMING_TEMPLATE,
    generateNamingVariables,
    generateUniqueFileName,
    parseUrlForNaming,
    renderNamingTemplate,
} from './download/index.js';
// Shared 模块导出
export type { BaseNamingVariables } from './shared/index.js';
export type {
    FileFilter,
    SourceConfig,
    TargetConfig,
    TransferConfig,
    TransferEvent,
    TransferEventType,
    TransferOptions,
    TransferProgress,
    TransferResult,
    UrlMapping,
} from './transfer/index.js';
// Transfer 模块导出
export {
    TransferConfigBuilder,
    transferRemoteImages,
} from './transfer/index.js';
export type {
    DeduplicationInfo,
    DeleteOptions,
    EventOptions,
    FailedItem,
    ImageCloudMapBody,
    ReplaceOptions,
    StorageOptions,
    UploadConfig,
    UploadEvent,
    UploadEventType,
    UploadResult,
} from './upload/index.js';
// Upload 模块导出（向后兼容）
export {
    ConfigBuilder,
    uploadLocalImageInMarkdown,
} from './upload/index.js';
export {
    detectStorageUrl,
    isAliyunOssUrl,
    isAwsS3Url,
    isSignedUrl,
    isStorageUrl,
    isTencentCosUrl,
} from './utils/storage-url-detector.js';
// Utils 模块导出 - 云存储 URL 检测
export type {
    DetectedCloudProvider,
    StorageUrlDetectOptions,
    StorageUrlInfo,
    StorageUrlType,
} from './utils/storage-url-types.js';
