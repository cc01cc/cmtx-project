import { createServiceRegistry, type ServiceRegistry } from "@cmtx/rule-engine/internal";
import { createAdapter } from "@cmtx/storage/adapters/factory";
import type * as vscode from "vscode";
import type { CmtxConfig, CmtxStorageConfig } from "@cmtx/asset/config";

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

    return registry;
}

/**
 * 辅助函数：创建存储适配器（异步版本）
 * 注意：实际使用时需要在异步上下文中调用
 */
export function createStorageAdapterAsync(
    storageConfig: CmtxStorageConfig,
): Promise<import("@cmtx/storage").StorageAdapter> {
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
