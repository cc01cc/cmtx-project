/**
 * Core Layer Type Definitions
 *
 * @module types
 * @description
 * 提供核心功能所需的类型定义，包括图片数据、选项、结果等。
 *
 * @remarks
 * 主要类型包括：
 * - 图片数据类型：{@link ParsedImage}, {@link ImageMatch} 及其子类型
 * - 筛选选项和过滤模式：{@link ImageFilterOptions}, {@link ImageFilterMode}
 * - 替换相关类型：{@link ReplaceOptions}, {@link ReplaceResult}, {@link FileReplaceResult}
 * - 删除相关类型：{@link DeleteFileOptions}, {@link DeleteFileResult}, {@link DeletionStrategy}
 * - 日志回调类型：{@link LoggerCallback}
 * - 错误处理：{@link CoreError}, {@link ErrorCode}
 *
 * @example
 * ```typescript
 * import type {
 *   ImageMatch,
 *   ImageFilterOptions,
 *   ReplaceOptions,
 *   DeleteFileOptions,
 *   LoggerCallback
 * } from '@cmtx/core';
 *
 * const filterOptions: ImageFilterOptions = {
 *   mode: 'sourceType',
 *   value: 'local'
 * };
 *
 * const replaceOptions: ReplaceOptions[] = [
 *   { field: 'src', oldValue: './old.png', newValue: './new.png' }
 * ];
 *
 * const deleteOptions: DeleteFileOptions = {
 *   strategy: 'trash',
 *   maxRetries: 3
 * };
 * ```
 */

/**
 * 日志级别
 *
 * @remarks
 * 定义不同级别的日志输出，用于控制日志的详细程度。
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 日志回调函数
 *
 * @param level - 日志级别
 * @param message - 日志消息
 * @param meta - 可选的元数据对象
 *
 * @remarks
 * 提供可选的日志输出机制，不会强制输出到控制台。
 * 应用可以根据需要实现自己的日志处理逻辑。
 *
 * @example
 * ```typescript
 * const logger: LoggerCallback = (level, message, meta) => {
 *   console.log(`[${level.toUpperCase()}] ${message}`, meta);
 * };
 *
 * await extractImagesFromFile("./README.md", { logger });
 * ```
 */
export type LoggerCallback = (level: LogLevel, message: string, meta?: Record<string, unknown>) => void;

/**
 * 图片来源类型
 *
 * @remarks
 * 区分图片的来源，用于不同的处理逻辑。
 * - web: 来自互联网的图片（http/https URL）
 * - local: 本地文件系统中的图片
 */
export type ImageSourceType = 'web' | 'local';

/**
 * 内部使用的解析后的图片数据
 *
 * @remarks
 * 本包采用正则统一架构，不提供位置信息（行号、列号、偏移量）。
 *
 * syntax 字段区分图片来源：
 * - 'md'：标准 Markdown 语法 `![alt](url "title")`
 * - 'html'：HTML `<img>` 标签（单行）
 *
 * @internal
 */
export interface ParsedImage {
    alt?: string;
    src: string;
    title?: string;
    raw: string;
    syntax: 'md' | 'html';
}

/**
 * Web 图片匹配信息
 *
 * @remarks
 * 表示从网络 URL 解析出的图片信息。
 * 包含完整的 URL 地址和其他元数据。
 */
export interface WebImageMatch {
    type: 'web';
    alt: string;
    src: string; // URL
    title?: string;
    raw: string;
    syntax: 'md' | 'html';
    source: 'text' | 'file';
}

/**
 * 本地图片匹配信息（相对路径，无绝对路径）
 *
 * @remarks
 * 用于从纯文本层提取图片时，因为没有文件上下文，无法计算绝对路径。
 */
export interface LocalImageMatchRelative {
    type: 'local';
    alt: string;
    src: string; // 原始 Markdown 中的相对或绝对路径
    title?: string;
    raw: string;
    syntax: 'md' | 'html';
    source: 'text';
}

/**
 * 本地图片匹配信息（带绝对路径）
 *
 * @remarks
 * 用于从文件层提取图片时，包含规范化的绝对路径。
 */
export interface LocalImageMatchWithAbsPath {
    type: 'local';
    alt: string;
    src: string; // 原始 Markdown 中的相对或绝对路径
    absLocalPath: string; // 规范化的本地图片绝对路径
    title?: string;
    raw: string;
    syntax: 'md' | 'html';
    source: 'file';
}

/**
 * 本地图片匹配信息（包括相对和绝对路径两种）
 *
 * @remarks
 * 联合类型，包含两种本地图片的表示形式。
 * - LocalImageMatchRelative: 只有相对路径（来自纯文本层）
 * - LocalImageMatchWithAbsPath: 包含绝对路径（来自文件层）
 */
export type LocalImageMatch = LocalImageMatchRelative | LocalImageMatchWithAbsPath;

/**
 * 匹配到的图片信息
 *
 * @remarks
 * 联合类型，包含 Web 图片和本地图片的所有可能形式。
 * 用于统一处理不同来源的图片。
 */
export type ImageMatch = WebImageMatch | LocalImageMatch;

/**
 * 图片筛选选项
 *
 * @remarks
 * 支持通过模式值对图片进行筛选：
 * - sourceType: 按图片来源筛选（"web" 或 "local"）
 * - hostname: 按 Web 图片的主机名筛选（支持子域名匹配）
 * - absolutePath: 按本地图片的绝对路径筛选（包含路径匹配）
 * - regex: 按正则表达式筛选（用于 src 字段）
 */
export interface ImageFilterOptions {
    mode: ImageFilterMode;
    value: ImageFilterValue;
}
/**
 * @internal
 * 图片筛选模式（内部使用）
 */
export type ImageFilterMode = 'sourceType' | 'hostname' | 'absolutePath' | 'regex';

/**
 * @internal
 * 图片筛选值（内部使用）
 */
export type ImageFilterValue = string | RegExp;

/**
 * 替换操作的参数
 *
 * @remarks
 * 指定如何修改图片的字段。支持多字段替换模式：
 * - field: 'src'|'raw' - 用于识别要修改的图片
 *   - 'src'：通过图片的 src 值匹配
 *   - 'raw'：通过图片的完整原始文本匹配（![alt](src "title")）
 * - pattern：匹配用的值（字符串或正则表达式）
 * - newSrc/newAlt/newTitle：新值，存在则表示要替换或插入
 *   - 如果只提供 newSrc，则只替换 src
 *   - 如果提供多个，则同时替换多个字段
 *   - 对于空字段，提供值则进行插入操作
 *
 * @example
 * ```typescript
 * // 多字段替换 - 通过 src 匹配，同时更新多个字段
 * {
 *   field: 'src',
 *   pattern: './local.png',
 *   newSrc: 'https://cdn.com/img.png',
 *   newAlt: '图片描述',
 *   newTitle: '图片标题'
 * }
 *
 * // 多字段替换 - 通过 raw 精确匹配
 * {
 *   field: 'raw',
 *   pattern: '![](./img.png)',
 *   newSrc: 'https://cdn.com/img.png',
 *   newAlt: '描述'
 * }
 * ```
 */
export interface ReplaceOptions {
    field: 'src' | 'raw';
    pattern: string | RegExp;
    newSrc?: string;
    newAlt?: string;
    newTitle?: string;
}

/**
 * 替换结果
 *
 * @remarks
 * 记录图片替换的结果，包含替换后的文本和所有替换详情。
 */
export interface ReplaceResult {
    /** 替换后的文本 */
    newText: string;
    /** 所有替换的详细记录 */
    replacements: ReplacementDetail[];
}

/**
 * 替换详情
 *
 * @remarks
 * 记录单个替换操作的前后文本
 */
export interface ReplacementDetail {
    before: string;
    after: string;
}

/**
 * 目录替换结果统计
 * 
 * @remarks
 * 用于 replaceImagesInDirectory 函数的返回值类型
 */
export interface DirectoryReplaceResult {
    /** 总共处理的文件数 */
    totalFiles: number;
    /** 成功处理的文件数 */
    successfulFiles: number;
    /** 失败的文件数 */
    failedFiles: number;
    /** 总替换次数 */
    totalReplacements: number;
    /** 详细结果 */
    results: FileReplaceResult[];
}

/**
 * 文件层替换结果
 *
 * @remarks
 * 记录文件层图片替换的结果，包含文件路径、成功状态和替换详情。
 */
export interface FileReplaceResult {
    /** 文件相对路径 */
    relativePath: string;

    /** 文件绝对路径 */
    absolutePath: string;

    /** 是否成功 */
    success: boolean;

    /** 错误信息（如有） */
    error?: string;

    /** 替换结果 */
    result?: ReplaceResult;
}

/**
 * 文件删除策略
 *
 * @remarks
 * 定义文件删除的方式：
 * - "trash": 移动到系统回收站（跨平台，推荐）
 * - "move": 移动到指定目录
 * - "hard-delete": 永久删除（谨慎使用）
 */
export type DeletionStrategy = 'trash' | 'move' | 'hard-delete';

/**
 * 文件删除选项
 *
 * @remarks
 * 配置文件删除的行为
 */
export interface DeleteFileOptions {
    /** 删除策略 */
    strategy: DeletionStrategy;

    /** 当 strategy 为 move 时的目标目录（绝对路径） */
    trashDir?: string;

    /** 最大重试次数，默认 3 */
    maxRetries?: number;

    /** 基础重试延迟（毫秒），默认 100 */
    baseDelayMs?: number;
}

/**
 * 文件删除结果
 *
 * @remarks
 * 记录删除操作的执行结果
 */
export interface DeleteFileResult {
    /** 删除状态 */
    status: 'success' | 'failed' | 'skipped';

    /** 重试次数 */
    retries: number;

    /** 错误信息（失败时） */
    error?: string;

    /** 实际使用的策略（trash 失败时可能降级为 move） */
    actualStrategy?: DeletionStrategy;
}

/**
 * 错误代码枚举
 *
 * @remarks
 * 定义核心包中可能出现的所有错误类型
 * 便于程序化错误处理和国际化
 */
export enum ErrorCode {
    /** 文件不存在 */
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',

    /** 权限被拒绝 */
    PERMISSION_DENIED = 'PERMISSION_DENIED',

    /** 无效的路径 */
    INVALID_PATH = 'INVALID_PATH',

    /** 解析失败 */
    PARSE_FAILED = 'PARSE_FAILED',

    /** 操作超时 */
    TIMEOUT = 'TIMEOUT',

    /** 删除失败 */
    DELETE_FAILED = 'DELETE_FAILED',
}

/**
 * 核心错误类
 *
 * @remarks
 * 提供结构化的错误信息，包含错误码和详细信息
 *
 * @example
 * ```typescript
 * throw new CoreError(
 *   ErrorCode.FILE_NOT_FOUND,
 *   "Image file not found",
 *   { filePath: "/path/to/file.png" }
 * );
 * ```
 */
export class CoreError extends Error {
    /**
     * 构造函数
     *
     * @param code - 错误代码
     * @param message - 错误消息
     * @param details - 错误详情（可选）
     */
    constructor(
        public code: ErrorCode,
        message: string,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'CoreError';

        // 支持 ES5 原型链
        Object.setPrototypeOf(this, CoreError.prototype);
    }
}
