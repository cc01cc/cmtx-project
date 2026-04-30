/**
 * 下载服务
 *
 * @module download/download-service
 * @description
 * 执行图片下载操作：从云端 URL 下载到本地文件。
 *
 * @remarks
 * ## 下载流程
 * 1. 解析 Markdown 提取图片 URL
 * 2. 根据域名过滤 URL
 * 3. 检查本地文件是否已存在
 * 4. 下载文件到本地
 * 5. 返回下载结果
 *
 * ## 支持的下载源
 * - 公开 URL：直接 HTTP 下载
 * - 私有存储：通过 IStorageAdapter.downloadToFile 下载
 */

import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import type { IStorageAdapter } from "@cmtx/storage";
import { renderTemplate } from "@cmtx/template";
import pLimit from "p-limit";
import {
    DEFAULT_NAMING_TEMPLATE,
    generateNamingVariables,
    generateUniqueFileName,
} from "./naming-handler.js";
import type { DownloadItem, DownloadOptions, DownloadResult, ParsedUrlInfo } from "./types.js";
import { createUrlMatcher, type UrlMatcher } from "./url-matcher.js";

/**
 * 下载服务配置
 */
export interface DownloadServiceConfig {
    /** 存储适配器（可选，用于私有存储下载） */
    adapter?: IStorageAdapter;

    /** 下载选项 */
    options: DownloadOptions;
}

/**
 * 下载服务
 */
export class DownloadService {
    private readonly config: DownloadServiceConfig;
    private readonly urlMatcher: UrlMatcher;
    private readonly usedNames: Set<string> = new Set();

    constructor(config: DownloadServiceConfig) {
        this.config = config;
        this.urlMatcher = createUrlMatcher({
            domain: config.options.domain,
        });
    }

    /**
     * 从 Markdown 文件下载所有图片
     *
     * @param markdownPath - Markdown 文件路径
     * @returns 下载结果
     */
    async downloadFromMarkdown(markdownPath: string): Promise<DownloadResult> {
        const content = await fs.readFile(markdownPath, "utf-8");
        return this.downloadFromContent(content);
    }

    /**
     * 从 Markdown 内容下载所有图片
     *
     * @param content - Markdown 内容
     * @returns 下载结果
     */
    async downloadFromContent(content: string): Promise<DownloadResult> {
        // 解析 URL
        const parsedUrls = this.urlMatcher.extractUrls(content);
        const matchedUrls = parsedUrls.filter((url) => url.isMatch);

        if (matchedUrls.length === 0) {
            return {
                total: 0,
                success: 0,
                failed: 0,
                skipped: 0,
                items: [],
                errors: [],
            };
        }

        // 确保输出目录存在
        await fs.mkdir(this.config.options.outputDir, { recursive: true });

        // 并发下载
        const concurrency = this.config.options.concurrency ?? 5;
        const limit = pLimit(concurrency);

        const items = await Promise.all(
            matchedUrls.map((urlInfo, index) => limit(() => this.downloadSingle(urlInfo, index))),
        );

        // 统计结果
        const result: DownloadResult = {
            total: items.length,
            success: 0,
            failed: 0,
            skipped: 0,
            items,
            errors: [],
        };

        for (const item of items) {
            if (item.skipped) {
                result.skipped++;
            } else if (item.success) {
                result.success++;
            } else {
                result.failed++;
                result.errors.push({
                    url: item.originalUrl,
                    error: item.error || "Unknown error",
                });
            }
        }

        return result;
    }

    /**
     * 下载单个图片
     *
     * @param url - 图片 URL
     * @param outputDir - 输出目录
     * @param sequence - 序号
     * @returns 下载结果
     */
    async downloadSingleUrl(
        url: string,
        outputDir: string,
        sequence: number = 1,
    ): Promise<DownloadItem> {
        const urlInfo = this.urlMatcher.parseUrl(url);
        if (!urlInfo) {
            return {
                originalUrl: url,
                localPath: "",
                fileName: "",
                size: 0,
                success: false,
                error: "Invalid URL",
            };
        }

        // 临时保存原始配置
        const originalOutputDir = this.config.options.outputDir;
        this.config.options.outputDir = outputDir;

        try {
            return await this.downloadSingle(urlInfo, sequence);
        } finally {
            this.config.options.outputDir = originalOutputDir;
        }
    }

    /**
     * 下载单个图片（内部方法）
     *
     * @param urlInfo - URL 信息
     * @param sequence - 序号
     * @returns 下载结果
     */
    private async downloadSingle(urlInfo: ParsedUrlInfo, sequence: number): Promise<DownloadItem> {
        const { options } = this.config;

        // 生成文件名
        const namingVars = generateNamingVariables(
            urlInfo.baseName,
            urlInfo.ext,
            undefined,
            sequence,
        );

        const template = options.namingTemplate || DEFAULT_NAMING_TEMPLATE;
        let fileName = renderTemplate(template, namingVars, {
            postProcess: (result) => result.replace(/\/+/g, "/"),
        });

        // 如果使用了 MD5 变量，需要先下载内容计算 MD5
        if (
            template.includes("{md5") ||
            template.includes("{md5_8}") ||
            template.includes("{md5_16}")
        ) {
            // TODO: 先下载到临时文件，计算 MD5 后重命名
            // 当前简化处理，使用默认 MD5
        }

        // 确保文件名唯一
        fileName = generateUniqueFileName(fileName, this.usedNames);
        this.usedNames.add(fileName);

        const localPath = join(options.outputDir, fileName);

        // 检查文件是否已存在
        if (!options.overwrite) {
            try {
                await fs.access(localPath);
                return {
                    originalUrl: urlInfo.originalUrl,
                    localPath,
                    fileName,
                    size: 0,
                    success: true,
                    skipped: true,
                };
            } catch {
                // 文件不存在，继续下载
            }
        }

        // 进度回调
        options.onProgress?.({
            current: 0,
            total: 0,
            fileName,
            bytesDownloaded: 0,
            totalBytes: 0,
            status: "downloading",
        });

        try {
            // 下载文件
            const size = await this.downloadFile(urlInfo, localPath);

            options.onProgress?.({
                current: 0,
                total: 0,
                fileName,
                bytesDownloaded: size,
                totalBytes: size,
                status: "completed",
            });

            return {
                originalUrl: urlInfo.originalUrl,
                localPath,
                fileName,
                size,
                success: true,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            options.onProgress?.({
                current: 0,
                total: 0,
                fileName,
                bytesDownloaded: 0,
                totalBytes: 0,
                status: "failed",
            });

            return {
                originalUrl: urlInfo.originalUrl,
                localPath,
                fileName,
                size: 0,
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * 下载文件（支持重试）
     *
     * @param urlInfo - URL 信息
     * @param localPath - 本地路径
     * @returns 文件大小
     */
    private async downloadFile(urlInfo: ParsedUrlInfo, localPath: string): Promise<number> {
        const { adapter } = this.config;

        // 确保父目录存在
        await fs.mkdir(dirname(localPath), { recursive: true });

        // 如果有适配器且 URL 匹配存储，使用适配器下载
        if (adapter && urlInfo.remotePath && adapter.downloadToFile) {
            return this.downloadWithAdapter(urlInfo.remotePath, localPath, adapter);
        }

        // 否则使用 HTTP 下载
        return this.downloadWithHttp(urlInfo.originalUrl, localPath);
    }

    /**
     * 使用存储适配器下载
     */
    private async downloadWithAdapter(
        remotePath: string,
        localPath: string,
        adapter: IStorageAdapter,
    ): Promise<number> {
        const maxRetries = 3;
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await adapter.downloadToFile?.(remotePath, localPath);

                // 获取文件大小
                const stats = await fs.stat(localPath);
                return stats.size;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < maxRetries) {
                    await this.delay(2 ** attempt * 1000);
                }
            }
        }

        throw lastError || new Error(`Failed to download after ${maxRetries} attempts`);
    }

    /**
     * 使用 HTTP 下载
     */
    private async downloadWithHttp(url: string, localPath: string): Promise<number> {
        const maxRetries = 3;
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const buffer = await response.arrayBuffer();
                await fs.writeFile(localPath, Buffer.from(buffer));

                return buffer.byteLength;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < maxRetries) {
                    await this.delay(2 ** attempt * 1000);
                }
            }
        }

        throw lastError || new Error(`Failed to download after ${maxRetries} attempts`);
    }

    /**
     * 延迟
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

/**
 * 创建下载服务
 *
 * @param config - 配置
 * @returns DownloadService 实例
 * @public
 */
export function createDownloadService(config: DownloadServiceConfig): DownloadService {
    return new DownloadService(config);
}
