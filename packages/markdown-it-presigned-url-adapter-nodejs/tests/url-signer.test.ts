/**
 * URL Signer 单元测试
 */

import { describe, expect, it, vi } from 'vitest';
import { UrlCacheManager, UrlSigner } from '../src/index.js';

describe('UrlSigner', () => {
    const createMockCacheManager = () => {
        return new UrlCacheManager();
    };

    const createSignerOptions = (overrides = {}) => ({
        providerConfigs: [
            {
                provider: 'aliyun-oss' as const,
                bucket: 'test-bucket',
                region: 'oss-cn-hangzhou',
                domain: 'cdn.example.com',
                accessKeyId: 'test-key',
                accessKeySecret: 'test-secret',
            },
        ],
        expire: 600,
        maxRetryCount: 3,
        ...overrides,
    });

    describe('constructor', () => {
        it('should create signer with default options', () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions();
            const signer = new UrlSigner(options, cacheManager);
            expect(signer).toBeDefined();
            expect(signer.getMaxRetryCount()).toBe(3);
        });

        it('should create signer with custom expire time', () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({ expire: 1200 });
            const signer = new UrlSigner(options, cacheManager);
            expect(signer).toBeDefined();
        });

        it('should create signer with custom maxRetryCount', () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({ maxRetryCount: 5 });
            const signer = new UrlSigner(options, cacheManager);
            expect(signer.getMaxRetryCount()).toBe(5);
        });

        it('should clamp maxRetryCount to 0 when negative', () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({ maxRetryCount: -1 });
            const signer = new UrlSigner(options, cacheManager);
            expect(signer.getMaxRetryCount()).toBe(0);
        });

        it('should call logger when initialized', () => {
            const logger = {
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({ logger });
            new UrlSigner(options, cacheManager);
            expect(logger.info).toHaveBeenCalledWith('URL 签名器初始化完成');
        });
    });

    describe('signUrl', () => {
        it('should return cached URL if available', async () => {
            const cacheManager = createMockCacheManager();
            cacheManager.set(
                'https://cdn.example.com/image.png',
                'https://cached.example.com/image.png',
                3600
            );

            const options = createSignerOptions();
            const signer = new UrlSigner(options, cacheManager);

            const result = await signer.signUrl('https://cdn.example.com/image.png');
            expect(result).toBe('https://cached.example.com/image.png');
        });

        it('should return original URL if no provider config matches', async () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions();
            const signer = new UrlSigner(options, cacheManager);

            const result = await signer.signUrl('https://other.example.com/image.png');
            expect(result).toBe('https://other.example.com/image.png');
        });

        it('should cache fallback URL when no provider matches', async () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions();
            const signer = new UrlSigner(options, cacheManager);

            await signer.signUrl('https://other.example.com/image.png');
            expect(cacheManager.has('https://other.example.com/image.png')).toBe(true);
        });

        it('should handle invalid URL gracefully', async () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions();
            const signer = new UrlSigner(options, cacheManager);

            const result = await signer.signUrl('not-a-valid-url');
            expect(result).toBe('not-a-valid-url');
        });

        it('should call logger for cached URL', async () => {
            const logger = {
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
            const cacheManager = createMockCacheManager();
            cacheManager.set(
                'https://cdn.example.com/image.png',
                'https://cached.example.com/image.png',
                3600
            );

            const options = createSignerOptions({ logger });
            const signer = new UrlSigner(options, cacheManager);

            await signer.signUrl('https://cdn.example.com/image.png');
            expect(logger.info).toHaveBeenCalledWith(
                '使用缓存的预签名 URL：https://cdn.example.com/image.png -> https://cached.example.com/image.png'
            );
        });

        it('should call logger when no provider config found', async () => {
            const logger = {
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({ logger });
            const signer = new UrlSigner(options, cacheManager);

            await signer.signUrl('https://other.example.com/image.png');
            expect(logger.warn).toHaveBeenCalledWith(
                '未找到匹配的提供商配置：https://other.example.com/image.png'
            );
        });
    });

    describe('unsupported providers', () => {
        it('should return original URL for unsupported provider', async () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({
                providerConfigs: [
                    {
                        provider: 'tencent-cos' as const,
                        bucket: 'test-bucket',
                        region: 'ap-guangzhou',
                        domain: 'cdn.example.com',
                    },
                ],
            });
            const signer = new UrlSigner(options, cacheManager);

            const result = await signer.signUrl('https://cdn.example.com/image.png');
            expect(result).toBe('https://cdn.example.com/image.png');
        });

        it('should call logger for unsupported provider', async () => {
            const logger = {
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({
                providerConfigs: [
                    {
                        provider: 'tencent-cos' as const,
                        bucket: 'test-bucket',
                        region: 'ap-guangzhou',
                        domain: 'cdn.example.com',
                    },
                ],
                logger,
            });
            const signer = new UrlSigner(options, cacheManager);

            await signer.signUrl('https://cdn.example.com/image.png');
            expect(logger.warn).toHaveBeenCalledWith(
                '腾讯云 COS 预签名 URL 功能暂未实现：https://cdn.example.com/image.png'
            );
        });

        it('should return original URL for AWS provider', async () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({
                providerConfigs: [
                    {
                        provider: 'aws' as const,
                        bucket: 'test-bucket',
                        region: 'us-east-1',
                        domain: 'cdn.example.com',
                    },
                ],
            });
            const signer = new UrlSigner(options, cacheManager);

            const result = await signer.signUrl('https://cdn.example.com/image.png');
            expect(result).toBe('https://cdn.example.com/image.png');
        });
    });

    describe('error handling', () => {
        it('should handle invalid URL format', async () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions();
            const signer = new UrlSigner(options, cacheManager);

            // Invalid URL should be handled gracefully
            const result = await signer.signUrl('not-a-valid-url');
            expect(result).toBe('not-a-valid-url');
        });

        it('should cache error result with fallback time', async () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions();
            const signer = new UrlSigner(options, cacheManager);

            // Use invalid URL to trigger error handling
            await signer.signUrl('not-a-valid-url');
            expect(cacheManager.has('not-a-valid-url')).toBe(true);
        });
    });
});
