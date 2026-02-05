/**
 * 正则表达式常量定义
 *
 * @module constants/regex
 * @description
 * 统一管理项目中使用的所有正则表达式常量。
 *
 * @remarks
 * ## 功能概述
 *
 * 提供项目所需的所有正则表达式常量，按功能分类管理。
 * 所有正则表达式都经过预编译和优化，确保性能和一致性。
 *
 * ## 正则表达式分类
 *
 * ### 图片相关 ({@link IMAGE_REGEX})
 * - {@link IMAGE_REGEX.MARKDOWN} - Markdown 内联图片语法
 * - {@link IMAGE_REGEX.HTML_TAG} - HTML img 标签
 * - {@link IMAGE_REGEX.TITLE} - Markdown 标题提取
 * - {@link IMAGE_REGEX.ATTRIBUTES} - HTML 属性提取
 *
 * ### 文件相关 ({@link FILE_REGEX})
 * - {@link FILE_REGEX.MARKDOWN_EXTENSIONS} - Markdown 文件扩展名
 * - {@link FILE_REGEX.IMAGE_EXTENSIONS} - 图片文件扩展名
 *
 * ### URL 相关 ({@link URL_REGEX})
 * - {@link URL_REGEX.WEB} - Web URL 检测
 * - {@link URL_REGEX.ABSOLUTE_PATH} - 绝对路径检测
 *
 * ### 实用工具 ({@link UTIL_REGEX})
 * - 空白字符处理相关正则表达式
 *
 * ## 使用示例
 *
 * ```typescript
 * import { IMAGE_REGEX, getRegex, testRegex } from '@cmtx/core/constants/regex';
 *
 * // 使用预定义的正则表达式
 * const markdownImages = text.match(IMAGE_REGEX.MARKDOWN);
 *
 * // 获取新的正则表达式实例
 * const regexInstance = getRegex(IMAGE_REGEX.HTML_TAG);
 *
 * // 测试字符串匹配
 * const isMatch = testRegex(text, IMAGE_REGEX.MARKDOWN);
 * ```
 *
 * @see {@link getRegex} - 获取正则表达式实例
 * @see {@link testRegex} - 测试字符串匹配
 * @see {@link matchRegex} - 提取匹配内容
 */

/**
 * 图片相关正则表达式
 */
export const IMAGE_REGEX = {
    /**
     * Markdown 内联图片语法
     * 匹配：![alt](url "title")
     */
    MARKDOWN: /!\[([^\]]*)\]\(([^)]+)\)/g,

    /**
     * HTML img 标签（单行）
     * 匹配：<img src="..." alt="..." title="...">
     */
    HTML_TAG: /<img\s+([^>]*)\/?\s*>/gi,

    /**
     * Markdown 标题提取
     * 从 URL 部分提取标题："title" 或 'title'
     */
    TITLE: /["']([^"']*?)["']\s*$/,

    /**
     * HTML 属性提取正则表达式
     */
    ATTRIBUTES: {
        /**
         * src 属性提取
         * 支持：src="value" 或 src='value' 或 src=value
         */
        SRC: /\bsrc\s*=\s*["']?([^"'\s>]+)["']?/,

        /**
         * alt 属性提取
         * 支持：alt="value" 或 alt='value'
         */
        ALT: /\balt\s*=\s*["']([^"']*)["']/,

        /**
         * title 属性提取
         * 支持：title="value" 或 title='value'
         */
        TITLE: /\btitle\s*=\s*["']([^"']*)["']/,
    },
} as const;

/**
 * 文件相关正则表达式
 */
export const FILE_REGEX = {
    /**
     * Markdown 文件扩展名
     */
    MARKDOWN_EXTENSIONS: /\.(?:md|markdown)$/i,

    /**
     * 图片文件扩展名
     */
    IMAGE_EXTENSIONS: /\.(?:jpg|jpeg|png|gif|bmp|svg|webp|ico)$/i,
} as const;

/**
 * URL 相关正则表达式
 */
export const URL_REGEX = {
    /**
     * Web URL 检测
     * 匹配 http:// 或 https:// 开头的 URL
     */
    WEB: /^https?:\/\//i,

    /**
     * 绝对路径检测（Unix/Windows）
     */
    ABSOLUTE_PATH: /^(?:[/\\]|[a-zA-Z]:\\|\w:[/\\])/,

    /**
     * 查询参数分割
     */
    QUERY_PARAMS: /\?.*$/,

    /**
     * Fragment 分割
     */
    FRAGMENT: /#.*$/,
} as const;

/**
 * 实用工具正则表达式
 */
export const UTIL_REGEX = {
    /**
     * 空白字符（包括 Unicode 空白）
     */
    WHITESPACE: /\s+/g,

    /**
     * 行首空白
     */
    LEADING_WHITESPACE: /^\s+/,

    /**
     * 行尾空白
     */
    TRAILING_WHITESPACE: /\s+$/,

    /**
     * 连续空白字符
     */
    MULTIPLE_SPACES: /\s{2,}/g,
} as const;

// 导出所有正则表达式的联合类型
export type RegexConstants = typeof IMAGE_REGEX & typeof FILE_REGEX & typeof URL_REGEX & typeof UTIL_REGEX;

/**
 * 获取预编译的正则表达式实例
 *
 * @param regex - 正则表达式常量
 * @returns 新的 RegExp 实例
 *
 * @example
 * ```typescript
 * const markdownRegex = getRegex(IMAGE_REGEX.MARKDOWN);
 * const matches = text.match(markdownRegex);
 * ```
 */
export function getRegex(regex: RegExp): RegExp {
    return new RegExp(regex.source, regex.flags);
}

/**
 * 检查字符串是否匹配指定正则表达式
 *
 * @param text - 要检查的文本
 * @param regex - 正则表达式
 * @returns 是否匹配
 */
export function testRegex(text: string, regex: RegExp): boolean {
    return regex.test(text);
}

/**
 * 从字符串中提取匹配内容
 *
 * @param text - 源文本
 * @param regex - 正则表达式
 * @returns 匹配结果数组或 null
 */
export function matchRegex(text: string, regex: RegExp): RegExpMatchArray | null {
    return regex.exec(text);
}
