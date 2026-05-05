import type MarkdownIt from "markdown-it";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as vscode from "vscode";
import type { PresignedUrlResolvedOptions } from "@cmtx/asset/config";
import {
    clearPresignedCache,
    deactivatePresignedUrl,
    extendMarkdownIt,
    initializePresignedUrl,
    isPresignedUrlEnabled,
    reloadPresignedUrlConfig,
    setPresignedUrlEnabled,
} from "../../src/providers/markdown-preview";

describe("markdown-preview", () => {
    let mockOutputChannel: vscode.OutputChannel;
    let mockOptions: PresignedUrlResolvedOptions;
    let mockMd: MarkdownIt;

    beforeEach(() => {
        mockOutputChannel = {
            appendLine: vi.fn(),
            append: vi.fn(),
            clear: vi.fn(),
            show: vi.fn(),
            hide: vi.fn(),
            dispose: vi.fn(),
            name: "CMTX",
        } as unknown as vscode.OutputChannel;

        mockOptions = {
            storageConfigs: {},
            domains: [],
            expire: 600,
            maxRetryCount: 3,
        };

        mockMd = {
            use: vi.fn().mockReturnThis(),
            renderer: {
                rules: {
                    image: vi.fn(),
                },
            },
            options: {
                html: true,
                linkify: true,
                typographer: true,
            },
        } as unknown as MarkdownIt;

        deactivatePresignedUrl();
    });

    afterEach(() => {
        vi.clearAllMocks();
        deactivatePresignedUrl();
    });

    describe("initializePresignedUrl", () => {
        it("should initialize with empty config", () => {
            expect(() => {
                initializePresignedUrl(mockOptions, mockOutputChannel);
            }).not.toThrow();
        });

        it("should initialize with aliyun provider and valid credentials", () => {
            const optionsWithAliyun: PresignedUrlResolvedOptions = {
                ...mockOptions,
                storageConfigs: {
                    "test-bucket.oss-cn-hangzhou.aliyuncs.com": {
                        provider: "aliyun-oss",
                        bucket: "test-bucket",
                        region: "oss-cn-hangzhou",
                        accessKeyId: "test-key-id",
                        accessKeySecret: "test-key-secret",
                    },
                },
                domains: [
                    {
                        domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                        useStorage: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                    },
                ],
            };

            expect(() => {
                initializePresignedUrl(optionsWithAliyun, mockOutputChannel);
            }).not.toThrow();
        });

        it("should not throw when aliyun provider missing credentials", () => {
            const optionsWithAliyunNoCreds: PresignedUrlResolvedOptions = {
                ...mockOptions,
                storageConfigs: {
                    "test-bucket.oss-cn-hangzhou.aliyuncs.com": {
                        provider: "aliyun-oss",
                        bucket: "test-bucket",
                        region: "oss-cn-hangzhou",
                    },
                },
                domains: [
                    {
                        domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                        useStorage: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                    },
                ],
            };

            expect(() => {
                initializePresignedUrl(optionsWithAliyunNoCreds, mockOutputChannel);
            }).not.toThrow();
        });

        it("should handle multiple aliyun providers", () => {
            const optionsWithMultiple: PresignedUrlResolvedOptions = {
                ...mockOptions,
                storageConfigs: {
                    "bucket1.oss-cn-hangzhou.aliyuncs.com": {
                        provider: "aliyun-oss",
                        bucket: "bucket1",
                        region: "oss-cn-hangzhou",
                        accessKeyId: "key1",
                        accessKeySecret: "secret1",
                    },
                    "bucket2.oss-cn-beijing.aliyuncs.com": {
                        provider: "aliyun-oss",
                        bucket: "bucket2",
                        region: "oss-cn-beijing",
                    },
                },
                domains: [
                    {
                        domain: "bucket1.oss-cn-hangzhou.aliyuncs.com",
                        useStorage: "bucket1.oss-cn-hangzhou.aliyuncs.com",
                    },
                    {
                        domain: "bucket2.oss-cn-beijing.aliyuncs.com",
                        useStorage: "bucket2.oss-cn-beijing.aliyuncs.com",
                    },
                ],
            };

            expect(() => {
                initializePresignedUrl(optionsWithMultiple, mockOutputChannel);
            }).not.toThrow();
        });
    });

    describe("extendMarkdownIt", () => {
        it("should return original md when config not initialized", () => {
            const result = extendMarkdownIt(mockMd);
            expect(result).toBe(mockMd);
            expect(mockMd.use).not.toHaveBeenCalled();
        });

        it("should not apply plugin when config has no providers", () => {
            initializePresignedUrl(mockOptions, mockOutputChannel);
            const result = extendMarkdownIt(mockMd);
            expect(result).toBe(mockMd);
            expect(mockMd.use).not.toHaveBeenCalled();
        });

        it("should apply plugin with valid providers", () => {
            const optionsWithProvider: PresignedUrlResolvedOptions = {
                ...mockOptions,
                storageConfigs: {
                    "test-bucket.oss-cn-hangzhou.aliyuncs.com": {
                        provider: "aliyun-oss",
                        bucket: "test-bucket",
                        region: "oss-cn-hangzhou",
                        accessKeyId: "test-key",
                        accessKeySecret: "test-secret",
                    },
                },
                domains: [
                    {
                        domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                        useStorage: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                    },
                ],
            };

            initializePresignedUrl(optionsWithProvider, mockOutputChannel);
            const result = extendMarkdownIt(mockMd);
            expect(result).toBe(mockMd);
            expect(mockMd.use).toHaveBeenCalled();
        });

        it("should always register plugin and pass enabled getter", () => {
            const optionsWithProvider: PresignedUrlResolvedOptions = {
                ...mockOptions,
                storageConfigs: {
                    "test-bucket.oss-cn-hangzhou.aliyuncs.com": {
                        provider: "aliyun-oss",
                        bucket: "test-bucket",
                        region: "oss-cn-hangzhou",
                        accessKeyId: "test-key",
                        accessKeySecret: "test-secret",
                    },
                },
                domains: [
                    {
                        domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                        useStorage: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                    },
                ],
            };

            initializePresignedUrl(optionsWithProvider, mockOutputChannel);
            setPresignedUrlEnabled(false);

            const result = extendMarkdownIt(mockMd);
            expect(result).toBe(mockMd);
            expect(mockMd.use).toHaveBeenCalledTimes(1);
        });

        it("should pass enabled getter that reflects runtime state", () => {
            const optionsWithProvider: PresignedUrlResolvedOptions = {
                ...mockOptions,
                storageConfigs: {
                    "test-bucket.oss-cn-hangzhou.aliyuncs.com": {
                        provider: "aliyun-oss",
                        bucket: "test-bucket",
                        region: "oss-cn-hangzhou",
                        accessKeyId: "test-key",
                        accessKeySecret: "test-secret",
                    },
                },
                domains: [
                    {
                        domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                        useStorage: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                    },
                ],
            };

            initializePresignedUrl(optionsWithProvider, mockOutputChannel);
            setPresignedUrlEnabled(false);
            extendMarkdownIt(mockMd);

            const pluginOptions = mockMd.use.mock.calls[0][1];
            expect(typeof pluginOptions.enabled).toBe("function");
            expect(pluginOptions.enabled()).toBe(false);

            setPresignedUrlEnabled(true);
            expect(pluginOptions.enabled()).toBe(true);
        });
    });

    describe("clearPresignedCache", () => {
        it("should warn when adapter not initialized", () => {
            clearPresignedCache();
            expect(() => clearPresignedCache()).not.toThrow();
        });

        it("should clear cache when adapter is initialized", () => {
            initializePresignedUrl(mockOptions, mockOutputChannel);
            expect(() => clearPresignedCache()).not.toThrow();
        });
    });

    describe("deactivatePresignedUrl", () => {
        it("should clean up state", () => {
            initializePresignedUrl(mockOptions, mockOutputChannel);
            deactivatePresignedUrl();

            const result = extendMarkdownIt(mockMd);
            expect(result).toBe(mockMd);
            expect(mockMd.use).not.toHaveBeenCalled();
        });
    });

    describe("reloadPresignedUrlConfig", () => {
        it("should reload config", () => {
            const initialOptions: PresignedUrlResolvedOptions = {
                ...mockOptions,
                storageConfigs: {
                    "initial.oss-cn-hangzhou.aliyuncs.com": {
                        provider: "aliyun-oss",
                        bucket: "initial",
                        region: "oss-cn-hangzhou",
                        accessKeyId: "key",
                        accessKeySecret: "secret",
                    },
                },
                domains: [
                    {
                        domain: "initial.oss-cn-hangzhou.aliyuncs.com",
                        useStorage: "initial.oss-cn-hangzhou.aliyuncs.com",
                    },
                ],
            };

            const newOptions: PresignedUrlResolvedOptions = {
                ...mockOptions,
                storageConfigs: {
                    "new.oss-cn-beijing.aliyuncs.com": {
                        provider: "aliyun-oss",
                        bucket: "new",
                        region: "oss-cn-beijing",
                        accessKeyId: "new-key",
                        accessKeySecret: "new-secret",
                    },
                },
                domains: [
                    {
                        domain: "new.oss-cn-beijing.aliyuncs.com",
                        useStorage: "new.oss-cn-beijing.aliyuncs.com",
                    },
                ],
            };

            initializePresignedUrl(initialOptions, mockOutputChannel);
            reloadPresignedUrlConfig(newOptions, mockOutputChannel);

            const result = extendMarkdownIt(mockMd);
            expect(result).toBe(mockMd);
            expect(mockMd.use).toHaveBeenCalled();
        });
    });

    describe("variable name consistency", () => {
        it("should use correct variable names in validateCredentialPresence", () => {
            const optionsWithAliyun: PresignedUrlResolvedOptions = {
                ...mockOptions,
                storageConfigs: {
                    "test-bucket.oss-cn-hangzhou.aliyuncs.com": {
                        provider: "aliyun-oss",
                        bucket: "test-bucket",
                        region: "oss-cn-hangzhou",
                    },
                },
                domains: [
                    {
                        domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                        useStorage: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                    },
                ],
            };
            expect(() => initializePresignedUrl(optionsWithAliyun, mockOutputChannel)).not.toThrow(
                ReferenceError,
            );
        });
    });

    describe("isPresignedUrlEnabled / setPresignedUrlEnabled", () => {
        it("should default to enabled after initializePresignedUrl", () => {
            initializePresignedUrl(mockOptions, mockOutputChannel);
            expect(isPresignedUrlEnabled()).toBe(true);
        });

        it("should be disabled after deactivatePresignedUrl", () => {
            initializePresignedUrl(mockOptions, mockOutputChannel);
            deactivatePresignedUrl();
            expect(isPresignedUrlEnabled()).toBe(false);
        });

        it("should respect setPresignedUrlEnabled", () => {
            initializePresignedUrl(mockOptions, mockOutputChannel);
            setPresignedUrlEnabled(false);
            expect(isPresignedUrlEnabled()).toBe(false);
            setPresignedUrlEnabled(true);
            expect(isPresignedUrlEnabled()).toBe(true);
        });
    });
});
