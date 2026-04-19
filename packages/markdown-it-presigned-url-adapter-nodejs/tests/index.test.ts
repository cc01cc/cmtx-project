/**
 * 模块导出测试
 */

import { describe, expect, it } from 'vitest';
import {
    type CacheManagerLogger,
    type Logger as SignerLogger,
    UrlCacheManager,
    UrlSigner,
} from '../src/index.js';

describe('模块导出', () => {
    it('应该导出 UrlCacheManager', () => {
        expect(UrlCacheManager).toBeDefined();
        expect(typeof UrlCacheManager).toBe('function');
    });

    it('应该导出 UrlSigner', () => {
        expect(UrlSigner).toBeDefined();
        expect(typeof UrlSigner).toBe('function');
    });

    it('应该能够创建 UrlCacheManager 实例', () => {
        const manager = new UrlCacheManager();
        expect(manager).toBeInstanceOf(UrlCacheManager);
    });

    it('应该能够创建带 logger 的 UrlCacheManager 实例', () => {
        const logger: CacheManagerLogger = {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
        };
        const manager = new UrlCacheManager(logger);
        expect(manager).toBeInstanceOf(UrlCacheManager);
    });

    it('应该能够创建 UrlSigner 实例', () => {
        const cacheManager = new UrlCacheManager();
        const options = {
            providerConfigs: [
                {
                    provider: 'aliyun-oss' as const,
                    bucket: 'test-bucket',
                    region: 'oss-cn-hangzhou',
                    domain: 'cdn.example.com',
                },
            ],
            expire: 600,
            maxRetryCount: 3,
        };
        const signer = new UrlSigner(options, cacheManager);
        expect(signer).toBeInstanceOf(UrlSigner);
    });

    it('应该能够创建带 logger 的 UrlSigner 实例', () => {
        const cacheManager = new UrlCacheManager();
        const logger: SignerLogger = {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
        };
        const options = {
            providerConfigs: [
                {
                    provider: 'aliyun-oss' as const,
                    bucket: 'test-bucket',
                    region: 'oss-cn-hangzhou',
                    domain: 'cdn.example.com',
                },
            ],
            expire: 600,
            maxRetryCount: 3,
            logger,
        };
        const signer = new UrlSigner(options, cacheManager);
        expect(signer).toBeInstanceOf(UrlSigner);
    });
});

describe('类型导出', () => {
    it('应该支持所有存储提供商类型', () => {
        const providers = ['aliyun-oss', 'tencent-cos', 'aws'] as const;
        expect(providers).toContain('aliyun-oss');
        expect(providers).toContain('tencent-cos');
        expect(providers).toContain('aws');
    });
});
