/**
 * 图片替换功能
 *
 * @module replacer
 * @description
 * 提供三层替换 API，支持在文本、文件和目录中替换图片。
 *
 * @remarks
 * ## 功能概述
 *
 * 提供强大的图片替换功能，支持多字段模式和目录批量操作。
 * 可以通过 src 或 raw 精确识别图片，同时替换多个字段属性。
 *
 * ## 核心功能
 *
 * ### 三层 API 结构
 * - {@link replaceImagesInText} - 文本层：替换纯文本 Markdown 内容中的图片
 * - {@link replaceImagesInFile} - 文件层：替换单个文件中的图片
 * - {@link replaceImagesInDirectory} - 目录层：批量替换目录中的图片
 *
 * ### 替换模式
 * - **多字段模式**：通过 src 或 raw 识别图片，同时替换 src、alt、title
 * - **正则表达式支持**：pattern 支持字符串和正则表达式
 * - **精确匹配**：通过 raw 字段实现精确的图片识别
 *
 * ### 性能特性
 * - 内置文件验证机制，避免处理过大或非文本文件
 * - 支持文件模式匹配和忽略规则
 * - 使用 fast-glob 进行高效的目录扫描
 *
 * ## 支持的图片语法
 *
 * - 内联：`![alt](src)`
 * - HTML：`<img src="..." alt="...">`
 *
 * @see {@link ReplaceOptions} - 替换选项配置
 * @see {@link ReplaceResult} - 替换结果类型
 * @see {@link IMAGE_REGEX} - 使用的正则表达式
 */

import { readFile, writeFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import fg, { Pattern } from 'fast-glob';

import type { FileReplaceResult, LoggerCallback, ReplaceOptions, ReplaceResult, ReplacementDetail, DirectoryReplaceResult } from './types.js';
import { IMAGE_REGEX } from './constants/regex.js';

/**
 * 检查文件是否适合进行图片替换操作
 * 
 * @param filePath - 文件路径
 * @param logger - 可选的日志回调函数
 * @returns 检查结果对象
 * 
 * @remarks
 * 检查包括：
 * - 文件扩展名是否为支持的文本格式
 * - 文件大小是否合理（避免处理过大文件）
 * - 文件是否存在且可读
 */
async function _validateFileForReplacement(
  filePath: string,
  logger?: LoggerCallback
): Promise<{ isValid: boolean; error?: string }> {
  try {
    // 检查文件是否存在
    const stats = await stat(filePath);
    
    // 检查是否为文件
    if (!stats.isFile()) {
      return { 
        isValid: false, 
        error: `路径 '${filePath}' 不是一个文件` 
      };
    }
    
    // 检查文件大小（> 50MB 警告）
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (stats.size > maxSize) {
      const warningMsg = `文件 '${filePath}' 大小为 ${Math.round(stats.size / 1024 / 1024)}MB，可能影响性能`;
      logger?.('warn', warningMsg);
    }
    
    // 检查文件扩展名
    const ext = extname(filePath).toLowerCase();
    const supportedExtensions = [
      '.md', '.markdown', '.txt', '.html', '.htm', 
      '.js', '.ts', '.jsx', '.tsx', '.vue',
      '.json', '.yaml', '.yml', '.xml', '.css'
    ];
    
    if (!supportedExtensions.includes(ext)) {
      const warningMsg = `文件 '${filePath}' 扩展名 '${ext}' 可能不是文本文件，但仍会尝试处理`;
      logger?.('warn', warningMsg);
      
      // 对于明显的二进制文件扩展名给出更强警告
      const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.pdf', '.exe', '.dll'];
      if (binaryExtensions.includes(ext)) {
        logger?.('error', `强烈建议不要对二进制文件 '${filePath}' 执行图片替换操作`);
      }
    }
    
    return { isValid: true };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { 
      isValid: false, 
      error: `无法访问文件 '${filePath}': ${errorMsg}` 
    };
  }
}

const SRC_ATTR_REGEX = IMAGE_REGEX.ATTRIBUTES.SRC;
const ALT_ATTR_REGEX = IMAGE_REGEX.ATTRIBUTES.ALT;
const TITLE_ATTR_REGEX = IMAGE_REGEX.ATTRIBUTES.TITLE;

/**
 * 处理 Markdown 图片替换
 *
 * @param match - 匹配的 Markdown 图片字符串
 * @param alt - 图片 alt 文本
 * @param urlPart - URL 部分（可能包含标题）
 * @param option - 替换选项
 * @param replacements - 替换详情数组
 * @returns 替换后的 Markdown 图片字符串
 *
 * @remarks
 * 支持多字段模式：field 为 'src'|'raw'，使用 newSrc/newAlt/newTitle 同时替换多个字段
 *
 * @internal
 */
function _processMarkdownImage(
    match: string,
    alt: string,
    urlPart: string,
    option: ReplaceOptions,
    replacements: ReplacementDetail[]
): string {
    const titleMatch = IMAGE_REGEX.TITLE.exec(urlPart);
    const title = titleMatch ? titleMatch[1] : '';
    const src = titleMatch ? urlPart.slice(0, titleMatch.index).trim() : urlPart.trim();

    // 检查是否匹配
    const isMatched = _checkImageMatch(match, { alt, src, title }, option);
    if (!isMatched) {
        return match;
    }

    // 应用多字段替换
    return _applyMultiFieldReplacement(match, { alt, src, title }, option, replacements);
}

/**
 * 创建用于替换的正则表达式
 */
function _createPatternRegex(pattern: string | RegExp): RegExp {
    if (pattern instanceof RegExp) {
        const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
        return new RegExp(pattern.source, flags);
    }
    return new RegExp(pattern.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'g');
}

/**
 * 检查图片是否匹配替换选项
 */
function _checkImageMatch(match: string, image: { alt: string; src: string; title: string }, option: ReplaceOptions): boolean {
    const pattern = _createPatternRegex(option.pattern);

    switch (option.field) {
        case 'src':
            return pattern.test(image.src);
        case 'raw':
            return pattern.test(match);
        default:
            return false;
    }
}

/**
 * 判断是否为多字段模式
 */
function _isMultiFieldMode(option: ReplaceOptions): boolean {
    return (option.field === 'src' || option.field === 'raw') && (option.newSrc !== undefined || option.newAlt !== undefined || option.newTitle !== undefined);
}

/**
 * 应用多字段替换
 */
function _applyMultiFieldReplacement(
    match: string,
    image: { alt: string; src: string; title: string },
    option: ReplaceOptions,
    replacements: ReplacementDetail[]
): string {
    let newAlt = image.alt;
    let newSrc = image.src;
    let newTitle = image.title;

    // 替换提供的字段
    if (option.newSrc !== undefined) {
        newSrc = option.newSrc;
    }
    if (option.newAlt !== undefined) {
        newAlt = option.newAlt;
    }
    if (option.newTitle !== undefined) {
        newTitle = option.newTitle;
    }

    const newUrlPart = newTitle ? `${newSrc} "${newTitle}"` : newSrc;
    const newMarkdown = `![${newAlt}](${newUrlPart})`;
    replacements.push({ before: match, after: newMarkdown });
    return newMarkdown;
}

/**
 * 处理 HTML 图片替换
 *
 * @param match - 匹配的 HTML img 标签字符串
 * @param attributes - img 标签的属性字符串
 * @param option - 替换选项
 * @param replacements - 替换详情数组
 * @returns 替换后的 HTML img 标签字符串
 *
 * @remarks
 * 处理 HTML `<img>` 标签的多字段替换。
 *
 * @internal
 */
function _processHtmlImage(
    match: string,
    attributes: string,
    option: ReplaceOptions,
    replacements: ReplacementDetail[]
): string {
    const srcMatch = SRC_ATTR_REGEX.exec(attributes);
    const altMatch = ALT_ATTR_REGEX.exec(attributes);
    const titleMatch = TITLE_ATTR_REGEX.exec(attributes);

    const src = srcMatch ? srcMatch[1] : '';
    const alt = altMatch ? altMatch[1] : '';
    const title = titleMatch ? titleMatch[1] : '';

    // 检查是否匹配
    const isMatched = _checkHtmlImageMatch(match, { alt, src, title }, option);
    if (!isMatched) {
        return match;
    }

    // 应用多字段替换
    return _applyHtmlMultiFieldReplacement(match, { alt, src, title }, option, replacements);
}

/**
 * 检查 HTML 图片是否匹配替换选项
 */
function _checkHtmlImageMatch(match: string, image: { alt: string; src: string; title: string }, option: ReplaceOptions): boolean {
    return _checkImageMatch(match, image, option);
}

/**
 * 应用 HTML 多字段替换
 */
function _applyHtmlMultiFieldReplacement(
    match: string,
    image: { alt: string; src: string; title: string },
    option: ReplaceOptions,
    replacements: ReplacementDetail[]
): string {
    let newAlt = image.alt;
    let newSrc = image.src;
    let newTitle = image.title;

    // 替换提供的字段
    if (option.newSrc !== undefined) {
        newSrc = option.newSrc;
    }
    if (option.newAlt !== undefined) {
        newAlt = option.newAlt;
    }
    if (option.newTitle !== undefined) {
        newTitle = option.newTitle;
    }

    let newTag = '<img';
    if (newSrc) newTag += ` src="${newSrc}"`;
    if (newAlt) newTag += ` alt="${newAlt}"`;
    if (newTitle) newTag += ` title="${newTitle}"`;
    newTag += ' />';

    replacements.push({ before: match, after: newTag });
    return newTag;
}

/**
 * 在文本中替换图片
 *
 * @param text - Markdown 文本
 * @param options - 替换选项数组
 * @returns 替换结果
 *
 * @remarks
 * 支持替换 Markdown 内联图片和 HTML img 标签的多个字段。
 * 每个替换操作通过 src 或 raw 识别图片，然后同时替换提供的字段。
 *
 * @example
 * ```typescript
 * const result = replaceImagesInText(markdown, [
 *   {
 *     field: 'src',
 *     pattern: './old.png',
 *     newSrc: './new.png',
 *     newAlt: 'New Description'
 *   }
 * ]);
 * console.log(result.newText);
 * console.log(result.replacements);
 * ```
 */
export function replaceImagesInText(text: string, options: ReplaceOptions[]): ReplaceResult {
    const replacements: ReplacementDetail[] = [];
    let currentText = text;

    for (const option of options) {
        // 处理 Markdown 图片
        currentText = currentText.replaceAll(IMAGE_REGEX.MARKDOWN, (match: string, alt: string, urlPart: string) =>
            _processMarkdownImage(match, alt, urlPart, option, replacements)
        );

        // 处理 HTML 图片
        currentText = currentText.replaceAll(IMAGE_REGEX.HTML_TAG, (match: string, attributes: string) =>
            _processHtmlImage(match, attributes, option, replacements)
        );
    }

    return {
        newText: currentText,
        replacements,
    };
}

/**
 * 在文件中替换图片
 *
 * @param fileAbsPath - 文件绝对路径
 * @param options - 替换参数数组
 * @param logger - 可选的日志回调函数
 * @returns 文件替换结果
 *
 * @throws {Error} 当文件读写操作失败时抛出错误
 *
 * @public
 */
export async function replaceImagesInFile(
    fileAbsPath: string,
    options: ReplaceOptions[],
    logger?: LoggerCallback
): Promise<FileReplaceResult> {
    const absolutePath = fileAbsPath;
    const relativePath = absolutePath.replace(process.cwd(), '').substring(1);

    try {
        // 首先验证文件是否适合处理
        const validation = await _validateFileForReplacement(fileAbsPath, logger);
        if (!validation.isValid) {
            return {
                relativePath,
                absolutePath,
                success: false,
                error: validation.error
            };
        }
        
        const content = await readFile(fileAbsPath, 'utf-8');
        const result = replaceImagesInText(content, options);

        if (result.replacements.length > 0) {
            await writeFile(fileAbsPath, result.newText, 'utf-8');
            logger?.('info', `Replaced ${result.replacements.length} images in file: ${fileAbsPath}`);
        }

        return {
            relativePath,
            absolutePath,
            success: true,
            result,
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger?.('error', `Failed to replace images in file: ${fileAbsPath}`, {
            error,
        });

        return {
            relativePath,
            absolutePath,
            success: false,
            error: errorMsg,
        };
    }
}

/**
 * 在目录中批量替换图片
 * 
 * @param dirAbsPath - 目录绝对路径
 * @param replaceOptions - 替换选项数组
 * @param globOptions - glob 配置选项
 * @param logger - 日志回调函数
 * @returns 处理结果统计
 * 
 * @remarks
 * 支持文件模式匹配和忽略规则，参考 filterImagesFromDirectory 的设计。
 * 默认处理所有 Markdown 文件。
 * 
 * @example
 * ```typescript
 * // 基本使用
 * const result = await replaceImagesInDirectory('/docs', [
 *   { field: 'src', pattern: './old.png', newValue: './new.png' }
 * ]);
 * 
 * // 指定文件模式和忽略规则
 * const result = await replaceImagesInDirectory('/docs', replaceOptions, {
 *   patterns: ['**\/*.md', '**\/*.markdown'],
 *   ignore: ['**\/node_modules/**', '**\/.git/**']
 * });
 * ```
 * 
 * @public
 */
export async function replaceImagesInDirectory(
  dirAbsPath: string,
  replaceOptions: ReplaceOptions[],
  globOptions?: { 
    patterns?: Pattern[]; 
    ignore?: Pattern[] 
  },
  logger?: LoggerCallback
): Promise<DirectoryReplaceResult> {
  // 默认匹配所有 Markdown 文件
  const globPatterns: Pattern[] =
    globOptions?.patterns && globOptions.patterns.length > 0 
      ? globOptions.patterns 
      : ['**/*.md', '**/*.markdown'];

  try {
    // 使用 fast-glob 查找目录下的所有匹配文件
    const files = await fg(globPatterns, {
      cwd: dirAbsPath,
      absolute: true,
      onlyFiles: true,
      caseSensitiveMatch: false,
      dot: true, // 包括隐藏文件
      ignore: globOptions?.ignore,
    });

    logger?.('info', `找到 ${files.length} 个文件进行处理`);

    // 批量处理文件
    const results: FileReplaceResult[] = [];

    for (const filePath of files) {
      try {
        const result = await replaceImagesInFile(filePath, replaceOptions, logger);
        results.push(result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger?.('error', `处理文件失败: ${filePath}`, { error });
        
        // 创建失败结果
        const relativePath = filePath.replace(dirAbsPath, '').substring(1);
        results.push({
          relativePath,
          absolutePath: filePath,
          success: false,
          error: errorMsg
        });
      }
    }

    // 统计结果
    const successfulFiles = results.filter(r => r.success).length;
    const failedFiles = results.filter(r => !r.success).length;
    const totalReplacements = results
      .filter(r => r.success && r.result?.replacements)
      .reduce((sum, r) => sum + (r.result?.replacements?.length || 0), 0);

    return {
      totalFiles: files.length,
      successfulFiles,
      failedFiles,
      totalReplacements,
      results
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger?.('error', `目录处理失败: ${dirAbsPath}`, { error });
    
    throw new Error(`目录处理失败: ${errorMsg}`);
  }
}
