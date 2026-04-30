/**
 * Monitoring Module
 *
 * @module monitoring
 * @description
 * 提供性能监控和指标收集功能。
 *
 * @remarks
 * ## 功能概述
 *
 * 提供性能指标记录和系统监控功能，用于跟踪应用性能和资源使用。
 *
 * ## 核心功能
 *
 * ### PerformanceMonitor
 * - 记录操作耗时
 * - 计算统计数据（平均值、最小值、最大值、P95、P99）
 * - 生成性能报告
 *
 * ### MetricsCollector
 * - 收集自定义指标
 * - 存储和检索指标数据
 *
 * @example
 * ```typescript
 * import { PerformanceMonitor, MetricsCollector } from '@cmtx/core';
 *
 * // 性能监控
 * const monitor = new PerformanceMonitor();
 * monitor.record('upload', 100);
 * monitor.record('upload', 150);
 * const report = monitor.getReport();
 * console.log(report.upload.average); // 125
 *
 * // 指标收集
 * const collector = new MetricsCollector();
 * collector.collect('totalUploads', 42);
 * console.log(collector.get('totalUploads')); // 42
 * ```
 */

/**
 * 性能指标接口
 *
 * @remarks
 * 包含统计数据：数量、平均值、最小值、最大值、百分位数
 * @public
 */
export interface PerformanceMetric {
    /** 记录数量 */
    count: number;
    /** 平均值 */
    average: number;
    /** 最小值 */
    min: number;
    /** 最大值 */
    max: number;
    /** 第 95 百分位数（可选） */
    p95?: number;
    /** 第 99 百分位数（可选） */
    p99?: number;
}

/**
 * 性能报告接口
 *
 * @remarks
 * 键为指标名称，值为性能指标数据
 * @public
 */
export interface PerformanceReport {
    [key: string]: PerformanceMetric;
}

/**
 * 系统指标接口
 *
 * @remarks
 * 包含内存使用、运行时间和 CPU 使用率
 * @public
 */
export interface SystemMetrics {
    /** 内存使用情况 */
    memoryUsage: NodeJS.MemoryUsage;
    /** 运行时间（秒） */
    uptime: number;
    /** CPU 使用情况 */
    cpuUsage: NodeJS.CpuUsage;
}

/**
 * 扩展指标接口
 *
 * @remarks
 * 包含缓存命中率、平均处理时间和错误率
 * @public
 */
export interface ExtensionMetrics {
    /** 缓存命中率 (0-1) */
    cacheHitRate: number;
    /** 平均处理时间（毫秒） */
    averageProcessingTime: number;
    /** 错误率 (0-1) */
    errorRate: number;
}

/**
 * 日志条目接口
 * @public
 */
export interface LogEntry {
    /** 时间戳 */
    timestamp: string;
    /** 日志级别 */
    level: "debug" | "info" | "warn" | "error";
    /** 日志消息 */
    message: string;
    /** 额外元数据 */
    meta?: unknown;
    /** 组件名称 */
    component: string;
}

/**
 * 日志配置接口
 * @public
 */
export interface LogConfig {
    /** 日志级别 */
    level: "debug" | "info" | "warn" | "error";
    /** 日志格式 */
    format: "json" | "text";
    /** 输出目标 */
    outputs: ("console" | "file" | "vscode")[];
    /** 最大文件数（可选） */
    maxFiles?: number;
    /** 最大文件大小（可选） */
    maxSize?: string;
    /** 文件名（可选） */
    filename?: string;
}

/**
 * 性能监控器
 *
 * @remarks
 * 用于记录和统计性能指标。
 * 支持记录多个不同名称的指标，每个指标可以有多个记录值。
 *
 * @example
 * ```typescript
 * const monitor = new PerformanceMonitor();
 *
 * // 记录操作耗时
 * monitor.record('apiCall', 120);
 * monitor.record('apiCall', 95);
 * monitor.record('apiCall', 150);
 *
 * // 获取报告
 * const report = monitor.getReport();
 * console.log(report.apiCall);
 * // { count: 3, average: 121.67, min: 95, max: 150, p95: 150, p99: 150 }
 * ```
 * @public
 */
export class PerformanceMonitor {
    private metrics: Map<string, number[]> = new Map();

    /**
     * 记录性能指标
     *
     * @param metricName - 指标名称
     * @param duration - 耗时（毫秒）
     *
     * @example
     * ```typescript
     * monitor.record('upload', 100);
     * ```
     */
    record(metricName: string, duration: number): void {
        const existingMetrics = this.metrics.get(metricName);
        if (existingMetrics) {
            existingMetrics.push(duration);
        } else {
            this.metrics.set(metricName, [duration]);
        }
    }

    /**
     * 获取性能报告
     *
     * @returns 包含所有指标统计数据的报告
     *
     * @example
     * ```typescript
     * const report = monitor.getReport();
     * for (const [name, metric] of Object.entries(report)) {
     *   console.log(`${name}: avg=${metric.average}ms`);
     * }
     * ```
     */
    getReport(): PerformanceReport {
        const report: PerformanceReport = {};
        for (const [name, values] of this.metrics) {
            report[name] = this.calculateMetric(values);
        }
        return report;
    }

    /**
     * 获取单个指标的统计数据
     *
     * @param metricName - 指标名称
     * @returns 性能指标统计数据，如果指标不存在返回 undefined
     */
    getMetric(metricName: string): PerformanceMetric | undefined {
        const values = this.metrics.get(metricName);
        if (!values || values.length === 0) {
            return undefined;
        }
        return this.calculateMetric(values);
    }

    /**
     * 清空所有记录
     */
    clear(): void {
        this.metrics.clear();
    }

    /**
     * 清空指定指标的记录
     *
     * @param metricName - 指标名称
     */
    clearMetric(metricName: string): void {
        this.metrics.delete(metricName);
    }

    /**
     * 计算指标统计数据
     *
     * @param values - 记录值数组
     * @returns 计算后的性能指标
     *
     * @internal
     */
    private calculateMetric(values: number[]): PerformanceMetric {
        if (values.length === 0) {
            return {
                count: 0,
                average: 0,
                min: 0,
                max: 0,
                p95: 0,
                p99: 0,
            };
        }

        const sorted = [...values].sort((a, b) => a - b);
        const count = sorted.length;
        const sum = sorted.reduce((a, b) => a + b, 0);

        return {
            count,
            average: sum / count,
            min: sorted[0],
            max: sorted[count - 1],
            p95: sorted[Math.floor(count * 0.95)],
            p99: sorted[Math.floor(count * 0.99)],
        };
    }
}

/**
 * 指标收集器
 *
 * @remarks
 * 用于收集和存储自定义指标数据。
 * 支持任意类型的指标值。
 *
 * @example
 * ```typescript
 * const collector = new MetricsCollector();
 *
 * // 收集指标
 * collector.collect('totalRequests', 1000);
 * collector.collect('successRate', 0.98);
 * collector.collect('lastError', new Date());
 *
 * // 获取指标
 * console.log(collector.get('totalRequests')); // 1000
 * console.log(collector.getAll()); // 所有指标
 * ```
 * @public
 */
export class MetricsCollector {
    private metrics: Map<string, unknown> = new Map();

    /**
     * 收集指标
     *
     * @param name - 指标名称
     * @param value - 指标值
     *
     * @example
     * ```typescript
     * collector.collect('userCount', 42);
     * ```
     */
    collect(name: string, value: unknown): void {
        this.metrics.set(name, value);
    }

    /**
     * 获取指标值
     *
     * @param name - 指标名称
     * @returns 指标值，如果不存在返回 undefined
     */
    get(name: string): unknown {
        return this.metrics.get(name);
    }

    /**
     * 获取所有指标
     *
     * @returns 包含所有指标的对象
     */
    getAll(): Record<string, unknown> {
        return Object.fromEntries(this.metrics);
    }

    /**
     * 删除指标
     *
     * @param name - 指标名称
     */
    remove(name: string): void {
        this.metrics.delete(name);
    }

    /**
     * 清空所有指标
     */
    clear(): void {
        this.metrics.clear();
    }

    /**
     * 检查指标是否存在
     *
     * @param name - 指标名称
     * @returns 如果指标存在返回 true
     */
    has(name: string): boolean {
        return this.metrics.has(name);
    }
}
