/**
 * TransferAssetsService 单元测试
 *
 * @module transfer-assets-service.test
 * @description
 * 测试跨存储转移服务的核心功能。
 */

import { describe, expect, it } from "vitest";
import { TransferAssetsService } from "../src/services/transfer-assets-service.js";
import type { IStorageAdapter } from "@cmtx/storage";

function createMockAdapter(name: string): IStorageAdapter {
    return {
        provider: "aliyun-oss" as const,
        upload: async () => {},
        downloadToFile: async () => {},
        exists: async () => false,
        delete: async () => {},
        list: async () => [],
        getObjectMeta: async () => ({ size: 100, lastModified: new Date() }),
    } as unknown as IStorageAdapter;
}

describe("TransferAssetsService", () => {
    describe("constructor", () => {
        it("should create service with required config", () => {
            const sourceAdapter = createMockAdapter("source");
            const targetAdapter = createMockAdapter("target");

            const service = new TransferAssetsService({
                sourceAdapters: [{ domain: "source.example.com", adapter: sourceAdapter }],
                targetAdapter,
            });

            expect(service.id).toBe("transfer");
        });

        it("should create service with all config options", () => {
            const sourceAdapter = createMockAdapter("source");
            const targetAdapter = createMockAdapter("target");
            const logger = { info: () => {} } as any;

            const service = new TransferAssetsService({
                sourceAdapters: [{ domain: "source.example.com", adapter: sourceAdapter }],
                targetAdapter,
                targetPrefix: "images/",
                targetCustomDomain: "https://cdn.example.com",
                sourceCustomDomain: "https://source.example.com",
                namingTemplate: "{date}/{name}{ext}",
                concurrency: 5,
                deleteSource: true,
                logger,
            });

            expect(service.id).toBe("transfer");
        });
    });

    describe("initialize", () => {
        it("should update config on initialize", () => {
            const sourceAdapter = createMockAdapter("source");
            const targetAdapter = createMockAdapter("target");

            const service = new TransferAssetsService({
                sourceAdapters: [{ domain: "source.example.com", adapter: sourceAdapter }],
                targetAdapter,
            });

            const newSourceAdapter = createMockAdapter("new-source");
            service.initialize({
                sourceAdapters: [{ domain: "new.example.com", adapter: newSourceAdapter }],
                targetAdapter,
            });

            expect(service.id).toBe("transfer");
        });
    });

    describe("transferImages", () => {
        it("should return empty result for document with no images", async () => {
            const sourceAdapter = createMockAdapter("source");
            const targetAdapter = createMockAdapter("target");

            const service = new TransferAssetsService({
                sourceAdapters: [{ domain: "source.example.com", adapter: sourceAdapter }],
                targetAdapter,
            });

            const result = await service.transferImages("No images here", "/test.md");

            expect(result.transferred).toBe(0);
            expect(result.failed).toBe(0);
            expect(result.content).toBe("No images here");
        });

        it("should return error when no source adapter configured", async () => {
            const targetAdapter = createMockAdapter("target");

            const service = new TransferAssetsService({
                sourceAdapters: [],
                targetAdapter,
            });

            const result = await service.transferImages(
                "![img](https://example.com/img.png)",
                "/test.md",
            );

            expect(result.transferred).toBe(0);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].error).toContain("No source adapter");
        });

        it("should accept options parameter", async () => {
            const sourceAdapter = createMockAdapter("source");
            const targetAdapter = createMockAdapter("target");

            const service = new TransferAssetsService({
                sourceAdapters: [{ domain: "source.example.com", adapter: sourceAdapter }],
                targetAdapter,
            });

            const result = await service.transferImages("No images", "/test.md", {
                sourceDomain: "source.example.com",
                concurrency: 3,
                deleteSource: false,
            });

            expect(result).toBeDefined();
        });
    });
});
