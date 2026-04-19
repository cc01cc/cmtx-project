/**
 * 图片上传模板渲染器
 *
 * @module template-renderer
 * @description
 * 提供专门用于图片上传场景的模板渲染功能。
 *
 * @remarks
 * ## 核心功能
 *
 * - 模板变量替换：将 `{variable}` 替换为实际值
 * - 空值处理：空字符串 `''` 会保留占位符（这是与通用模板引擎的关键区别）
 * - 上下文管理：创建和合并渲染上下文
 *
 * ## 与 @cmtx/template/renderTemplate 的区别
 *
 * | 特性 | renderTemplateImage | renderTemplate |
 * |------|---------------------|----------------|
 * | 空字符串处理 | 保留占位符 `{var}` | 替换为空字符串 |
 * | undefined 处理 | 保留占位符 `{var}` | 保留占位符 `{var}` |
 * | 使用场景 | 图片上传（alt/title 为空时保留占位符） | 通用模板渲染 |
 *
 * ## 模板语法
 *
 * 使用花括号包围变量名：`{variableName}`
 *
 * ```typescript
 * // 基本替换
 * renderTemplateImage('{cloudSrc}', { cloudSrc: 'https://example.com/image.png' })
 * // 结果：'https://example.com/image.png'
 *
 * // 空字符串保留占位符（图片上传场景的特殊需求）
 * renderTemplateImage('{originalAlt}', { originalAlt: '' })
 * // 结果：'{originalAlt}' - 保留占位符，便于后续处理
 *
 * // undefined 也保留占位符
 * renderTemplateImage('{originalAlt}', {})
 * // 结果：'{originalAlt}'
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
 * @see {@link renderTemplateImage} - 图片上传模板渲染函数
 * @see {@link createContext} - 上下文创建函数
 */

/**
 * 渲染图片上传模板字符串
 *
 * @param template - 模板字符串，如 '{cloudSrc}' 或 '{originalAlt} - 来自我的博客'
 * @param context - 上下文变量
 * @returns 渲染后的字符串
 *
 * @remarks
 * ## 空字符串处理规则
 *
 * - 如果模板变量存在且为**非空字符串**，使用该值
 * - 如果模板变量为 `undefined` 或**空字符串** `''`，保留原始占位符
 *
 * 这是为了适应图片上传场景：
 * - 当 Markdown 图片的 alt 或 title 为空时，保留占位符 `{originalAlt}`
 * - 便于后续处理或提示用户补充信息
 *
 * @example
 * ```typescript
 * // 正常替换
 * renderTemplateImage('{cloudSrc}', { cloudSrc: 'https://example.com/image.png' })
 * // => 'https://example.com/image.png'
 *
 * // 空字符串保留占位符
 * renderTemplateImage('{originalAlt}', { originalAlt: '' })
 * // => '{originalAlt}'
 *
 * // undefined 保留占位符
 * renderTemplateImage('{originalAlt}', {})
 * // => '{originalAlt}'
 * ```
 */
export function renderTemplateImage(
    template: string,
    context: Record<string, string | undefined>
): string {
    if (!template) return '';

    return template.replaceAll(/\{([^}]+)\}/g, (match, key) => {
        const value = context[key];
        // 如果值存在且不为空字符串，使用该值；否则保留占位符
        return value && value.trim() !== '' ? value : match;
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
        timestamp: Date.now().toString(),
    };

    // 合并用户提供的额外上下文（保留 undefined 值）
    return { ...baseContext, ...options };
}
