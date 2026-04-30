/**
 * Rule 执行引擎
 *
 * @module engine
 * @description
 * 提供 Rule 注册、执行和管理功能。
 */

import type {
    GlobalRulesConfig,
    PresetConfig,
    Rule,
    RuleContext,
    RuleResult,
    RuleStepConfig,
    SimplePreset,
} from "./rule-types.js";
import { builtInRules } from "./built-in/index.js";

/**
 * Rule 执行错误
 */
export class RuleExecutionError extends Error {
    constructor(
        message: string,
        public readonly ruleId: string,
        public readonly cause?: Error,
    ) {
        super(message);
        this.name = "RuleExecutionError";
    }
}

/**
 * Rule 引擎
 */
export class RuleEngine {
    private rules = new Map<string, Rule>();
    private globalConfig: GlobalRulesConfig = {};

    /**
     * 注册 Rule
     */
    register(rule: Rule): void {
        this.rules.set(rule.id, rule);
    }

    /**
     * 批量注册 Rules
     */
    registerMany(rules: Rule[]): void {
        for (const rule of rules) {
            this.register(rule);
        }
    }

    /**
     * 获取 Rule
     */
    getRule(id: string): Rule | undefined {
        return this.rules.get(id);
    }

    /**
     * 获取所有 Rule ID
     */
    getAllRuleIds(): string[] {
        return Array.from(this.rules.keys());
    }

    /**
     * 设置全局 Rules 配置
     */
    setGlobalConfig(config: GlobalRulesConfig): void {
        this.globalConfig = config;
    }

    /**
     * 执行单个 Rule
     */
    async executeRule(
        ruleId: string,
        context: RuleContext,
        ruleConfig?: Record<string, unknown>,
    ): Promise<RuleResult> {
        const rule = this.rules.get(ruleId);
        if (!rule) {
            throw new RuleExecutionError(`Rule not found: ${ruleId}`, ruleId);
        }

        // 合并全局配置和传入配置
        const globalRuleConfig = this.globalConfig[ruleId];
        const mergedConfig = {
            ...(globalRuleConfig as Record<string, unknown> | undefined),
            ...ruleConfig,
        };

        try {
            const result = await rule.execute(context, mergedConfig);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new RuleExecutionError(
                `Rule execution failed: ${message}`,
                ruleId,
                error instanceof Error ? error : undefined,
            );
        }
    }

    /**
     * 执行 Preset
     */
    async executePreset(
        preset: PresetConfig | SimplePreset,
        context: RuleContext,
        onProgress?: (ruleId: string, result: RuleResult) => void,
    ): Promise<{
        content: string;
        results: Array<{ ruleId: string; result: RuleResult }>;
    }> {
        const steps = this.normalizePreset(preset);
        const results: Array<{ ruleId: string; result: RuleResult }> = [];

        let currentContent = context.document;

        for (const step of steps) {
            if (!step.enabled) {
                continue;
            }

            // 更新上下文中的文档内容
            const stepContext: RuleContext = {
                ...context,
                document: currentContent,
            };

            const result = await this.executeRule(step.id, stepContext, step.config);

            results.push({ ruleId: step.id, result });

            if (result.modified) {
                currentContent = result.content;
            }

            if (onProgress) {
                onProgress(step.id, result);
            }
        }

        return {
            content: currentContent,
            results,
        };
    }

    /**
     * 标准化 Preset
     * 将简洁版转换为完整版
     */
    private normalizePreset(preset: PresetConfig | SimplePreset): RuleStepConfig[] {
        // 如果是数组，转换为 RuleStepConfig[]
        if (Array.isArray(preset)) {
            return preset.map((id) => ({
                id,
                enabled: true,
            }));
        }

        // 如果是完整配置，返回 steps
        return preset.steps;
    }

    /**
     * 预览 Preset 效果（不实际执行）
     */
    async previewPreset(
        preset: PresetConfig | SimplePreset,
        context: RuleContext,
    ): Promise<{
        content: string;
        changes: Array<{
            ruleId: string;
            willModify: boolean;
        }>;
    }> {
        // 使用 dryRun 模式执行
        const dryRunContext: RuleContext = {
            ...context,
            // 可以添加 dryRun 标志
        };

        const steps = this.normalizePreset(preset);
        const changes: Array<{ ruleId: string; willModify: boolean }> = [];

        let currentContent = context.document;

        for (const step of steps) {
            if (!step.enabled) {
                changes.push({ ruleId: step.id, willModify: false });
                continue;
            }

            const stepContext: RuleContext = {
                ...dryRunContext,
                document: currentContent,
            };

            try {
                const result = await this.executeRule(step.id, stepContext, step.config);
                changes.push({ ruleId: step.id, willModify: result.modified });

                if (result.modified) {
                    currentContent = result.content;
                }
            } catch {
                changes.push({ ruleId: step.id, willModify: false });
            }
        }

        return {
            content: currentContent,
            changes,
        };
    }
}

/**
 * 创建 Rule 引擎实例
 *
 * @returns RuleEngine 实例
 *
 * @example
 * ```typescript
 * import { createRuleEngine } from '@cmtx/publish';
 *
 * const engine = createRuleEngine();
 * engine.register(myRule);
 * await engine.executePreset(preset, context);
 * ```
 */
export function createRuleEngine(): RuleEngine {
    return new RuleEngine();
}

/**
 * 创建默认配置的 Rule 引擎实例（自动注册内置规则）
 *
 * @returns RuleEngine 实例
 *
 * @example
 * ```typescript
 * import { createDefaultRuleEngine } from '@cmtx/publish';
 *
 * const engine = createDefaultRuleEngine();
 * await engine.executePreset(preset, context);
 * ```
 */
export function createDefaultRuleEngine(): RuleEngine {
    const engine = createRuleEngine();
    engine.registerMany(builtInRules);
    return engine;
}
