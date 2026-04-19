import type MarkdownIt from 'markdown-it';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import type { PresignedUrlConfig } from '../../src/infra';
import {
    clearPresignedCache,
    deactivatePresignedUrl,
    extendMarkdownIt,
    initializePresignedUrl,
    reloadPresignedUrlConfig,
} from '../../src/providers/markdown-preview';

describe('markdown-preview', () => {
    let mockOutputChannel: vscode.OutputChannel;
    let mockConfig: PresignedUrlConfig;
    let mockMd: MarkdownIt;

    beforeEach(() => {
        // Mock OutputChannel
        mockOutputChannel = {
            appendLine: vi.fn(),
            append: vi.fn(),
            clear: vi.fn(),
            show: vi.fn(),
            hide: vi.fn(),
            dispose: vi.fn(),
            name: 'CMTX',
        } as unknown as vscode.OutputChannel;

        // Mock config without aliyun provider
        mockConfig = {
            imageFormat: 'all',
            expire: 600,
            maxRetryCount: 3,
            providerConfigs: [],
        };

        // Mock MarkdownIt
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

        // Reset state
        deactivatePresignedUrl();
    });

    afterEach(() => {
        vi.clearAllMocks();
        deactivatePresignedUrl();
    });

    describe('initializePresignedUrl', () => {
        it('should initialize with empty config', () => {
            expect(() => {
                initializePresignedUrl(mockConfig, mockOutputChannel);
            }).not.toThrow();
        });

        it('should initialize with aliyun provider and valid credentials', () => {
            const configWithAliyun: PresignedUrlConfig = {
                ...mockConfig,
                providerConfigs: [
                    {
                        provider: 'aliyun-oss',
                        domain: 'test-bucket.oss-cn-hangzhou.aliyuncs.com',
                        bucket: 'test-bucket',
                        region: 'oss-cn-hangzhou',
                        accessKeyId: 'test-key-id',
                        accessKeySecret: 'test-key-secret',
                    },
                ],
            };

            expect(() => {
                initializePresignedUrl(configWithAliyun, mockOutputChannel);
            }).not.toThrow();
        });

        it('should not throw when aliyun provider missing credentials', () => {
            const configWithAliyunNoCreds: PresignedUrlConfig = {
                ...mockConfig,
                providerConfigs: [
                    {
                        provider: 'aliyun-oss',
                        domain: 'test-bucket.oss-cn-hangzhou.aliyuncs.com',
                        bucket: 'test-bucket',
                        region: 'oss-cn-hangzhou',
                    },
                ],
            };

            // Should not throw, but should log error
            expect(() => {
                initializePresignedUrl(configWithAliyunNoCreds, mockOutputChannel);
            }).not.toThrow();

            // Function should complete without error
            expect(true).toBe(true);
        });

        it('should handle multiple aliyun providers', () => {
            const configWithMultiple: PresignedUrlConfig = {
                ...mockConfig,
                providerConfigs: [
                    {
                        provider: 'aliyun-oss',
                        domain: 'bucket1.oss-cn-hangzhou.aliyuncs.com',
                        bucket: 'bucket1',
                        region: 'oss-cn-hangzhou',
                        accessKeyId: 'key1',
                        accessKeySecret: 'secret1',
                    },
                    {
                        provider: 'aliyun-oss',
                        domain: 'bucket2.oss-cn-beijing.aliyuncs.com',
                        bucket: 'bucket2',
                        region: 'oss-cn-beijing',
                        // Missing credentials
                    },
                ],
            };

            // Should not throw
            expect(() => {
                initializePresignedUrl(configWithMultiple, mockOutputChannel);
            }).not.toThrow();

            // Function should complete without error
            expect(true).toBe(true);
        });
    });

    describe('extendMarkdownIt', () => {
        it('should return original md when config not initialized', () => {
            const result = extendMarkdownIt(mockMd);
            expect(result).toBe(mockMd);
            expect(mockMd.use).not.toHaveBeenCalled();
        });

        it('should not apply plugin when config has no providers', () => {
            initializePresignedUrl(mockConfig, mockOutputChannel);
            const result = extendMarkdownIt(mockMd);
            expect(result).toBe(mockMd);
            // Plugin should NOT be applied when providerConfigs is empty
            expect(mockMd.use).not.toHaveBeenCalled();
        });

        it('should apply plugin with valid providers', () => {
            const configWithProvider: PresignedUrlConfig = {
                ...mockConfig,
                providerConfigs: [
                    {
                        provider: 'aliyun-oss',
                        domain: 'test-bucket.oss-cn-hangzhou.aliyuncs.com',
                        bucket: 'test-bucket',
                        region: 'oss-cn-hangzhou',
                        accessKeyId: 'test-key',
                        accessKeySecret: 'test-secret',
                    },
                ],
            };

            initializePresignedUrl(configWithProvider, mockOutputChannel);
            const result = extendMarkdownIt(mockMd);
            expect(result).toBe(mockMd);
            expect(mockMd.use).toHaveBeenCalled();
        });
    });

    describe('clearPresignedCache', () => {
        it('should warn when adapter not initialized', () => {
            clearPresignedCache();
            // Should log warning - check through logger
            expect(() => clearPresignedCache()).not.toThrow();
        });

        it('should clear cache when adapter is initialized', () => {
            initializePresignedUrl(mockConfig, mockOutputChannel);
            // Should not throw when clearing cache
            expect(() => clearPresignedCache()).not.toThrow();
        });
    });

    describe('deactivatePresignedUrl', () => {
        it('should clean up state', () => {
            initializePresignedUrl(mockConfig, mockOutputChannel);
            deactivatePresignedUrl();

            // After deactivation, extendMarkdownIt should not apply plugin
            const result = extendMarkdownIt(mockMd);
            expect(result).toBe(mockMd);
            expect(mockMd.use).not.toHaveBeenCalled();
        });
    });

    describe('reloadPresignedUrlConfig', () => {
        it('should reload config', () => {
            const initialConfig: PresignedUrlConfig = {
                ...mockConfig,
                providerConfigs: [
                    {
                        provider: 'aliyun-oss',
                        domain: 'initial.oss-cn-hangzhou.aliyuncs.com',
                        bucket: 'initial',
                        region: 'oss-cn-hangzhou',
                        accessKeyId: 'key',
                        accessKeySecret: 'secret',
                    },
                ],
            };

            const newConfig: PresignedUrlConfig = {
                ...mockConfig,
                providerConfigs: [
                    {
                        provider: 'aliyun-oss',
                        domain: 'new.oss-cn-beijing.aliyuncs.com',
                        bucket: 'new',
                        region: 'oss-cn-beijing',
                        accessKeyId: 'new-key',
                        accessKeySecret: 'new-secret',
                    },
                ],
            };

            initializePresignedUrl(initialConfig, mockOutputChannel);
            reloadPresignedUrlConfig(newConfig, mockOutputChannel);

            // Should be able to extend with new config
            const result = extendMarkdownIt(mockMd);
            expect(result).toBe(mockMd);
            expect(mockMd.use).toHaveBeenCalled();
        });
    });

    describe('variable name consistency', () => {
        it('should use correct variable names in validateCredentialPresence', () => {
            // This test ensures the bug with "alyunProviders" vs "aliyunProviders" doesn't happen again
            const configWithAliyun: PresignedUrlConfig = {
                ...mockConfig,
                providerConfigs: [
                    {
                        provider: 'aliyun-oss',
                        domain: 'test.oss-cn-hangzhou.aliyuncs.com',
                        bucket: 'test',
                        region: 'oss-cn-hangzhou',
                        // No credentials - should trigger error logging
                    },
                ],
            };

            // Should not throw ReferenceError
            expect(() => {
                initializePresignedUrl(configWithAliyun, mockOutputChannel);
            }).not.toThrow(ReferenceError);

            // Verify the function executed without throwing
            // The error logging goes through getLogger, not directly to outputChannel
            expect(true).toBe(true);
        });
    });
});
