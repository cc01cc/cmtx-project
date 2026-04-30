import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as vscode from "vscode";
import {
    createVsCodeAdapter,
    type VsCodeAdapterConfig,
} from "../../../src/presigned-url/create-vscode-adapter";

describe("createVsCodeAdapter", () => {
    let mockOutputChannel: vscode.OutputChannel;
    let config: VsCodeAdapterConfig;

    beforeEach(() => {
        // Mock OutputChannel
        mockOutputChannel = {
            appendLine: vi.fn(),
            append: vi.fn(),
            clear: vi.fn(),
            show: vi.fn(),
            hide: vi.fn(),
            dispose: vi.fn(),
            name: "CMTX",
        } as unknown as vscode.OutputChannel;

        config = {
            storageConfigs: {
                default: {
                    provider: "aliyun-oss" as const,
                    bucket: "test-bucket",
                    region: "oss-cn-hangzhou",
                    domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                },
            },
            domains: [
                {
                    domain: "test-bucket.oss-cn-hangzhou.aliyuncs.com",
                    useStorage: "default",
                },
            ],
            expire: 600,
            maxRetryCount: 3,
            outputChannel: mockOutputChannel,
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("getSignedUrl", () => {
        it("should return null when no cache exists", () => {
            const adapter = createVsCodeAdapter(config);
            const result = adapter.getSignedUrl("https://example.com/image.png");
            expect(result).toBeNull();
        });

        it("should return cached URL when cache exists", async () => {
            const adapter = createVsCodeAdapter(config);
            const originalUrl = "https://test-bucket.oss-cn-hangzhou.aliyuncs.com/image.png";

            // First request to populate cache
            await adapter.requestSignedUrl(originalUrl);

            // Now should return the signed URL from cache
            const cachedResult = adapter.getSignedUrl(originalUrl);
            expect(cachedResult).not.toBeNull();
            expect(cachedResult).toContain("Signature=");
        });
    });

    describe("requestSignedUrl", () => {
        it("should handle unknown domain gracefully", async () => {
            const adapter = createVsCodeAdapter(config);
            const unknownUrl = "https://unknown-domain.com/image.png";

            const result = await adapter.requestSignedUrl(unknownUrl);

            // Should return original URL when domain not configured
            expect(result).toBe(unknownUrl);
        });

        it("should handle concurrent requests for same URL", async () => {
            const adapter = createVsCodeAdapter(config);
            const url = "https://test-bucket.oss-cn-hangzhou.aliyuncs.com/image.png";

            // Make two concurrent requests
            const promise1 = adapter.requestSignedUrl(url);
            const promise2 = adapter.requestSignedUrl(url);

            // Should return same promise
            const result1 = await promise1;
            const result2 = await promise2;

            expect(result1).toBe(result2);
        });
    });

    describe("logger integration", () => {
        it("should log to output channel with correct format", async () => {
            const adapter = createVsCodeAdapter(config);
            const url = "https://test-bucket.oss-cn-hangzhou.aliyuncs.com/image.png";

            await adapter.requestSignedUrl(url);

            // Check log format
            const calls = (mockOutputChannel.appendLine as ReturnType<typeof vi.fn>).mock.calls;
            const hasCorrectFormat = calls.some(
                (call: string[]) => call[0].includes("[CMTX]") && call[0].includes("[Adapter]"),
            );
            expect(hasCorrectFormat).toBe(true);
        });

        it("should log different levels appropriately", async () => {
            const adapter = createVsCodeAdapter(config);
            const unknownUrl = "https://unknown-domain.com/image.png";

            // This should trigger warn level log
            await adapter.requestSignedUrl(unknownUrl);

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining("WARN"),
            );
        });
    });

    describe("adapter initialization", () => {
        it("should initialize with correct configuration", async () => {
            const adapter = createVsCodeAdapter(config);
            const url = "https://test-bucket.oss-cn-hangzhou.aliyuncs.com/image.png";

            await adapter.requestSignedUrl(url);

            // Verify initialization logs
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining("URL 签名器初始化完成"),
            );
        });
    });
});
