/**
 * 模式渲染器 - 处理 template 字符串的渲染
 *
 * @module template-renderer
 * @description
 * 提供模板字符串的渲染和上下文管理功能。
 *
 * @remarks
 * ## 核心功能
 *
 * - 模板变量替换：将 `{variable}` 替换为实际值
 * - 上下文管理：创建和合并渲染上下文
 * - 空值处理：保留未定义变量的原始占位符
 *
 * ## 模板语法
 *
 * 使用花括号包围变量名：`{variableName}`
 *
 * ```typescript
 * // 基本替换
 * renderTemplateSimple('{cloudSrc}', { cloudSrc: 'https://example.com/image.png' })
 * // 结果：'https://example.com/image.png'
 *
 * // 保留未定义变量
 * renderTemplateSimple('{undefinedVar}', {})
 * // 结果：'{undefinedVar}'
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
 * @see {@link renderTemplateSimple} - 模板渲染函数
 * @see {@link createContext} - 上下文创建函数
 */

/**
 * 渲染模式字符串
 * @param template - 模式字符串，如 '{cloudSrc}' 或 '{originalValue} - Updated'
 * @param context - 上下文变量
 * @returns 渲染后的字符串
 * 
 * @remarks
 * - 如果模板变量存在且为非空值，则使用该值
 * - 如果模板变量为 undefined 或空字符串，则保留原始占位符
 */
export function renderTemplateSimple(
    template: string,
    context: Record<string, string | undefined>
): string {
    if (!template) return '';
    
    return template.replaceAll(/\{([^}]+)\}/g, (match, key) => {
        const value = context[key];
        // 如果值存在且不为空字符串，使用该值；否则保留占位符
        return (value && value.trim() !== '') ? value : match;
    });
}

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
    options: Record<string, string | undefined>
): Record<string, string | undefined> {
    const baseContext = {
        cloudSrc: options.cloudUrl || '',
        imagePath: imagePath,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now().toString()
    };
    
    // 合并用户提供的额外上下文（保留 undefined 值）
    return { ...baseContext, ...options };
}
