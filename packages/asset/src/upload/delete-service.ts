/**
 * 删除服务 - 处理本地图片删除逻辑
 *
 * @module delete-service
 * @description
 * 负责上传完成后本地图片的安全删除。
 *
 * @remarks
 * ## 主要职责
 *
 * - 删除已成功上传和替换的本地图片
 * - 支持多种删除策略（trash/move/hard-delete）
 * - 集成 @cmtx/core 的安全删除功能
 * - 提供删除统计信息
 *
 * ## 安全机制
 *
 * - **路径验证**：防止删除根目录外的文件
 * - **使用检查**：确保图片未被其他文件引用
 * - **策略选择**：支持回收站、移动、硬删除三种方式
 */

import type { DeleteFileOptions, Logger } from "@cmtx/core";
import { FileService } from "../file/file-service.js";
import type { DeleteOptions } from "./types.js";

/**
 * 删除本地图片
 *
 * @param uploadedPaths - 已上传的图片绝对路径
 * @param deleteOptions - 删除选项
 * @param logger - 日志回调
 * @returns 删除统计 { deletedCount }
 */
export async function deleteImages(
    uploadedPaths: Set<string>,
    deleteOptions: DeleteOptions,
    logger?: Logger,
): Promise<{ deletedCount: number }> {
    logger?.debug(`[DeleteService] Deleting ${uploadedPaths.size} images`);

    let deletedCount = 0;
    const fileService = new FileService();

    // 执行删除
    for (const imageAbsPath of uploadedPaths) {
        try {
            logger?.debug(`[DeleteService] Deleting ${imageAbsPath}`);

            // 将 DeleteConfig 转换为 DeleteFileOptions
            const fileOptions: DeleteFileOptions = {
                strategy: deleteOptions.strategy === "trash" ? "move" : "hard-delete",
                trashDir: deleteOptions.trashDir,
                maxRetries: deleteOptions.maxRetries,
            };

            const result = await fileService.deleteLocalImage(imageAbsPath, fileOptions);
            if (result.status === "success") {
                deletedCount++;
                logger?.info(`[DeleteService] Success: ${imageAbsPath}`);
            } else {
                logger?.warn(`[DeleteService] Failed: ${imageAbsPath}`, {
                    error: result.error,
                });
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger?.warn(`[DeleteService] Error: ${imageAbsPath}`, {
                error,
            });
        }
    }

    logger?.info(`[DeleteService] Deleted ${deletedCount}/${uploadedPaths.size} images`);
    return { deletedCount };
}
