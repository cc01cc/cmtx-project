/**
 * @module @cmtx/template/core
 *
 * 模板核心引擎和类型定义
 *
 * @description
 * 导出模板渲染的核心类型、函数和工具类。
 *
 * @remarks
 * 此模块提供：
 * - `TemplateContext` - 模板变量上下文类型
 * - `ValidationResult` - 模板验证结果类型
 * - `TemplateEngine` - 模板引擎接口类型
 * - `renderTemplate()` - 核心渲染函数
 * - `ContextManager` - 上下文管理器
 * - `BuiltinVariables` - 内置变量集合
 *
 * @example
 * 使用核心渲染函数
 * ```typescript
 * import { renderTemplate } from '@cmtx/template/core';
 *
 * const result = renderTemplate('Hello, {{name}}!', { name: 'World' });
 * ```
 *
 * @example
 * 使用上下文管理器
 * ```typescript
 * import { ContextManager, BuiltinVariables } from '@cmtx/template/core';
 *
 * const manager = new ContextManager();
 * manager.addBuiltinVariables();
 * const context = manager.getContext();
 * ```
 */

/**
 * @category 上下文管理
 */
/**
 * @category 内置变量
 */
export { BuiltinVariables, ContextManager } from './context.js';
/**
 * @category 模板渲染
 */
/**
 * @category 模板验证
 */
export { renderTemplate, validateTemplate } from './template-engine.js';
/**
 * @category 类型定义
 */
/**
 * @category 类型定义
 */
/**
 * @category 类型定义
 */
export type { TemplateContext, TemplateEngine, ValidationResult } from './types.js';
