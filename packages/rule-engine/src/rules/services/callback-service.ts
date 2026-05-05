/**
 * 回调服务实现
 *
 * @module callback-service
 * @description
 * 提供用户交互相关的回调功能。
 */

import type { CallbackService, CallbackServiceConfig } from "../service-registry.js";

/**
 * 回调服务实现
 */
export class CallbackServiceImpl implements CallbackService {
    readonly id = "callback" as const;

    onFileExists?: (
        fileName: string,
        remotePath: string,
        remoteUrl: string,
    ) => Promise<"skip" | "replace" | "download">;

    onProgress?: (message: string) => void;

    constructor(config?: CallbackServiceConfig) {
        this.onFileExists = config?.onFileExists;
        this.onProgress = config?.onProgress;
    }

    /**
     * 初始化服务
     * @param config - 回调配置
     */
    initialize(config?: CallbackServiceConfig): void {
        if (config?.onFileExists) {
            this.onFileExists = config.onFileExists;
        }
        if (config?.onProgress) {
            this.onProgress = config.onProgress;
        }
    }

    /**
     * 销毁服务
     */
    dispose(): void {
        this.onFileExists = undefined;
        this.onProgress = undefined;
    }
}

/**
 * 创建回调服务
 * @param config - 回调配置
 * @returns CallbackService 实例
 */
export function createCallbackService(config?: CallbackServiceConfig): CallbackService {
    return new CallbackServiceImpl(config);
}
