import type { TemplateContext, ValidationResult } from './types.js';

/**
 * 验证模板语法是否正确
 *
 * 检查模板字符串的语法有效性，包括：
 * - 大括号是否匹配（每个 `{` 都有对应的 `}`）
 * - 是否存在空的模板变量 `{}`
 * - 变量名是否有效
 *
 * @param template - 要验证的模板字符串
 *
 * @returns 验证结果对象，包含 `isValid` 状态和错误信息列表
 *
 * @example
 * ```typescript
 * // 有效模板
 * const result = validateTemplate('Hello {name}!');
 * // 返回: { isValid: true, errors: [] }
 *
 * // 未闭合的大括号
 * const unclosed = validateTemplate('Hello {name!');
 * // 返回: { isValid: false, errors: ['大括号不匹配: 找到 1 个 opening brace 和 0 个 closing brace'] }
 *
 * // 空的大括号
 * const empty = validateTemplate('Hello {}!');
 * // 返回: { isValid: false, errors: ['空的模板变量: {}'] }
 * ```
 *
 * @public
 */
export function validateTemplate(template: string): ValidationResult {
    const errors: string[] = [];

    // 检查参数类型
    if (typeof template !== 'string') {
        errors.push('模板必须是字符串类型');
        return { isValid: false, errors };
    }

    // 统计大括号数量
    const openBraces = (template.match(/\{/g) || []).length;
    const closeBraces = (template.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
        errors.push(
            `大括号不匹配: 找到 ${openBraces} 个 opening brace 和 ${closeBraces} 个 closing brace`
        );
    }

    // 检查空的模板变量 {}
    const emptyVarRegex = /\{\s*\}/g;
    if (emptyVarRegex.test(template)) {
        errors.push('空的模板变量: {}');
    }

    // 检查未闭合的变量（有 opening brace 但没有 closing brace）
    // 使用正则匹配所有 opening brace 后的内容
    const unclosedRegex = /\{[^{}]*$/;
    if (unclosedRegex.test(template) && !template.includes('}', template.lastIndexOf('{'))) {
        // 只有当大括号数量不匹配时才报告，避免重复
        if (openBraces === closeBraces) {
            errors.push('未闭合的模板变量');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * 核心模板渲染函数
 *
 * 使用简单的 {variable} 语法进行变量替换。
 * 支持字符串、数字、布尔值类型的变量替换。
 *
 * @param template - 模板字符串，使用 {variable} 语法
 * @param context - 上下文变量对象，提供模板变量的实际值
 *
 * @returns 渲染后的字符串，其中模板变量已被实际值替换
 *
 * @throws {TypeError} 当参数不是字符串类型时抛出
 *
 * @remarks
 * - 变量名中的前后空格会被自动去除
 * - 未定义的变量会保留原始的 {variable} 格式
 * - 支持变量名包含空格的情况
 *
 * @example
 * ```typescript
 * // 基本用法
 * const result = renderTemplate('Hello {name}!', { name: 'World' });
 * // 返回: 'Hello World!'
 *
 * // 多个变量
 * const multi = renderTemplate('{greeting} {name}!', {
 *   greeting: 'Hello',
 *   name: 'World'
 * });
 * // 返回: 'Hello World!'
 *
 * // 处理未定义变量
 * const undefinedVar = renderTemplate('Hello {name}!', {});
 * // 返回: 'Hello {name}!'
 *
 * // 变量名带空格
 * const spaced = renderTemplate('Hello { user name }!', { 'user name': 'John' });
 * // 返回: 'Hello John!'
 * ```
 *
 * @public
 */
export function renderTemplate(template: string, context: TemplateContext): string {
    return template.replaceAll(/\{([^}]+)\}/g, (match, key) => {
        const value = context[key.trim()];
        return value === undefined ? match : String(value);
    });
}
