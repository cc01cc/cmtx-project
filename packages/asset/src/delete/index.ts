/**
 * Delete 模块导出
 *
 * @module delete
 * @description
 * 提供图片删除功能，包括引用检查和文件删除。
 *
 * @example
 * ```typescript
 * import { DeleteService } from '@cmtx/asset/delete';
 *
 * const service = new DeleteService({
 *     workspaceRoot: '/path/to/workspace',
 *     options: {
 *         strategy: 'trash',
 *         removeFromMarkdown: true,
 *     }
 * });
 *
 * const target = await service.scanReferences('./images/test.png');
 * const result = await service.delete(target);
 * ```
 */

export { DeleteService } from "./delete-service.js";
export type {
    DeleteDetail,
    DeleteOptions,
    DeleteProgress,
    DeleteResult,
    DeleteServiceConfig,
    DeleteTarget,
    ReferenceInfo,
} from "./types.js";
