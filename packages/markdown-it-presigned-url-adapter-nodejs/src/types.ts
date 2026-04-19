import type { CloudStorageConfig } from '@cmtx/storage';

export type { CloudStorageConfig } from '@cmtx/storage';

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

export interface PresignedUrlAdapterOptions {
    providerConfigs: CloudStorageConfig[];
    expire: number;
    maxRetryCount: number;
    logger?: {
        debug: (message: string, ...args: unknown[]) => void;
        info: (message: string, ...args: unknown[]) => void;
        warn: (message: string, ...args: unknown[]) => void;
        error: (message: string, ...args: unknown[]) => void;
    };
}
