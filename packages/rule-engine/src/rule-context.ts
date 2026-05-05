/**
 * Rule 引擎上下文工厂
 *
 * @module rule-context
 * @description
 * 提供统一的 Rule 引擎上下文创建函数，封装引擎创建、服务注册、上下文构建的标准流程。
 * 适用于 CLI 和 VS Code 等应用层，消除重复的引擎设置逻辑。
 *
 * @example
 * ```typescript
 * // 基础用法（无存储服务）
 * const { engine, registry } = createRuleEngineContext();
 *
 * // 带上传服务
 * const { engine, registry } = createRuleEngineContext({
 *   upload: { adapter: myAdapter, prefix: "images/" },
 * });
 *
 * // 带多存储下载服务
 * const { engine, registry } = createRuleEngineContext({
 *   download: {
 *     sourceAdapters: [
 *       { domain: "private.example.com", adapter: ossAdapter },
 *     ],
 *   },
 * });
 * ```
 */

import type { IStorageAdapter } from "@cmtx/storage";
import {
    createDownloadAssetsService,
    createTransferAssetsService,
    createUploadService,
} from "@cmtx/asset";
import type {
    DownloadAssetsServiceConfig,
    StorageDomainConfig,
    TransferAssetsServiceConfig,
    UploadServiceConfig,
} from "@cmtx/asset";
import { createDefaultRuleEngine, createServiceRegistry } from "./rules/index.js";
import type { RuleEngine, ServiceRegistry } from "./rules/index.js";

/**
 * Rule 引擎上下文创建选项
 */
export interface CreateRuleEngineContextOptions {
    // ========== 新 Service 配置 ==========

    /** 上传服务配置（单存储目标） */
    upload?: UploadServiceConfig;
    /** 下载服务配置（多存储源） */
    download?: DownloadAssetsServiceConfig;
    /** 转移服务配置（源 → 目标） */
    transfer?: TransferAssetsServiceConfig;

    // ========== 向后兼容（deprecated） ==========

    /** @deprecated 使用 upload.adapter 替代 */
    assetAdapter?: IStorageAdapter;
    /** @deprecated 使用 upload.prefix 替代 */
    assetPrefix?: string;
    /** @deprecated 使用 upload.namingTemplate 替代 */
    assetNamingTemplate?: string;
}

/**
 * Rule 引擎上下文创建结果
 */
export interface RuleEngineContextResult {
    /** Rule 引擎实例（已注册内置规则） */
    engine: RuleEngine;
    /** 服务注册表 */
    registry: ServiceRegistry;
}

/**
 * 创建 Rule 引擎上下文
 *
 * 封装创建引擎 + 条件注册服务的核心流程。
 * 适用于 CLI 和 VS Code 等应用层。
 *
 * @param options - 创建选项
 * @returns 引擎实例和服务注册表
 */
export function createRuleEngineContext(
    options?: CreateRuleEngineContextOptions,
): RuleEngineContextResult {
    const engine = createDefaultRuleEngine();
    const registry = createServiceRegistry();

    // 注册 UploadService
    if (options?.upload) {
        registry.register(createUploadService(options.upload));
    } else if (options?.assetAdapter) {
        // 向后兼容：从旧选项创建 UploadService
        registry.register(
            createUploadService({
                adapter: options.assetAdapter,
                prefix: options.assetPrefix,
                namingTemplate: options.assetNamingTemplate,
            }),
        );
    }

    // 注册 DownloadAssetsService
    if (options?.download) {
        registry.register(createDownloadAssetsService(options.download));
    } else if (options?.assetAdapter) {
        // 向后兼容：使用同一个 adapter 作为下载源
        registry.register(
            createDownloadAssetsService({
                sourceAdapters: [{ domain: "*", adapter: options.assetAdapter }],
                namingTemplate: options.assetNamingTemplate,
            }),
        );
    }

    // 注册 TransferAssetsService
    if (options?.transfer) {
        registry.register(createTransferAssetsService(options.transfer));
    }

    return { engine, registry };
}
