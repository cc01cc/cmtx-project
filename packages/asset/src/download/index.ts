/**
 * Download 模块
 *
 * @module @cmtx/asset/download
 * @description
 * 提供从云端下载图片到本地的功能。
 *
 * @remarks
 * ## 主要功能
 * - 从 Markdown 文件提取并下载远程图片
 * - 支持命名模板自定义文件名
 * - 支持域名过滤
 * - 支持并发控制
 * - 支持进度回调
 *
 * ## 命名模板变量
 *
 * ### 基础变量（与 Upload 共享）
 * - `{name}` - 文件名（不含扩展名）
 * - `{ext}` - 文件扩展名
 * - `{date}` - 日期（YYYY-MM-DD）
 * - `{timestamp}` - 时间戳
 * - `{md5}` - 完整 MD5 哈希
 * - `{md5_8}` - MD5 前 8 位
 * - `{md5_16}` - MD5 前 16 位
 *
 * ### Download 独有变量
 * - `{sequence}` - 序号（自动递增）
 *
 * ## 使用示例
 * ```typescript
 * import { createDownloadService } from '@cmtx/asset/download';
 *
 * const service = createDownloadService({
 *   options: {
 *     outputDir: './images/',
 *     namingTemplate: '{date}/{name}{ext}',
 *     concurrency: 5,
 *   }
 * });
 *
 * const result = await service.downloadFromMarkdown('./article.md');
 * console.log(`Downloaded ${result.success} images`);
 * ```
 */

export * from "./download-service.js";
export {
    DEFAULT_NAMING_TEMPLATE,
    generateNamingVariables,
    generateUniqueFileName,
    parseUrlForNaming,
} from "./naming-handler.js";
export * from "./types.js";
export * from "./url-matcher.js";
