/**
 * Upload 包主入口 - 核心上传功能
 *
 * @module uploader
 * @description
 * 提供 Markdown 图片上传的核心功能实现。
 *
 * @remarks
 * ## 功能概述
 *
 * 实现 Markdown 文件中本地图片的完整上传流程：
 * 1. 提取本地图片引用
 * 2. 上传图片到云存储
 * 3. 替换 Markdown 中的引用
 * 4. 删除本地图片（可选）
 *
 * ## 核心特性
 *
 * - **智能去重**：自动识别和处理重复图片引用
 * - **模块化设计**：分离上传、替换、删除三个核心服务
 * - **上下文管理**：使用 UploadContext 管理上传状态
 * - **错误容忍**：单个图片失败不影响整体流程
 *
 * @see {@link uploadLocalImageInMarkdown} - 主要导出函数
 * @see {@link UploadContext} - 上传上下文管理
 * @see {@link uploadImages} - 图片上传服务
 * @see {@link processFieldReplacements} - 引用替换服务
 * @see {@link deleteImages} - 图片删除服务
 */

import { dirname, resolve } from 'node:path';
import type { LoggerCallback } from '@cmtx/core';
import { executeUploadPipeline } from './pipeline.js';
import { FileDocumentAccessor, SafeDeleteStrategy, StorageUploadStrategy } from './strategies.js';
import type { UploadConfig, UploadOptions, UploadResult } from './types.js';

// 导出 ImageCloudMapBody 以保持向后兼容
export type { ImageCloudMapBody } from './types.js';

/**
 * 上传单个 Markdown 文件中的图片
 *
 * @param markdownPath - Markdown 文件路径
 * @param config - 上传配置
 * @param optionsOrLogger - 上传选项或日志回调（向后兼容）
 * @returns 上传结果（包含处理后的内容）
 * @public
 */
export async function uploadLocalImageInMarkdown(
    markdownPath: string,
    config: UploadConfig,
    optionsOrLogger?: UploadOptions | LoggerCallback
): Promise<UploadResult> {
    // 向后兼容：第三个参数可能是 LoggerCallback 或 UploadOptions
    const options: UploadOptions =
        typeof optionsOrLogger === 'function' ? {} : (optionsOrLogger ?? {});
    const logger: LoggerCallback | undefined =
        typeof optionsOrLogger === 'function' ? optionsOrLogger : config.events?.logger;

    const log = logger;
    const markdownAbsPath = resolve(markdownPath);

    log?.('info', `[Upload] Processing file: ${markdownAbsPath}`);

    const result = await executeUploadPipeline({
        documentAccessor: new FileDocumentAccessor(markdownAbsPath, {
            writeEnabled: options.writeFile ?? false,
        }),
        config,
        uploadStrategy: new StorageUploadStrategy(config.storage.adapter),
        deleteStrategy: config.delete ? new SafeDeleteStrategy(config.delete) : undefined,
        baseDirectory: dirname(markdownAbsPath),
        shouldSkipSource: (src) => /^https?:\/\//i.test(src),
        logger: log,
    });

    log?.('info', '[Upload] Completed successfully');
    return result;
}
