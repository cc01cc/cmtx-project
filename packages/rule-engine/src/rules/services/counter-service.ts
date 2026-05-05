/**
 * 计数器服务实现
 *
 * @module counter-service
 * @description
 * 提供计数器功能，用于 ID 生成等场景。
 */

import type { CounterService, CounterServiceConfig } from "../service-registry.js";

/**
 * 计数器服务实现
 */
export class CounterServiceImpl implements CounterService {
    readonly id = "counter" as const;

    private currentValue: number;
    private step: number;

    constructor(config?: CounterServiceConfig) {
        this.currentValue = config?.initialValue ?? 0;
        this.step = config?.step ?? 1;
    }

    /**
     * 初始化服务
     * @param config - 计数器配置
     */
    initialize(config?: CounterServiceConfig): void {
        if (config?.initialValue !== undefined) {
            this.currentValue = config.initialValue;
        }
        if (config?.step !== undefined) {
            this.step = config.step;
        }
    }

    /**
     * 获取下一个计数值
     * @returns 下一个值
     */
    next(): number {
        const value = this.currentValue;
        this.currentValue += this.step;
        return value;
    }

    /**
     * 获取当前值
     * @returns 当前值
     */
    current(): number {
        return this.currentValue;
    }

    /**
     * 重置计数器
     * @param value - 重置值，默认为 0
     */
    reset(value?: number): void {
        this.currentValue = value ?? 0;
    }
}

/**
 * 创建计数器服务
 * @param config - 计数器配置
 * @returns CounterService 实例
 */
export function createCounterService(config?: CounterServiceConfig): CounterService {
    return new CounterServiceImpl(config);
}
