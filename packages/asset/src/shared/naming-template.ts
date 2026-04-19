/**
 * 命名模板渲染工具
 *
 * @module shared/naming-template
 * @description
 * 提供统一的命名模板渲染功能，供 Upload 和 Download 模块共用。
 */

import type { BaseNamingVariables } from './types.js';

/**
 * 渲染命名模板
 *
 * @param template - 命名模板字符串（如 `'{name}.{ext}'`）
 * @param variables - 命名变量对象
 * @returns 渲染后的文件名
 *
 * @remarks
 * - 支持所有 `BaseNamingVariables` 中的变量
 * - 自动移除多余的路径分隔符（如连续的斜杠）
 * - 未定义的变量会保留原始的 `{var}` 格式
 *
 * @example
 * ```typescript
 * const variables = {
 *   name: 'photo',
 *   ext: 'png',
 *   date: '2026-04-14',
 *   md5_8: 'a1b2c3d4'
 * };
 *
 * const fileName = renderNamingTemplate('{date}/{name}_{md5_8}.{ext}', variables);
 * // => '2026-04-14/photo_a1b2c3d4.png'
 * ```
 */
export function renderNamingTemplate(template: string, variables: BaseNamingVariables): string {
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
