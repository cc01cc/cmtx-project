/**
 * 图片替换功能
 *
 * @module replacer
 * @description
 * 提供文本层替换 API，支持在文本中替换图片。
 *
 * @remarks
 * ## 功能概述
 *
 * 提供强大的图片替换功能，支持多字段模式。
 * 可以通过 src 或 raw 精确识别图片，同时替换多个字段属性。
 *
 * ## 核心功能
 *
 * ### 文本层 API
 * - {@link replaceImagesInText} - 替换纯文本 Markdown 内容中的图片
 *
 * ### 替换模式
 * - **多字段模式**：通过 src 或 raw 识别图片，同时替换 src、alt、title
 * - **正则表达式支持**：pattern 支持字符串和正则表达式
 * - **精确匹配**：通过 raw 字段实现精确的图片识别
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

import { IMAGE_REGEX } from "./constants/regex.js";
import type { ReplacementDetail, ReplaceOptions, ReplaceResult } from "./types.js";

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
    replacements: ReplacementDetail[],
): string {
    const titleMatch = IMAGE_REGEX.TITLE.exec(urlPart);
    const title = titleMatch ? titleMatch[1] : "";
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
        const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
        return new RegExp(pattern.source, flags);
    }
    return new RegExp(pattern.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), "g");
}

/**
 * 检查图片是否匹配替换选项
 */
function _checkImageMatch(
    match: string,
    image: { alt: string; src: string; title: string },
    option: ReplaceOptions,
): boolean {
    const pattern = _createPatternRegex(option.pattern);

    switch (option.field) {
        case "src":
            return pattern.test(image.src);
        case "raw":
            return pattern.test(match);
        default:
            return false;
    }
}

/**
 * 判断是否为多字段模式
 */
function _isMultiFieldMode(option: ReplaceOptions): boolean {
    return (
        (option.field === "src" || option.field === "raw") &&
        (option.newSrc !== undefined ||
            option.newAlt !== undefined ||
            option.newTitle !== undefined)
    );
}

/**
 * 应用多字段替换
 */
function _applyMultiFieldReplacement(
    match: string,
    image: { alt: string; src: string; title: string },
    option: ReplaceOptions,
    replacements: ReplacementDetail[],
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
    replacements: ReplacementDetail[],
): string {
    const srcMatch = IMAGE_REGEX.ATTRIBUTES.SRC.exec(attributes);
    const altMatch = IMAGE_REGEX.ATTRIBUTES.ALT.exec(attributes);
    const titleMatch = IMAGE_REGEX.ATTRIBUTES.TITLE.exec(attributes);

    const src = srcMatch ? srcMatch[1] : "";
    const alt = altMatch ? altMatch[1] : "";
    const title = titleMatch ? titleMatch[1] : "";

    // 检查是否匹配
    const isMatched = _checkImageMatch(match, { alt, src, title }, option);
    if (!isMatched) {
        return match;
    }

    // 应用多字段替换
    return _applyHtmlMultiFieldReplacement(match, { alt, src, title }, option, replacements);
}

/**
 * 检查 HTML 图片是否匹配替换选项
 */
function _checkHtmlImageMatch(
    match: string,
    image: { alt: string; src: string; title: string },
    option: ReplaceOptions,
): boolean {
    return _checkImageMatch(match, image, option);
}

/**
 * 应用 HTML 多字段替换
 * 保留原始标签中的所有属性，只替换指定的属性值
 */
function _applyHtmlMultiFieldReplacement(
    match: string,
    _image: { alt: string; src: string; title: string },
    option: ReplaceOptions,
    replacements: ReplacementDetail[],
): string {
    // 提取原始标签中的所有属性
    const allAttributes = _extractAllHtmlAttributes(match);

    // 更新指定的属性
    if (option.newSrc !== undefined) {
        allAttributes.src = option.newSrc;
    }
    if (option.newAlt !== undefined) {
        allAttributes.alt = option.newAlt;
    }
    if (option.newTitle !== undefined) {
        allAttributes.title = option.newTitle;
    }

    // 重建标签，保留所有属性
    // 检测原始标签的结束方式：` />` 或 `>`
    const isSelfClosing = match.trimEnd().endsWith("/>");

    let newTag = "<img";
    for (const [name, value] of Object.entries(allAttributes)) {
        if (value !== undefined && value !== "") {
            newTag += ` ${name}="${value}"`;
        }
    }
    newTag += isSelfClosing ? " />" : ">";

    replacements.push({ before: match, after: newTag });
    return newTag;
}

/**
 * 从 HTML img 标签中提取所有属性
 */
function _extractAllHtmlAttributes(imgTag: string): Record<string, string> {
    const attributes: Record<string, string> = {};

    // 匹配所有属性：name="value" 或 name='value' 或 name=value
    // 对于 alt 和 title，值可以包含空格，所以使用不同的匹配模式
    const attrRegex = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'>]*)))?/g;
    let match;

    while ((match = attrRegex.exec(imgTag)) !== null) {
        const name = match[1];
        // 值可能是三种引号之一，或者没有值
        const value = match[2] ?? match[3] ?? match[4] ?? "";
        if (name && name !== "img") {
            attributes[name] = value;
        }
    }

    return attributes;
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
 *
 * @public
 */
export function replaceImagesInText(text: string, options: ReplaceOptions[]): ReplaceResult {
    const replacements: ReplacementDetail[] = [];
    let currentText = text;

    for (const option of options) {
        // 处理 Markdown 图片
        currentText = currentText.replaceAll(
            IMAGE_REGEX.MARKDOWN,
            (match: string, alt: string, urlPart: string) =>
                _processMarkdownImage(match, alt, urlPart, option, replacements),
        );

        // 处理 HTML 图片
        currentText = currentText.replaceAll(
            IMAGE_REGEX.HTML_TAG,
            (match: string, attributes: string) =>
                _processHtmlImage(match, attributes, option, replacements),
        );
    }

    return {
        newText: currentText,
        replacements,
    };
}

// ==================== 图片属性更新功能 ====================

/**
 * 更新 HTML img 标签的指定属性
 *
 * @param html - HTML img 标签字符串
 * @param attribute - 要更新的属性名（src, alt, title, width, height）
 * @param value - 新的属性值
 * @returns 更新后的 HTML 字符串
 *
 * @remarks
 * 如果属性已存在则更新值，不存在则添加。
 * 支持更新 src、alt、title、width、height 属性。
 * 保持原有标签格式不变，仅修改指定属性。
 *
 * @example
 * ```typescript
 * // 更新已存在的属性
 * const newHtml = updateImageAttribute('<img src="a.png" width="100" />', 'width', '200');
 * // 返回: '<img src="a.png" width="200" />'
 *
 * // 添加新属性
 * const newHtml = updateImageAttribute('<img src="a.png" />', 'width', '100');
 * // 返回: '<img src="a.png" width="100" />'
 * ```
 *
 * @public
 */
export function updateImageAttribute(html: string, attribute: string, value: string): string {
    // 属性名必须是支持的属性
    const supportedAttributes = ["src", "alt", "title", "width", "height"];
    if (!supportedAttributes.includes(attribute)) {
        return html;
    }

    // 构建属性匹配正则表达式
    // 支持: attr="value" 或 attr='value' 或 attr=value
    // 对于 alt 和 title，值可以包含空格，所以使用不同的匹配模式
    const attrRegex = new RegExp(`\\b${attribute}\\s*=\\s*["']?([^"'>]*)["']?`, "i");

    if (attrRegex.test(html)) {
        // 属性存在，更新值
        return html.replace(attrRegex, `${attribute}="${value}"`);
    }
    // 属性不存在，在 <img 后添加
    return html.replace(/<img\s/i, `<img ${attribute}="${value}" `);
}

// ==================== 多组正则表达式集成功能 ====================
