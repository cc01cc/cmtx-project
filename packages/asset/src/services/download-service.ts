/**
 * Download Service
 *
 * @module services/download-service
 * @description
 * 负责将 Markdown 文档中的远程图片下载到本地。
 * 支持多存储源：根据 URL 域名自动选择对应的 storage adapter。
 */

import { promises as fs } from "node:fs";
import type { StorageAdapter } from "@cmtx/storage";
import type { Logger } from "@cmtx/core";
import { DownloadService as DownloadTaskService } from "../download/download-service.js";
import type { DownloadOptions, DownloadResult } from "../download/types.js";
import type { Service } from "./service-registry.js";

/**
 * 多存储域名配置
 */
export interface StorageDomainConfig {
    /** 自定义域名（用于 URL 匹配） */
    domain: string;
    /** 对应的存储适配器 */
    adapter: StorageAdapter;
}

/**
 * Download Assets Service 配置
 */
export interface DownloadServiceConfig {
    /** 多存储源（domain → adapter 映射，可选） */
    sourceAdapters?: StorageDomainConfig[];
    /** 命名模板 */
    namingTemplate?: string;
    /** 下载并发数 */
    concurrency?: number;
    /** 日志回调 */
    logger?: Logger;
}

/**
 * Download 调用时可选覆盖参数
 * 用于 Rule 执行时动态覆盖 Service 配置
 */
export interface DownloadInvocationOptions {
    /** 命名模板 */
    namingTemplate?: string;
    /** 下载并发数 */
    concurrency?: number;
    /** 只下载指定域名的图片 */
    domain?: string;
    /** 是否覆盖已存在的文件 */
    overwrite?: boolean;
}

/**
 * 下载结果（简化版）
 */
export interface SimpleDownloadResult {
    /** 成功数 */
    succeeded: number;
    /** 失败数 */
    failed: number;
    /** 跳过数 */
    skipped: number;
}

/**
 * Download Assets Service 实现
 *
 * @description
 * 多存储下载：根据 URL 域名匹配 storage adapter，未匹配则回退 HTTP。
 */
export class DownloadService implements Service<DownloadServiceConfig> {
    readonly id = "download" as const;

    private config: DownloadServiceConfig;

    constructor(config: DownloadServiceConfig) {
        this.config = config;
    }

    initialize(config?: DownloadServiceConfig): void {
        if (config) {
            this.config = config;
        }
    }

    /**
     * 根据 URL 查找匹配的 storage adapter
     *
     * @param url - 图片 URL
     * @returns 匹配的 adapter，未匹配返回 undefined
     */
    private findAdapterForUrl(url: string): StorageAdapter | undefined {
        if (!this.config.sourceAdapters || this.config.sourceAdapters.length === 0) {
            return undefined;
        }

        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;

            for (const entry of this.config.sourceAdapters) {
                // 支持精确匹配和子域名匹配
                if (hostname === entry.domain || hostname.endsWith(`.${entry.domain}`)) {
                    return entry.adapter;
                }
            }
        } catch {
            // URL 解析失败，回退到 HTTP
        }

        return undefined;
    }

    /**
     * 下载 Markdown 文档中的远程图片
     *
     * @param document - Markdown 文档内容
     * @param outputDir - 输出目录
     * @param options - 可选覆盖参数（调用时动态覆盖 Service 配置）
     * @returns 下载结果
     */
    async downloadImages(
        document: string,
        outputDir: string,
        options?: DownloadInvocationOptions,
    ): Promise<SimpleDownloadResult> {
        this.config.logger?.info("[DownloadService] Starting download for document");

        // 合并配置：options > this.config
        const effectiveConfig = {
            concurrency: options?.concurrency ?? this.config.concurrency,
            namingTemplate: options?.namingTemplate ?? this.config.namingTemplate,
        };

        // 对于单 adapter 场景（向后兼容），使用第一个 sourceAdapter
        // 对于多 adapter 场景，DownloadTaskService 的 domain 过滤 + HTTP 回退已覆盖
        const adapter = this.config.sourceAdapters?.[0]?.adapter;

        const downloadService = new DownloadTaskService({
            adapter,
            options: {
                outputDir,
                concurrency: effectiveConfig.concurrency,
                namingTemplate: effectiveConfig.namingTemplate,
                domain: options?.domain,
                overwrite: options?.overwrite,
            },
        });

        const result: DownloadResult = await downloadService.downloadFromContent(document);

        this.config.logger?.info(
            `[DownloadService] Download complete: ${result.succeeded} images downloaded`,
        );

        return {
            succeeded: result.succeeded,
            failed: result.failed,
            skipped: result.skipped,
        };
    }

    /**
     * 下载单个 URL 到本地文件
     *
     * @param url - 图片 URL
     * @param localPath - 本地保存路径
     * @returns 文件大小（字节）
     */
    async downloadSingleUrl(url: string, localPath: string): Promise<number> {
        const adapter = this.findAdapterForUrl(url);

        if (adapter && adapter.downloadToFile) {
            await adapter.downloadToFile(url, localPath);
            const stats = await fs.stat(localPath);
            return stats.size;
        }

        // 回退到 HTTP 下载
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        await fs.writeFile(localPath, Buffer.from(buffer));
        return buffer.byteLength;
    }
}

/**
 * 创建 DownloadService 实例
 */
export function createDownloadService(config: DownloadServiceConfig): DownloadService {
    return new DownloadService(config);
}
