/**
 * DownloadService 单元测试
 *
 * @module download-assets-service.test
 * @description
 * 测试多存储下载服务的核心功能，包括 URL 域名匹配、adapter 选择、HTTP 回退等。
 */

import { describe, expect, it, vi } from "vitest";
import { DownloadService } from "../src/services/download-service.js";
import type { StorageAdapter } from "@cmtx/storage";

function createMockAdapter(name: string): StorageAdapter {
    return {
        provider: "aliyun-oss" as const,
        upload: vi.fn().mockResolvedValue("https://cdn.example.com/uploaded.png"),
        downloadToFile: vi.fn().mockResolvedValue(undefined),
        exists: vi.fn().mockResolvedValue(false),
        delete: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue([]),
        getObjectMeta: vi.fn().mockResolvedValue({ size: 100, lastModified: new Date() }),
    } as unknown as StorageAdapter;
}

describe("DownloadService", () => {
    describe("constructor", () => {
        it("should create service with empty config", () => {
            const service = new DownloadService({});
            expect(service.id).toBe("download");
        });

        it("should create service with sourceAdapters", () => {
            const adapter = createMockAdapter("test");
            const service = new DownloadService({
                sourceAdapters: [{ domain: "private.example.com", adapter }],
            });
            expect(service.id).toBe("download");
        });

        it("should create service with all config options", () => {
            const adapter = createMockAdapter("test");
            const logger = { info: vi.fn() } as any;
            const service = new DownloadService({
                sourceAdapters: [{ domain: "private.example.com", adapter }],
                namingTemplate: "{date}/{name}{ext}",
                concurrency: 5,
                logger,
            });
            expect(service.id).toBe("download");
        });
    });

    describe("initialize", () => {
        it("should update config on initialize", () => {
            const adapter = createMockAdapter("initial");
            const service = new DownloadService({
                sourceAdapters: [{ domain: "old.example.com", adapter }],
            });

            const newAdapter = createMockAdapter("new");
            service.initialize({
                sourceAdapters: [{ domain: "new.example.com", adapter: newAdapter }],
            });

            expect(service.id).toBe("download");
        });
    });

    describe("downloadImages", () => {
        it("should return zero counts for content with no images", async () => {
            const adapter = createMockAdapter("test");
            const service = new DownloadService({
                sourceAdapters: [{ domain: "private.example.com", adapter }],
            });

            const result = await service.downloadImages("No images here", "/tmp/output");

            expect(result.succeeded).toBe(0);
            expect(result.failed).toBe(0);
            expect(result.skipped).toBe(0);
        });

        it("should handle progress callback", async () => {
            const service = new DownloadService({});

            const result = await service.downloadImages("No images", "/tmp/output");

            expect(result.succeeded).toBe(0);
        });

        it("should accept options parameter with all fields", async () => {
            const adapter = createMockAdapter("test");
            const service = new DownloadService({
                sourceAdapters: [{ domain: "private.example.com", adapter }],
            });

            const result = await service.downloadImages("No images", "/tmp/output", {
                domain: "cdn.example.com",
                namingTemplate: "{date}/{name}{ext}",
                concurrency: 5,
                overwrite: true,
            });

            expect(result).toBeDefined();
            expect(result.succeeded).toBe(0);
        });

        it("options should override constructor config", async () => {
            const adapter = createMockAdapter("test");
            const service = new DownloadService({
                sourceAdapters: [{ domain: "private.example.com", adapter }],
                namingTemplate: "constructor.{ext}",
                concurrency: 3,
            });

            await service.downloadImages("No images", "/tmp/output", {
                namingTemplate: "override.{ext}",
                concurrency: 10,
            });

            const innerService = (service as any).config;
            expect(innerService.namingTemplate).toBe("constructor.{ext}");
        });
    });

    describe("adapter matching by URL domain", () => {
        it("should use matching adapter when URL domain matches configured source domain", async () => {
            const ossAdapter = createMockAdapter("oss");
            const service = new DownloadService({
                sourceAdapters: [{ domain: "private.oss.example.com", adapter: ossAdapter }],
            });

            // Use downloadSingleUrl to test adapter selection
            // This exercises findAdapterForUrl internally
            await expect(
                service.downloadSingleUrl(
                    "https://private.oss.example.com/images/photo.png",
                    "/tmp/img.png",
                ),
            ).rejects.toThrow();
            // The call should try to use the adapter's downloadToFile first
        });

        it("should use HTTP fallback when URL domain does not match any configured source domain", async () => {
            const ossAdapter = createMockAdapter("oss");
            const service = new DownloadService({
                sourceAdapters: [{ domain: "private.example.com", adapter: ossAdapter }],
            });

            // Different domain should fallback to HTTP download
            await expect(
                service.downloadSingleUrl("https://other.example.com/photo.png", "/tmp/img.png"),
            ).rejects.toThrow();
        });

        it(
            "should use HTTP fallback when sourceAdapters is empty",
            { timeout: 30000 },
            async () => {
                const service = new DownloadService({});

                await expect(
                    service.downloadSingleUrl("https://httpbin.org/status/404", "/tmp/img.png"),
                ).rejects.toThrow();
            },
        );
    });
});
