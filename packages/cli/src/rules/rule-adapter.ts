/**
 * Rule 引擎适配器
 *
 * @module rules/rule-adapter
 * @description
 * 为 CLI 提供 Rule 引擎适配层，使 CLI 能够方便地使用 @cmtx/rule-engine 的 Rule 引擎。
 *
 * 职责：
 * 1. 创建和配置 ServiceRegistry
 * 2. 注册内置 Rules
 * 3. 提供简化的执行接口
 * 4. 桥接 RuleResult 到 CLI 输出格式
 */

import path from "node:path";
import type { RuleEngine, ServiceRegistry } from "@cmtx/rule-engine";
import {
    createCoreService,
    createRuleEngineContext,
    type RuleContext,
    type RuleResult,
} from "@cmtx/rule-engine";
import { createUploadService } from "@cmtx/asset";
import type { ConflictResolutionStrategy } from "@cmtx/asset/upload";
import type { IStorageAdapter } from "@cmtx/storage";

/**
 * CLI Rule 引擎适配器
 */
export class RuleEngineAdapter {
    private engine: RuleEngine;
    private registry: ServiceRegistry;

    private constructor(engine: RuleEngine, registry: ServiceRegistry) {
        this.engine = engine;
        this.registry = registry;
    }

    /**
     * 异步创建 RuleEngineAdapter 实例
     */
    static async create(): Promise<RuleEngineAdapter> {
        const { engine, registry } = createRuleEngineContext();
        return new RuleEngineAdapter(engine, registry);
    }

    /**
     * 获取 Rule 引擎实例
     */
    getEngine(): RuleEngine {
        return this.engine;
    }

    /**
     * 获取服务注册表实例
     */
    getRegistry(): ServiceRegistry {
        return this.registry;
    }

    /**
     * 配置存储服务
     */
    configureStorage(
        adapter: IStorageAdapter,
        options?: {
            prefix?: string;
            namingTemplate?: string;
            conflictStrategy?: ConflictResolutionStrategy;
        },
    ): void {
        const uploadService = createUploadService({
            adapter,
            prefix: options?.prefix,
            namingTemplate: options?.namingTemplate,
            conflictStrategy: options?.conflictStrategy,
        });
        this.registry.register(uploadService);
    }

    /**
     * 配置核心服务
     *
     * @deprecated Core 服务未被任何内置规则使用，无需注册
     */
    configureCore(): void {
        const coreService = createCoreService();
        this.registry.register(coreService);
    }

    /**
     * 执行单个 Rule
     */
    async executeRule(
        ruleId: string,
        document: string,
        filePath: string,
        options?: {
            baseDirectory?: string;
            ruleConfig?: Record<string, unknown>;
        },
    ): Promise<RuleResult> {
        const context: RuleContext = {
            document,
            filePath,
            baseDirectory: options?.baseDirectory || path.dirname(filePath),
            services: this.registry,
        };

        return this.engine.executeRule(ruleId, context, options?.ruleConfig);
    }

    /**
     * 执行 Preset（规则组合）
     */
    async executePreset(
        preset: string[],
        document: string,
        filePath: string,
        onProgress?: (current: number, total: number, ruleId: string) => void,
    ): Promise<{
        content: string;
        results: Array<{
            ruleId: string;
            modified: boolean;
            messages: string[];
        }>;
    }> {
        const context: RuleContext = {
            document,
            filePath,
            baseDirectory: path.dirname(filePath),
            services: this.registry,
        };

        const result = await this.engine.executePreset(preset, context, (ruleId, _ruleResult) => {
            if (onProgress) {
                // Note: onProgress callback signature differs, we pass 1-based index
                onProgress(1, preset.length, ruleId);
            }
        });

        // Transform result to match expected return type
        return {
            content: result.content,
            results: result.results.map((r) => ({
                ruleId: r.ruleId,
                modified: r.result.modified,
                messages: r.result.messages || [],
            })),
        };
    }

    /**
     * 预览 Preset 执行结果（不修改文件）
     */
    async previewPreset(
        preset: string[],
        document: string,
        filePath: string,
    ): Promise<{
        content: string;
        changes: Array<{ ruleId: string; willModify: boolean }>;
    }> {
        const context: RuleContext = {
            document,
            filePath,
            baseDirectory: path.dirname(filePath),
            services: this.registry,
        };

        return this.engine.previewPreset(preset, context);
    }
}

/**
 * 创建预配置的 Rule 引擎适配器（用于 CLI）
 */
export async function createRuleEngineAdapter(): Promise<RuleEngineAdapter> {
    return RuleEngineAdapter.create();
}
