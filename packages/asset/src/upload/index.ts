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
 *   .storages({
 *     default: {
 *       adapter,
 *       namingTemplate: "{date}_{md5_8}{ext}"
 *     }
 *   })
 *   .useStorage('default')
 *   .prefix("blog/images/")
 *   .replace({
 *     fields: {
 *       src: "{cloudSrc}?x-oss-process=image/resize,w_640",
 *       alt: "{originalAlt} - 来自我的博客"
 *     }
 *   })
 *   .delete({
 *     strategy: "trash",
 *     trashDir: "/path/to/trash"
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
 * @see {@link @cmtx/storage} - 存储适配器（独立包）
 *
 * @remarks
 * ## 模板渲染
 *
 * 图片上传使用 `@cmtx/template/renderTemplate` 进行模板渲染，支持以下选项：
 * - `emptyString: 'preserve'` - 保留空字符串占位符
 * - `postProcess` - 后处理函数（如路径规范化）
 *
 * 如需自定义模板渲染，请直接使用 `@cmtx/template` 包。
 */

// 类型定义（统一从 config.js 和 types.js 导出）
export type {
    DeleteConfig,
    EventConfig,
    ReplaceConfig,
    StorageConfig,
    UploadConfig,
} from "./config.js";
// 配置类型（从 config.ts 导出）
export type { FileInfo, NameTemplateVariables } from "./naming-handler.js";
// 命名处理函数
export {
    generateNameAndRemotePath,
    generateRemoteImageName,
    getFileInfo,
} from "./naming-handler.js";
// 重新导出 generateMD5（从 shared 模块）
export { generateMD5 } from "../shared/md5.js";
export type { UploadPipelineInput, UploadPipelineSelection } from "./pipeline.js";
export { executeUploadPipeline } from "./pipeline.js";
export type {
    DeleteStrategy,
    DocumentAccessor,
    ReplacementOp,
    UploadSource,
    UploadStrategy,
} from "./strategies.js";
export { FileDocumentAccessor, SafeDeleteStrategy, StorageUploadStrategy } from "./strategies.js";
export type {
    ConflictResolutionStrategy,
    DeduplicationInfo,
    DeleteOptions,
    DetailedUploadResult,
    FailedItem,
    FailedItemDetail,
    ImageCloudMapBody,
    UploadEvent,
    UploadEventType,
    UploadOptions,
    UploadResult,
} from "./types.js";
// 配置构建器
export { ConfigBuilder } from "./types.js";
// 核心功能
export { uploadLocalImageInMarkdown } from "./uploader.js";
