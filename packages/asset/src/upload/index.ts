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
 * ### 安全删除
 * - 上传成功后可选择删除本地图片
 * - 支持 trash/move/hard-delete 三种策略
 * - 集成 @cmtx/core 的安全删除功能
 *
 * ## 快速开始
 *
 * ```typescript
 * import { uploadLocalImageInMarkdown, ConfigBuilder } from "@cmtx/asset/upload";
 * import { AliOSSAdapter } from "@cmtx/storage/adapters/ali-oss";
 * import OSS from "ali-oss";
 *
 * // 1. 配置云存储适配器
 * const adapter = new AliOSSAdapter(
 *   new OSS({
 *     region: "oss-cn-hangzhou",
 *     accessKeyId: "your-key",
 *     accessKeySecret: "your-secret",
 *     bucket: "my-bucket"
 *   })
 * );
 *
 * // 2. 构建上传配置
 * const config = new ConfigBuilder()
 *   .storage(adapter, {
 *     prefix: "blog/images/",
 *     namingTemplate: "{date}_{md5_8}{ext}"
 *   })
 *   .replace({
 *     fields: {
 *       src: "{cloudSrc}?x-oss-process=image/resize,w_640",
 *       alt: "{originalAlt} - 来自我的博客"
 *     }
 *   })
 *   .delete({
 *     strategy: "trash",
 *     rootPath: "/path/to/docs"
 *   })
 *   .build();
 *
 * // 3. 执行上传
 * const result = await uploadLocalImageInMarkdown("/path/to/article.md", config);
 *
 * console.log(`Uploaded ${result.uploaded} images`);
 * console.log(`Replaced ${result.replaced} references`);
 * console.log(`Deleted ${result.deleted} local images`);
 * ```
 *
 * @see {@link uploadLocalImageInMarkdown} - 主要上传函数
 * @see {@link ConfigBuilder} - 配置构建器
 * @see {@link renderTemplateImage} - 图片上传专用的模板渲染函数
 * @see {@link @cmtx/storage} - 存储适配器（独立包）
 */

// 配置类型（从 config.ts 导出）
export type { UploadConfig } from './config.js';
export type {
    FileInfo,
    NameTemplateVariables,
} from './naming-handler.js';
// 命名处理函数
export {
    generateMD5,
    generateNameAndRemotePath,
    generateRemoteImageName,
    getFileInfo,
} from './naming-handler.js';
export type {
    UploadPipelineInput,
    UploadPipelineSelection,
} from './pipeline.js';
export { executeUploadPipeline } from './pipeline.js';
export type {
    DeleteStrategy,
    DocumentAccessor,
    ReplacementOp,
    UploadSource,
    UploadStrategy,
} from './strategies.js';
export {
    FileDocumentAccessor,
    SafeDeleteStrategy,
    StorageUploadStrategy,
} from './strategies.js';
// 模板渲染
export { renderTemplateImage } from './template-renderer.js';
// 类型定义（统一从 config.ts 导出）
export type {
    DeduplicationInfo,
    DeleteOptions,
    EventOptions,
    FailedItem,
    ImageCloudMapBody,
    ReplaceOptions,
    StorageOptions,
    UploadEvent,
    UploadEventType,
    UploadOptions,
    UploadResult,
} from './types.js';
// 配置构建器
export { ConfigBuilder } from './types.js';
// 核心功能
export { uploadLocalImageInMarkdown } from './uploader.js';
