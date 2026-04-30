/**
 * Core Service 内部包装器
 *
 * @module core-service-wrapper
 * @description
 * 在 @cmtx/publish 内部包装 @cmtx/core 的函数 API 为 Service 接口。
 * 仅供 publish 包内部 Rule 引擎使用，不对外暴露。
 */

import type { ImageFilterOptions, ImageMatch, ReplaceOptions, ReplaceResult } from "@cmtx/core";
import { filterImagesInText, replaceImagesInText } from "@cmtx/core";
import type { Service } from "../service-registry.js";

/**
 * Core Service 配置
 */
export interface CoreServiceConfig {
    /** 日志回调（可选） */
    logger?: (level: string, message: string, data?: unknown) => void;
}

/**
 * Core Service 内部实现
 *
 * @description
 * 包装 @cmtx/core 的核心函数，提供统一的 Service 接口
 * 仅供 publish 包内部 Rule 引擎使用
 */
export class CoreService implements Service<CoreServiceConfig> {
    readonly id = "core" as const;

    private logger?: CoreServiceConfig["logger"];

    constructor(config?: CoreServiceConfig) {
        this.logger = config?.logger;
    }

    /**
     * 初始化服务
     * @param config - CoreService 配置
     */
    initialize(config?: CoreServiceConfig): void {
        if (config?.logger) {
            this.logger = config.logger;
        }
    }

    /**
     * 从文档中筛选图片
     * @param document - Markdown 文档内容
     * @param options - 筛选选项
     * @returns 匹配的图片列表
     */
    filterImages(document: string, options?: ImageFilterOptions): ImageMatch[] {
        this.logger?.("debug", "[CoreService] Filtering images");
        return filterImagesInText(document, options);
    }

    /**
     * 替换文档中的图片
     * @param document - Markdown 文档内容
     * @param replacements - 替换规则
     * @returns 替换后的文档内容
     */
    replaceImages(document: string, replacements: ReplaceOptions[]): string {
        this.logger?.("debug", `[CoreService] Replacing ${replacements.length} images`);
        const result: ReplaceResult = replaceImagesInText(document, replacements);
        return result.newText;
    }
}

/**
 * 创建 CoreService 实例
 * @param config - CoreService 配置
 * @returns CoreService 实例
 */
export function createCoreService(config?: CoreServiceConfig): CoreService {
    return new CoreService(config);
}
