/**
 * Transfer Assets Service
 *
 * @module services/transfer-assets-service
 * @description
 * 负责将 Markdown 文档中的远程图片从一个对象存储转移到另一个。
 * 组合 Download（多存储源）+ Upload（单存储目标）。
 */

import type { IStorageAdapter } from "@cmtx/storage";
import type { Logger } from "@cmtx/core";
import { createTransferManager } from "../transfer/transfer-manager.js";
import type { TransferResult as TransferManagerResult } from "../transfer/types.js";
import type { StorageDomainConfig } from "./download-assets-service.js";
import type { Service } from "./service-registry.js";

/**
 * Transfer Assets Service 配置
 */
export interface TransferAssetsServiceConfig {
    /** 源存储（多存储，domain → adapter） */
    sourceAdapters: StorageDomainConfig[];
    /** 目标存储适配器（单存储） */
    targetAdapter: IStorageAdapter;
    /** 目标存储前缀 */
    targetPrefix?: string;
    /** 目标存储自定义域名 */
    targetDomain?: string;
    /** 源存储自定义域名 */
    sourceDomain?: string;
    /** 命名模板 */
    namingTemplate?: string;
    /** 并发数 */
    concurrency?: number;
    /** 是否删除源文件 */
    deleteSource?: boolean;
    /** 日志回调 */
    logger?: Logger;
}

/**
 * 转移结果
 */
export interface TransferAssetsResult {
    /** 处理后的 Markdown 内容 */
    content: string;
    /** 成功转移的图片数 */
    transferred: number;
    /** 失败数 */
    failed: number;
    /** 跳过数 */
    skipped: number;
    /** 详细映射 */
    mappings: TransferManagerResult["mappings"];
    /** 错误列表 */
    errors: Array<{ url: string; error: string }>;
}

/**
 * Transfer Assets Service 实现
 *
 * @description
 * 跨存储转移：从源存储下载图片，上传到目标存储，替换 Markdown 引用。
 */
export class TransferAssetsService implements Service<TransferAssetsServiceConfig> {
    readonly id = "transfer" as const;

    private config: TransferAssetsServiceConfig;

    constructor(config: TransferAssetsServiceConfig) {
        this.config = config;
    }

    initialize(config?: TransferAssetsServiceConfig): void {
        if (config) {
            this.config = config;
        }
    }

    /**
     * 转移 Markdown 文档中的远程图片
     *
     * @param document - Markdown 文档内容
     * @param filePath - 文件路径（用于上下文）
     * @returns 转移结果
     */
    async transferImages(
        document: string,
        filePath: string,
        options?: {
            sourceDomain?: string;
            targetDomain?: string;
            concurrency?: number;
            deleteSource?: boolean;
        },
    ): Promise<TransferAssetsResult> {
        this.config.logger?.info("[TransferAssetsService] Starting transfer for document");

        // 使用第一个 sourceAdapter 作为默认源
        // TODO: 支持多源 adapter 匹配（需要 TransferManager 支持）
        const sourceAdapter = this.config.sourceAdapters[0]?.adapter;
        if (!sourceAdapter) {
            return {
                content: document,
                transferred: 0,
                failed: 0,
                skipped: 0,
                mappings: [],
                errors: [{ url: "*", error: "No source adapter configured" }],
            };
        }

        const manager = createTransferManager({
            source: {
                adapter: sourceAdapter,
                domain: options?.sourceDomain ?? this.config.sourceDomain,
            },
            target: {
                adapter: this.config.targetAdapter,
                domain: options?.targetDomain ?? this.config.targetDomain,
                prefix: this.config.targetPrefix,
                namingTemplate: this.config.namingTemplate,
            },
            options: {
                concurrency: options?.concurrency ?? this.config.concurrency,
                deleteSource: options?.deleteSource ?? this.config.deleteSource,
            },
        });

        const result = await manager.transferContent(document, filePath);

        this.config.logger?.info(
            `[TransferAssetsService] Transfer complete: ${result.success} images transferred`,
        );

        return {
            content: result.newContent ?? document,
            transferred: result.success,
            failed: result.failed,
            skipped: result.skipped,
            mappings: result.mappings,
            errors: result.errors,
        };
    }
}

/**
 * 创建 TransferAssetsService 实例
 */
export function createTransferAssetsService(
    config: TransferAssetsServiceConfig,
): TransferAssetsService {
    return new TransferAssetsService(config);
}
