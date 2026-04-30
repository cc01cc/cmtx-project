/**
 * @packageDocumentation
 *
 * @module @cmtx/core
 *
 * CMTX Core - Markdown 图片处理核心库
 *
 * @remarks
 * 提供 Markdown 图片的纯文本处理功能，包括图片筛选和替换。
 *
 * ## 核心功能
 *
 * ### 图片筛选 ({@link module:filter})
 * 从文本中筛选图片，支持多种过滤模式：
 * - **sourceType**: 按图片来源筛选（"web" 或 "local"）
 * - **hostname**: 按 Web 图片的主机名筛选
 * - **absolutePath**: 按本地图片的绝对路径筛选
 * - **regex**: 按正则表达式筛选（用于 src 字段）
 *
 * ### 图片替换 ({@link module:replacer})
 * 使用正则表达式替换图片的 src、alt 和 title 属性：
 * - 支持多字段模式：通过 src 或 raw 识别图片，同时替换多个字段
 * - 支持文本层替换
 *
 * ### 日志 ({@link module:logger})
 * 提供统一的日志记录接口（Logger interface）和 no-op 默认实现（dummyLogger）。
 *
 * ### 监控 ({@link module:monitoring})
 * 提供性能监控和指标收集功能。
 *
 * ## 架构特点
 *
 * 采用**正则统一架构**：
 * - 不依赖 remark/rehype AST 和 magic-string
 * - 使用纯 JavaScript 正则表达式解析和替换
 * - 性能高，依赖少，维护简单
 * - 不提供精确的位置信息（行号、列号、偏移量）
 * - 纯文本处理，不涉及文件操作
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
 *   type Logger,
 *   dummyLogger,
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
 * // 日志记录（应用层注入自己的 logger 实现）
 * const logger: Logger = console; // 或 winston/pino 等
 * logger.info('Processing complete');
 * ```
 *
 * @see {@link module:filter} - 图片筛选功能
 * @see {@link module:replacer} - 图片替换功能
 * @see {@link module:parser} - Markdown 图片解析
 * @see {@link module:types} - 类型定义
 * @see {@link module:utils} - 工具函数
 * @see {@link module:logger} - 日志功能
 * @see {@link module:monitoring} - 监控功能
 */

// ==================== 常量 ====================

/**
 * @category 常量
 */
export { METADATA_REGEX } from "./constants/regex.js";

// ==================== 图片筛选 ====================

/**
 * @category 图片筛选
 */
export { filterImagesInText } from "./filter.js";

// ==================== 图片解析 ====================

/**
 * @category 图片解析
 */
export { parseImages, parseImagesHtmlSingleline, parseImagesMdSingleline } from "./parser.js";

// ==================== 图片替换 ====================

/**
 * @category 图片替换
 */
export { replaceImagesInText, updateImageAttribute } from "./replace.js";

// ==================== 图片格式化 ====================

/**
 * @category 图片格式化
 */
export { formatHtmlImage, formatMarkdownImage } from "./utils.js";

// ==================== 图片尺寸调整 ====================

/**
 * @category 图片尺寸调整
 */
export {
    calculateTargetWidth,
    convertMarkdownImageToHtml,
    convertMarkdownImageToHtmlWithWidth,
    detectCurrentWidth,
    detectImageWidth,
    type ImageElement,
    parseImageElements,
    resizeImageWidth,
    type WidthDirection,
} from "./resize.js";

// ==================== 元数据处理 ====================

/**
 * @category 元数据处理
 */
export {
    convertHeadingToFrontmatter,
    deleteFrontmatterFields,
    extractFrontmatterField,
    extractMetadata,
    extractSectionHeadings,
    extractTitleFromMarkdown,
    type FrontmatterParseResult,
    generateFrontmatterYaml,
    parseFrontmatter,
    parseYamlFrontmatter,
    removeFrontmatter,
    upsertFrontmatterFields,
} from "./metadata.js";

// ==================== 章节编号 ====================

/**
 * @category 章节编号
 */
export { addSectionNumbers, removeSectionNumbers } from "./section-numbers.js";

// ==================== 多正则操作 ====================

/**
 * @category 多正则操作
 */
export { findAllMatches, replaceWithMultipleRegex } from "./multi-regex.js";

// ==================== 工具函数 ====================

/**
 * @category 工具函数
 */
export {
    isLocalAbsolutePath,
    isLocalImage,
    isLocalImageWithAbsPath,
    isLocalImageWithRelativePath,
    isPathInside,
    isValidUrl,
    isWebImage,
    isWebSource,
    normalizePath,
    parseUrlSafe,
    replaceAltVariables,
} from "./utils.js";

// ==================== 日志 ====================

/**
 * @category 日志
 */
export type { Logger } from "./logger.js";

/**
 * @category 日志
 */
export { consoleLogger, dummyLogger } from "./logger.js";

// ==================== 监控 ====================

/**
 * @category 监控
 */
export type {
    ExtensionMetrics,
    LogConfig,
    LogEntry,
    PerformanceMetric,
    PerformanceReport,
    SystemMetrics,
} from "./monitoring.js";

/**
 * @category 监控
 */
export { MetricsCollector, PerformanceMonitor } from "./monitoring.js";

// ==================== 类型定义 ====================

// -------------------- 核心类型 --------------------

/**
 * @category 核心类型
 */
export type { LogLevel, ValidationResult } from "./types.js";

// -------------------- 图片匹配 --------------------

/**
 * @category 图片匹配
 */
export type {
    ImageMatch,
    LocalImageMatch,
    LocalImageMatchWithAbsPath,
    LocalImageMatchWithRelativePath,
    ParsedImage,
    WebImageMatch,
} from "./types.js";

// -------------------- 筛选类型 --------------------

/**
 * @category 筛选类型
 */
export type { ImageFilterMode, ImageFilterOptions, ImageFilterValue } from "./types.js";

// -------------------- 替换类型 --------------------

/**
 * @category 替换类型
 */
export type { ReplacementDetail, ReplaceOptions, ReplaceResult } from "./types.js";

// -------------------- 文件操作类型（供 @cmtx/asset 使用）--------------------

/**
 * @category 文件操作类型
 */
export type {
    DeleteFileOptions,
    DeleteFileResult,
    DeletionStrategy,
    DirectoryReplaceResult,
    FileReplaceResult,
} from "./types.js";

// -------------------- 错误处理 --------------------

/**
 * @category 错误处理
 */
export { CoreError, ErrorCode } from "./types.js";

// -------------------- 多正则类型 --------------------

/**
 * @category 多正则类型
 */
export type {
    FindMatchesResult,
    MatchResult,
    MatchStatistics,
    MultiRegexFindOptions,
    MultiRegexOptions,
    MultiRegexResult,
    MultiRegexRule,
    RuleApplyDetail,
} from "./types.js";

// -------------------- 元数据类型 --------------------

/**
 * @category 元数据类型
 */
export type {
    DocumentMetadata,
    FrontmatterUpdateResult,
    FrontmatterValue,
    HeadingConvertOptions,
    MetadataExtractOptions,
    SectionHeading,
    SectionHeadingExtractOptions,
    UpsertFrontmatterOptions,
} from "./types.js";

// -------------------- 章节编号类型 --------------------

/**
 * @category 章节编号类型
 */
export type { SectionNumbersOptions, SectionNumbersResult } from "./types.js";

// -------------------- 图片格式化 --------------------

/**
 * @category 图片格式化
 */
export type { FormatHtmlImageOptions, FormatMarkdownImageOptions } from "./types.js";
