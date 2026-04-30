import type { CloudStorageConfig } from "@cmtx/storage";

export type { CloudStorageConfig } from "@cmtx/storage";

export interface PresignedUrlCacheItem {
    url: string;
    timestamp: number;
    expires: number;
}

export interface PresignedUrlCache {
    [key: string]: PresignedUrlCacheItem;
}

export interface IUrlCacheManager {
    get(url: string): string | null;
    set(originalUrl: string, signedUrl: string, expireInSeconds: number): void;
    has(url: string): boolean;
    clear(): void;
    canRetry(url: string, maxRetryCount: number): boolean;
    getRetryCount(url: string): number;
    recordFailure(url: string): number;
    resetRetry(url: string): void;
    addPendingRequest(url: string, promise: Promise<string>): void;
    getPendingRequest(url: string): Promise<string> | undefined;
    removePendingRequest(url: string): void;
    waitForAllPending(): Promise<void>;
}

export interface PresignedUrlDomainConfig {
    /** 域名（用于匹配 Markdown 中的图片 URL） */
    domain: string;
    /** 引用 storages 中的 storage ID（模式 1：复用 storage pool） */
    useStorage?: string;
    /** 独立配置 provider 类型（模式 2：独立配置，不复用 storages） */
    provider?: string;
    /** 独立配置时的存储配置（与 provider 一起使用） */
    config?: CloudStorageConfig;
    /** 该 domain 使用的路径前缀 */
    prefix?: string;
}

export interface PresignedUrlAdapterOptions {
    /** 存储池配置：storage ID -> CloudStorageConfig */
    storageConfigs: Record<string, CloudStorageConfig>;
    /** 域名配置数组：每个 domain 可以引用 storage pool 或独立配置 */
    domains: PresignedUrlDomainConfig[];
    /** 预签名 URL 过期时间（秒） */
    expire: number;
    /** 最大重试次数 */
    maxRetryCount: number;
    /** 日志接口 */
    logger?: {
        debug: (message: string, ...args: unknown[]) => void;
        info: (message: string, ...args: unknown[]) => void;
        warn: (message: string, ...args: unknown[]) => void;
        error: (message: string, ...args: unknown[]) => void;
    };
}
