/**
 * 上传服务 - 处理图片上传逻辑
 *
 * @module upload-service
 * @description
 * 负责图片上传的核心业务逻辑。
 *
 * @remarks
 * ## 主要职责
 *
 * - 对图片列表进行去重处理
 * - 逐一上传图片到云存储
 * - 记录上传结果到上下文
 * - 提供上传统计信息
 *
 * ## 核心流程
 *
 * 1. **去重处理**：提取唯一的本地图片路径
 * 2. **上传执行**：调用存储适配器上传图片
 * 3. **结果记录**：将上传结果存储到 UploadContext
 * 4. **统计返回**：返回上传成功数量
 *
 * ## 错误处理
 *
 * - 单个图片上传失败不会中断整个流程
 * - 失败信息记录在日志中
 * - 继续处理剩余图片
 *
 * @see {@link uploadImages} - 主要导出函数
 * @see {@link UploadContext} - 上传上下文
 * @see {@link IStorageAdapter} - 存储适配器接口
 */

import type { LocalImageMatchWithAbsPath, Logger } from "@cmtx/core";
import type { StorageConfig } from "./config.js";
import { generateNameAndRemotePath as generateRemoteImageInfo } from "./naming-handler.js";
import type { UploadContext } from "./upload-context.js";

/**
 * 上传图片
 *
 * 流程：
 * 1. 从本地图片列表中提取唯一的绝对路径（去重）
 * 2. 逐个上传到云存储
 * 3. 成功结果记录到 context.cloudImageMap
 *
 * @param localImagesWithAbs - 带有绝对路径的本地图片列表
 * @param storageOptions - 存储配置（仅包含上传所需的字段）
 * @param context - 上传上下文，用于记录结果
 * @param logger - 日志回调
 * @returns 上传统计信息 { uploadedCount }
 */
export async function uploadImages(
    localImagesWithAbs: LocalImageMatchWithAbsPath[],
    storageOptions: StorageConfig,
    context: UploadContext,
    logger?: Logger,
): Promise<{ uploadedCount: number }> {
    // 去重：提取唯一的 absLocalPath
    const uniquePaths = new Set<string>();
    for (const img of localImagesWithAbs) {
        uniquePaths.add(img.absLocalPath);
    }

    logger?.debug(
        `[UploadService] Found ${uniquePaths.size} unique images to upload (from ${localImagesWithAbs.length} total)`,
    );

    let uploadedCount = 0;

    // 逐个上传
    for (const absPath of uniquePaths) {
        try {
            // 生成远程路径和文件名
            const { name, remotePath, nameTemplateVariables } = await generateRemoteImageInfo(
                { absLocalPath: absPath } as LocalImageMatchWithAbsPath,
                storageOptions,
            );

            logger?.debug(`[UploadService] Uploading ${absPath} -> ${remotePath}`);

            // 执行上传
            const uploadResult = await storageOptions.adapter.upload(absPath, remotePath);

            // 记录结果到 context
            context.recordUpload(absPath, {
                name,
                remotePath,
                url: uploadResult.url,
                nameTemplateVariables,
            });

            uploadedCount++;
            logger?.info(`[UploadService] Success: ${absPath} -> ${uploadResult.url}`);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger?.error(`[UploadService] Failed to upload ${absPath}`, {
                error,
            });
            // 继续处理其他图片，不中断流程
        }
    }

    logger?.info(`[UploadService] Uploaded ${uploadedCount}/${uniquePaths.size} images`);
    return { uploadedCount };
}
