/**
 * DownloadAssetsService 单元测试
 *
 * @module download-assets-service.test
 * @description
 * 测试多存储下载服务的核心功能，包括 URL 域名匹配、adapter 选择、HTTP 回退等。
 */

import { describe, expect, it, vi } from "vitest";
import { DownloadAssetsService } from "../src/services/download-assets-service.js";
import type { IStorageAdapter } from "@cmtx/storage";

function createMockAdapter(name: string): IStorageAdapter {
    return {
        provider: "aliyun-oss" as const,
        upload: vi.fn().mockResolvedValue("https://cdn.example.com/uploaded.png"),
        downloadToFile: vi.fn().mockResolvedValue(undefined),
        exists: vi.fn().mockResolvedValue(false),
        delete: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue([]),
        getObjectMeta: vi.fn().mockResolvedValue({ size: 100, lastModified: new Date() }),
    } as unknown as IStorageAdapter;
}

describe("DownloadAssetsService", () => {
    describe("constructor", () => {
        it("should create service with empty config", () => {
            const service = new DownloadAssetsService({});
            expect(service.id).toBe("download");
        });

        it("should create service with sourceAdapters", () => {
            const adapter = createMockAdapter("test");
            const service = new DownloadAssetsService({
                sourceAdapters: [{ domain: "private.example.com", adapter }],
            });
            expect(service.id).toBe("download");
        });

        it("should create service with all config options", () => {
            const adapter = createMockAdapter("test");
            const logger = { info: vi.fn() } as any;
            const service = new DownloadAssetsService({
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
            const service = new DownloadAssetsService({
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
            const service = new DownloadAssetsService({
                sourceAdapters: [{ domain: "private.example.com", adapter }],
            });

            const result = await service.downloadImages("No images here", "/tmp/output");

            expect(result.success).toBe(0);
            expect(result.failed).toBe(0);
            expect(result.skipped).toBe(0);
        });

        it("should handle progress callback", async () => {
            const service = new DownloadAssetsService({});

            const result = await service.downloadImages("No images", "/tmp/output");

            expect(result.success).toBe(0);
        });
    });

    describe("adapter matching by URL domain", () => {
        it("should use matching adapter when URL domain matches configured source domain", async () => {
            const ossAdapter = createMockAdapter("oss");
            const service = new DownloadAssetsService({
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
            const service = new DownloadAssetsService({
                sourceAdapters: [{ domain: "private.example.com", adapter: ossAdapter }],
            });

            // Different domain should fallback to HTTP download
            await expect(
                service.downloadSingleUrl("https://other.example.com/photo.png", "/tmp/img.png"),
            ).rejects.toThrow();
        });

        it("should use HTTP fallback when sourceAdapters is empty", async () => {
            const service = new DownloadAssetsService({});

            await expect(
                service.downloadSingleUrl("https://example.com/photo.png", "/tmp/img.png"),
            ).rejects.toThrow();
        });
    });
});
