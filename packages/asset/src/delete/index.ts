/**
 * Delete 模块导出
 *
 * @module delete
 * @description
 * 提供图片删除功能，包括引用检查、文件删除，以及从 Markdown 文件中移除图片引用。
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
    PruneEntry,
    PruneOptions,
    PruneResult,
    ReferenceInfo,
    SafeDeleteDetail,
    SafeDeleteOptions,
    SafeDeleteResult,
} from "./types.js";
