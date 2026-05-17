/**
 * @packageDocumentation
 *
 * @module @cmtx/template
 *
 * 模板渲染工具包
 *
 * @description
 * 提供灵活的模板渲染引擎，支持变量占位符替换。
 *
 * @remarks
 * 此包提供以下功能：
 *
 * ## 核心功能
 *
 * ### 模板渲染
 * - 支持变量占位符替换
 * - 支持可选参数配置
 *
 * @example
 * ```typescript
 * import { renderTemplate } from '@cmtx/template';
 *
 * const result = renderTemplate('Hello, {{name}}!', { name: 'World' });
 * console.log(result); // 'Hello, World!'
 * ```
 */

// ==================== 核心功能 ====================

export { renderTemplate } from "./core/index.js";

// 类型定义导出
export type { RenderTemplateOptions, TemplateContext } from "./core/index.js";

// 默认导出核心渲染函数
export { renderTemplate as default } from "./core/template-engine.js";
