/**
 * Core Layer Utilities
 *
 * @module utils
 * @description
 * 提供 Markdown/HTML 图片格式化函数。
 *
 * @remarks
 * ## 核心功能
 *
 * ### 图片格式化
 * - {@link formatMarkdownImage} - 生成 Markdown 图片语法
 * - {@link formatHtmlImage} - 生成 HTML img 标签
 *
 * ### 内部工具
 * 路径处理、URL 检测、类型判断等工具函数已标记为 @internal，
 * 仅在包内部使用，不推荐外部直接调用。
 *
 * @see {@link ImageMatch} - 图片匹配类型
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
 * @internal
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
 * @internal
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
 * @internal
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
 * @internal
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
