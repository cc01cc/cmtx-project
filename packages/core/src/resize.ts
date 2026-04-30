/**
 * Resize 模块 - 图片尺寸调整（纯文本处理）
 *
 * @module resize
 * @description
 * 提供 Markdown/HTML 中图片尺寸调整的纯文本处理功能。
 *
 * @remarks
 * ## 设计原则
 *
 * - **纯文本处理**: 不涉及文件操作，只处理字符串
 * - **无 AST 解析**: 使用正则表达式处理
 * - **支持 Markdown 和 HTML**: 两种语法格式
 *
 * ## 使用示例
 *
 * ```typescript
 * import {
 *   resizeImageWidth,
 *   detectImageWidth,
 *   calculateTargetWidth,
 *   convertMarkdownImageToHtml,
 * } from '@cmtx/core';
 *
 * // 调整 HTML 图片宽度
 * const newHtml = resizeImageWidth('<img src="test.png" width="300">', 500);
 *
 * // 检测当前宽度
 * const width = detectImageWidth('<img src="test.png" width="300">'); // 300
 *
 * // 计算目标宽度
 * const target = calculateTargetWidth(300, 'in', [200, 400, 600, 800]); // 400
 *
 * // 转换 Markdown 为 HTML
 * const html = convertMarkdownImageToHtml('![alt](test.png)');
 * // '<img src="test.png" alt="alt">'
 * ```
 */

// ==================== 类型定义 ====================

/**
 * 图片元素信息
 */
export interface ImageElement {
    /** 类型：markdown 或 html */
    type: "markdown" | "html";

    /** 原始文本 */
    originalText: string;

    /** 图片 URL */
    src: string;

    /** 替代文本 */
    alt?: string;

    /** 当前宽度（仅 HTML 图片有） */
    currentWidth?: number;
}

/**
 * 宽度调整方向
 */
export type WidthDirection = "in" | "out";

// ==================== 解析函数 ====================

/**
 * 解析文本中的图片元素
 *
 * @param text - 包含图片的文本（Markdown 或 HTML）
 * @returns 图片元素列表
 */
export function parseImageElements(text: string): ImageElement[] {
    const elements: ImageElement[] = [];

    // 匹配 Markdown 图片: ![alt](src)
    const markdownRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = markdownRegex.exec(text)) !== null) {
        elements.push({
            type: "markdown",
            originalText: match[0],
            src: match[2],
            alt: match[1],
        });
    }

    // 匹配 HTML 图片: <img ...>
    const htmlRegex = /<img\s+[^>]*>/gi;

    while ((match = htmlRegex.exec(text)) !== null) {
        const srcMatch = match[0].match(/src=['"]([^'"]+)['"]/);
        const altMatch = match[0].match(/alt=['"]([^'"]*)['"]/);
        const widthMatch = match[0].match(/width=['"]?(\d+)['"]?/);

        if (srcMatch) {
            elements.push({
                type: "html",
                originalText: match[0],
                src: srcMatch[1],
                alt: altMatch?.[1],
                currentWidth: widthMatch ? parseInt(widthMatch[1], 10) : undefined,
            });
        }
    }

    return elements;
}

// ==================== 宽度检测 ====================

/**
 * 检测 HTML 图片的当前宽度
 *
 * @param html - HTML 字符串（包含 img 标签）
 * @returns 当前宽度（像素），未找到返回 null
 */
export function detectImageWidth(html: string): number | null {
    const widthMatch = html.match(/width=['"]?(\d+)['"]?/);
    if (widthMatch) {
        return parseInt(widthMatch[1], 10);
    }
    return null;
}

/**
 * 从图片元素列表中检测当前宽度
 *
 * @param elements - 图片元素列表
 * @param defaultWidths - 默认宽度列表（当没有检测到宽度时使用）
 * @returns 当前宽度
 */
export function detectCurrentWidth(elements: ImageElement[], defaultWidths: number[]): number {
    for (const element of elements) {
        if (element.currentWidth) {
            return element.currentWidth;
        }
    }
    // 返回中间值作为默认值
    return defaultWidths[Math.floor(defaultWidths.length / 2)];
}

// ==================== 宽度计算 ====================

/**
 * 计算目标宽度
 *
 * @param currentWidth - 当前宽度
 * @param direction - 调整方向（'in' 放大，'out' 缩小）
 * @param availableWidths - 可用的宽度列表
 * @returns 目标宽度
 */
export function calculateTargetWidth(
    currentWidth: number,
    direction: WidthDirection,
    availableWidths: number[],
): number {
    const sorted = [...availableWidths].sort((a, b) => a - b);
    const currentIndex = sorted.findIndex((w) => w >= currentWidth);

    if (direction === "in") {
        // 放大：选择下一个更大的宽度
        if (currentIndex === -1) {
            return sorted[sorted.length - 1]; // 已最大，返回最大值
        }
        return currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : sorted[currentIndex];
    } else {
        // 缩小：选择下一个更小的宽度
        if (currentIndex <= 0) {
            return sorted[0]; // 已最小，返回最小值
        }
        return sorted[currentIndex - 1];
    }
}

// ==================== 宽度调整 ====================

/**
 * 调整 HTML 图片的宽度属性
 *
 * @param html - HTML 字符串（包含 img 标签）
 * @param targetWidth - 目标宽度（像素）
 * @returns 调整后的 HTML
 */
export function resizeImageWidth(html: string, targetWidth: number): string {
    // 检查是否已有 width 属性
    const hasWidth = /width=['"]?\d+['"]?/.test(html);

    if (hasWidth) {
        // 替换现有宽度
        return html.replace(/width=['"]?\d+['"]?/, `width="${targetWidth}"`);
    } else {
        // 添加 width 属性（在 src 属性后）
        return html.replace(/(<img\s+[^>]*src=['"][^'"]+['"])/, `$1 width="${targetWidth}"`);
    }
}

// ==================== Markdown 转 HTML ====================

/**
 * 将 Markdown 图片语法转换为 HTML img 标签
 *
 * @param markdown - Markdown 文本（包含图片语法）
 * @returns HTML 字符串
 *
 * @example
 * ```typescript
 * convertMarkdownImageToHtml('![alt text](image.png)')
 * // '<img src="image.png" alt="alt text">'
 *
 * convertMarkdownImageToHtml('![alt](image.png "title")')
 * // '<img src="image.png" alt="alt" title="title">'
 * ```
 */
export function convertMarkdownImageToHtml(markdown: string): string {
    return markdown.replace(
        /!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]*)")?\)/g,
        (_match, alt: string, src: string, title?: string) => {
            let html = `<img src="${src}" alt="${alt}"`;
            if (title) {
                html += ` title="${title}"`;
            }
            html += ">";
            return html;
        },
    );
}

/**
 * 将 Markdown 图片转换为带宽度的 HTML img 标签
 *
 * @param markdown - Markdown 图片语法
 * @param targetWidth - 目标宽度（像素）
 * @returns HTML img 标签（包含 width 属性）
 */
export function convertMarkdownImageToHtmlWithWidth(markdown: string, targetWidth: number): string {
    return markdown.replace(
        /!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]*)")?\)/g,
        (_match, alt: string, src: string, title?: string) => {
            let html = `<img src="${src}" alt="${alt}" width="${targetWidth}"`;
            if (title) {
                html += ` title="${title}"`;
            }
            html += ">";
            return html;
        },
    );
}
