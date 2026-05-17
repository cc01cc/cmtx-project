/**
 * Core Service 服务实现
 *
 * @module core-service
 * @description
 * 提供 Markdown 图片处理核心功能的 Service 包装。
 * 从 @cmtx/core 上移，作为 Service 层的一部分。
 */

import { filterImages, updateImageRefs } from "@cmtx/core";
import type { ImageFilterOptions, ImageMatch, ReplaceOptions, ReplaceResult } from "@cmtx/core";
import type { Service } from "./service-registry.js";

/**
 * Core Service 配置
 */
export interface CoreServiceConfig {
    /** 日志回调（可选） */
    logger?: (level: string, message: string, data?: unknown) => void;
}

/**
 * Core Service 实现
 *
 * @deprecated 已无生产调用方。直接使用 @cmtx/core 的 filterImages / updateImageRefs 函数 API。
 * 将在下一个 minor 版本 (0.6.0) 中移除。
 * @internal
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
        return filterImages(document, options);
    }

    /**
     * 替换文档中的图片
     * @param document - Markdown 文档内容
     * @param replacements - 替换规则
     * @returns 替换后的文档内容
     */
    updateImageRefs(document: string, replacements: ReplaceOptions[]): string {
        this.logger?.("debug", `[CoreService] Replacing ${replacements.length} images`);
        const result: ReplaceResult = updateImageRefs(document, replacements);
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
