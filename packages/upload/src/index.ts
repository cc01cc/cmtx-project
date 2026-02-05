/**
 * @cmtx/upload - Markdown 图片上传到对象存储
 *
 * @packageDocumentation
 * @module @cmtx/upload
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
 * ## 架构特点
 *
 * - **模块化设计**：配置构建器模式，链式调用
 * - **适配器模式**：支持多种云存储服务
 * - **模板系统**：灵活的命名和字段模板
 * - **事件驱动**：完整的进度跟踪和回调机制
 * - **智能去重**：单文件和跨文件两级去重
 *
 * ## 快速开始
 *
 * ```typescript
 * import { uploadLocalImageInMarkdown, ConfigBuilder } from "@cmtx/upload";
 * import { AliOSSAdapter } from "@cmtx/upload/adapters/ali-oss";
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
 *     namingPattern: "{date}_{md5_8}{ext}"
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
 * @see {@link IStorageAdapter} - 存储适配器接口
 * @see {@link UploadConfig} - 上传配置类型
 */

// 核心功能
export { uploadLocalImageInMarkdown } from './uploader.js';

// 配置构建器
export { ConfigBuilder } from './types.js';

// 类型定义
export type {
    UploadConfig,
    StorageOptions,
    ReplaceOptions,
    DeleteOptions,
    EventOptions,
    UploadResult,
    UploadEvent,
    FailedItem,
    DeduplicationInfo,
    IStorageAdapter,
} from './types.js';
