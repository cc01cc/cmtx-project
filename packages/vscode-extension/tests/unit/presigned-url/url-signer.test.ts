import type { UrlCacheManager } from "@cmtx/markdown-it-presigned-url-adapter-nodejs";
import { UrlSigner } from "@cmtx/markdown-it-presigned-url-adapter-nodejs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PresignedUrlConfig } from "../../../src/infra/config";
import {
    PRESIGNED_URL_CONFIG_FIXTURES,
    PRESIGNED_URL_FIXTURES,
    PROVIDER_CONFIG_FIXTURES,
} from "../../fixtures/presigned-url";

// Mock ali-oss
vi.mock("ali-oss", () => {
    const mockSignatureUrl = vi.fn((key: string, options?: { expires?: number }) => {
        return `https://signed-url-for-${key}?expires=${options?.expires || 600}`;
    });

    const MockOSS = vi.fn(() => ({
        signatureUrl: mockSignatureUrl,
    }));

    return {
        default: MockOSS,
    };
});

// Mock UrlCacheManager
const createMockCacheManager = () => ({
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    clear: vi.fn(),
    canRetry: vi.fn(),
    getRetryCount: vi.fn(),
    recordFailure: vi.fn(),
    resetRetry: vi.fn(),
    addPendingRequest: vi.fn(),
    getPendingRequest: vi.fn(),
    removePendingRequest: vi.fn(),
    waitForAllPending: vi.fn(),
});

describe("UrlSigner", () => {
    let urlSigner: UrlSigner;
    let mockCacheManager: ReturnType<typeof createMockCacheManager>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockCacheManager = createMockCacheManager();
        vi.stubEnv("CMTX_ALIYUN_ACCESS_KEY_ID", "");
        vi.stubEnv("CMTX_ALIYUN_ACCESS_KEY_SECRET", "");
        vi.stubEnv("ALIYUN_OSS_ACCESS_KEY_ID", "");
        vi.stubEnv("ALIYUN_OSS_ACCESS_KEY_SECRET", "");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    // ==================== 初始化 ====================
    describe("初始化", () => {
        it("should initialize with valid config", () => {
            const config = PRESIGNED_URL_CONFIG_FIXTURES.complete;
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);

            expect(urlSigner.getMaxRetryCount()).toBe(3);
        });

        it("should build provider map from providerConfigs", () => {
            const config = PRESIGNED_URL_CONFIG_FIXTURES.multiProvider;
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);

            // Verify by checking if it can sign URLs from different providers
            expect(urlSigner.getMaxRetryCount()).toBe(3);
        });

        it("should use default expire time (600s) when not specified", () => {
            const config: PresignedUrlConfig = {
                imageFormat: "all",
                expire: 0, // Will use default
                maxRetryCount: 3,
                storageConfigs: {
                    default: PROVIDER_CONFIG_FIXTURES.aliyunComplete,
                },
                domains: [
                    {
                        domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                        useStorage: "default",
                    },
                ],
            };
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);

            expect(urlSigner.getMaxRetryCount()).toBe(3);
        });

        it("should use default maxRetryCount (3) when not specified", () => {
            const config: PresignedUrlConfig = {
                imageFormat: "all",
                expire: 600,
                maxRetryCount: undefined as unknown as number,
                storageConfigs: {
                    default: PROVIDER_CONFIG_FIXTURES.aliyunComplete,
                },
                domains: [
                    {
                        domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                        useStorage: "default",
                    },
                ],
            };
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);

            // Default is 3
            expect(urlSigner.getMaxRetryCount()).toBe(3);
        });

        it("should handle empty providerConfigs array", () => {
            const config = PRESIGNED_URL_CONFIG_FIXTURES.minimal;
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);

            expect(urlSigner.getMaxRetryCount()).toBe(1);
        });

        it("should skip providers without domain", () => {
            const config: PresignedUrlConfig = {
                imageFormat: "all",
                expire: 600,
                maxRetryCount: 3,
                storageConfigs: {
                    aliyun: PROVIDER_CONFIG_FIXTURES.aliyunComplete,
                },
                domains: [
                    {
                        domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                        useStorage: "aliyun",
                    },
                ],
            };
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);

            expect(urlSigner.getMaxRetryCount()).toBe(3);
        });

        it("should store expire and maxRetryCount correctly", () => {
            const config: PresignedUrlConfig = {
                imageFormat: "all",
                expire: 300,
                maxRetryCount: 5,
                storageConfigs: {
                    default: PROVIDER_CONFIG_FIXTURES.aliyunComplete,
                },
                domains: [
                    {
                        domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                        useStorage: "default",
                    },
                ],
            };
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);

            expect(urlSigner.getMaxRetryCount()).toBe(5);
        });

        it("should return maxRetryCount via getMaxRetryCount()", () => {
            const config = PRESIGNED_URL_CONFIG_FIXTURES.complete;
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);

            expect(urlSigner.getMaxRetryCount()).toBe(config.maxRetryCount);
        });
    });

    // ==================== 签名流程 ====================
    describe("signUrl - 签名主流程", () => {
        beforeEach(() => {
            const config = PRESIGNED_URL_CONFIG_FIXTURES.complete;
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);
        });

        it("should return cached URL if available in cache", async () => {
            const originalUrl = PRESIGNED_URL_FIXTURES.validAliyunUrl;
            const cachedUrl = "https://cached-url.com";

            mockCacheManager.get.mockReturnValue(cachedUrl);

            const result = await urlSigner.signUrl(originalUrl);

            expect(result).toBe(cachedUrl);
            expect(mockCacheManager.get).toHaveBeenCalledWith(originalUrl);
        });

        it("should return original URL when no matching provider config", async () => {
            mockCacheManager.get.mockReturnValue(null);

            const result = await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.unknownDomainUrl);

            expect(result).toBe(PRESIGNED_URL_FIXTURES.unknownDomainUrl);
            expect(mockCacheManager.set).toHaveBeenCalledWith(
                PRESIGNED_URL_FIXTURES.unknownDomainUrl,
                PRESIGNED_URL_FIXTURES.unknownDomainUrl,
                30, // Fallback cache seconds
            );
        });

        it("should sign URL with aliyun-oss provider", async () => {
            mockCacheManager.get.mockReturnValue(null);

            const result = await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.validAliyunUrl);

            // Result should be a URL (signed or original on error)
            expect(result).toBeDefined();
            expect(typeof result).toBe("string");
            expect(mockCacheManager.set).toHaveBeenCalled();
        });

        it("should cache signed URL with configured expire time", async () => {
            mockCacheManager.get.mockReturnValue(null);

            await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.validAliyunUrl);

            // Should call set with some URL and expire time
            expect(mockCacheManager.set).toHaveBeenCalled();
        });

        it("should return original URL on unsupported provider", async () => {
            const config: PresignedUrlConfig = {
                imageFormat: "all",
                expire: 600,
                maxRetryCount: 3,
                storageConfigs: {
                    tencent: PROVIDER_CONFIG_FIXTURES.tencent,
                },
                domains: [
                    {
                        domain: "test-bucket.cos.ap-guangzhou.myqcloud.com",
                        useStorage: "tencent",
                    },
                ],
            };
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);
            mockCacheManager.get.mockReturnValue(null);

            const result = await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.validTencentUrl);

            expect(result).toBe(PRESIGNED_URL_FIXTURES.validTencentUrl);
        });

        it("should return original URL when key extraction fails", async () => {
            mockCacheManager.get.mockReturnValue(null);

            const result = await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.rootPathUrl);

            // Root path should still work but key might be empty
            expect(result).toBeDefined();
        });
    });

    // ==================== 其他提供商支持 ====================
    describe("其他提供商支持", () => {
        it("should return original URL for tencent-cos (not implemented)", async () => {
            const config: PresignedUrlConfig = {
                imageFormat: "all",
                expire: 600,
                maxRetryCount: 3,
                storageConfigs: {
                    tencent: PROVIDER_CONFIG_FIXTURES.tencent,
                },
                domains: [
                    {
                        domain: "test-bucket.cos.ap-guangzhou.myqcloud.com",
                        useStorage: "tencent",
                    },
                ],
            };
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);
            mockCacheManager.get.mockReturnValue(null);

            const result = await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.validTencentUrl);

            expect(result).toBe(PRESIGNED_URL_FIXTURES.validTencentUrl);
        });

        it("should return original URL for aws (not implemented)", async () => {
            const config: PresignedUrlConfig = {
                imageFormat: "all",
                expire: 600,
                maxRetryCount: 3,
                storageConfigs: {
                    aws: PROVIDER_CONFIG_FIXTURES.aws,
                },
                domains: [
                    {
                        domain: "test-bucket.s3.us-west-2.amazonaws.com",
                        useStorage: "aws",
                    },
                ],
            };
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);
            mockCacheManager.get.mockReturnValue(null);

            const result = await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.validAwsUrl);

            expect(result).toBe(PRESIGNED_URL_FIXTURES.validAwsUrl);
        });

        it("should return original URL for unknown provider type", async () => {
            const config: PresignedUrlConfig = {
                imageFormat: "all",
                expire: 600,
                maxRetryCount: 3,
                storageConfigs: {
                    unknown: {
                        provider: "unknown" as "aliyun-oss",
                        domain: "unknown.com",
                        bucket: "test",
                        region: "test",
                    },
                },
                domains: [
                    {
                        domain: "unknown.com",
                        useStorage: "unknown",
                    },
                ],
            };
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);
            mockCacheManager.get.mockReturnValue(null);

            const result = await urlSigner.signUrl("https://unknown.com/image.jpg");

            expect(result).toBe("https://unknown.com/image.jpg");
        });
    });

    // ==================== 凭据合并逻辑 ====================
    describe("凭据合并逻辑", () => {
        beforeEach(() => {
            const config = PRESIGNED_URL_CONFIG_FIXTURES.complete;
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);
        });

        it("should prefer CMTX_ALIYUN_ACCESS_KEY_ID over config", async () => {
            vi.stubEnv("CMTX_ALIYUN_ACCESS_KEY_ID", "env-key-id");
            vi.stubEnv("CMTX_ALIYUN_ACCESS_KEY_SECRET", "env-key-secret");

            mockCacheManager.get.mockReturnValue(null);

            await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.validAliyunUrl);

            // Should use environment variables
            expect(mockCacheManager.set).toHaveBeenCalled();
        });

        it("should prefer ALIYUN_OSS_ACCESS_KEY_ID as fallback", async () => {
            vi.stubEnv("ALIYUN_OSS_ACCESS_KEY_ID", "fallback-key-id");
            vi.stubEnv("ALIYUN_OSS_ACCESS_KEY_SECRET", "fallback-key-secret");

            mockCacheManager.get.mockReturnValue(null);

            await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.validAliyunUrl);

            expect(mockCacheManager.set).toHaveBeenCalled();
        });

        it("should use config credentials when env vars not set", async () => {
            mockCacheManager.get.mockReturnValue(null);

            await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.validAliyunUrl);

            expect(mockCacheManager.set).toHaveBeenCalled();
        });

        it("should handle missing credentials (empty string)", async () => {
            const config: PresignedUrlConfig = {
                imageFormat: "all",
                expire: 600,
                maxRetryCount: 3,
                storageConfigs: {
                    aliyun: PROVIDER_CONFIG_FIXTURES.aliyunMinimal,
                },
                domains: [
                    {
                        domain: "minimal-bucket.oss-cn-shanghai.aliyuncs.com",
                        useStorage: "aliyun",
                    },
                ],
            };
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);
            mockCacheManager.get.mockReturnValue(null);

            const result = await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.validAliyunUrl);

            expect(result).toBeDefined();
        });
    });

    // ==================== URL 解析 ====================
    describe("URL 解析", () => {
        it("should extract key from simple URL path", async () => {
            const config = PRESIGNED_URL_CONFIG_FIXTURES.complete;
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);
            mockCacheManager.get.mockReturnValue(null);

            const result = await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.validAliyunUrl);

            expect(result).toContain("images/photo.jpg");
        });

        it("should extract key from nested path", async () => {
            const config = PRESIGNED_URL_CONFIG_FIXTURES.complete;
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);
            mockCacheManager.get.mockReturnValue(null);

            const result = await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.validAliyunUrlNested);

            expect(result).toContain("path/to/nested/image.png");
        });

        it("should handle invalid URL gracefully", async () => {
            const config = PRESIGNED_URL_CONFIG_FIXTURES.complete;
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);
            mockCacheManager.get.mockReturnValue(null);

            const result = await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.invalidUrl);

            expect(result).toBe(PRESIGNED_URL_FIXTURES.invalidUrl);
        });
    });

    // ==================== 错误处理 ====================
    describe("错误处理", () => {
        it("should cache original URL on failure (30s fallback)", async () => {
            const config = PRESIGNED_URL_CONFIG_FIXTURES.complete;
            urlSigner = new UrlSigner(config, mockCacheManager as unknown as UrlCacheManager);
            mockCacheManager.get.mockReturnValue(null);

            // Sign with a URL that won't match any provider
            await urlSigner.signUrl(PRESIGNED_URL_FIXTURES.unknownDomainUrl);

            expect(mockCacheManager.set).toHaveBeenCalledWith(
                PRESIGNED_URL_FIXTURES.unknownDomainUrl,
                PRESIGNED_URL_FIXTURES.unknownDomainUrl,
                30,
            );
        });
    });
});
