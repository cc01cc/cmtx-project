/**
 * 传输服务
 *
 * @module transfer/transfer-service
 * @description
 * 执行单个文件的传输操作：下载 -> 上传。
 *
 * @remarks
 * ## 传输流程
 * 1. 检查目标文件是否已存在
 * 2. 获取源文件元数据
 * 3. 检查文件过滤器
 * 4. 检查磁盘空间
 * 5. 下载到本地临时文件
 * 6. 读取文件内容计算 MD5（如果模板需要）
 * 7. 使用模板生成目标文件名
 * 8. 上传到目标 OSS
 * 9. 返回结果
 *
 * ## 组合设计
 * TransferService = DownloadService（下载） + 直接上传
 *
 * ## 错误处理
 * - 网络错误：自动重试（最多 3 次）
 * - 磁盘空间不足：提前检查并报错
 */

import { readFile } from 'node:fs/promises';
import type { ObjectMeta } from '@cmtx/storage';
import type { ProgressTracker } from '../utils/progress-tracker.js';
import type { TempManager } from '../utils/temp-manager.js';
import type { InternalTransferConfig, UrlMapping } from './types.js';
import { createUrlTransformer } from './url-transformer.js';

/**
 * 传输服务配置
 */
export interface TransferServiceConfig {
    /** 传输配置（内部配置，包含适配器） */
    transferConfig: InternalTransferConfig;

    /** 临时文件管理器 */
    tempManager: TempManager;

    /** 进度追踪器 */
    progressTracker: ProgressTracker;

    /** 任务临时目录 */
    taskDir: string;
}

/**
 * 传输服务
 *
 * 组合 DownloadService 的下载能力 + 直接上传能力
 */
export class TransferService {
    private readonly config: TransferServiceConfig;
    private readonly urlTransformer;

    constructor(config: TransferServiceConfig) {
        this.config = config;
        this.urlTransformer = createUrlTransformer(config.transferConfig.target);
    }

    /**
     * 检查文件是否已存在（不覆盖模式下）
     */
    private async checkFileExists(remotePath: string, overwrite?: boolean): Promise<boolean> {
        if (overwrite === false) {
            const exists = await this.config.transferConfig.target.adapter.exists?.(remotePath);
            return exists ?? false;
        }
        return false;
    }

    /**
     * 传输单个文件
     * @param originalUrl - 原始 URL
     * @param remotePath - 远程路径
     * @returns URL 映射结果
     */
    async transfer(originalUrl: string, remotePath: string): Promise<UrlMapping> {
        const { target, options } = this.config.transferConfig;
        const fileName = originalUrl.split('/').pop() || 'unknown';

        // 开始追踪
        this.config.progressTracker.start(fileName, 'downloading');

        // 初步生成 URL 映射（用于不依赖 MD5 的场景）
        let mapping = this.urlTransformer.transform(originalUrl, remotePath);

        try {
            // 1. 检查目标文件是否已存在
            if (await this.checkFileExists(mapping.remotePath, target.overwrite)) {
                mapping.success = true;
                this.config.progressTracker.skip(fileName);
                return mapping;
            }

            // 2. 获取源文件元数据
            const meta = await this.getSourceMeta(remotePath);
            if (!meta) {
                throw new Error(`Failed to get metadata for ${remotePath}`);
            }

            // 3. 检查文件过滤器
            if (options?.filter && !this.checkFilter(meta, options.filter)) {
                mapping.success = true;
                this.config.progressTracker.skip(fileName);
                return mapping;
            }

            // 4. 检查磁盘空间
            const hasSpace = await this.config.tempManager.checkDiskSpace(meta.size);
            if (!hasSpace) {
                throw new Error(`Insufficient disk space for ${fileName} (${meta.size} bytes)`);
            }

            // 5. 下载到临时文件
            const tempFilePath = this.config.tempManager.getTempFilePath(
                this.config.taskDir,
                fileName
            );

            this.config.progressTracker.update(fileName, 'downloading');
            await this.downloadFile(remotePath, tempFilePath);

            // 6. 如果模板需要 MD5，读取文件内容并重新生成文件名
            let fileContent: Buffer | undefined;
            if (this.urlTransformer.needsMd5()) {
                fileContent = await readFile(tempFilePath);
                mapping = this.urlTransformer.transformWithContent(
                    originalUrl,
                    tempFilePath,
                    fileContent
                );
            }

            // 更新文件大小
            mapping = { ...mapping, size: fileContent?.length ?? meta.size };

            // 7. 再次检查目标文件是否已存在（使用新的 remotePath）
            if (await this.checkFileExists(mapping.remotePath, target.overwrite)) {
                mapping.success = true;
                this.config.progressTracker.skip(fileName);
                return mapping;
            }

            // 8. 上传到目标
            this.config.progressTracker.update(fileName, 'uploading');
            await this.uploadFile(tempFilePath, mapping.remotePath);

            // 9. 如果配置了 deleteSource，删除源文件
            if (options?.deleteSource && mapping.success) {
                await this.deleteSourceFile(remotePath);
            }

            mapping.success = true;

            this.config.progressTracker.complete(fileName, mapping.newUrl);

            return mapping;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            mapping.success = false;
            mapping.error = errorMessage;

            this.config.progressTracker.fail(
                fileName,
                error instanceof Error ? error : new Error(errorMessage)
            );

            return mapping;
        }
    }

    /**
     * 获取源文件元数据
     */
    private async getSourceMeta(remotePath: string): Promise<ObjectMeta | null> {
        const { source } = this.config.transferConfig;

        if (source.adapter.getObjectMeta) {
            try {
                return await source.adapter.getObjectMeta(remotePath);
            } catch {
                return null;
            }
        }

        return {
            size: 0,
            lastModified: new Date(),
        };
    }

    /**
     * 检查文件过滤器
     */
    private checkFilter(
        meta: ObjectMeta,
        filter: {
            extensions?: string[];
            maxSize?: number;
            minSize?: number;
            custom?: (meta: { size: number; name: string }) => boolean;
        }
    ): boolean {
        if (filter.maxSize && meta.size > filter.maxSize) {
            return false;
        }
        if (filter.minSize && meta.size < filter.minSize) {
            return false;
        }

        if (filter.custom) {
            return filter.custom({ size: meta.size, name: '' });
        }

        return true;
    }

    /**
     * 下载文件（使用 storage adapter）
     */
    private async downloadFile(remotePath: string, localPath: string): Promise<void> {
        const { source } = this.config.transferConfig;

        if (!source.adapter.downloadToFile) {
            throw new Error('Source adapter does not support downloadToFile');
        }

        const maxRetries = 3;
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await source.adapter.downloadToFile(remotePath, localPath);
                return;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < maxRetries) {
                    await this.delay(2 ** attempt * 1000);
                }
            }
        }

        throw (
            lastError || new Error(`Failed to download ${remotePath} after ${maxRetries} attempts`)
        );
    }

    /**
     * 上传文件
     */
    private async uploadFile(localPath: string, remotePath: string): Promise<void> {
        const { target } = this.config.transferConfig;

        const maxRetries = 3;
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await target.adapter.upload(localPath, remotePath);
                return;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < maxRetries) {
                    await this.delay(2 ** attempt * 1000);
                }
            }
        }

        throw lastError || new Error(`Failed to upload ${remotePath} after ${maxRetries} attempts`);
    }

    /**
     * 删除源文件
     */
    private async deleteSourceFile(remotePath: string): Promise<void> {
        const { source } = this.config.transferConfig;

        if (!source.adapter.delete) {
            console.warn(`Source adapter does not support delete, skipping: ${remotePath}`);
            return;
        }

        try {
            await source.adapter.delete(remotePath);
        } catch (error) {
            console.error(
                `Failed to delete source file ${remotePath}: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * 延迟
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

/**
 * 创建传输服务
 */
export function createTransferService(config: TransferServiceConfig): TransferService {
    return new TransferService(config);
}
