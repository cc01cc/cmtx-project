import { UrlCacheManager } from '@cmtx/markdown-it-presigned-url-adapter-nodejs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('UrlCacheManager', () => {
    let cacheManager: UrlCacheManager;

    beforeEach(() => {
        cacheManager = new UrlCacheManager();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    // ==================== 缓存基本操作 ====================
    describe('缓存基本操作', () => {
        it('should set and get cached URL', () => {
            const originalUrl = 'https://example.com/image.jpg';
            const signedUrl = 'https://example.com/image.jpg?signature=xxx';

            cacheManager.set(originalUrl, signedUrl, 600);

            const result = cacheManager.get(originalUrl);
            expect(result).toBe(signedUrl);
        });

        it('should return null for non-existent cache key', () => {
            const result = cacheManager.get('https://not-cached.com/image.jpg');
            expect(result).toBeNull();
        });

        it('should overwrite existing cache entry', () => {
            const originalUrl = 'https://example.com/image.jpg';
            const signedUrl1 = 'https://example.com/image.jpg?signature=1';
            const signedUrl2 = 'https://example.com/image.jpg?signature=2';

            cacheManager.set(originalUrl, signedUrl1, 600);
            cacheManager.set(originalUrl, signedUrl2, 600);

            const result = cacheManager.get(originalUrl);
            expect(result).toBe(signedUrl2);
        });

        it('should clear all cache entries', () => {
            cacheManager.set('url1', 'signed1', 600);
            cacheManager.set('url2', 'signed2', 600);

            cacheManager.clear();

            expect(cacheManager.get('url1')).toBeNull();
            expect(cacheManager.get('url2')).toBeNull();
        });

        it('should check if URL exists in cache (has method)', () => {
            const originalUrl = 'https://example.com/image.jpg';
            const signedUrl = 'https://example.com/image.jpg?signature=xxx';

            cacheManager.set(originalUrl, signedUrl, 600);

            expect(cacheManager.has(originalUrl)).toBe(true);
            expect(cacheManager.has('https://not-cached.com/image.jpg')).toBe(false);
        });

        it('should handle multiple different URLs', () => {
            cacheManager.set('url1', 'signed1', 600);
            cacheManager.set('url2', 'signed2', 600);
            cacheManager.set('url3', 'signed3', 600);

            expect(cacheManager.get('url1')).toBe('signed1');
            expect(cacheManager.get('url2')).toBe('signed2');
            expect(cacheManager.get('url3')).toBe('signed3');
        });
    });

    // ==================== 缓存过期逻辑 ====================
    describe('缓存过期逻辑', () => {
        it('should return cached URL before 90% expiration threshold', () => {
            const originalUrl = 'https://example.com/image.jpg';
            const signedUrl = 'https://example.com/image.jpg?signature=xxx';
            const expireSeconds = 600; // 10 minutes

            cacheManager.set(originalUrl, signedUrl, expireSeconds);

            // Advance time to 89% of expiration (534 seconds)
            vi.advanceTimersByTime(534 * 1000);

            const result = cacheManager.get(originalUrl);
            expect(result).toBe(signedUrl);
        });

        it('should return null after 90% expiration threshold', () => {
            const originalUrl = 'https://example.com/image.jpg';
            const signedUrl = 'https://example.com/image.jpg?signature=xxx';
            const expireSeconds = 600; // 10 minutes

            cacheManager.set(originalUrl, signedUrl, expireSeconds);

            // Advance time to 91% of expiration (546 seconds)
            vi.advanceTimersByTime(546 * 1000);

            const result = cacheManager.get(originalUrl);
            expect(result).toBeNull();
        });

        it('should delete expired cache entry when accessed', () => {
            const originalUrl = 'https://example.com/image.jpg';
            const signedUrl = 'https://example.com/image.jpg?signature=xxx';
            const expireSeconds = 100;

            cacheManager.set(originalUrl, signedUrl, expireSeconds);

            // Advance time past 90% threshold
            vi.advanceTimersByTime(91 * 1000);

            cacheManager.get(originalUrl);
            expect(cacheManager.has(originalUrl)).toBe(false);
        });

        it('should use custom expire time for each entry', () => {
            const url1 = 'https://example.com/image1.jpg';
            const url2 = 'https://example.com/image2.jpg';

            cacheManager.set(url1, 'signed1', 100);
            cacheManager.set(url2, 'signed2', 200);

            // Advance 91 seconds (past 90% of url1's 100s expiry = 90s)
            vi.advanceTimersByTime(91 * 1000);

            expect(cacheManager.get(url1)).toBeNull();
            expect(cacheManager.get(url2)).toBe('signed2');
        });

        it('should handle different expire times for different URLs', () => {
            cacheManager.set('short', 'signed-short', 50);
            cacheManager.set('medium', 'signed-medium', 100);
            cacheManager.set('long', 'signed-long', 200);

            // After 46 seconds (past 90% of short's 50s = 45s)
            vi.advanceTimersByTime(46 * 1000);
            expect(cacheManager.get('short')).toBeNull();
            expect(cacheManager.get('medium')).toBe('signed-medium');
            expect(cacheManager.get('long')).toBe('signed-long');

            // After 91 seconds total (past 90% of medium's 100s = 90s)
            vi.advanceTimersByTime(45 * 1000);
            expect(cacheManager.get('medium')).toBeNull();
            expect(cacheManager.get('long')).toBe('signed-long');
        });

        it('should calculate early expiration correctly (90% rule)', () => {
            const testCases = [
                { expire: 100, expectedExpiry: 90 },
                { expire: 600, expectedExpiry: 540 },
                { expire: 3600, expectedExpiry: 3240 },
            ];

            testCases.forEach(({ expire, expectedExpiry }, index) => {
                const url = `url-${index}`;
                cacheManager.set(url, `signed-${index}`, expire);

                // Just before 90% threshold
                vi.advanceTimersByTime((expectedExpiry - 1) * 1000);
                expect(cacheManager.get(url)).toBe(`signed-${index}`);

                // Just after 90% threshold
                vi.advanceTimersByTime(2 * 1000);
                expect(cacheManager.get(url)).toBeNull();

                vi.advanceTimersByTime(0); // Reset for next iteration
            });
        });
    });

    // ==================== 重试计数管理 ====================
    describe('重试计数管理', () => {
        it('should track retry count for each URL', () => {
            expect(cacheManager.getRetryCount('url1')).toBe(0);

            cacheManager.recordFailure('url1');
            expect(cacheManager.getRetryCount('url1')).toBe(1);

            cacheManager.recordFailure('url1');
            expect(cacheManager.getRetryCount('url1')).toBe(2);
        });

        it('should return 0 for URLs not yet retried', () => {
            expect(cacheManager.getRetryCount('never-tried')).toBe(0);
        });

        it('should increment retry count on recordFailure', () => {
            const url = 'test-url';

            const count1 = cacheManager.recordFailure(url);
            expect(count1).toBe(1);

            const count2 = cacheManager.recordFailure(url);
            expect(count2).toBe(2);

            const count3 = cacheManager.recordFailure(url);
            expect(count3).toBe(3);
        });

        it('should determine if retry is allowed (canRetry)', () => {
            const url = 'test-url';
            const maxRetry = 3;

            expect(cacheManager.canRetry(url, maxRetry)).toBe(true);

            cacheManager.recordFailure(url); // count = 1
            expect(cacheManager.canRetry(url, maxRetry)).toBe(true);

            cacheManager.recordFailure(url); // count = 2
            expect(cacheManager.canRetry(url, maxRetry)).toBe(true);

            cacheManager.recordFailure(url); // count = 3
            expect(cacheManager.canRetry(url, maxRetry)).toBe(false);
        });

        it('should not allow retry when maxRetryCount is 0', () => {
            const url = 'test-url';

            expect(cacheManager.canRetry(url, 0)).toBe(false);
        });

        it('should reset retry count for specific URL', () => {
            const url = 'test-url';

            cacheManager.recordFailure(url);
            cacheManager.recordFailure(url);
            expect(cacheManager.getRetryCount(url)).toBe(2);

            cacheManager.resetRetry(url);
            expect(cacheManager.getRetryCount(url)).toBe(0);
        });

        it('should handle multiple URLs with different retry counts', () => {
            cacheManager.recordFailure('url1');
            cacheManager.recordFailure('url1');
            cacheManager.recordFailure('url2');

            expect(cacheManager.getRetryCount('url1')).toBe(2);
            expect(cacheManager.getRetryCount('url2')).toBe(1);
            expect(cacheManager.getRetryCount('url3')).toBe(0);
        });

        it('should allow retry when count < maxRetryCount', () => {
            const url = 'test-url';
            const maxRetry = 3;

            cacheManager.recordFailure(url); // count = 1
            cacheManager.recordFailure(url); // count = 2
            expect(cacheManager.canRetry(url, maxRetry)).toBe(true); // 2 < 3
        });

        it('should not allow retry when count >= maxRetryCount', () => {
            const url = 'test-url';
            const maxRetry = 2;

            cacheManager.recordFailure(url); // count = 1
            cacheManager.recordFailure(url); // count = 2
            expect(cacheManager.canRetry(url, maxRetry)).toBe(false); // 2 >= 2
        });
    });

    // ==================== 待处理请求管理 ====================
    describe('待处理请求管理', () => {
        it('should add pending request promise', () => {
            const url = 'test-url';
            const promise = Promise.resolve('signed-url');

            cacheManager.addPendingRequest(url, promise);

            const result = cacheManager.getPendingRequest(url);
            expect(result).toBe(promise);
        });

        it('should get pending request by URL', () => {
            const url = 'test-url';
            const promise = Promise.resolve('signed-url');

            cacheManager.addPendingRequest(url, promise);

            expect(cacheManager.getPendingRequest(url)).toBe(promise);
        });

        it('should remove pending request', () => {
            const url = 'test-url';
            const promise = Promise.resolve('signed-url');

            cacheManager.addPendingRequest(url, promise);
            cacheManager.removePendingRequest(url);

            expect(cacheManager.getPendingRequest(url)).toBeUndefined();
        });

        it('should return undefined for non-existent pending request', () => {
            const result = cacheManager.getPendingRequest('not-exist');
            expect(result).toBeUndefined();
        });

        it('should wait for all pending requests to complete', async () => {
            const promise1 = Promise.resolve('signed1');
            const promise2 = Promise.resolve('signed2');

            cacheManager.addPendingRequest('url1', promise1);
            cacheManager.addPendingRequest('url2', promise2);

            await cacheManager.waitForAllPending();

            // Should complete without errors
        });

        it('should handle empty pending requests (waitForAllPending)', async () => {
            await cacheManager.waitForAllPending();
            // Should complete immediately without errors
        });

        it('should handle multiple concurrent pending requests', async () => {
            let resolve1: (value: string) => void;
            let resolve2: (value: string) => void;

            const promise1 = new Promise<string>((resolve) => {
                resolve1 = resolve;
            });
            const promise2 = new Promise<string>((resolve) => {
                resolve2 = resolve;
            });

            cacheManager.addPendingRequest('url1', promise1);
            cacheManager.addPendingRequest('url2', promise2);

            // Resolve both promises
            resolve1!('signed1');
            resolve2!('signed2');

            await cacheManager.waitForAllPending();
            // Should complete without errors
        });
    });
});
