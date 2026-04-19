/**
 * @packageDocumentation
 *
 * @module @cmtx/template
 *
 * 模板渲染和变量管理工具包
 *
 * @description
 * 提供灵活的模板渲染引擎和变量管理系统，支持自定义模板语法和变量替换。
 *
 * @remarks
 * 此包提供以下功能：
 *
 * ## 核心功能
 *
 * ### 模板渲染
 * - 支持变量占位符替换
 * - 支持条件渲染和循环
 * - 支持嵌套模板
 *
 * ### 变量管理
 * - 内置常用变量（时间、UUID、计数器等）
 * - 自定义变量上下文
 * - 变量验证和类型检查
 *
 * ### Builder 模式
 * - 流式 API 构建模板
 * - 支持链式调用
 * - 灵活的配置选项
 *
 * @example
 * 基础用法
 * ```typescript
 * import { renderTemplate } from '@cmtx/template';
 *
 * const result = renderTemplate('Hello, {{name}}!', { name: 'World' });
 * console.log(result); // 'Hello, World!'
 * ```
 *
 * @example
 * 使用 Builder 模式
 * ```typescript
 * import { BaseTemplateBuilder } from '@cmtx/template';
 *
 * const template = new BaseTemplateBuilder()
 *     .setTemplate('Hello, {{name}}!')
 *     .setVariable('name', 'World')
 *     .build();
 *
 * const result = template.render();
 * console.log(result); // 'Hello, World!'
 * ```
 *
 * @example
 * 使用内置变量
 * ```typescript
 * import { ContextManager, renderTemplate } from '@cmtx/template';
 *
 * const context = new ContextManager();
 * context.addBuiltinVariables();
 *
 * const result = renderTemplate('Time: {{timestamp}}', context.getContext());
 * console.log(result); // 'Time: 1234567890'
 * ```
 */

// ==================== Builder 模式 ====================

export { BaseTemplateBuilder } from './builder/index.js';

// ==================== 核心功能 ====================

// 类型定义导出
export type {
    /** @category 类型定义 */
    TemplateContext,
    /** @category 类型定义 */
    TemplateEngine,
    /** @category 类型定义 */
    ValidationResult,
} from './core/index.js';
export {
    /** @category 内置变量 */
    BuiltinVariables,
    /** @category 上下文管理 */
    ContextManager,
    /** @category 模板渲染 */
    renderTemplate,
    /** @category 模板验证 */
    validateTemplate,
} from './core/index.js';

// 默认导出核心渲染函数
export { renderTemplate as default } from './core/template-engine.js';
