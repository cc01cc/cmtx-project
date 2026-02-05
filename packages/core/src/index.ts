/**
 * @packageDocumentation
 * 
 * @module @cmtx/core
 * 
 * CMTX Core - Markdown 图片处理核心库
 * 
 * @remarks
 * 提供完整的 Markdown 图片处理功能，包括图片筛选、替换和删除。
 * 
 * ## 核心功能
 * 
 * ### 图片筛选 ({@link module:filter})
 * 从文本、文件和目录中筛选图片，支持多种过滤模式：
 * - **sourceType**: 按图片来源筛选 ("web" 或 "local")
 * - **hostname**: 按 Web 图片的主机名筛选
 * - **absolutePath**: 按本地图片的绝对路径筛选
 * - **regex**: 按正则表达式筛选（用于 src 字段）
 * 
 * ### 图片替换 ({@link module:replacer})
 * 使用正则表达式替换图片的 src、alt 和 title 属性：
 * - 支持多字段模式：通过 src 或 raw 识别图片，同时替换多个字段
 * - 支持文本层和文件层替换
 * - 支持目录批量替换
 * 
 * ### 图片删除 ({@link module:delete})
 * 安全删除图片，支持多种删除策略和重试机制：
 * - **trash**: 使用系统回收站（跨平台，推荐）
 * - **move**: 移动到指定目录
 * - **hard-delete**: 永久删除（谨慎使用）
 * 
 * ## 架构特点
 * 
 * 采用**正则统一架构**：
 * - 不依赖 remark/rehype AST 和 magic-string
 * - 使用纯 JavaScript 正则表达式解析和替换
 * - 性能高，依赖少，维护简单
 * - 不提供精确的位置信息（行号、列号、偏移量）
 * - 默认使用 UTF-8 编码处理文件
 * 
 * ## 支持的图片语法
 * 
 * - 内联图片：`![alt](url "title")`
 * - HTML 图片：`<img src="url" alt="alt" title="title" />`
 * 
 * ## 快速开始
 * 
 * ```typescript
 * import {
 *   filterImagesInText,
 *   replaceImagesInText,
 *   deleteLocalImage
 * } from '@cmtx/core';
 * 
 * // 筛选图片
 * const images = filterImagesInText(markdown, {
 *   mode: 'sourceType',
 *   value: 'local'
 * });
 * 
 * // 替换图片
 * const result = replaceImagesInText(markdown, [
 *   {
 *     field: 'src',
 *     pattern: './old.png',
 *     newSrc: './new.png',
 *     newAlt: 'New Description'
 *   }
 * ]);
 * 
 * // 删除图片
 * const deleteResult = await deleteLocalImage('/path/to/image.png', {
 *   strategy: 'trash',
 *   maxRetries: 3
 * });
 * ```
 * 
 * @see {@link module:filter} - 图片筛选功能
 * @see {@link module:replacer} - 图片替换功能
 * @see {@link module:delete} - 图片删除功能
 * @see {@link module:parser} - Markdown 图片解析
 * @see {@link module:types} - 类型定义
 * @see {@link module:utils} - 工具函数
 */

// ==================== 筛选模块 ====================
export { filterImagesInText, filterImagesFromFile, filterImagesFromDirectory } from './filter.js';

// ==================== 替换模块 ====================
export { replaceImagesInText, replaceImagesInFile, replaceImagesInDirectory } from './replace.js';
export type { ReplaceOptions, ReplaceResult, DirectoryReplaceResult, FileReplaceResult } from './types.js';

// ==================== 删除模块 ====================
export { deleteLocalImage, deleteLocalImageSafely } from './delete.js';

// ==================== 类型定义 ====================
export type {
    LogLevel,
    LoggerCallback,
    ImageMatch,
    WebImageMatch,
    LocalImageMatchRelative,
    LocalImageMatchWithAbsPath,
    LocalImageMatch,
    ImageFilterOptions,
    DeletionStrategy,
    DeleteFileOptions,
    DeleteFileResult,
} from './types.js';

// ==================== 工具函数 ====================
export { isWebImage, isLocalImage, isLocalImageWithAbsPath, isLocalImageRelative } from './utils.js';
