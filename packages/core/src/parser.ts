/**
 * Core Layer Markdown Parser
 *
 * @module parser
 * @description
 * 使用正则表达式解析 Markdown 中的图片语法。
 *
 * @remarks
 * ## 功能概述
 *
 * 提供 Markdown 图片语法的解析功能，支持内联图片和 HTML img 标签。
 * 解析结果包含完整的图片信息，用于后续的筛选、替换和删除操作。
 *
 * ## 模块结构
 *
 * ### Public APIs
 * - {@link parseImages} - 解析 Markdown 中的所有图片
 * - {@link parseImagesMdSingleline} - 解析 Markdown 内联图片
 * - {@link parseImagesHtmlSingleline} - 解析 HTML img 标签
 *
 * ## 技术实现
 *
 * - 使用正则表达式解析 Markdown 图片语法
 * - 支持标题属性解析
 * - 所有 raw 字段均从原始 markdown 中提取，不进行手动生成，确保格式一致性
 * - 不提供精确的位置信息（行号、列号、偏移量）
 *
 * ## 支持的图片语法
 *
 * ### Markdown 内联图片
 * ```markdown
 * ![替代文本](图片地址)
 * ![替代文本](图片地址 "标题")
 * ![替代文本](图片地址 '标题')
 * ```
 *
 * ### HTML 图片标签
 * ```html
 * <img src="图片地址" alt="替代文本" />
 * <img src="图片地址" alt="替代文本" title="标题" />
 * ```
 *
 * @see {@link ParsedImage} - 解析结果的数据结构
 * @see {@link IMAGE_REGEX} - 使用的正则表达式常量
 */

import { IMAGE_REGEX } from "./constants/regex.js";
import type { ParsedImage } from "./types.js";

/**
 * 解析 Markdown 文本中的所有图片
 *
 * @param text - Markdown 文本
 * @returns 解析出的图片数组
 *
 * @remarks
 * 同时解析 Markdown 内联图片和 HTML img 标签。
 *
 * @public
 */
export function parseImages(text: string): ParsedImage[] {
    const mdImages = parseImagesMdSingleline(text);
    const htmlImages = parseImagesHtmlSingleline(text);
    return [...mdImages, ...htmlImages];
}

/**
 * 解析 Markdown 内联图片
 *
 * @param text - Markdown 文本
 * @returns 解析出的 Markdown 图片数组
 *
 * @remarks
 * 解析标准 Markdown 图片语法 `![alt](url "title")`。
 * 支持：
 * - 带标题：`![alt](url "title")` 或 `![alt](url 'title')`
 * - 不带标题：`![alt](url)`
 *
 * @public
 */
export function parseImagesMdSingleline(text: string): ParsedImage[] {
    const results: ParsedImage[] = [];
    let match: RegExpExecArray | null;

    while ((match = IMAGE_REGEX.MARKDOWN.exec(text)) !== null) {
        const raw = match[0];
        const alt = match[1];
        const urlPart = match[2];

        let src: string;
        let title: string | undefined;

        const titleMatch = IMAGE_REGEX.TITLE.exec(urlPart);
        if (titleMatch) {
            src = urlPart.slice(0, titleMatch.index).trim();
            title = titleMatch[1];
        } else {
            src = urlPart.trim();
            title = undefined;
        }

        results.push({
            alt,
            src,
            title,
            raw,
            syntax: "md",
        });
    }

    return results;
}

/**
 * 从 Markdown 文本中解析单行 HTML img 标签
 *
 * @param text - Markdown 文本
 * @returns 解析出的 HTML 图片数组
 *
 * @remarks
 * - 只处理单行 HTML img 标签（不含换行符）
 * - 属性顺序、个数无关紧要
 * - src 是必需属性，缺少 src 的标签会被忽略
 *
 * @public
 */
export function parseImagesHtmlSingleline(text: string): ParsedImage[] {
    const results: ParsedImage[] = [];
    let match: RegExpExecArray | null;

    while ((match = IMAGE_REGEX.HTML_TAG.exec(text)) !== null) {
        const fullTag = match[0];
        const tagContent = match[1];

        // 只处理单行 HTML（跳过多行标签）
        if (fullTag.includes("\n")) {
            continue;
        }

        // src 是必需属性
        const srcMatch = IMAGE_REGEX.ATTRIBUTES.SRC.exec(tagContent);
        if (!srcMatch) {
            continue;
        }

        const src = srcMatch[1];
        const altMatch = IMAGE_REGEX.ATTRIBUTES.ALT.exec(tagContent);
        const titleMatch = IMAGE_REGEX.ATTRIBUTES.TITLE.exec(tagContent);
        const widthMatch = IMAGE_REGEX.ATTRIBUTES.WIDTH.exec(tagContent);
        const heightMatch = IMAGE_REGEX.ATTRIBUTES.HEIGHT.exec(tagContent);

        const alt = altMatch?.[1] ?? "";
        const title = titleMatch?.[1];
        const width = widthMatch?.[1];
        const height = heightMatch?.[1];

        results.push({
            src,
            alt,
            title,
            width,
            height,
            raw: fullTag,
            syntax: "html",
        });
    }

    return results;
}
