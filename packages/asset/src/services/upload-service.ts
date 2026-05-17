/**
 * Upload Service
 *
 * @module services/upload-service
 * @description
 * 负责将 Markdown 文档中的本地图片上传到对象存储。
 * 单存储目标，持有单个 StorageAdapter。
 */

import { filterImages, isWebSource, applyReplacementOps, type Logger } from "@cmtx/core";
import type { ReplacementOp } from "@cmtx/core";
import type { StorageAdapter } from "@cmtx/storage";
import type { ReplaceConfig } from "../config/types.js";
import { batchUploadImages, matchesToSources } from "../upload/index.js";
import { renderReplacementText } from "../upload/batch-upload.js";
import type { ConflictResolutionStrategy, FailedItemDetail } from "../upload/types.js";
import type { Service } from "./service-registry.js";

/**
 * Upload Service 配置
 */
export interface UploadServiceConfig {
    /** 上传目标存储适配器（单存储） */
    adapter: StorageAdapter;
    /** 上传前缀 */
    prefix?: string;
    /** 命名模板 */
    namingTemplate?: string;
    /** 冲突处理策略 */
    conflictStrategy?: ConflictResolutionStrategy;
    /** 图片替换配置 */
    replace?: ReplaceConfig;
    /** 日志回调 */
    logger?: Logger;
    /** 自定义域名（上传后 URL 替换为此域名） */
    domain?: string;
}

/**
 * Upload 调用时可选覆盖参数
 * 用于 Rule 执行时动态覆盖 Service 配置
 */
export interface UploadInvocationOptions {
    /** 上传前缀 */
    prefix?: string;
    /** 命名模板 */
    namingTemplate?: string;
    /** 冲突处理策略 */
    conflictStrategy?: ConflictResolutionStrategy;
    /** 图片替换配置 */
    replace?: ReplaceConfig;
    /** 自定义域名（上传后 URL 替换为此域名） */
    domain?: string;
}

/**
 * 上传结果
 */
export interface UploadResult {
    /** 处理后的 Markdown 内容 */
    content: string;
    /** 成功上传的图片数 */
    succeeded: number;
    /** 失败的图片详情 */
    failed: FailedItemDetail[];
    /** 跳过的项 */
    skipped: FailedItemDetail[];
    /** 下载的项 */
    downloaded: FailedItemDetail[];
}

/**
 * Upload Service 实现
 *
 * @description
 * 单存储上传：将 Markdown 中的本地图片上传到一个目标存储。
 */
export class UploadService implements Service<UploadServiceConfig> {
    readonly id = "upload" as const;

    private config: UploadServiceConfig;

    constructor(config: UploadServiceConfig) {
        this.config = config;
    }

    initialize(config?: UploadServiceConfig): void {
        if (config) {
            this.config = config;
        }
    }

    /**
     * 上传 Markdown 文档中的本地图片
     *
     * @param document - Markdown 文档内容
     * @param basePath - 基础目录（本地图片的相对路径基准）
     * @param options - 可选覆盖参数（调用时动态覆盖 Service 配置）
     * @returns 上传结果
     */
    async uploadImagesInDocument(
        document: string,
        basePath: string,
        options?: UploadInvocationOptions,
    ): Promise<UploadResult> {
        this.config.logger?.info("[UploadService] Starting upload for document");

        // 合并配置：options > this.config
        const effectiveConfig = {
            adapter: this.config.adapter,
            namingTemplate: options?.namingTemplate ?? this.config.namingTemplate,
            prefix: options?.prefix ?? this.config.prefix,
            conflictStrategy: options?.conflictStrategy ?? this.config.conflictStrategy,
            replace: options?.replace ?? this.config.replace,
            domain: options?.domain ?? this.config.domain,
            logger: this.config.logger,
        };

        const allMatches = filterImages(document);
        const localMatches = allMatches.filter(
            (m) => !isWebSource(m.src) && !m.src.startsWith("data:image/"),
        );

        if (localMatches.length === 0) {
            return { content: document, succeeded: 0, failed: [], skipped: [], downloaded: [] };
        }

        const sources = matchesToSources(localMatches, basePath);

        const batchResult = await batchUploadImages(sources, {
            adapter: effectiveConfig.adapter,
            namingTemplate: effectiveConfig.namingTemplate,
            prefix: effectiveConfig.prefix,
            conflictStrategy: effectiveConfig.conflictStrategy,
            logger: effectiveConfig.logger,
        });

        const replaceDomain = (url: string): string => {
            if (!effectiveConfig.domain) return url;
            try {
                const parsed = new URL(url);
                return url.replace(parsed.host, effectiveConfig.domain);
            } catch {
                return url;
            }
        };

        const ops: ReplacementOp[] = [];
        for (let i = 0; i < localMatches.length; i++) {
            const cloudResult = batchResult.lookup(sources[i]);
            if (!cloudResult || cloudResult.action === "skipped") continue;
            const newText = renderReplacementText(
                localMatches[i],
                { cloudUrl: replaceDomain(cloudResult.cloudUrl), variables: cloudResult.variables },
                effectiveConfig.replace as
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
            `[UploadService] Upload complete: ${batchResult.uploaded.length} images uploaded`,
        );

        return {
            content: finalContent,
            succeeded: batchResult.uploaded.length,
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
}

/**
 * 创建 UploadService 实例
 */
export function createUploadService(config: UploadServiceConfig): UploadService {
    return new UploadService(config);
}
