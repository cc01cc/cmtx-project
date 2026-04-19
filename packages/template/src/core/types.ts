import type { ValidationResult } from '@cmtx/core';

// 重新导出 ValidationResult 以保持向后兼容
export type { ValidationResult } from '@cmtx/core';

/**
 * 模板上下文接口
 *
 * 定义模板渲染时可用的变量映射。
 * 支持字符串、数字、布尔值类型的变量。
 *
 * @remarks
 * 该接口允许任意字符串键名，值可以是：
 * - string: 字符串值
 * - number: 数值
 * - boolean: 布尔值
 * - undefined: 未定义值（用于处理缺失变量）
 *
 * @example
 * ```typescript
 * const context: TemplateContext = {
 *   name: 'John',
 *   age: 30,
 *   isActive: true,
 *   date: '2024-01-01'
 * };
 * ```
 *
 * @public
 */
export interface TemplateContext {
    /** 任意字符串键名到值的映射 */
    [key: string]: string | number | boolean | undefined;

    /**
     * 内置标准变量 - 当前日期
     * @remarks 格式为 YYYY-MM-DD
     */
    date?: string;

    /**
     * 内置标准变量 - 时间戳
     * @remarks Unix 时间戳（毫秒）
     */
    timestamp?: string;

    /**
     * 内置标准变量 - UUID
     * @remarks RFC 4122 标准的 UUID 字符串
     */
    uuid?: string;
}

/**
 * 模板引擎核心接口
 *
 * 定义模板引擎必须实现的核心功能。
 *
 * @remarks
 * 实现此接口的类应该提供：
 * 1. 模板渲染功能 - 将模板字符串与上下文变量结合生成最终文本
 * 2. 模板验证功能 - 检查模板语法是否正确
 *
 * @example
 * ```typescript
 * class MyTemplateEngine implements TemplateEngine {
 *   render(template: string, context: TemplateContext): string {
 *     // 实现渲染逻辑
 *     return renderedString;
 *   }
 *
 *   validate(template: string): ValidationResult {
 *     // 实现验证逻辑
 *     return validationResult;
 *   }
 * }
 * ```
 *
 * @public
 */
export interface TemplateEngine {
    /**
     * 渲染模板字符串
     *
     * @param template - 要渲染的模板字符串，使用 {variable} 语法
     * @param context - 上下文变量对象，提供模板中变量的实际值
     *
     * @returns 渲染后的字符串，其中的模板变量已被实际值替换
     *
     * @throws {TypeError} 当参数类型不正确时抛出
     *
     * @example
     * ```typescript
     * const engine: TemplateEngine = new MyTemplateEngine();
     * const result = engine.render('Hello {name}!', { name: 'World' });
     * // 返回: 'Hello World!'
     * ```
     */
    render(template: string, context: TemplateContext): string;

    /**
     * 验证模板语法
     *
     * @param template - 要验证的模板字符串
     *
     * @returns 包含验证结果的对象，指示模板是否有效以及具体的错误信息
     *
     * @example
     * ```typescript
     * const engine: TemplateEngine = new MyTemplateEngine();
     * const result = engine.validate('Hello {name}!');
     * // 返回: { isValid: true, errors: [] }
     *
     * const invalid = engine.validate('Hello {name!');
     * // 返回: { isValid: false, errors: ['未闭合的大括号'] }
     * ```
     */
    validate(template: string): ValidationResult;
}
