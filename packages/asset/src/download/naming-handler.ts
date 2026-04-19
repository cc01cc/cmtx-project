/**
 * 下载文件命名处理器
 *
 * @module download/naming-handler
 * @description
 * 根据命名模板生成下载文件名。
 *
 * @remarks
 * ## 模板变量
 *
 * ### 基础变量（与 Upload 共享）
 * - `{name}` - 文件名（不含扩展名）
 * - `{ext}` - 文件扩展名（不含点）
 * - `{date}` - 日期（YYYY-MM-DD）
 * - `{timestamp}` - 时间戳
 * - `{md5}` - 完整 MD5 哈希
 * - `{md5_8}` - MD5 前 8 位
 * - `{md5_16}` - MD5 前 16 位
 *
 * ### Download 独有变量
 * - `{sequence}` - 序号（自动递增）
 *
 * @example
 * ```typescript
 * // 使用模板生成文件名
 * const fileName = renderNamingTemplate('{name}.{ext}', variables);
 * // => 'photo.png'
 *
 * const fileName = renderNamingTemplate('{name}_{md5_8}.{ext}', variables);
 * // => 'photo_a1b2c3d4.png'
 * ```
 */

import { generateMD5 } from '../shared/md5.js';
import type { NamingVariables } from './types.js';

/**
 * 默认命名模板
 */
export const DEFAULT_NAMING_TEMPLATE = '{name}.{ext}';

/**
 * 生成命名变量
 *
 * @param baseName - 文件名（不含扩展名）
 * @param ext - 扩展名（不含点）
 * @param content - 文件内容（用于计算 MD5）
 * @param sequence - 序号
 * @returns 命名变量对象
 */
export function generateNamingVariables(
    baseName: string,
    ext: string,
    content?: Buffer,
    sequence: number = 1
): NamingVariables {
    const now = new Date();

    // 计算日期相关变量
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const date = `${year}-${month}-${day}`; // YYYY-MM-DD 格式
    const timestamp = now.getTime().toString();

    // 计算 MD5 相关变量
    const md5 = content ? generateMD5(content, 32) : '00000000000000000000000000000000';
    const md5_8 = md5.slice(0, 8);
    const md5_16 = md5.slice(0, 16);

    return {
        // 基础变量
        name: baseName,
        ext, // 不含点
        date,
        timestamp,
        md5,
        md5_8,
        md5_16,
        // Download 独有变量
        sequence: sequence.toString().padStart(3, '0'),
    };
}

/**
 * 渲染命名模板
 *
 * @param template - 命名模板
 * @param variables - 命名变量
 * @returns 渲染后的文件名
 *
 * @example
 * ```typescript
 * const variables = generateNamingVariables('photo', '.png', undefined, 1);
 * const fileName = renderNamingTemplate('{date}/{name}{ext}', variables);
 * // => '2026-04-02/photo.png'
 * ```
 *
 * @example
 * ```typescript
 * // 使用 MD5 哈希防冲突
 * const fileName = renderNamingTemplate('{name}_{md5_8}{ext}', variables);
 * // => 'photo_a1b2c3d4.png'
 * ```
 */
export function renderNamingTemplate(template: string, variables: NamingVariables): string {
    // 复用共享模块的统一渲染函数
    // 注意：为了保持向后兼容，此函数保留，但内部逻辑已统一
    if (!template) return '';

    let result = template;

    // 替换所有模板变量
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    // 移除多余的路径分隔符（如连续的斜杠）
    result = result.replace(/\/+/g, '/');

    return result;
}

/**
 * 解析 URL 获取文件名信息
 *
 * @param url - 图片 URL
 * @returns 文件名和扩展名（不含点）
 */
export function parseUrlForNaming(url: string): { baseName: string; ext: string } {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const lastSlash = pathname.lastIndexOf('/');
        const fileName = lastSlash >= 0 ? pathname.slice(lastSlash + 1) : pathname;

        // 分离文件名和扩展名
        const lastDot = fileName.lastIndexOf('.');
        if (lastDot > 0) {
            return {
                baseName: fileName.slice(0, lastDot),
                ext: fileName.slice(lastDot + 1), // 不含点
            };
        }

        return {
            baseName: fileName || 'image',
            ext: 'bin',
        };
    } catch {
        return {
            baseName: 'image',
            ext: 'bin',
        };
    }
}

/**
 * 生成唯一文件名（防止冲突）
 *
 * @param desiredName - 期望的文件名
 * @param existingNames - 已存在的文件名集合
 * @returns 唯一的文件名
 */
export function generateUniqueFileName(desiredName: string, existingNames: Set<string>): string {
    if (!existingNames.has(desiredName)) {
        return desiredName;
    }

    // 分离文件名和扩展名
    const lastDot = desiredName.lastIndexOf('.');
    const baseName = lastDot > 0 ? desiredName.slice(0, lastDot) : desiredName;
    const ext = lastDot > 0 ? `.${desiredName.slice(lastDot + 1)}` : '';

    let counter = 1;
    while (existingNames.has(`${baseName}-${counter}${ext}`)) {
        counter++;
    }

    return `${baseName}-${counter}${ext}`;
}
