/**
 * URL Cache Manager 单元测试
 */

import { describe, expect, it, vi } from 'vitest';
import { UrlCacheManager } from '../src/url-cache-manager.js';

describe('UrlCacheManager', () => {
    describe('get', () => {
        it('should return null for non-existent URL', () => {
            const manager = new UrlCacheManager();
            expect(manager.get('https://example.com/image.png')).toBeNull();
        });

        it('should return cached URL', () => {
            const manager = new UrlCacheManager();
            manager.set(
                'https://example.com/image.png',
                'https://signed.example.com/image.png',
                3600
            );
            expect(manager.get('https://example.com/image.png')).toBe(
                'https://signed.example.com/image.png'
            );
        });

        it('should call logger when cache miss', () => {
            const logger = {
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
            const manager = new UrlCacheManager(logger);
            manager.get('https://example.com/image.png');
            expect(logger.debug).toHaveBeenCalledWith('缓存未命中：https://example.com/image.png');
        });

        it('should call logger when cache hit', () => {
            const logger = {
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
            const manager = new UrlCacheManager(logger);
            manager.set(
                'https://example.com/image.png',
                'https://signed.example.com/image.png',
                3600
            );
            manager.get('https://example.com/image.png');
            expect(logger.debug).toHaveBeenCalledWith(
                '缓存命中：https://example.com/image.png -> https://signed.example.com/image.png'
            );
        });
    });

    describe('set', () => {
        it('should set cache item', () => {
            const manager = new UrlCacheManager();
            manager.set(
                'https://example.com/image.png',
                'https://signed.example.com/image.png',
                3600
            );
            expect(manager.has('https://example.com/image.png')).toBe(true);
        });

        it('should call logger when setting cache', () => {
            const logger = {
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
            const manager = new UrlCacheManager(logger);
            manager.set(
                'https://example.com/image.png',
                'https://signed.example.com/image.png',
                3600
            );
            expect(logger.debug).toHaveBeenCalledWith(
                '缓存已设置：https://example.com/image.png -> https://signed.example.com/image.png (3600s)'
            );
        });
    });

    describe('has', () => {
        it('should return false for non-existent URL', () => {
            const manager = new UrlCacheManager();
            expect(manager.has('https://example.com/image.png')).toBe(false);
        });

        it('should return true for cached URL', () => {
            const manager = new UrlCacheManager();
            manager.set(
                'https://example.com/image.png',
                'https://signed.example.com/image.png',
                3600
            );
            expect(manager.has('https://example.com/image.png')).toBe(true);
        });
    });

    describe('clear', () => {
        it('should clear all cache', () => {
            const manager = new UrlCacheManager();
            manager.set(
                'https://example.com/image1.png',
                'https://signed.example.com/image1.png',
                3600
            );
            manager.set(
                'https://example.com/image2.png',
                'https://signed.example.com/image2.png',
                3600
            );
            manager.clear();
            expect(manager.has('https://example.com/image1.png')).toBe(false);
            expect(manager.has('https://example.com/image2.png')).toBe(false);
        });

        it('should call logger when clearing', () => {
            const logger = {
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
            const manager = new UrlCacheManager(logger);
            manager.clear();
            expect(logger.debug).toHaveBeenCalledWith('缓存已清空');
        });
    });

    describe('retry logic', () => {
        it('should return 0 for initial retry count', () => {
            const manager = new UrlCacheManager();
            expect(manager.getRetryCount('https://example.com/image.png')).toBe(0);
        });

        it('should record failure and increment retry count', () => {
            const manager = new UrlCacheManager();
            expect(manager.recordFailure('https://example.com/image.png')).toBe(1);
            expect(manager.recordFailure('https://example.com/image.png')).toBe(2);
            expect(manager.getRetryCount('https://example.com/image.png')).toBe(2);
        });

        it('should check if can retry', () => {
            const manager = new UrlCacheManager();
            expect(manager.canRetry('https://example.com/image.png', 3)).toBe(true);
            manager.recordFailure('https://example.com/image.png');
            manager.recordFailure('https://example.com/image.png');
            manager.recordFailure('https://example.com/image.png');
            expect(manager.canRetry('https://example.com/image.png', 3)).toBe(false);
        });

        it('should return false for canRetry when maxRetryCount is 0', () => {
            const manager = new UrlCacheManager();
            expect(manager.canRetry('https://example.com/image.png', 0)).toBe(false);
        });

        it('should reset retry count', () => {
            const manager = new UrlCacheManager();
            manager.recordFailure('https://example.com/image.png');
            expect(manager.getRetryCount('https://example.com/image.png')).toBe(1);
            manager.resetRetry('https://example.com/image.png');
            expect(manager.getRetryCount('https://example.com/image.png')).toBe(0);
        });

        it('should call logger when recording failure', () => {
            const logger = {
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
            const manager = new UrlCacheManager(logger);
            manager.recordFailure('https://example.com/image.png');
            expect(logger.warn).toHaveBeenCalledWith(
                '记录预签名失败次数：https://example.com/image.png (1)'
            );
        });
    });

    describe('pending requests', () => {
        it('should add and get pending request', () => {
            const manager = new UrlCacheManager();
            const promise = Promise.resolve('signed-url');
            manager.addPendingRequest('https://example.com/image.png', promise);
            expect(manager.getPendingRequest('https://example.com/image.png')).toBe(promise);
        });

        it('should return undefined for non-existent pending request', () => {
            const manager = new UrlCacheManager();
            expect(manager.getPendingRequest('https://example.com/image.png')).toBeUndefined();
        });

        it('should remove pending request', () => {
            const manager = new UrlCacheManager();
            const promise = Promise.resolve('signed-url');
            manager.addPendingRequest('https://example.com/image.png', promise);
            manager.removePendingRequest('https://example.com/image.png');
            expect(manager.getPendingRequest('https://example.com/image.png')).toBeUndefined();
        });

        it('should wait for all pending requests', async () => {
            const manager = new UrlCacheManager();
            let resolved = false;
            const promise = new Promise<string>((resolve) => {
                setTimeout(() => {
                    resolved = true;
                    resolve('signed-url');
                }, 10);
            });
            manager.addPendingRequest('https://example.com/image.png', promise);
            await manager.waitForAllPending();
            expect(resolved).toBe(true);
        });

        it('should return immediately when no pending requests', async () => {
            const manager = new UrlCacheManager();
            const start = Date.now();
            await manager.waitForAllPending();
            expect(Date.now() - start).toBeLessThan(10);
        });
    });
});
