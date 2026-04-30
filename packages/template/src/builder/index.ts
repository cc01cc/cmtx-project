/**
 * @module @cmtx/template/builder
 *
 * 模板 Builder 模式实现
 *
 * @description
 * 提供流式 API 构建模板的 Builder 模式实现。
 *
 * @remarks
 * 此模块导出 `BaseTemplateBuilder` 类，支持：
 * - 链式调用构建模板
 * - 灵活的配置选项
 * - 模板验证和编译
 *
 * @example
 * 使用 Builder 模式
 * ```typescript
 * import { BaseTemplateBuilder } from '@cmtx/template/builder';
 *
 * const template = new BaseTemplateBuilder()
 *     .setTemplate('Hello, {{name}}!')
 *     .setVariable('name', 'World')
 *     .build();
 *
 * const result = template.render();
 * console.log(result); // 'Hello, World!'
 * ```
 */

export { BaseTemplateBuilder } from "./base-builder.js";
