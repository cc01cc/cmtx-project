/**
 * @cmtx/asset/upload - Markdown 图片上传到对象存储
 *
 * @packageDocumentation
 * @module @cmtx/asset/upload
 *
 * @description
 * 提供将 Markdown 中引用的本地图片上传到对象存储（如阿里云 OSS）
 * 并自动替换引用为远程 URL 的功能。
 *
 * @remarks
 * ## 核心功能
 *
 * ### 图片上传
 * - 扫描 Markdown 文件中的本地图片引用
 * - 支持多种云存储服务（阿里云 OSS、AWS S3 等）
 * - 智能去重：相同图片只上传一次
 * - 灵活的命名模板系统
 *
 * ### 引用替换
 * - 自动替换 Markdown 中的图片引用
 * - 支持同时替换 src、alt、title 字段
 * - 模板系统支持动态字段渲染
 *
 * ## 模板渲染
 *
 * 图片上传使用 `@cmtx/template/renderTemplate` 进行模板渲染，支持以下选项：
 * - `emptyString: 'preserve'` - 保留空字符串占位符
 * - `postProcess` - 后处理函数（如路径规范化）
 *
 * 如需自定义模板渲染，请直接使用 `@cmtx/template` 包。
 */

export type { EventConfig, ReplaceConfig, StorageConfig, UploadConfig } from "./config.js";
export type { FileInfo, NameTemplateVariables } from "./naming-handler.js";
export {
    generateNameAndRemotePath,
    generateRemoteImageName,
    getFileInfo,
} from "./naming-handler.js";
export { generateMD5 } from "../shared/md5.js";
export { batchUploadImages, renderReplacementText, applyReplacementOps } from "./batch-upload.js";
export type {
    BatchUploadConfig,
    BatchUploadResult,
    BatchUploadResultItem,
    BatchConflictStrategy,
} from "./batch-upload.js";
export { matchesToSources } from "./matches-to-sources.js";
export { uploadAndReplaceFile, uploadAndReplaceBatch } from "./upload-and-replace.js";
export type { ImageRef, UploadReplaceResult } from "./upload-and-replace.js";
export type {
    DocumentAccessor,
    ReplacementOp,
    UploadSource,
    UploadStrategy,
} from "./strategies.js";
export { FileDocumentAccessor, StorageUploadStrategy } from "./strategies.js";
export type {
    ConflictResolutionStrategy,
    DeduplicationInfo,
    DetailedUploadResult,
    FailedItem,
    FailedItemDetail,
    ImageCloudMapBody,
    UploadEvent,
    UploadEventType,
    UploadOptions,
    UploadResult,
} from "./types.js";
export { ConfigBuilder } from "./types.js";
