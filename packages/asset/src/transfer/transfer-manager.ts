/**
 * 传输管理器
 *
 * @module transfer/transfer-manager
 * @description
 * 集成 Markdown 处理、URL 解析和传输服务，提供完整的传输功能。
 */

import { promises as fs } from "node:fs";
import type { ReplaceOptions, ReplaceResult } from "@cmtx/core";
import { replaceImagesInText } from "@cmtx/core";
import pLimit from "p-limit";
import { createProgressTracker } from "../utils/progress-tracker.js";
import { createTempManager, type TempManager } from "../utils/temp-manager.js";
import { createUrlParser } from "../utils/url-parser.js";
import { createTransferService } from "./transfer-service.js";
import type { InternalTransferConfig, TransferResult, UrlMapping } from "./types.js";

/**
 * 传输管理器
 */
export class TransferManager {
    private readonly config: InternalTransferConfig;
    private tempManager: TempManager;
    private taskDir: string | null = null;

    constructor(config: InternalTransferConfig) {
        this.config = config;
        this.tempManager = createTempManager(config.options?.tempDir);
    }

    /**
     * 传输 Markdown 文件中的远程图片
     * @param filePath - Markdown 文件路径
     * @returns 传输结果
     */
    async transferMarkdown(filePath: string): Promise<TransferResult> {
        // 读取 Markdown 文件
        const content = await fs.readFile(filePath, "utf-8");
        return this.transferContent(content, filePath);
    }

    /**
     * 传输 Markdown 内容中的远程图片
     * @param content - Markdown 内容
     * @param filePath - 文件路径（用于上下文）
     * @returns 传输结果
     */
    async transferContent(content: string, _filePath: string): Promise<TransferResult> {
        // 创建任务临时目录
        this.taskDir = await this.tempManager.createTaskDir();

        try {
            // 解析源存储的 URL
            const urlParser = createUrlParser({
                sourceDomains: this.getSourceDomains(),
            });

            const parsedUrls = urlParser.parseSourceUrls(content);
            const matchedUrls = parsedUrls.filter((url) => url.isMatch && url.remotePath);

            if (matchedUrls.length === 0) {
                return {
                    total: 0,
                    success: 0,
                    failed: 0,
                    skipped: 0,
                    mappings: [],
                    errors: [],
                };
            }

            // 创建进度追踪器
            // 注意：matchedUrls 是字符串数组，没有 size 属性
            // 实际大小需要在传输时从元数据获取
            const totalBytes = 0; // 将在传输过程中更新
            const progressTracker = createProgressTracker({
                total: matchedUrls.length,
                totalBytes,
                onProgress: this.config.options?.onProgress,
            });

            // 创建传输服务
            const transferService = createTransferService({
                transferConfig: this.config,
                tempManager: this.tempManager,
                progressTracker,
                taskDir: this.taskDir,
            });

            // 设置并发限制
            const concurrency = this.config.options?.concurrency ?? 5;
            const limit = pLimit(concurrency);

            // 执行传输
            const mappings = await Promise.all(
                matchedUrls.map((url) =>
                    limit(() => transferService.transfer(url.originalUrl, url.remotePath ?? "")),
                ),
            );

            // 替换 Markdown 中的 URL
            const newContent = this.replaceUrls(content, mappings);

            // 返回结果
            return {
                total: mappings.length,
                success: mappings.filter((m) => m.success).length,
                failed: mappings.filter((m) => !m.success && !m.error?.includes("skip")).length,
                skipped: mappings.filter((m) => m.error?.includes("skip")).length,
                mappings,
                errors: mappings
                    .filter((m) => !m.success && !m.error?.includes("skip"))
                    .map((m) => ({
                        url: m.originalUrl,
                        error: m.error || "Unknown error",
                    })),
                newContent,
            };
        } finally {
            // 清理临时文件
            if (this.taskDir) {
                await this.tempManager.cleanup(this.taskDir);
                this.taskDir = null;
            }
        }
    }

    /**
     * 批量传输多个 Markdown 文件
     * @param filePaths - 文件路径列表
     * @returns 传输结果列表
     */
    async transferBatch(filePaths: string[]): Promise<Map<string, TransferResult>> {
        const results = new Map<string, TransferResult>();

        for (const filePath of filePaths) {
            const result = await this.transferMarkdown(filePath);
            results.set(filePath, result);
        }

        return results;
    }

    /**
     * 获取源存储域名列表
     * @returns 域名列表
     */
    private getSourceDomains(): string[] {
        const domains: string[] = [];

        if (this.config.source.domain) {
            domains.push(this.config.source.domain);
        }

        return domains;
    }

    /**
     * 替换 Markdown 中的 URL
     * @param content - 原始内容
     * @param mappings - URL 映射列表
     * @returns 替换后的内容
     */
    private replaceUrls(content: string, mappings: UrlMapping[]): string {
        const urlMap = new Map<string, string>();
        for (const mapping of mappings) {
            if (mapping.success) {
                urlMap.set(mapping.originalUrl, mapping.newUrl);
            }
        }

        if (urlMap.size === 0) {
            return content;
        }

        // 使用 replaceImagesInText 替换 URL
        const replaceOptions: ReplaceOptions[] = [];
        for (const [originalUrl, newUrl] of urlMap.entries()) {
            replaceOptions.push({
                field: "src",
                pattern: originalUrl,
                newSrc: newUrl,
            });
        }
        const result: ReplaceResult = replaceImagesInText(content, replaceOptions);
        return result.newText;
    }
}

/**
 * 创建传输管理器
 * @param config - 传输配置（内部配置，包含适配器）
 * @returns TransferManager 实例
 */
export function createTransferManager(config: InternalTransferConfig): TransferManager {
    return new TransferManager(config);
}

/**
 * 传输远程图片（便捷函数）
 * @param filePath - Markdown 文件路径
 * @param config - 传输配置（内部配置，包含适配器）
 * @returns 传输结果
 * @public
 */
export async function transferRemoteImages(
    filePath: string,
    config: InternalTransferConfig,
): Promise<TransferResult> {
    const manager = createTransferManager(config);
    return manager.transferMarkdown(filePath);
}
