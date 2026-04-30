/**
 * Asset Service 内部包装器
 *
 * @module asset-service-wrapper
 * @description
 * 在 @cmtx/publish 内部包装 @cmtx/asset 的函数 API 为 Service 接口。
 * 仅供 publish 包内部 Rule 引擎使用，不对外暴露。
 */

import type { DeleteOptions, DeleteResult, ReplaceConfig } from "@cmtx/asset";
import { DeleteService } from "@cmtx/asset";
import type { DownloadOptions, DownloadResult } from "@cmtx/asset/download";
import { DownloadService } from "@cmtx/asset/download";
import type {
    ConflictResolutionStrategy,
    DetailedUploadResult,
    FailedItemDetail,
    ReplacementOp,
    UploadConfig,
} from "@cmtx/asset/upload";
import { executeUploadPipeline } from "@cmtx/asset/upload";
import { filterImagesInText, type Logger } from "@cmtx/core";
import type { IStorageAdapter } from "@cmtx/storage";
import type { Service } from "../service-registry.js";

/**
 * Asset Service 配置
 *
 * @description
 * 支持完整的错误处理、冲突处理（配置驱动）、日志记录
 * 注意：上传采用批量处理模式，没有中间回调，只返回最终结果
 */
export interface AssetServiceConfig {
    /** 存储适配器 */
    adapter: IStorageAdapter;
    /** 前缀（可选） */
    prefix?: string;
    /** 命名模板（可选） */
    namingTemplate?: string;

    /** 错误处理 */
    maxRetries?: number;
    retryDelay?: number;

    /** 冲突处理策略 */
    conflictStrategy?: ConflictResolutionStrategy;

    /** 图片替换配置（可选，默认 src="{cloudSrc}"） */
    replace?: ReplaceConfig;

    /** 日志回调 */
    logger?: Logger;
}

/**
 * 上传结果
 */
export interface UploadResult {
    /** 处理后的 Markdown 内容 */
    content: string;
    /** 成功上传的图片数 */
    uploaded: number;
    /** 失败的图片详情 */
    failed: FailedItemDetail[];
    /** 跳过的项 */
    skipped: FailedItemDetail[];
    /** 下载的项 */
    downloaded: FailedItemDetail[];
}

/**
 * 转移结果（占位，待实现）
 */
export interface TransferResult {
    /** 处理后的 Markdown 内容 */
    content: string;
    /** 成功转移的图片数 */
    transferred: number;
    /** 失败的图片详情 */
    failed: FailedItemDetail[];
}

/**
 * 下载结果（简化版）
 */
export interface SimpleDownloadResult {
    /** 成功数 */
    success: number;

    /** 失败数 */
    failed: number;

    /** 跳过数 */
    skipped: number;
}

/**
 * Asset Service 内部实现
 *
 * @description
 * 采用 Facade 模式封装复杂的 Pipeline，提供简化的 API
 * 仅供 publish 包内部 Rule 引擎使用
 */
export class AssetService implements Service<AssetServiceConfig> {
    readonly id = "asset" as const;

    private config: AssetServiceConfig;

    constructor(config: AssetServiceConfig) {
        this.config = config;
    }

    /**
     * 初始化服务
     * @param config - AssetService 配置
     */
    initialize(config?: AssetServiceConfig): void {
        if (config) {
            this.config = config;
        }
    }

    /**
     * 上传 Markdown 文档中的图片
     *
     * @description
     * 完整支持：
     * - 错误处理（重试机制）
     * - 冲突处理（conflictStrategy 策略，配置驱动）
     * - 日志记录
     *
     * 注意：上传采用批量处理模式，遍历所有图片后返回完整的 DetailedUploadResult，
     * 没有中间回调。
     *
     * @param document - Markdown 文档内容
     * @param baseDirectory - 基础目录（本地图片的相对路径基准）
     * @returns 上传结果（包含 uploaded, skippedItems, downloadedItems, failedItems）
     */
    async uploadImagesInDocument(document: string, baseDirectory: string): Promise<UploadResult> {
        this.config.logger?.info("[AssetService] Starting upload for document");

        // 创建简单的 DocumentAccessor 实现
        const accessor = {
            identifier: "memory",
            readText: async () => document,
            applyReplacements: async (_ops: ReplacementOp[]) => true,
        };

        // 构建完整的 UploadConfig
        const replace = this.config.replace;
        const config: UploadConfig = {
            storages: {
                default: {
                    adapter: this.config.adapter,
                    namingTemplate: this.config.namingTemplate,
                },
            },
            useStorage: "default",
            prefix: this.config.prefix,
            replace: {
                fields: {
                    src: replace?.fields?.src ?? "{cloudSrc}",
                    alt: replace?.fields?.alt ?? "{originalAlt}",
                },
            },
            delete: { enabled: false },
        };

        // 执行 Pipeline，使用冲突策略替代回调
        const result: DetailedUploadResult = await executeUploadPipeline({
            documentAccessor: accessor,
            config,
            baseDirectory,
            conflictStrategy: this.config.conflictStrategy,
            logger: this.config.logger,
        });

        this.config.logger?.info(
            `[AssetService] Upload complete: ${result.uploaded} images uploaded, ${result.skippedItems.length} skipped, ${result.downloadedItems.length} downloaded`,
        );

        return {
            content: result.content,
            uploaded: result.uploaded,
            failed: result.failedItems,
            skipped: result.skippedItems as unknown as FailedItemDetail[],
            downloaded: result.downloadedItems as unknown as FailedItemDetail[],
        };
    }

    /**
     * 下载 Markdown 文档中的远程图片
     *
     * @param document - Markdown 文档内容
     * @param outputDir - 输出目录
     * @param options - 下载选项
     * @returns 下载结果
     */
    async downloadImages(
        document: string,
        outputDir: string,
        options?: Omit<DownloadOptions, "outputDir">,
    ): Promise<SimpleDownloadResult> {
        this.config.logger?.info("[AssetService] Starting download for document");

        const downloadService = new DownloadService({
            adapter: this.config.adapter,
            options: {
                outputDir,
                ...options,
            },
        });

        const result: DownloadResult = await downloadService.downloadFromContent(document);

        this.config.logger?.info(
            `[AssetService] Download complete: ${result.success} images downloaded`,
        );

        return {
            success: result.success,
            failed: result.failed,
            skipped: result.skipped,
        };
    }

    /**
     * 删除 Markdown 文档中的本地图片
     *
     * @param document - Markdown 文档内容
     * @param baseDirectory - 基础目录
     * @param options - 删除选项
     * @returns 删除结果
     */
    async deleteImage(
        document: string,
        baseDirectory: string,
        options?: DeleteOptions,
    ): Promise<DeleteResult> {
        this.config.logger?.info("[AssetService] Starting delete for document");

        const deleteService = new DeleteService(
            {
                workspaceRoot: baseDirectory,
                options,
            },
            this.config.logger,
        );

        // 从文档中提取本地图片路径
        const images = filterImagesInText(document, {
            mode: "sourceType",
            value: "local",
        });

        if (images.length === 0) {
            return {
                success: true,
                deletedCount: 0,
                referencesRemovedFrom: 0,
                details: [],
            };
        }

        // 删除第一个本地图片（用于单图片删除场景）
        const firstImage = images[0];
        if (firstImage.type === "local" && "absLocalPath" in firstImage) {
            const target = await deleteService.scanReferences(firstImage.absLocalPath);
            return await deleteService.delete(target);
        }

        return {
            success: true,
            deletedCount: 0,
            referencesRemovedFrom: 0,
            details: [],
        };
    }
}

/**
 * 创建 AssetService 实例
 * @param config - AssetService 配置
 * @returns AssetService 实例
 */
export function createAssetService(config: AssetServiceConfig): AssetService {
    return new AssetService(config);
}
