/**
 * Core Layer Utilities
 *
 * @module utils
 * @description
 * 提供工具函数，包括路径规范化、类型判断和 Web 链接检测。
 *
 * @remarks
 * ## 功能概述
 *
 * 提供核心包所需的基础工具函数，主要用于路径处理和类型判断。
 * 所有函数都经过优化，支持跨平台兼容性。
 *
 * ## 核心功能
 *
 * ### 路径处理
 * - {@link normalizePath} - 路径规范化（跨平台兼容）
 *
 * ### 类型判断
 * - {@link isWebSource} - 判断是否为 Web 链接
 * - 类型守卫：{@link isWebImage}, {@link isLocalImage}, {@link isLocalImageWithAbsPath} 等
 *
 * ### 跨平台支持
 * - 自动处理 Windows 和 Unix 系统的路径差异
 * - 统一使用正斜杠作为路径分隔符
 * - Windows 系统下自动转换为小写（不区分大小写）
 *
 * @example
 * ```typescript
 * import { normalizePath, isWebSource, isLocalImage } from '@cmtx/core';
 *
 * // 规范化路径
 * const normalized = normalizePath('/path\\to/file.png');
 *
 * // 判断图片来源
 * const isWeb = isWebSource('https://example.com/image.png');
 *
 * // 类型守卫
 * if (isLocalImage(image)) {
 *   console.log(image.absLocalPath);
 * }
 * ```
 *
 * @see {@link ImageMatch} - 图片匹配类型
 * @see {@link LocalImageMatchWithAbsPath} - 带绝对路径的本地图片类型
 */

import { isAbsolute, normalize, relative } from "node:path";

import type { ImageMatch } from "./types.js";

/**
 * 规范化文件路径用于比较（处理跨平台和大小写）
 *
 * @param filePath - 要规范化的文件路径
 * @returns 规范化后的路径（使用正斜杠）
 *
 * @remarks
 * - 统一使用正斜杠 `/` 作为路径分隔符
 * - Windows 系统下转为小写（不区分大小写）
 * - 用于跨平台的路径比较
 *
 * @internal
 */
export function normalizePath(filePath: string): string {
    // 先使用 node:path.normalize 进行路径标准化
    let normalized = normalize(filePath);

    // 然后将所有反斜杠替换为正斜杠（无论在哪个平台上）
    normalized = normalized.split("\\").join("/");

    // Windows 系统下转为小写（不区分大小写）
    if (process.platform === "win32") {
        return normalized.toLowerCase();
    }

    return normalized;
}

/**
 * 判断是否为 Web 链接
 *
 * @param src - 图片源地址
 * @returns 如果是 Web 链接返回 true
 *
 * @remarks
 * 匹配以 `http://`、`https://` 或 `//` 开头的 URL
 * @public
 */
export function isWebSource(src: string): boolean {
    return /^(https?:)?\/\//i.test(src.trim());
}

/**
 * 判断是否为本地绝对路径
 *
 * @param src - 路径字符串
 * @returns 如果是本地绝对路径返回 true
 *
 * @remarks
 * 匹配：
 * - /path/to/img (Unix)
 * - C:\path\to\img (Windows)
 * - \path\to\img (Windows)
 * @public
 */
export function isLocalAbsolutePath(src: string): boolean {
    return /^([/\\]|[a-zA-Z]:[/\\])/.test(src.trim());
}

/**
 * 判断一个路径是否在另一个路径之内
 *
 * @param parent - 父目录绝对路径
 * @param child - 子路径（绝对路径）
 * @returns 如果 child 在 parent 之内（或是 parent 本身）返回 true
 * @public
 */
export function isPathInside(parent: string, child: string): boolean {
    const rel = relative(parent, child);
    return !rel.startsWith("..") && !isAbsolute(rel);
}

// ==================== URL 工具函数 ====================

/**
 * 验证 URL 是否有效
 *
 * @param urlString - 要验证的 URL 字符串
 * @returns 如果是有效 URL 返回 true
 *
 * @example
 * ```typescript
 * import { isValidUrl } from '@cmtx/core';
 *
 * console.log(isValidUrl('https://example.com')); // true
 * console.log(isValidUrl('not-a-url')); // false
 * ```
 * @public
 */
export function isValidUrl(urlString: string): boolean {
    try {
        new URL(urlString);
        return true;
    } catch {
        return false;
    }
}

/**
 * 安全解析 URL
 *
 * @param urlString - 要解析的 URL 字符串
 * @returns 解析后的 URL 对象，如果解析失败返回 null
 *
 * @example
 * ```typescript
 * import { parseUrlSafe } from '@cmtx/core';
 *
 * const url = parseUrlSafe('https://example.com/path');
 * console.log(url?.hostname); // 'example.com'
 * ```
 * @public
 */
export function parseUrlSafe(urlString: string): URL | null {
    try {
        return new URL(urlString);
    } catch {
        return null;
    }
}

/**
 * 格式化 Markdown 图片链接
 *
 * @remarks
 * Markdown 图片语法：`![alt](src "title")`
 *
 * @example
 * ```typescript
 * formatMarkdownImage({ src: 'image.png', alt: '描述' })
 * // => '![描述](image.png)'
 *
 * formatMarkdownImage({ src: 'image.png', alt: '描述', title: '标题' })
 * // => '![描述](image.png "标题")'
 * ```
 * @public
 */
export function formatMarkdownImage(
    options: import("./types.js").FormatMarkdownImageOptions,
): string {
    const { src, alt = "", title } = options;

    if (title) {
        return `![${alt}](${src} "${title}")`;
    }
    return `![${alt}](${src})`;
}

/**
 * 格式化 HTML 图片标签
 *
 * @remarks
 * 参考 MDN 文档：<https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img>
 *
 * @example
 * ```typescript
 * formatHtmlImage({ src: 'image.png', alt: '描述' })
 * // => '<img src="image.png" alt="描述">'
 *
 * formatHtmlImage({
 *     src: 'image.png',
 *     alt: '描述',
 *     attributes: { width: 300, loading: 'lazy' }
 * })
 * // => '<img src="image.png" alt="描述" width="300" loading="lazy">'
 * ```
 * @public
 */
export function formatHtmlImage(options: import("./types.js").FormatHtmlImageOptions): string {
    const { src, alt = "", attributes = {}, extraAttributes = {} } = options;

    const attrs: string[] = [`src="${src}"`];
    if (alt) attrs.push(`alt="${alt.replace(/"/g, "&quot;")}"`);

    // 标准属性
    if (attributes.width) attrs.push(`width="${attributes.width}"`);
    if (attributes.height) attrs.push(`height="${attributes.height}"`);
    if (attributes.loading) attrs.push(`loading="${attributes.loading}"`);
    if (attributes.decoding) attrs.push(`decoding="${attributes.decoding}"`);
    if (attributes.crossorigin) attrs.push(`crossorigin="${attributes.crossorigin}"`);
    if (attributes.referrerpolicy) attrs.push(`referrerpolicy="${attributes.referrerpolicy}"`);

    // 额外属性
    for (const [key, value] of Object.entries(extraAttributes)) {
        attrs.push(`${key}="${value.replace(/"/g, "&quot;")}"`);
    }

    return `<img ${attrs.join(" ")}>`;
}

/**
 * 替换 alt 模板变量
 *
 * @param template - 模板字符串
 * @param filename - 可选的文件名
 * @returns 替换后的字符串
 *
 * @remarks
 * 支持的变量：
 * - `{timestamp}` - 时间戳（毫秒）
 * - `{date}` - 日期（YYYYMMDD）
 * - `{time}` - 时间（HHmmss）
 * - `{datetime}` - 日期时间（YYYYMMDDHHmmss）
 * - `{year}`, `{month}`, `{day}`, `{hour}`, `{minute}`, `{second}` - 单独的时间组件
 * - `{filename}` - 文件名
 *
 * @example
 * ```typescript
 * import { replaceAltVariables } from '@cmtx/core';
 *
 * const alt = replaceAltVariables('{filename} - {date}', 'my-image.png');
 * console.log(alt); // 'my-image.png - 20240101'
 * ```
 * @public
 */
export function replaceAltVariables(template: string, filename?: string): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hour = now.getHours().toString().padStart(2, "0");
    const minute = now.getMinutes().toString().padStart(2, "0");
    const second = now.getSeconds().toString().padStart(2, "0");

    return template
        .replace(/\{timestamp\}/g, Date.now().toString())
        .replace(/\{date\}/g, `${year}${month}${day}`)
        .replace(/\{time\}/g, `${hour}${minute}${second}`)
        .replace(/\{datetime\}/g, `${year}${month}${day}${hour}${minute}${second}`)
        .replace(/\{year\}/g, year)
        .replace(/\{month\}/g, month)
        .replace(/\{day\}/g, day)
        .replace(/\{hour\}/g, hour)
        .replace(/\{minute\}/g, minute)
        .replace(/\{second\}/g, second)
        .replace(/\{filename\}/g, filename || "image");
}
