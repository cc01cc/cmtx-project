/**
 * URL Signer 单元测试
 */

import { describe, expect, it, vi } from "vitest";
import { UrlCacheManager, UrlSigner } from "../src/index.js";

describe("UrlSigner", () => {
    const createMockCacheManager = () => {
        return new UrlCacheManager();
    };

    const createSignerOptions = (overrides = {}) => ({
        storageConfigs: {
            default: {
                provider: "aliyun-oss" as const,
                bucket: "test-bucket",
                region: "oss-cn-hangzhou",
                accessKeyId: "test-key",
                accessKeySecret: "test-secret",
            },
        },
        domains: [
            {
                domain: "cdn.example.com",
                useStorage: "default",
            },
        ],
        expire: 600,
        maxRetryCount: 3,
        ...overrides,
    });

    describe("constructor", () => {
        it("should create signer with default options", () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions();
            const signer = new UrlSigner(options, cacheManager);
            expect(signer).toBeDefined();
            expect(signer.getMaxRetryCount()).toBe(3);
        });

        it("should create signer with custom expire time", () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({ expire: 1200 });
            const signer = new UrlSigner(options, cacheManager);
            expect(signer).toBeDefined();
        });

        it("should create signer with custom maxRetryCount", () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({ maxRetryCount: 5 });
            const signer = new UrlSigner(options, cacheManager);
            expect(signer.getMaxRetryCount()).toBe(5);
        });

        it("should clamp maxRetryCount to 0 when negative", () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({ maxRetryCount: -1 });
            const signer = new UrlSigner(options, cacheManager);
            expect(signer.getMaxRetryCount()).toBe(0);
        });

        it("should call logger when initialized", () => {
            const logger = {
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({ logger });
            new UrlSigner(options, cacheManager);
            expect(logger.info).toHaveBeenCalledWith("URL 签名器初始化完成");
        });

        it("should throw error when useStorage references non-existent storage", () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({
                domains: [
                    {
                        domain: "cdn.example.com",
                        useStorage: "nonexistent",
                    },
                ],
            });
            expect(() => new UrlSigner(options, cacheManager)).toThrow(
                'Storage ID "nonexistent" not found in storages pool',
            );
        });

        it("should throw error when domain has neither useStorage nor provider", () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({
                domains: [
                    {
                        domain: "cdn.example.com",
                    },
                ],
            });
            expect(() => new UrlSigner(options, cacheManager)).toThrow(
                'Domain "cdn.example.com" must specify either useStorage or provider',
            );
        });

        it("should accept domain with independent provider config", () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions({
                domains: [
                    {
                        domain: "cdn.external.com",
                        provider: "aliyun-oss",
                        config: {
                            provider: "aliyun-oss",
                            bucket: "external-bucket",
                            region: "oss-cn-shanghai",
                            accessKeyId: "external-key",
                            accessKeySecret: "external-secret",
                        },
                    },
                ],
            });
            const signer = new UrlSigner(options, cacheManager);
            expect(signer).toBeDefined();
        });
    });

    describe("signUrl", () => {
        it("should return cached URL if available", async () => {
            const cacheManager = createMockCacheManager();
            cacheManager.set(
                "https://cdn.example.com/image.png",
                "https://cached.example.com/image.png",
                3600,
            );

            const options = createSignerOptions();
            const signer = new UrlSigner(options, cacheManager);

            const result = await signer.signUrl("https://cdn.example.com/image.png");
            expect(result).toBe("https://cached.example.com/image.png");
        });

        it("should return original URL if no provider config matches", async () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions();
            const signer = new UrlSigner(options, cacheManager);

            const result = await signer.signUrl("https://other.example.com/image.png");
            expect(result).toBe("https://other.example.com/image.png");
        });

        it("should cache fallback URL when no provider matches", async () => {
            const cacheManager = createMockCacheManager();
            const options = createSignerOptions();
            const signer = new UrlSigner(options, cacheManager);

            const url = "https://other.example.com/image.png";
            const result = await signer.signUrl(url);
            expect(result).toBe(url);

            const cached = cacheManager.get(url);
            expect(cached).toBe(url);
        });
    });
});
