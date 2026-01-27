/**
 * @cmtx/upload - Markdown 图片上传到对象存储
 * 
 * @packageDocumentation
 * 
 * @remarks
 * 提供将 Markdown 中引用的本地图片上传到对象存储（如阿里云 OSS）
 * 并自动替换引用为远程 URL 的功能。
 * 
 * @example
 * 基本使用：
 * ```typescript
 * import { uploadMultiImages } from "@cmtx/upload";
 * import { AliOSSAdapter } from "@cmtx/upload/adapters/ali-oss";
 * import OSS from "ali-oss";
 * 
 * const adapter = new AliOSSAdapter(
 *   new OSS({
 *     region: "oss-cn-hangzhou",
 *     accessKeyId: "your-key",
 *     accessKeySecret: "your-secret",
 *     bucket: "my-bucket"
 *   })
 * );
 * 
 * const results = await uploadMultiImages({
 *   workspace: {
 *     projectRoot: "/path/to/project",
 *     searchDir: "docs",
 *   },
 *   adapter,
 *   naming: { uploadPrefix: "blog/images" },
 *   replace: true, // 启用 Markdown 引用替换
 *   onEvent: (event) => {
 *     console.log(`[${event.type}]`, event.data);
 *   }
 * });
 * 
 * console.log(`Uploaded ${results.length} images`);
 * ```
 */

// 核心功能
export {
  analyzeImages,
  uploadSingleImage,
  uploadMultiImages,
  // 工具函数（供 CLI 使用）
  computeFileHash,
  formatTimestamp,
  generateRenamedFilename,
  applyNamingStrategy,
  resolveNamingTemplate,
} from "./uploader.js";

// 类型定义
export type {
  UploadEventType,
  UploadEvent,
  UploadEventCallback,
  IStorageAdapter,
  ImageFilterOptions,
  CoreUploadConfig,
  WorkspaceOptions,
  HookOptions,
  NamingConfig,
  NamingStrategy,
  NamingOptions,
  DeletionStrategy,
  DeletionOptions,
  AnalyzeOptions,
  UploadSingleImageOptions,
  UploadMultiImagesOptions,
  UploadResult,
  ImageInfo,
  SkippedImageInfo,
  UploadAnalysis,
  NamingTemplateContext,
} from "./types.js";
