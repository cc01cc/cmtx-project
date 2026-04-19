/**
 * 进度追踪器
 *
 * @module utils/progress-tracker
 * @description
 * 追踪传输任务的进度，提供统计信息和回调通知。
 */

import type { TransferEvent, TransferEventType, TransferProgress } from '../transfer/types.js';

/**
 * 进度追踪器配置
 */
export interface ProgressTrackerConfig {
    /** 总数 */
    total: number;

    /** 总字节数 */
    totalBytes: number;

    /** 进度回调 */
    onProgress?: (progress: TransferProgress) => void;

    /** 事件回调 */
    onEvent?: (event: TransferEvent) => void;
}

/**
 * 进度追踪器
 */
export class ProgressTracker {
    private readonly config: ProgressTrackerConfig;
    private current = 0;
    private success = 0;
    private failed = 0;
    private skipped = 0;
    private bytesTransferred = 0;

    constructor(config: ProgressTrackerConfig) {
        this.config = config;
    }

    /**
     * 开始处理文件
     * @param fileName - 文件名
     * @param status - 初始状态
     */
    start(fileName: string, status: TransferProgress['status'] = 'downloading'): void {
        this.current++;
        this.notifyProgress(fileName, status);
        this.notifyEvent('transfer:start', { originalUrl: fileName });
    }

    /**
     * 更新状态
     * @param fileName - 文件名
     * @param status - 新状态
     * @param bytesDelta - 字节变化量
     */
    update(fileName: string, status: TransferProgress['status'], bytesDelta = 0): void {
        this.bytesTransferred += bytesDelta;
        this.notifyProgress(fileName, status);
    }

    /**
     * 标记完成
     * @param fileName - 文件名
     * @param newUrl - 新 URL
     */
    complete(fileName: string, newUrl?: string): void {
        this.success++;
        this.notifyProgress(fileName, 'completed');
        this.notifyEvent('transfer:complete', { originalUrl: fileName, newUrl });
    }

    /**
     * 标记失败
     * @param fileName - 文件名
     * @param error - 错误信息
     */
    fail(fileName: string, error: Error): void {
        this.failed++;
        this.notifyProgress(fileName, 'failed');
        this.notifyEvent('transfer:error', { originalUrl: fileName, error });
    }

    /**
     * 标记跳过
     * @param fileName - 文件名
     */
    skip(fileName: string): void {
        this.skipped++;
        this.notifyEvent('transfer:complete', { originalUrl: fileName, skipped: true });
    }

    /**
     * 获取当前进度
     * @param fileName - 当前文件名
     * @param status - 当前状态
     * @returns 进度信息
     */
    getProgress(fileName: string, status: TransferProgress['status']): TransferProgress {
        return {
            current: this.current,
            total: this.config.total,
            fileName,
            bytesTransferred: this.bytesTransferred,
            totalBytes: this.config.totalBytes,
            status,
        };
    }

    /**
     * 获取统计信息
     * @returns 统计信息
     */
    getStats(): {
        total: number;
        current: number;
        success: number;
        failed: number;
        skipped: number;
        bytesTransferred: number;
        totalBytes: number;
    } {
        return {
            total: this.config.total,
            current: this.current,
            success: this.success,
            failed: this.failed,
            skipped: this.skipped,
            bytesTransferred: this.bytesTransferred,
            totalBytes: this.config.totalBytes,
        };
    }

    /**
     * 通知进度更新
     * @param fileName - 文件名
     * @param status - 状态
     */
    private notifyProgress(fileName: string, status: TransferProgress['status']): void {
        if (this.config.onProgress) {
            this.config.onProgress(this.getProgress(fileName, status));
        }
    }

    /**
     * 通知事件
     * @param type - 事件类型
     * @param data - 事件数据
     */
    private notifyEvent(type: TransferEventType, data?: TransferEvent['data']): void {
        if (this.config.onEvent) {
            this.config.onEvent({
                type,
                timestamp: Date.now(),
                data,
            });
        }
    }
}

/**
 * 创建进度追踪器
 * @param config - 配置
 * @returns ProgressTracker 实例
 */
export function createProgressTracker(config: ProgressTrackerConfig): ProgressTracker {
    return new ProgressTracker(config);
}
