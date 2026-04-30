import type { TemplateContext } from "./types.js";
import type { ValidationResult } from "./types.js";

/**
 * 模板渲染选项
 *
 * @remarks
 * 提供模板渲染时的配置选项，支持不同的空值处理策略和后处理。
 *
 * @example
 * ```typescript
 * // 保留空字符串占位符（图片上传场景）
 * const result = renderTemplate(template, context, { emptyString: 'preserve' });
 *
 * // 路径规范化（文件命名场景）
 * const result = renderTemplate(template, context, {
 *   postProcess: (s) => s.replace(/\/+/g, '/')
 * });
 *
 * // 不 trim 变量名空格
 * const result = renderTemplate(template, context, { trimWhitespace: false });
 * ```
 *
 * @public
 */
export interface RenderTemplateOptions {
    /**
     * 空字符串处理策略
     * - 'replace': 替换为空字符串（默认，兼容现有行为）
     * - 'preserve': 保留占位符（用于图片上传等场景）
     * @default 'replace'
     */
    emptyString?: "replace" | "preserve";

    /**
     * 是否 trim 变量名中的空格
     * - true: 自动 trim 变量名（默认）
     * - false: 保留原始变量名
     * @default true
     */
    trimWhitespace?: boolean;

    /**
     * 后处理函数，用于路径规范化等
     *
     * @example
     * ```typescript
     * // 路径规范化
     * const result = renderTemplate(template, context, {
     *   postProcess: (s) => s.replace(/\/+/g, '/')
     * });
     * ```
     */
    postProcess?: (result: string) => string;
}

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
    if (typeof template !== "string") {
        errors.push("模板必须是字符串类型");
        return { isValid: false, errors };
    }

    // 统计大括号数量
    const openBraces = (template.match(/\{/g) || []).length;
    const closeBraces = (template.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
        errors.push(
            `大括号不匹配: 找到 ${openBraces} 个 opening brace 和 ${closeBraces} 个 closing brace`,
        );
    }

    // 检查空的模板变量 {}
    const emptyVarRegex = /\{\s*\}/g;
    if (emptyVarRegex.test(template)) {
        errors.push("空的模板变量: {}");
    }

    // 检查未闭合的变量（有 opening brace 但没有 closing brace）
    // 使用正则匹配所有 opening brace 后的内容
    const unclosedRegex = /\{[^{}]*$/;
    if (unclosedRegex.test(template) && !template.includes("}", template.lastIndexOf("{"))) {
        // 只有当大括号数量不匹配时才报告，避免重复
        if (openBraces === closeBraces) {
            errors.push("未闭合的模板变量");
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
 * @param options - 可选配置参数
 *
 * @returns 渲染后的字符串，其中模板变量已被实际值替换
 *
 * @throws {TypeError} 当参数不是字符串类型时抛出
 *
 * @remarks
 * - 变量名中的前后空格默认会被自动去除（可通过 trimWhitespace 选项关闭）
 * - 未定义的变量会保留原始的 {variable} 格式
 * - 空字符串默认替换为空（可通过 emptyString 选项保留占位符）
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
 * // 变量名带空格（默认 trim）
 * const spaced = renderTemplate('Hello { user name }!', { 'user name': 'John' });
 * // 返回: 'Hello John!'
 *
 * // 保留空字符串占位符（图片上传场景）
 * const imageAlt = renderTemplate('{originalAlt}', { originalAlt: '' }, { emptyString: 'preserve' });
 * // 返回: '{originalAlt}'
 *
 * // 路径规范化（文件命名场景）
 * const fileName = renderTemplate('{date}//{name}', { date: '2026-04-25', name: 'photo' }, {
 *   postProcess: (s) => s.replace(/\/+/g, '/')
 * });
 * // 返回: '2026-04-25/photo'
 * ```
 *
 * @public
 */
export function renderTemplate(
    template: string,
    context: TemplateContext,
    options?: RenderTemplateOptions,
): string {
    const { emptyString = "replace", trimWhitespace = true, postProcess } = options ?? {};

    let result = template.replaceAll(/\{([^}]+)\}/g, (match, key) => {
        // 根据 trimWhitespace 选项决定是否 trim 变量名
        const normalizedKey = trimWhitespace ? key.trim() : key;
        const value = context[normalizedKey];

        // undefined 始终保留占位符
        if (value === undefined) {
            return match;
        }

        // 空字符串处理
        if (value === "" && emptyString === "preserve") {
            return match;
        }

        return String(value);
    });

    // 应用后处理
    if (postProcess) {
        result = postProcess(result);
    }

    return result;
}
