/**
 * Resize 模块 - 图片尺寸调整（纯文本处理）
 *
 * @module resize
 * @description
 * 提供 HTML img 标签中 width/height 属性的纯文本设置，以及 Markdown 图片转 HTML 功能。
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
 * import { setImageDimensions, toHtmlImage } from '@cmtx/core';
 *
 * // 设置 HTML 图片尺寸
 * const html = setImageDimensions('<img src="test.png" width="300">', { width: '500' });
 *
 * // 转换 Markdown 为 HTML
 * const result = toHtmlImage('![alt](test.png)');
 * ```
 */

// ==================== 宽度调整 ====================

/**
 * 设置 HTML img 标签的 width / height 属性
 *
 * @param html - 包含 img 标签的 HTML 字符串
 * @param attrs - 要设置的属性，如 { width: '800', height: '600' }
 *                属性存在时替换，不存在时添加
 * @returns 调整后的 HTML
 */
export function setImageDimensions(
    html: string,
    attrs?: { width?: string; height?: string },
): string {
    let result = html;

    if (attrs?.width !== undefined) {
        const widthStr = String(attrs.width);
        if (/width\s*=\s*["']?[^"'\s>]+["']?/.test(result)) {
            result = result.replace(/width\s*=\s*["']?[^"'\s>]+["']?/, `width="${widthStr}"`);
        } else {
            result = result.replace(
                /(<img\s+[^>]*src\s*=\s*["'][^'"]+["'])/,
                `$1 width="${widthStr}"`,
            );
        }
    }

    if (attrs?.height !== undefined) {
        const heightStr = String(attrs.height);
        if (/height\s*=\s*["']?[^"'\s>]+["']?/.test(result)) {
            result = result.replace(/height\s*=\s*["']?[^"'\s>]+["']?/, `height="${heightStr}"`);
        } else if (attrs?.width !== undefined) {
            result = result.replace(/(width\s*=\s*["'][^"']*["'])/, `$1 height="${heightStr}"`);
        } else {
            result = result.replace(
                /(<img\s+[^>]*src\s*=\s*["'][^'"]+["'])/,
                `$1 height="${heightStr}"`,
            );
        }
    }

    return result;
}

// ==================== Markdown 转 HTML ====================

/**
 * 将 Markdown 图片语法转换为 HTML img 标签
 *
 * @param markdown - Markdown 文本（包含图片语法）
 * @param attributes - 可选的 HTML 属性，如 { width: '800', loading: 'lazy' }
 * @returns HTML 字符串
 *
 * @example
 * ```typescript
 * toHtmlImage('![alt text](image.png)')
 * // '<img src="image.png" alt="alt text">'
 *
 * toHtmlImage('![alt](image.png "title")')
 * // '<img src="image.png" alt="alt" title="title">'
 *
 * toHtmlImage('![alt](img.png)', { width: '800', loading: 'lazy' })
 * // '<img src="img.png" alt="alt" width="800" loading="lazy">'
 * ```
 */
export function toHtmlImage(markdown: string, attributes?: Record<string, string>): string {
    return markdown.replace(
        /!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]*)")?\)/g,
        (_match, alt: string, src: string, title?: string) => {
            let html = `<img src="${src}" alt="${alt}"`;
            if (attributes) {
                for (const [key, value] of Object.entries(attributes)) {
                    html += ` ${key}="${value}"`;
                }
            }
            if (title) {
                html += ` title="${title}"`;
            }
            html += ">";
            return html;
        },
    );
}
