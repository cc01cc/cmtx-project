import {
    createCallbackService,
    createCounterService,
    createServiceRegistry,
    type ServiceRegistry,
} from "@cmtx/rule-engine";
import { createAdapter } from "@cmtx/storage/adapters/factory";
import type * as vscode from "vscode";
import type { CmtxConfig, CmtxStorageConfig } from "@cmtx/asset/config";
import { getModuleLogger } from "./infra/unified-logger.js";
import { CounterManager } from "./utils/counter-manager.js";

const logger = getModuleLogger("container");

/**
 * 创建 VS Code 扩展的服务容器（Composition Root）
 */
export function createVsCodeContainer(
    workspaceFolder: vscode.WorkspaceFolder | null,
    config: CmtxConfig | null,
): ServiceRegistry {
    const registry = createServiceRegistry();

    // 如果没有工作区或配置，返回空的容器
    if (!workspaceFolder || !config) {
        return registry;
    }

    // 注册回调服务（VS Code 特定实现）
    // 注意：
    // - 冲突处理已改为配置驱动（conflictStrategy: "skip" | "overwrite"）
    // - onFileExists 回调保留用于兼容性，但不再使用对话框
    // - onProgress 回调保留用于兼容性，但上传采用批量处理模式，没有中间进度回调
    const callbackService = createCallbackService({
        onFileExists: async (fileName, _remotePath, _remoteUrl) => {
            // 冲突处理策略在配置文件中定义（conflictStrategy: "skip" | "overwrite"）
            // 此回调保留用于兼容性，但不再使用对话框
            logger.warn(
                `[Container] onFileExists called for ${fileName}, but conflict handling is now config-driven`,
            );
            return "skip"; // 默认跳过，实际由配置中的 conflictStrategy 决定
        },
        onProgress: () => {
            // 上传采用批量处理模式，没有中间进度回调
            // 此回调保留用于兼容性
        },
    });
    registry.register(callbackService);

    // 计数器服务由命令按需注册（因为需要知道 counter 名称）
    // 不在此处注册，避免不必要的文件 I/O

    return registry;
}

/**
 * 辅助函数：创建存储适配器（异步版本）
 * 注意：实际使用时需要在异步上下文中调用
 */
export function createStorageAdapterAsync(
    storageConfig: CmtxStorageConfig,
): Promise<import("@cmtx/storage").IStorageAdapter> {
    if (storageConfig.adapter === "aliyun-oss") {
        const credentials = {
            provider: "aliyun-oss" as const,
            bucket: storageConfig.config.bucket || "",
            region: storageConfig.config.region || "",
            accessKeyId: storageConfig.config.accessKeyId || "",
            accessKeySecret: storageConfig.config.accessKeySecret || "",
        };
        return createAdapter(credentials);
    } else if (storageConfig.adapter === "tencent-cos") {
        const credentials = {
            provider: "tencent-cos" as const,
            bucket: storageConfig.config.bucket || "",
            region: storageConfig.config.region || "",
            secretId: storageConfig.config.accessKeyId || "",
            secretKey: storageConfig.config.accessKeySecret || "",
        };
        return createAdapter(credentials);
    } else {
        return Promise.reject(new Error(`Unsupported storage adapter: ${storageConfig.adapter}`));
    }
}

/**
 * 辅助函数：为容器添加计数器服务
 */
export async function registerCounterService(
    registry: ServiceRegistry,
    workspaceFolder: vscode.WorkspaceFolder,
    counterName: string = "global",
): Promise<void> {
    if (!workspaceFolder) {
        return;
    }

    const counterManager = new CounterManager(workspaceFolder.uri.fsPath);
    const nextValue = await counterManager.incrementAndGet(counterName);
    const counterService = createCounterService({
        initialValue: nextValue,
        step: 1,
    });
    registry.register(counterService);
}
