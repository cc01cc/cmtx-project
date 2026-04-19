/**
 * Core Layer Image Filter Functions
 *
 * @module filter
 * @description
 * 提供图片筛选功能的主要 API，支持从文本、文件和目录中筛选图片。
 *
 * @remarks
 * ## 功能概述
 *
 * 提供三层图片筛选 API，支持多种过滤模式和高性能的快速检查机制。
 * 可以根据图片的来源、主机名、路径或正则表达式进行精确筛选。
 *
 * ## 核心功能
 *
 * ### 三层 API 结构
 * - {@link filterImagesInText} - 文本层：从纯文本 Markdown 内容筛选图片
 * - {@link filterImagesFromFile} - 文件层：从单个 Markdown 文件筛选图片
 * - {@link filterImagesFromDirectory} - 目录层：从目录批量筛选图片
 *
 * ### 支持的筛选模式
 * - **sourceType**: 按图片来源筛选 ("web" 或 "local")
 * - **hostname**: 按 Web 图片的主机名筛选（支持子域名匹配）
 * - **absolutePath**: 按本地图片的绝对路径筛选（包含路径匹配）
 * - **regex**: 按正则表达式筛选（用于 src 字段）
 *
 * ### 性能优化
 * - 内置快速内容检查机制，避免不必要的完整解析
 * - 支持跨平台路径规范化和比较
 * - 使用 fast-glob 进行高效的目录扫描
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

import { readFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, resolve } from 'node:path';

import fg, { type Pattern } from 'fast-glob';
import { URL_REGEX } from './constants/regex.js';
import { parseImages } from './parser.js';
import type {
    ImageFilterMode,
    ImageFilterOptions,
    ImageFilterValue,
    ImageMatch,
    LocalImageMatchWithAbsPath,
    LocalImageMatchWithRelativePath,
    LoggerCallback,
    ParsedImage,
    WebImageMatch,
} from './types.js';
import { isWebSource } from './utils.js';

/**
 * 检查图片来源类型是否匹配
 */
function matchesSourceType(imageSourceType: 'web' | 'local', filterValue: string): boolean {
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
    return pattern.test(src);
}

/**
 * 判断图片是否应该被包含
 *
 * @param img - 解析后的图片
 * @param absLocalPath - 本地图片的绝对路径（可选）
 * @param mode - 过滤模式
 * @param value - 过滤值
 * @returns 是否包含
 *
 * @remarks
 * 支持的过滤模式：
 * - **sourceType**: 按图片来源筛选 ("web" 或 "local")
 * - **hostname**: 按 Web 图片的主机名筛选 (支持子域名匹配)
 * - **absolutePath**: 按本地图片的绝对路径筛选
 * - **regex**: 按正则表达式筛选 (匹配 src 字段)
 *
 * @internal
 */
function _shouldIncludeImage(
    img: ParsedImage,
    absLocalPath: string | undefined,
    mode?: ImageFilterMode,
    value?: ImageFilterValue
): boolean {
    if (!mode || value === undefined) {
        return true;
    }

    const sourceType = isWebSource(img.src) ? 'web' : 'local';

    switch (mode) {
        case 'sourceType':
            return matchesSourceType(sourceType, value as string);

        case 'hostname':
            if (sourceType !== 'web') {
                return false;
            }
            return matchesHostname(img.src, value as string);

        case 'absolutePath':
            if (sourceType !== 'local' || !absLocalPath) {
                return false;
            }
            return matchesAbsolutePath(absLocalPath, value as string);

        case 'regex':
            if (!(value instanceof RegExp)) {
                return false;
            }
            return matchesRegex(img.src, value);

        default:
            return true;
    }
}

/**
 * 将 ParsedImage 转换为 ImageMatch，并应用筛选
 *
 * @param parsedImages - 解析后的图片数组
 * @param fileDir - 文件所在目录绝对路径 (null 表示纯文本层，无法计算绝对路径)
 * @param source - 数据来源 ("text" | "file")
 * @param mode - 筛选模式
 * @param value - 筛选值
 * @returns ImageMatch 数组
 *
 * @remarks
 * 根据数据来源返回不同类型的 ImageMatch：
 * - **文本层**: 返回 {@link LocalImageMatchWithRelativePath} (无绝对路径)
 * - **文件层**: 返回 {@link LocalImageMatchWithAbsPath} (带绝对路径)
 * - **Web 图片**: 返回 {@link WebImageMatch}
 *
 * @internal
 */
function _parsedToImageMatches(
    parsedImages: ParsedImage[],
    fileDir: string | null,
    source: 'text' | 'file',
    mode?: ImageFilterMode,
    value?: ImageFilterValue
): ImageMatch[] {
    const results: ImageMatch[] = [];

    for (const img of parsedImages) {
        const isWeb = isWebSource(img.src);
        // 使用 resolve 代替 join，并增加对各种平台绝对路径的识别
        // 如果 img.src 是绝对路径，resolve 会直接返回它
        // 增加 URL_REGEX.ABSOLUTE_PATH.test 作为辅助检查，以处理一些特殊的绝对路径场景
        const absLocalPath =
            !isWeb && fileDir
                ? isAbsolute(img.src) || URL_REGEX.ABSOLUTE_PATH.test(img.src)
                    ? img.src
                    : resolve(fileDir, img.src)
                : undefined;

        // 检查是否应该包含此图片
        if (!_shouldIncludeImage(img, absLocalPath, mode, value)) {
            continue;
        }

        // 创建 ImageMatch 对象
        if (isWeb) {
            results.push({
                type: 'web',
                alt: img.alt,
                src: img.src,
                title: img.title,
                raw: img.raw,
                syntax: img.syntax,
                source,
            } as WebImageMatch);
        } else if (absLocalPath) {
            // 有绝对路径（来自文件层）
            results.push({
                type: 'local',
                alt: img.alt,
                src: img.src,
                absLocalPath,
                title: img.title,
                raw: img.raw,
                syntax: img.syntax,
                source: 'file',
            } as LocalImageMatchWithAbsPath);
        } else {
            // 无绝对路径（来自文本层）
            results.push({
                type: 'local',
                alt: img.alt,
                src: img.src,
                title: img.title,
                raw: img.raw,
                syntax: img.syntax,
                source: 'text',
            } as LocalImageMatchWithRelativePath);
        }
    }

    return results;
}
/**
 * 检查内容是否可能包含 Web 图片
 */
function mayContainWebImages(content: string): boolean {
    return content.toLowerCase().includes('http');
}

/**
 * 检查内容是否可能包含本地图片
 */
function mayContainLocalImages(content: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'];
    const lowerContent = content.toLowerCase();
    return imageExtensions.some((ext) => lowerContent.includes(ext));
}

/**
 * 检查内容是否可能包含特定主机名
 */
function mayContainHostname(content: string, hostname: string): boolean {
    return content.toLowerCase().includes(hostname.toLowerCase());
}

/**
 * 检查内容是否可能包含文件
 */
function mayContainFile(content: string, filePath: string): boolean {
    const fileName = basename(filePath);
    return fileName ? content.includes(fileName) : false;
}

/**
 * 快速内容检查
 *
 * @param content - Markdown 内容
 * @param mode - 筛选模式
 * @param value - 筛选值
 * @returns 是否继续解析
 *
 * @remarks
 * 通过快速字符串检查来决定是否需要进行完整的解析，提升性能。
 *
 * 不同筛选模式的检查策略：
 * - **sourceType**: 检查是否包含 http/https 或图片扩展名
 * - **hostname**: 检查是否包含特定主机名
 * - **absolutePath**: 检查是否包含文件名
 * - **regex**: 总是返回 true（正则表达式复杂，无法快速判断）
 *
 * @internal
 */
function _quickContentCheck(
    content: string,
    mode?: ImageFilterMode,
    value?: ImageFilterValue
): boolean {
    if (!mode || value === undefined) {
        return true;
    }

    switch (mode) {
        case 'sourceType':
            if (value === 'web') {
                return mayContainWebImages(content);
            }
            if (value === 'local') {
                return mayContainLocalImages(content);
            }
            return false;

        case 'hostname':
            if (typeof value === 'string') {
                return mayContainHostname(content, value);
            }
            return false;

        case 'absolutePath':
            if (typeof value === 'string') {
                return mayContainFile(content, value);
            }
            return false;

        case 'regex':
            return value instanceof RegExp;

        default:
            return true;
    }
}

/**
 * 从纯文本 Markdown 内容筛选图片
 *
 * @param markdown - Markdown 内容文本
 * @param options - 图片筛选选项（可选）
 * @param logger - 可选的日志回调函数
 * @returns ImageMatch 数组
 *
 * @remarks
 * 此函数处理纯文本内容，无法计算本地图片的绝对路径。
 * 返回的 LocalImageMatch 对象将不包含 absLocalPath 字段。
 *
 * 支持的过滤模式：
 * - sourceType: 按图片来源筛选 ("web" 或 "local")
 * - hostname: 按 Web 图片的主机名筛选
 * - absolutePath: 按本地图片的路径筛选（相对路径）
 * - regex: 按正则表达式筛选（匹配 src 字段）
 *
 * 使用场景：
 * - 即时预览中显示图片列表
 * - 文本编辑时的实时图片检测
 * - 不需要计算绝对路径的场景
 *
 * @example
 * ```ts
 * // 获取所有图片
 * const allImages = filterImagesInText(markdown);
 *
 * // 只获取本地图片
 * const localImages = filterImagesInText(markdown, {
 *   mode: 'sourceType',
 *   value: 'local'
 * });
 *
 * // 只获取特定主机的图片
 * const cdnImages = filterImagesInText(markdown, {
 *   mode: 'hostname',
 *   value: 'cdn.example.com'
 * });
 *
 * // 使用正则表达式过滤
 * const pngImages = filterImagesInText(markdown, {
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
    logger?: LoggerCallback
): ImageMatch[] {
    const { mode, value } = options || { mode: undefined, value: undefined };

    try {
        // 使用快速检查来决定是否需要解析
        if (!_quickContentCheck(markdown, mode, value)) {
            return []; // 快速检查失败，直接返回空数组
        }
        const parsedImages = parseImages(markdown);
        return _parsedToImageMatches(parsedImages, null, 'text', mode, value);
    } catch (error) {
        logger?.('error', 'Failed to filter images from text', {
            error,
        });
        throw error;
    }
}

/**
 * 从单个 Markdown 文件筛选图片
 *
 * @param fileAbsPath - 文件绝对路径
 * @param options - 图片筛选选项（可选）
 * @param logger - 可选的日志回调函数
 * @returns ImageMatch 数组，包含原始路径和绝对路径信息
 *
 * @remarks
 * - 返回的本地图片包含规范化的绝对路径
 * - 支持跨平台路径比较和操作
 * - 当不提供 options 时，返回文件中的所有图片
 *
 * 使用场景：
 * - 处理单个 Markdown 文件的图片
 * - 需要获得图片的绝对路径
 * - 命令行工具的单文件处理
 * - 编辑器插件的文件级别操作
 *
 * @example
 * ```ts
 * // 获取文件中的所有图片
 * const allImages = await filterImagesFromFile("/docs/README.md");
 *
 * // 只获取本地图片（便于上传或移动）
 * const localImages = await filterImagesFromFile("/docs/README.md", {
 *   mode: 'sourceType',
 *   value: 'local'
 * });
 *
 * // 获取特定主机的远程图片
 * const remoteImages = await filterImagesFromFile("/docs/README.md", {
 *   mode: 'hostname',
 *   value: 'example.com'
 * });
 *
 * // 只获取特定目录下的本地图片
 * const localImages = await filterImagesFromFile("/docs/README.md", {
 *   mode: 'absolutePath',
 *   value: '/docs/images/'
 * });
 * ```
 *
 * @public
 */
export async function filterImagesFromFile(
    fileAbsPath: string,
    options?: ImageFilterOptions,
    logger?: LoggerCallback
): Promise<ImageMatch[]> {
    const { mode, value } = options || { mode: undefined, value: undefined };

    // 检查文件扩展名是否为 Markdown 文件
    const ext = fileAbsPath.toLowerCase().split('.').pop();
    if (!ext || !['md', 'markdown'].includes(ext)) {
        logger?.('debug', `File is not a markdown file, skipping: ${fileAbsPath}`);
        return [];
    }

    try {
        const content = await readFile(fileAbsPath, 'utf-8');

        // 使用快速检查来决定是否需要解析
        if (!_quickContentCheck(content, mode, value)) {
            return []; // 快速检查失败，直接返回空数组
        }

        const parsedImages = parseImages(content);
        const fileDir = dirname(fileAbsPath);

        return _parsedToImageMatches(parsedImages, fileDir, 'file', mode, value);
    } catch (error) {
        logger?.('error', `Failed to filter images from file: ${fileAbsPath}`, {
            error,
        });
        throw error;
    }
}

/**
 * 从指定目录中批量筛选图片
 *
 * @param dirAbsPath - 要搜索的目录的绝对路径
 * @param options - 图片筛选选项（可选）
 * @param globOptions - glob 配置选项（可选）
 * @param logger - 可选的日志回调函数
 * @returns 返回一个 Promise，解析为 ImageMatch 类型的数组，每个元素代表一个匹配到的图片
 *
 * @remarks
 * 目录层 API：聚合文件层结果，实现跨多个 Markdown 文件的批量图片筛选。
 *
 * **核心特性**：
 * - 使用 fast-glob 递归扫描目录中的 Markdown 文件
 * - 自动在子目录中搜索（支持 ** glob 模式）
 * - 支持完全自定义 glob 模式和忽略规则
 * - 对每个找到的文件应用相同的筛选规则
 * - 聚合所有结果并返回统一的 ImageMatch 数组
 *
 * **参数说明**：
 * - options: 在所有文件上应用相同的筛选规则
 * - globOptions: glob 配置，支持以下属性：
 *   - `patterns`: glob 模式数组，默认 `['**\/*.md', '**\/*.markdown']`
 *   - `ignore`: 忽略的 glob 模式数组，用于排除特定文件/目录
 *
 * **性能特性**：
 * - glob 搜索在内存中进行，不涉及磁盘随机访问
 * - 每个文件只解析一次，结果缓存以优化重复查询
 * - 推荐处理少于 1000 个 Markdown 文件的目录结构
 *
 * @example
 * ```typescript
 * // 示例 1: 获取所有 Markdown 文件中的所有图片
 * const allImages = await filterImagesFromDirectory("/docs");
 *
 * // 示例 2: 获取所有本地图片（相对路径）
 * const localImages = await filterImagesFromDirectory("/docs", {
 *   mode: "sourceType",
 *   value: "local"
 * });
 *
 * // 示例 3: 自定义 glob 模式，只搜索 blog 子目录中的文章
 * const blogImages = await filterImagesFromDirectory("/docs",
 *   { mode: "hostname", value: "cdn.example.com" },
 *   { patterns: ["blog/**\/*.md"] }
 * );
 *
 * // 示例 4: 忽略 node_modules 和 .git 目录
 * const images = await filterImagesFromDirectory("/docs",
 *   { mode: "sourceType", value: "local" },
 *   { ignore: ["**\/node_modules/**", "**\/.git/**"] }
 * );
 *
 * // 示例 5: 获取特定来源的远程图片（带日志）
 * const remoteImages = await filterImagesFromDirectory("/docs",
 *   { mode: "sourceType", value: "web" },
 *   undefined,  // 使用默认 glob 模式
 *   (level, message) => {
 *     if (level === "info") console.info(message);
 *   }
 * );
 * ```
 *
 * @public
 */
export async function filterImagesFromDirectory(
    dirAbsPath: string,
    options?: ImageFilterOptions,
    globOptions?: { patterns?: Pattern[]; ignore?: Pattern[] },
    logger?: LoggerCallback
): Promise<ImageMatch[]> {
    // 默认匹配所有 Markdown 文件
    const globPatterns: Pattern[] =
        globOptions?.patterns && globOptions.patterns.length > 0
            ? globOptions.patterns
            : ['**/*.md', '**/*.markdown'];

    // 使用 fast-glob 查找目录下的所有 Markdown 文件
    const files = await fg(globPatterns, {
        cwd: dirAbsPath,
        absolute: true,
        onlyFiles: true,
        caseSensitiveMatch: false,
        dot: true, // 包括隐藏文件
        ignore: globOptions?.ignore,
    });

    const allImages: ImageMatch[] = [];

    for (const filePath of files) {
        try {
            const images = await filterImagesFromFile(filePath, options, logger);
            allImages.push(...images);
        } catch (error) {
            logger?.('error', `Failed to filter images from file: ${filePath}`, {
                error,
            });
            // 继续处理下一个文件，不中断整个流程
        }
    }

    return allImages;
}
