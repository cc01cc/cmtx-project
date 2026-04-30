/**
 * 命名模板渲染工具
 *
 * @module shared/naming-template
 * @description
 * 提供统一的命名模板渲染功能，供 Upload 和 Download 模块共用。
 *
 * @remarks
 * 此模块现在基于 `@cmtx/template/renderTemplate` 实现，
 * 提供路径规范化等后处理功能。
 *
 * ## 使用方式
 *
 * 直接使用 `@cmtx/template/renderTemplate` 并传入 `postProcess` 选项：
 *
 * ```typescript
 * import { renderTemplate } from '@cmtx/template';
 *
 * const variables = {
 *   name: 'photo',
 *   ext: 'png',
 *   date: '2026-04-14',
 *   md5_8: 'a1b2c3d4'
 * };
 *
 * const fileName = renderTemplate('{date}/{name}_{md5_8}.{ext}', variables, {
 *   postProcess: (result) => result.replace(/\/+/g, '/')
 * });
 * // => '2026-04-14/photo_a1b2c3d4.png'
 * ```
 */

export type { BaseNamingVariables } from "./types.js";
