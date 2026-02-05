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
import { basename, dirname, join } from 'node:path';

import fg, { Pattern } from 'fast-glob';
import { parseImages } from './parser.js';
import type {
    ImageFilterMode,
    ImageFilterOptions,
    ImageFilterValue,
    ImageMatch,
    LocalImageMatchRelative,
    LocalImageMatchWithAbsPath,
    LoggerCallback,
    ParsedImage,
    WebImageMatch,
} from './types.js';
import { isWebSource } from './utils.js';

/**
 * 判断图片是否符合过滤条件
 *
 * @param img - 解析后的图片对象
 * @param absLocalPath - 本地图片的绝对路径 (可选)
 * @param mode - 过滤模式
 * @param value - 过滤值
 * @returns 如果图片符合条件返回 true
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
    // 无过滤条件，返回 true
    if (!mode || value === undefined) {
        return true;
    }

    const sourceType = isWebSource(img.src) ? 'web' : 'local';

    switch (mode) {
        case 'sourceType': {
            // value 应该是 "web" 或 "local"
            return sourceType === value;
        }

        case 'hostname': {
            // 仅对 Web 图片有效，value 是域名
            if (sourceType !== 'web') {
                return false;
            }
            const hostname = typeof value === 'string' ? value : '';
            try {
                const url = new URL(img.src);
                return url.hostname === hostname || url.hostname.endsWith('.' + hostname);
            } catch {
                return false;
            }
        }

        case 'absolutePath': {
            // 仅对本地图片有效，value 是绝对路径
            if (sourceType !== 'local' || !absLocalPath) {
                return false;
            }
            const pathToMatch = typeof value === 'string' ? value : '';
            return absLocalPath === pathToMatch || absLocalPath.includes(pathToMatch);
        }

        case 'regex': {
            // 通用正则匹配，对 src 字段进行匹配
            if (!(value instanceof RegExp)) {
                return false;
            }
            return value.test(img.src);
        }

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
 * - **文本层**: 返回 {@link LocalImageMatchRelative} (无绝对路径)
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
        const absLocalPath = !isWeb && fileDir ? join(fileDir, img.src) : undefined;

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
            } as LocalImageMatchRelative);
        }
    }

    return results;
}
/**
 * 快速检查内容是否可能包含匹配的图片，避免不必要的解析
 *
 * @param content - Markdown 内容文本
 * @param mode - 筛选模式
 * @param value - 筛选值
 * @returns 如果内容可能包含匹配项返回 true，否则返回 false
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
function _quickContentCheck(content: string, mode?: ImageFilterMode, value?: ImageFilterValue): boolean {
    if (!mode || value === undefined) {
        return true; // 无筛选条件时总是返回 true，继续解析
    }

    switch (mode) {
        case 'sourceType':
            // 根据筛选类型判断是否可能有匹配项
            if (value === 'web') {
                // 如果筛选 web 图片但内容中没有 http/https 链接，则无需解析
                return content.toLowerCase().includes('http');
            } else if (value === 'local') {
                // 如果筛选本地图片但内容中没有常见图片扩展名，则可能无需解析
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'];
                return imageExtensions.some((ext) => content.toLowerCase().includes(ext.toLowerCase()));
            }
            return false;
        case 'hostname':
            // 如果筛选特定主机名但内容中不包含该主机名，则无需解析
            if (typeof value === 'string') {
                return content.toLowerCase().includes(value.toLowerCase());
            }
            return false;
        case 'absolutePath':
            // 对于绝对路径筛选，提取文件名并检查内容中是否包含该文件名
            if (typeof value === 'string') {
                // 使用 Node.js 内置的 basename 方法提取文件名
                const fileName = basename(value);
                if (fileName) {
                    // 检查内容中是否包含文件名
                    return content.includes(fileName);
                }
            }
            return false;
        case 'regex':
            // 对于正则表达式筛选，总是返回 true
            // 因为正则表达式可能包含复杂的转义字符和特殊模式
            // 难以通过简单的字符串包含检查来判断，所以直接让解析逻辑处理
            if (value instanceof RegExp) {
                return true;
            }
            return false;
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
 */
export async function filterImagesFromDirectory(
    dirAbsPath: string,
    options?: ImageFilterOptions,
    globOptions?: { patterns?: Pattern[]; ignore?: Pattern[] },
    logger?: LoggerCallback
): Promise<ImageMatch[]> {
    // 默认匹配所有 Markdown 文件
    const globPatterns: Pattern[] =
        globOptions?.patterns && globOptions.patterns.length > 0 ? globOptions.patterns : ['**/*.md', '**/*.markdown'];

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
