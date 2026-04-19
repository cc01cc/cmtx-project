import type { IUrlCacheManager, PresignedUrlCache } from './types.js';

export interface Logger {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
}

export class UrlCacheManager implements IUrlCacheManager {
    private _cache: PresignedUrlCache = {};
    private readonly _pendingRequests: Map<string, Promise<string>> = new Map();
    private _retryCounts: Record<string, number> = {};
    private readonly _logger?: Logger;

    constructor(logger?: Logger) {
        this._logger = logger;
    }

    get(url: string): string | null {
        const item = this._cache[url];
        if (!item) {
            this._logger?.debug(`缓存未命中：${url}`);
            return null;
        }

        const earlyExpireTime = item.timestamp + item.expires * 0.9 * 1000;
        if (Date.now() > earlyExpireTime) {
            this._logger?.debug(`缓存已过期：${url}`);
            delete this._cache[url];
            return null;
        }

        this._logger?.debug(`缓存命中：${url} -> ${item.url}`);
        return item.url;
    }

    set(originalUrl: string, signedUrl: string, expireInSeconds: number): void {
        this._cache[originalUrl] = {
            url: signedUrl,
            timestamp: Date.now(),
            expires: expireInSeconds,
        };

        this._logger?.debug(`缓存已设置：${originalUrl} -> ${signedUrl} (${expireInSeconds}s)`);
    }

    has(url: string): boolean {
        return this.get(url) !== null;
    }

    clear(): void {
        this._cache = {};
        this._retryCounts = {};
        this._logger?.debug('缓存已清空');
    }

    canRetry(url: string, maxRetryCount: number): boolean {
        if (maxRetryCount <= 0) {
            return false;
        }

        return this.getRetryCount(url) < maxRetryCount;
    }

    getRetryCount(url: string): number {
        return this._retryCounts[url] ?? 0;
    }

    recordFailure(url: string): number {
        const nextCount = this.getRetryCount(url) + 1;
        this._retryCounts[url] = nextCount;
        this._logger?.warn(`记录预签名失败次数：${url} (${nextCount})`);
        return nextCount;
    }

    resetRetry(url: string): void {
        if (this._retryCounts[url] !== undefined) {
            delete this._retryCounts[url];
            this._logger?.debug(`重置预签名失败次数：${url}`);
        }
    }

    addPendingRequest(url: string, promise: Promise<string>): void {
        this._pendingRequests.set(url, promise);
    }

    getPendingRequest(url: string): Promise<string> | undefined {
        return this._pendingRequests.get(url);
    }

    removePendingRequest(url: string): void {
        this._pendingRequests.delete(url);
    }

    async waitForAllPending(): Promise<void> {
        if (this._pendingRequests.size === 0) {
            return;
        }

        this._logger?.debug(`等待 ${this._pendingRequests.size} 个待处理请求完成`);
        const promises = Array.from(this._pendingRequests.values());
        await Promise.all(promises);
        this._logger?.debug('所有待处理请求已完成');
    }
}
