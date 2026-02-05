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
 * - **重试机制**：内置重试和降级策略
 *
 * ## 删除策略
 *
 * - **trash**：移动到系统回收站（推荐）
 * - **move**：移动到指定目录
 * - **hard-delete**：永久删除（谨慎使用）
 *
 * @see {@link deleteImages} - 主要导出函数
 * @see {@link deleteLocalImage} - 核心删除函数
 * @see {@link deleteLocalImageSafely} - 安全删除函数
 */

import { deleteLocalImage, deleteLocalImageSafely } from '@cmtx/core';
import type { LoggerCallback } from '@cmtx/core';
import { DeleteOptions } from './types.js';

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
    logger?: LoggerCallback
): Promise<{ deletedCount: number }> {
    logger?.('debug', `[DeleteService] Deleting ${uploadedPaths.size} images`);

    let deletedCount = 0;

    // 执行删除
    for (const imageAbsPath of uploadedPaths) {
        try {
            logger?.('debug', `[DeleteService] Deleting ${imageAbsPath}`);

            let result = undefined;
            if (deleteOptions.rootPath) {
                result = await deleteLocalImageSafely(imageAbsPath, deleteOptions.rootPath, deleteOptions);
            } else {
                result = await deleteLocalImage(imageAbsPath, deleteOptions);
            }
            if (result.status === 'success') {
                deletedCount++;
                logger?.('info', `[DeleteService] Success: ${imageAbsPath}`);
            } else {
                logger?.('warn', `[DeleteService] Failed: ${imageAbsPath}`, { error: result.error });
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger?.('warn', `[DeleteService] Error: ${imageAbsPath}`, { error });
        }
    }

    logger?.('info', `[DeleteService] Deleted ${deletedCount}/${uploadedPaths.size} images`);
    return { deletedCount };
}
