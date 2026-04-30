/**
 * 图片上传模板渲染器
 *
 * @module template-renderer
 * @description
 * 提供专门用于图片上传场景的模板渲染上下文创建功能。
 *
 * @remarks
 * ## 核心功能
 *
 * - 上下文管理：创建和合并渲染上下文
 * - 基于 `@cmtx/template/renderTemplate` 实现
 *
 * ## 模板语法
 *
 * 使用花括号包围变量名：`{variableName}`
 *
 * ```typescript
 * import { renderTemplate } from '@cmtx/template';
 * import { createContext } from './template-renderer.js';
 *
 * // 创建上下文
 * const context = createContext('images/logo.png', {
 *   cloudUrl: 'https://example.com/logo.png',
 *   originalAlt: 'Logo'
 * });
 *
 * // 使用 renderTemplate 渲染（使用 emptyString: 'preserve' 保留空值占位符）
 * const result = renderTemplate('{cloudSrc} - {originalAlt}', context, {
 *   emptyString: 'preserve'
 * });
 * ```
 *
 * ## 上下文变量
 *
 * 系统提供以下内置变量：
 * - `cloudSrc` - 云端图片 URL
 * - `imagePath` - 原始图片路径
 * - `date` - 当前日期
 * - `timestamp` - 时间戳
 *
 * @see {@link createContext} - 上下文创建函数
 */

/**
 * 创建渲染上下文
 *
 * @remarks
 * 注意：此函数保留 undefined 值来保持字段值的真实性。
 * 当字段值不存在（如 alt 或 title 为空）时，模板中引用这些变量
 * 将保持原样（如 {originalAlt} 不会被替换），这是预期行为。
 */
export function createContext(
    imagePath: string,
    options: Record<string, string | undefined>,
): Record<string, string | undefined> {
    const baseContext = {
        cloudSrc: options.cloudUrl || "",
        imagePath: imagePath,
        date: new Date().toISOString().split("T")[0],
        timestamp: Date.now().toString(),
    };

    // 合并用户提供的额外上下文（保留 undefined 值）
    return { ...baseContext, ...options };
}
