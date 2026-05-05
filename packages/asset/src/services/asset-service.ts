/**
 * Asset Service 服务实现
 *
 * @module asset-service
 * @description
 * 提供 Markdown 资产（图片）管理功能的 Service 包装。
 * 采用 Facade 模式简化复杂的 Pipeline API。
 */

import { filterImagesInText, isWebSource, type Logger } from "@cmtx/core";
import { isAbsolute, resolve } from "node:path";
import type { IStorageAdapter } from "@cmtx/storage";
import type { ReplaceConfig } from "../config/types.js";
import { DeleteService } from "../delete/delete-service.js";
import type { DeleteOptions, DeleteResult } from "../delete/types.js";
import { DownloadService } from "../download/download-service.js";
import type { DownloadOptions, DownloadResult } from "../download/types.js";
import {
    batchUploadImages,
    matchesToSources,
    renderReplacementText,
    applyReplacementOps,
} from "../upload/index.js";
import type { ReplacementOp } from "../upload/strategies.js";
import type { ConflictResolutionStrategy, FailedItemDetail } from "../upload/types.js";
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
    async uploadImagesInDocument(document: string, basePath: string): Promise<UploadResult> {
        this.config.logger?.info("[AssetService] Starting upload for document");

        const allMatches = filterImagesInText(document);
        const localMatches = allMatches.filter(
            (m) => !isWebSource(m.src) && !m.src.startsWith("data:image/"),
        );

        if (localMatches.length === 0) {
            return { content: document, uploaded: 0, failed: [], skipped: [], downloaded: [] };
        }

        const sources = matchesToSources(localMatches, basePath);

        const batchResult = await batchUploadImages(sources, {
            adapter: this.config.adapter,
            namingTemplate: this.config.namingTemplate,
            prefix: this.config.prefix,
            conflictStrategy: this.config.conflictStrategy,
            logger: this.config.logger,
        });

        const ops: ReplacementOp[] = [];
        for (let i = 0; i < localMatches.length; i++) {
            const cloudResult = batchResult.lookup(sources[i]);
            if (!cloudResult || cloudResult.action === "skipped") continue;
            const newText = renderReplacementText(
                localMatches[i],
                { cloudUrl: cloudResult.cloudUrl, variables: cloudResult.variables },
                this.config.replace as
                    | { fields: Record<string, string>; context?: Record<string, string> }
                    | undefined,
            );
            ops.push({
                offset: document.indexOf(localMatches[i].raw),
                length: localMatches[i].raw.length,
                newText,
            });
        }

        const finalContent = applyReplacementOps(document, ops);

        this.config.logger?.info(
            `[AssetService] Upload complete: ${batchResult.uploaded.length} images uploaded`,
        );

        if (this.config.onProgress) {
            this.config.onProgress(`已上传 ${batchResult.uploaded.length} 张图片`);
        }

        return {
            content: finalContent,
            uploaded: batchResult.uploaded.length,
            failed: batchResult.failed.map((f) => ({
                localPath: f.source.kind === "file" ? f.source.absPath : "buffer",
                stage: "upload",
                error: f.error,
            })),
            skipped: batchResult.skipped.map((s) => ({
                localPath: "",
                stage: "upload",
                error: s.action,
            })),
            downloaded: [],
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
     * @param baseDirectory - 基础目录（用于解析相对路径）
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

        const allDetails: import("../delete/types.js").DeleteDetail[] = [];
        let totalReferencesRemoved = 0;

        for (const img of images) {
            const absPath = isAbsolute(img.src)
                ? resolve(img.src)
                : resolve(baseDirectory, img.src);

            const target = await deleteService.scanReferences(absPath);
            const deleteResult = await deleteService.delete(target);

            allDetails.push(...deleteResult.details);
            totalReferencesRemoved += deleteResult.referencesRemovedFrom;
        }

        const success = allDetails.every((d) => d.success);

        return {
            success,
            deletedCount: allDetails.filter((d) => d.success).length,
            referencesRemovedFrom: totalReferencesRemoved,
            details: allDetails,
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
