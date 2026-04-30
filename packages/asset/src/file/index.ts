/**
 * FileService 模块导出
 *
 * @module file
 * @description
 * 提供文件操作服务，包括：
 * - 图片筛选（从 core 迁移）
 * - 图片替换（从 core 迁移）
 * - 图片删除（从 core 迁移）
 * - 通用文件操作
 *
 * @example
 * ```typescript
 * import { FileService, createFileService } from '@cmtx/asset/file';
 *
 * const service = createFileService();
 *
 * // 从文件筛选图片
 * const images = await service.filterImagesFromFile('/path/to/file.md');
 *
 * // 替换文件中的图片
 * const result = await service.replaceImagesInFile('/path/to/file.md', [
 *   { field: 'src', pattern: './old.png', newSrc: './new.png' }
 * ]);
 *
 * // 删除本地图片
 * const deleteResult = await service.deleteLocalImage('/path/to/image.png', {
 *   strategy: 'trash'
 * });
 * ```
 */

export { createFileService, FileService } from "./file-service.js";
export type { DirectoryScanOptions, FileInfo, FileServiceConfig, IFileService } from "./types.js";
