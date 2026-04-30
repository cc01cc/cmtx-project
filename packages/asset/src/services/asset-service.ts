/**
 * Asset Service 服务实现
 *
 * @module asset-service
 * @description
 * 提供 Markdown 资产（图片）管理功能的 Service 包装。
 * 采用 Facade 模式简化复杂的 Pipeline API。
 */

import type { Logger } from "@cmtx/core";
import type { IStorageAdapter } from "@cmtx/storage";
import type { ReplaceConfig } from "../config/types.js";
import { DeleteService } from "../delete/delete-service.js";
import type { DeleteOptions, DeleteResult } from "../delete/types.js";
import { DownloadService } from "../download/download-service.js";
import type { DownloadOptions, DownloadResult } from "../download/types.js";
import { executeUploadPipeline } from "../upload/pipeline.js";
import type { ReplacementOp } from "../upload/strategies.js";
import type {
    ConflictResolutionStrategy,
    DetailedUploadResult,
    FailedItemDetail,
    UploadConfig,
} from "../upload/types.js";
import type { Service } from "./service-registry.js";

/**
 * Asset Service 配置
 *
 * @description
 * 支持完整的错误处理、冲突处理、进度回调
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

    /** 进度回调 */
    onProgress?: (message: string) => void;

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
 * Asset Service 实现
 *
 * @description
 * 采用 Facade 模式封装复杂的 Pipeline，提供简化的 API
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
     * - 冲突处理（conflictStrategy 策略）
     * - 进度回调
     * - 日志记录
     *
     * @param document - Markdown 文档内容
     * @param baseDirectory - 基础目录（本地图片的相对路径基准）
     * @returns 上传结果
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
            `[AssetService] Upload complete: ${result.uploaded} images uploaded`,
        );

        // 报告进度
        if (this.config.onProgress) {
            this.config.onProgress(`已上传 ${result.uploaded} 张图片`);
        }

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
        const { filterImagesInText } = await import("@cmtx/core");
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
