/**
 * Core Layer Image Filter Functions
 *
 * @module filter
 * @description
 * 提供文本层图片筛选功能，支持多种过滤模式。
 *
 * @remarks
 * ## 功能概述
 *
 * 提供文本层图片筛选 API，支持多种过滤模式。
 * 可以根据图片的来源、主机名、路径或正则表达式进行精确筛选。
 *
 * ## 核心功能
 *
 * ### 文本层 API
 * - {@link filterImagesInText} - 从纯文本 Markdown 内容筛选图片
 *
 * ### 支持的筛选模式
 * - **sourceType**: 按图片来源筛选 ("web" 或 "local")
 * - **hostname**: 按 Web 图片的主机名筛选（支持子域名匹配）
 * - **absolutePath**: 按本地图片的绝对路径筛选（包含路径匹配）
 * - **regex**: 按正则表达式筛选（用于 src 字段）
 *
 * ## 支持的图片语法
 *
 * - 内联式图片：`![alt](src)`
 * - HTML 图片：`<img src="..." alt="...">`
 *
 * @see {@link ImageFilterOptions} - 筛选选项配置
 * @see {@link ImageMatch} - 筛选结果类型
 * @see {@link parseImages} - 底层解析函数
 */

import { parseImages } from "./parser.js";
import type {
    ImageFilterMode,
    ImageFilterOptions,
    ImageFilterValue,
    ImageMatch,
    ParsedImage,
} from "./types.js";
import type { Logger } from "./logger.js";
import { isWebSource } from "./utils.js";

/**
 * 检查图片来源类型是否匹配
 */
function matchesSourceType(imageSourceType: "web" | "local", filterValue: string): boolean {
    return imageSourceType === filterValue;
}

/**
 * 检查图片主机名是否匹配
 */
function matchesHostname(src: string, hostname: string): boolean {
    try {
        const url = new URL(src);
        return url.hostname === hostname || url.hostname.endsWith(`.${hostname}`);
    } catch {
        return false;
    }
}

/**
 * 检查本地图片路径是否匹配
 */
function matchesAbsolutePath(imagePath: string | undefined, filterPath: string): boolean {
    if (!imagePath) {
        return false;
    }
    return imagePath === filterPath || imagePath.includes(filterPath);
}

/**
 * 检查图片 src 是否匹配正则表达式
 */
function matchesRegex(src: string, pattern: RegExp): boolean {
    if (!(pattern instanceof RegExp)) {
        return false;
    }
    return pattern.test(src);
}

/**
 * 判断图片是否应该被包含
 *
 * @param img - 解析后的图片
 * @param mode - 筛选模式
 * @param value - 筛选值
 * @returns 是否应该包含该图片
 */
function _shouldIncludeImage(
    img: ParsedImage,
    mode: ImageFilterMode | undefined,
    value: ImageFilterValue | undefined,
): boolean {
    // 如果没有指定筛选条件，则包含所有图片
    if (mode === undefined || value === undefined) {
        return true;
    }

    const isWeb = isWebSource(img.src);

    switch (mode) {
        case "sourceType":
            return matchesSourceType(isWeb ? "web" : "local", value as string);
        case "hostname":
            return isWeb && matchesHostname(img.src, value as string);
        case "absolutePath":
            return !isWeb && matchesAbsolutePath(img.src, value as string);
        case "regex":
            return matchesRegex(img.src, value as RegExp);
        default:
            return false;
    }
}

/**
 * 快速内容检查
 *
 * @remarks
 * 在完整解析之前，快速检查文本是否可能包含符合条件的图片。
 * 这可以节省大量不必要的解析时间。
 *
 * @param content - Markdown 文本
 * @param mode - 筛选模式
 * @param value - 筛选值
 * @returns 是否可能包含符合条件的图片
 */
function _quickContentCheck(
    content: string,
    mode: ImageFilterMode | undefined,
    value: ImageFilterValue | undefined,
): boolean {
    if (mode === undefined || value === undefined) {
        return true; // 没有筛选条件，直接进行完整解析
    }

    switch (mode) {
        case "sourceType":
            if (value === "local") {
                // 检查是否包含本地图片语法：![alt](./ 或 ![alt](/ 或 <img src="./ 等
                return (
                    /!\[.*?\]\([./]/.test(content) || /<img[^>]+src\s*=\s*["']?[./]/.test(content)
                );
            } else if (value === "web") {
                // 检查是否包含 Web 图片（http/https）
                return (
                    /!\[.*?\]\(https?:\/\//.test(content) ||
                    /<img[^>]+src\s*=\s*["']?https?:\/\//.test(content)
                );
            }
            return false;
        case "hostname":
            // 检查是否包含指定主机名的 URL
            return content.includes(value as string);
        case "absolutePath":
            // 检查是否包含指定路径
            return content.includes(value as string);
        case "regex":
            // 对于正则，我们无法快速判断，直接进行完整解析
            return true;
        default:
            return true;
    }
}

/**
 * 将解析后的图片转换为 ImageMatch 格式
 */
function _parsedToImageMatches(
    parsedImages: ParsedImage[],
    _fileDir: string | null,
    _source: "text" | "file",
    mode: ImageFilterMode | undefined,
    value: ImageFilterValue | undefined,
): ImageMatch[] {
    return parsedImages
        .filter((img) => _shouldIncludeImage(img, mode, value))
        .map((img) => {
            const isWeb = isWebSource(img.src);
            if (isWeb) {
                return {
                    type: "web" as const,
                    alt: img.alt || "",
                    src: img.src,
                    title: img.title,
                    width: img.width,
                    height: img.height,
                    raw: img.raw,
                    syntax: img.syntax,
                    source: _source,
                } as ImageMatch;
            } else {
                return {
                    type: "local" as const,
                    alt: img.alt || "",
                    src: img.src,
                    title: img.title,
                    width: img.width,
                    height: img.height,
                    raw: img.raw,
                    syntax: img.syntax,
                    source: _source,
                } as ImageMatch;
            }
        });
}

/**
 * 检查文本是否可能包含本地图片
 *
 * @remarks
 * 快速检查函数，用于避免不必要的文件读取和解析。
 * 如果返回 false，则可以跳过该文件的解析。
 *
 * @param content - Markdown 文本
 * @returns 是否可能包含本地图片
 */
function mayContainLocalImages(content: string): boolean {
    return /!\[.*?\]\([./]/.test(content) || /<img[^>]+src\s*=\s*["']?[./]/.test(content);
}

/**
 * 检查文本是否可能包含文件
 *
 * @remarks
 * 快速检查函数，用于避免不必要的文件读取和解析。
 * 如果返回 false，则可以跳过该文件的解析。
 *
 * @param content - Markdown 文本
 * @param filePath - 文件路径（用于判断文件类型）
 * @returns 是否可能包含文件
 */
function _mayContainFile(content: string, filePath: string): boolean {
    const ext = filePath.toLowerCase().split(".").pop();
    if (ext === "md" || ext === "markdown") {
        return true; // Markdown 文件，假设可能包含图片
    }
    // 对于其他文件类型，检查是否包含图片语法
    return mayContainLocalImages(content) || /https?:\/\//.test(content);
}

/**
 * 在文本中筛选图片
 *
 * @param markdown - Markdown 文本
 * @param options - 图片筛选选项（可选）
 * @param logger - 可选的日志回调函数
 * @returns ImageMatch 数组
 *
 * @remarks
 * 支持通过模式值对图片进行筛选：
 * - sourceType: 按图片来源筛选（"web" 或 "local"）
 * - hostname: 按 Web 图片的主机名筛选（支持子域名匹配）
 * - absolutePath: 按本地图片的绝对路径筛选（包含路径匹配）
 * - regex: 按正则表达式筛选（用于 src 字段）
 *
 * @example
 * ```typescript
 * // 获取文本中的所有图片
 * const allImages = filterImagesInText(markdown);
 *
 * // 只获取本地图片
 * const localImages = filterImagesInText(markdown, {
 *   mode: 'sourceType',
 *   value: 'local'
 * });
 *
 * // 获取特定主机的远程图片
 * const remoteImages = filterImagesInText(markdown, {
 *   mode: 'hostname',
 *   value: 'example.com'
 * });
 *
 * // 使用正则表达式筛选
 * const matchedImages = filterImagesInText(markdown, {
 *   mode: 'regex',
 *   value: /\.png$/i
 * });
 * ```
 *
 * @public
 */
export function filterImagesInText(
    markdown: string,
    options?: ImageFilterOptions,
    logger?: Logger,
): ImageMatch[] {
    const { mode, value } = options || { mode: undefined, value: undefined };

    try {
        // 使用快速检查来决定是否需要解析
        if (!_quickContentCheck(markdown, mode, value)) {
            return []; // 快速检查失败，直接返回空数组
        }
        const parsedImages = parseImages(markdown);
        return _parsedToImageMatches(parsedImages, null, "text", mode, value);
    } catch (error) {
        logger?.error("Failed to filter images from text", { error });
        throw error;
    }
}
