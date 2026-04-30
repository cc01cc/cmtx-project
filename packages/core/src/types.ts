/**
 * @remarks
 * 主要类型包括：
 * - 图片数据类型：{@link ParsedImage}, {@link ImageMatch} 及其子类型
 * - 筛选选项和过滤模式：{@link ImageFilterOptions}, {@link ImageFilterMode}
 * - 替换相关类型：{@link ReplaceOptions}, {@link ReplaceResult}, {@link FileReplaceResult}
 * - 删除相关类型：{@link DeleteFileOptions}, {@link DeleteFileResult}, {@link DeletionStrategy}
 * - 错误处理：{@link CoreError}, {@link ErrorCode}
 *
 * @example
 * ```typescript
 * import type {
 *   ImageMatch,
 *   ImageFilterOptions,
 *   ReplaceOptions,
 *   DeleteFileOptions,
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
 * @public
 * @category 核心类型
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * 验证结果
 *
 * @remarks
 * 通用的验证结果类型，用于表示验证操作的结果。
 * 适用于模板验证、配置验证等各种验证场景。
 *
 * @public
 * @category 核心类型
 */
export interface ValidationResult {
    /** 验证是否通过 */
    isValid: boolean;
    /** 错误信息列表 */
    errors: string[];
}

/**
 * 图片来源类型
 *
 * @remarks
 * 区分图片的来源，用于不同的处理逻辑。
 * - web: 来自互联网的图片（http/https URL）
 * - local: 本地文件系统中的图片
 * @public
 * @category 核心类型
 */
export type ImageSourceType = "web" | "local";

/**
 * 解析后的图片数据
 *
 * @remarks
 * 本包采用正则统一架构，不提供位置信息（行号、列号、偏移量）。
 *
 * syntax 字段区分图片来源：
 * - 'md'：标准 Markdown 语法 `![alt](url "title")`
 * - 'html'：HTML `<img>` 标签（单行）
 * @public
 * @category 图片匹配
 */
export interface ParsedImage {
    alt?: string;
    src: string;
    title?: string;
    width?: string;
    height?: string;
    raw: string;
    syntax: "md" | "html";
}

/**
 * Web 图片匹配信息
 *
 * @remarks
 * 表示从网络 URL 解析出的图片信息。
 * 包含完整的 URL 地址和其他元数据。
 * @public
 * @category 图片匹配
 */
export interface WebImageMatch {
    type: "web";
    alt: string;
    src: string; // URL
    title?: string;
    width?: string;
    height?: string;
    raw: string;
    syntax: "md" | "html";
    source: "text" | "file";
}

/**
 * 本地图片匹配信息（带相对路径，无绝对路径）
 *
 * @remarks
 * 用于从纯文本层提取图片时，因为没有文件上下文，无法计算绝对路径。
 * @public
 * @category 图片匹配
 */
export interface LocalImageMatchWithRelativePath {
    type: "local";
    alt: string;
    src: string; // 原始 Markdown 中的相对或绝对路径
    title?: string;
    width?: string;
    height?: string;
    raw: string;
    syntax: "md" | "html";
    source: "text";
}

/**
 * 本地图片匹配信息（带绝对路径）
 *
 * @remarks
 * 用于从文件层提取图片时，包含规范化的绝对路径。
 * @public
 * @category 图片匹配
 */
export interface LocalImageMatchWithAbsPath {
    type: "local";
    alt: string;
    src: string; // 原始 Markdown 中的相对或绝对路径
    absLocalPath: string; // 规范化的本地图片绝对路径
    title?: string;
    width?: string;
    height?: string;
    raw: string;
    syntax: "md" | "html";
    source: "file";
}

/**
 * 本地图片匹配信息（包括相对和绝对路径两种）
 *
 * @remarks
 * 联合类型，包含两种本地图片的表示形式。
 * - LocalImageMatchWithRelativePath: 只有相对路径（来自纯文本层）
 * - LocalImageMatchWithAbsPath: 包含绝对路径（来自文件层）
 * @public
 * @category 图片匹配
 */
export type LocalImageMatch = LocalImageMatchWithRelativePath | LocalImageMatchWithAbsPath;

/**
 * 匹配到的图片信息
 *
 * @remarks
 * 联合类型，包含 Web 图片和本地图片的所有可能形式。
 * 用于统一处理不同来源的图片。
 * @public
 * @category 图片匹配
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
 * @public
 * @category 筛选类型
 */
export interface ImageFilterOptions {
    mode: ImageFilterMode;
    value: ImageFilterValue;
}
/**
 * 图片筛选模式
 *
 * @remarks
 * 支持通过模式值对图片进行筛选：
 * - sourceType: 按图片来源筛选（"web" 或 "local"）
 * - hostname: 按 Web 图片的主机名筛选（支持子域名匹配）
 * - absolutePath: 按本地图片的绝对路径筛选（包含路径匹配）
 * - regex: 按正则表达式筛选（用于 src 字段）
 * @public
 * @category 筛选类型
 */
export type ImageFilterMode = "sourceType" | "hostname" | "absolutePath" | "regex";

/**
 * 图片筛选值
 *
 * @remarks
 * 筛选值可以是字符串或正则表达式。
 * @public
 * @category 筛选类型
 */
export type ImageFilterValue = string | RegExp;

/**
 * 替换操作的参数
 *
 * @remarks
 * 指定如何修改图片的字段。支持多字段替换模式：
 * - field: 'src'|'raw' - 用于识别要修改的图片
 *   - 'src'：通过图片的 src 值匹配
 *   - 'raw'：通过图片的完整原始文本匹配
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
 * @public
 * @category 替换类型
 */
export interface ReplaceOptions {
    field: "src" | "raw";
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
 * @public
 * @category 替换类型
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
 * @public
 * @category 替换类型
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
 * @public
 * @category 替换类型
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
 * @public
 * @category 替换类型
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
 * @public
 * @category 删除类型
 */
export type DeletionStrategy = "trash" | "move" | "hard-delete";

/**
 * 文件删除选项
 *
 * @remarks
 * 配置文件删除的行为
 * @public
 * @category 删除类型
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
 * @public
 * @category 删除类型
 */
export interface DeleteFileResult {
    /** 删除状态 */
    status: "success" | "failed" | "skipped";

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
 * @public
 * @category 错误处理
 */
export enum ErrorCode {
    /** 文件不存在 */
    FILE_NOT_FOUND = "FILE_NOT_FOUND",

    /** 权限被拒绝 */
    PERMISSION_DENIED = "PERMISSION_DENIED",

    /** 无效的路径 */
    INVALID_PATH = "INVALID_PATH",

    /** 解析失败 */
    PARSE_FAILED = "PARSE_FAILED",

    /** 操作超时 */
    TIMEOUT = "TIMEOUT",

    /** 删除失败 */
    DELETE_FAILED = "DELETE_FAILED",
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
 * @public
 * @category 错误处理
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
        public details?: Record<string, unknown>,
    ) {
        super(message);
        this.name = "CoreError";

        // 支持 ES5 原型链
        Object.setPrototypeOf(this, CoreError.prototype);
    }
}

// ==================== 多组正则表达式相关类型 ====================

/**
 * 基础正则表达式规则
 *
 * @remarks
 * 定义基本的正则表达式规则，包含匹配模式和标识符。
 * 作为替换规则和查询规则的共同基类。
 * @public
 * @category 多正则类型
 */
export interface BaseRegexRule {
    /** 正则表达式模式 */
    pattern: string | RegExp;
    /** 规则标识符（可选，用于调试）*/
    id?: string;
    /** 执行顺序（可选，数值越小优先级越高，默认按数组顺序执行）*/
    order?: number;
}

/**
 * 多组正则表达式替换规则
 *
 * @remarks
 * 定义单个正则表达式替换规则，包含匹配模式、替换字符串和可选的执行顺序。
 * 支持字符串和 RegExp 对象作为模式，替换字符串支持捕获组引用（$1, $2 等）。
 *
 * @example
 * ```typescript
 * // 基本用法
 * { pattern: /old/g, replacement: 'new' }
 *
 * // 带 ID 的规则（便于调试）
 * { id: 'title-update', pattern: /^# .*$/m, replacement: '# New Title' }
 *
 * // 使用捕获组
 * { pattern: /(\w+) (\w+)/g, replacement: '$2, $1' }
 *
 * // 带执行顺序的规则
 * { pattern: /first/g, replacement: 'second', order: 1 }
 * { pattern: /second/g, replacement: 'third', order: 2 }
 * ```
 * @public
 * @category 多正则类型
 */
export interface MultiRegexRule extends BaseRegexRule {
    /** 替换字符串（支持捕获组引用 $1, $2 等）*/
    replacement: string;
}

// MultiRegexFindRule 类型别名，用于查询功能
/**
 * 多组正则表达式查询规则
 * @public
 * @category 多正则类型
 */
export type MultiRegexFindRule = BaseRegexRule;

/**
 * 多组正则表达式替换选项
 *
 * @remarks
 * 配置多组正则表达式替换的行为，目前只包含规则数组。
 * 后续可根据需要扩展更多选项。
 * @public
 * @category 多正则类型
 */
export interface MultiRegexOptions {
    /** 替换规则数组 */
    rules: MultiRegexRule[];
}

/**
 * 多组正则表达式查询选项
 *
 * @remarks
 * 配置多组正则表达式查询的行为。
 * @public
 * @category 多正则类型
 */
export interface MultiRegexFindOptions {
    /** 查询规则数组 */
    rules: MultiRegexFindRule[];
}

/**
 * 多组正则表达式替换结果
 *
 * @remarks
 * 记录多组正则表达式替换的执行结果，包含最终文本和统计信息。
 * @public
 * @category 多正则类型
 */
export interface MultiRegexResult {
    /** 替换后的文本 */
    newText: string;
    /** 总替换次数 */
    totalReplacements: number;
    /** 每个规则的应用详情 */
    ruleDetails: RuleApplyDetail[];
}

/**
 * 规则应用详情
 *
 * @remarks
 * 记录单个规则的执行情况，包括规则 ID 和应用次数。
 * @public
 * @category 多正则类型
 */
export interface RuleApplyDetail {
    /** 规则 ID */
    ruleId: string;
    /** 应用次数 */
    appliedCount: number;
}

/**
 * 单个匹配结果
 *
 * @remarks
 * 记录正则表达式匹配的详细信息，包括位置、内容和捕获组。
 *
 * @example
 * ```typescript
 * // 匹配 'Hello World!' with pattern /Hello (\w+)!/
 * const match: MatchResult = {
 *   matchedText: 'Hello World!',
 *   index: 0,
 *   endIndex: 12,
 *   groups: ['Hello World!', 'World'],
 *   ruleId: 'greeting',
 *   ruleOrder: 0
 * };
 * ```
 * @public
 * @category 多正则类型
 */
export interface MatchResult {
    /** 匹配的完整文本 */
    matchedText: string;
    /** 匹配在原文本中的起始位置 */
    index: number;
    /** 匹配在原文本中的结束位置 */
    endIndex: number;
    /** 捕获组数组（索引 0 是完整匹配，后续是各个捕获组）*/
    groups: string[];
    /** 对应规则的 ID */
    ruleId: string;
    /** 规则在执行顺序中的位置 */
    ruleOrder: number;
}

/**
 * 查询匹配结果统计信息
 *
 * @remarks
 * 按规则分组的匹配统计信息。
 * @public
 * @category 多正则类型
 */
export interface MatchStatistics {
    /** 该规则匹配的次数 */
    count: number;
    /** 该规则的一些匹配样本（最多 5 个）*/
    sampleMatches: string[];
    /** 该规则的执行顺序 */
    order: number;
}

/**
 * 查询匹配结果
 *
 * @remarks
 * 包含所有匹配项和按规则分组的统计信息。
 * 用于 findAllMatches 函数的返回值。
 * @public
 * @category 多正则类型
 */
export interface FindMatchesResult {
    /** 所有匹配结果，按在文本中出现的顺序排列 */
    matches: MatchResult[];
    /** 按规则分组的统计信息 */
    statistics: Record<string, MatchStatistics>;
    /** 原始文本 */
    originalText: string;
}

// ==================== 元数据相关类型 ====================

/**
 * Frontmatter 值类型
 * @public
 * @category 元数据类型
 */
export type FrontmatterValue = string | string[] | null;

/**
 * 文档元数据
 *
 * @remarks
 * `extractMetadata` 函数保证返回的 `title` 字段必定存在：
 * 1. 优先从 Frontmatter YAML 提取
 * 2. 其次从 Markdown Heading 提取
 * 3. 最后使用文件名（不含扩展名）作为备选
 *
 * @public
 * @category 元数据类型
 */
export interface DocumentMetadata {
    /**
     * 文档标题
     *
     * @remarks
     * 必定存在，来源优先级：Frontmatter YAML > Markdown Heading > 文件名
     */
    title: string;
    /** 其他元数据字段 */
    [key: string]: FrontmatterValue | undefined;
}

/**
 * 元数据提取选项
 * @public
 * @category 元数据类型
 */
export interface MetadataExtractOptions {
    /** 用于提取标题的标题等级，默认 1 */
    headingLevel?: number;
}

/**
 * 章节标题
 * @public
 * @category 元数据类型
 */
export interface SectionHeading {
    /** 标题等级 (1-6) */
    level: number;
    /** 标题文本 */
    text: string;
}

/**
 * 章节标题提取选项
 * @public
 * @category 元数据类型
 */
export interface SectionHeadingExtractOptions {
    /** 最小标题等级，默认 2 */
    minLevel?: number;
    /** 最大标题等级，默认 6 */
    maxLevel?: number;
}

/**
 * 标题转换选项
 * @public
 * @category 元数据类型
 */
export interface HeadingConvertOptions {
    /** Frontmatter 格式，默认 'yaml' */
    format?: "yaml";
    /** 用于提取标题的标题等级，默认 1 */
    headingLevel?: number;
}

/**
 * Frontmatter 更新选项
 * @public
 * @category 元数据类型
 */
export interface UpsertFrontmatterOptions {
    /** Frontmatter 格式，默认 'yaml' */
    format?: "yaml";
    /** 如果不存在 Frontmatter 是否创建，默认 true */
    createIfMissing?: boolean;
}

/**
 * Frontmatter 更新结果
 * @public
 * @category 元数据类型
 */
export interface FrontmatterUpdateResult {
    /** 操作是否成功 */
    success: boolean;
    /** 更新的字段 */
    updated: string[];
    /** 新增的字段 */
    added: string[];
    /** 未变化的字段 */
    unchanged: string[];
    /** 更新后的 Markdown 内容 */
    markdown: string;
}

// ==================== 章节编号类型 ====================

/**
 * 章节编号选项
 * @public
 * @category 章节编号类型
 */
export interface SectionNumbersOptions {
    /** 最小标题等级，默认 1 */
    minLevel?: number;
    /** 最大标题等级，默认 6 */
    maxLevel?: number;
    /** 起始层级，默认 1 */
    startLevel?: number;
    /** 分隔符，默认 '.' */
    separator?: string;
}

/**
 * 章节编号结果
 * @public
 * @category 章节编号类型
 */
export interface SectionNumbersResult {
    /** 处理后的 Markdown 内容 */
    content: string;
    /** 是否被修改 */
    modified: boolean;
    /** 处理的标题数量 */
    headingsCount: number;
}

// ==================== 图片格式化类型 ====================

/**
 * Markdown 图片格式选项
 * @public
 * @category 图片格式化
 */
export interface FormatMarkdownImageOptions {
    /** 图片 URL */
    src: string;
    /** 替代文本 */
    alt?: string;
    /** 标题（显示在悬停时） */
    title?: string;
}

/**
 * HTML img 元素标准属性
 *
 * @remarks
 * 参考 MDN 文档：<https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img>
 *
 * 支持的属性：
 * - `width` / `height`: 图片尺寸
 * - `loading`: 加载方式 ('eager' | 'lazy')
 * - `decoding`: 解码方式 ('sync' | 'async' | 'auto')
 * - `crossorigin`: CORS 设置 ('anonymous' | 'use-credentials')
 * - `referrerpolicy`: 引用策略
 *
 * 注意：`title` 是全局属性，如需使用请通过 `extraAttributes` 传入
 *
 * @public
 * @category 图片格式化
 */
export interface HtmlImageAttributes {
    /** 图片宽度 */
    width?: string | number;
    /** 图片高度 */
    height?: string | number;
    /** 加载方式 */
    loading?: "eager" | "lazy";
    /** 解码方式 */
    decoding?: "sync" | "async" | "auto";
    /** CORS 设置 */
    crossorigin?: "anonymous" | "use-credentials";
    /** 引用策略 */
    referrerpolicy?: string;
}

/**
 * HTML 图片格式选项
 *
 * @remarks
 * 参考 MDN 文档：<https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img>
 *
 * @public
 * @category 图片格式化
 */
export interface FormatHtmlImageOptions {
    /** 图片 URL */
    src: string;
    /** 替代文本 */
    alt?: string;
    /** 标准 HTML img 属性
     *
     * @see {@link HtmlImageAttributes}
     */
    attributes?: HtmlImageAttributes;
    /** 额外属性（class, id, style, data-* 等）
     *
     * @remarks
     * 用于传入任意 HTML 属性，如：
     * - `class`, `id`: 样式和标识
     * - `style`: 内联样式
     * - `title`: 全局属性（tooltip）
     * - `data-*`: 自定义数据属性
     */
    extraAttributes?: Record<string, string>;
}
