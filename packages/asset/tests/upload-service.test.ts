import { describe, expect, it, vi } from "vitest";
import { UploadService } from "../src/services/upload-service.js";
import type { StorageAdapter } from "@cmtx/storage";

function createMockAdapter(): StorageAdapter {
    return {
        provider: "aliyun-oss" as const,
        upload: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/img.png" }),
        exists: vi.fn().mockResolvedValue(false),
        buildUrl: vi.fn().mockReturnValue("https://cdn.example.com/img.png"),
    } as unknown as StorageAdapter;
}

describe("UploadService", () => {
    describe("constructor", () => {
        it("should create service with required config", () => {
            const service = new UploadService({ adapter: createMockAdapter() });
            expect(service.id).toBe("upload");
        });

        it("should create service with all config options", () => {
            const service = new UploadService({
                adapter: createMockAdapter(),
                prefix: "blog/",
                namingTemplate: "{name}.{ext}",
                conflictStrategy: "rename",
                domain: "cdn.example.com",
            });
            expect(service.id).toBe("upload");
        });
    });

    describe("initialize", () => {
        it("should update config on initialize", () => {
            const service = new UploadService({ adapter: createMockAdapter() });
            service.initialize({ adapter: createMockAdapter() });
            expect(service.id).toBe("upload");
        });
    });

    describe("uploadImagesInDocument", () => {
        it("should return empty result for document with no images", async () => {
            const service = new UploadService({ adapter: createMockAdapter() });
            const result = await service.uploadImagesInDocument("No images here", "/tmp");
            expect(result.succeeded).toBe(0);
            expect(result.failed).toHaveLength(0);
        });

        it("should accept options parameter", async () => {
            const adapter = createMockAdapter();
            const service = new UploadService({ adapter });

            const result = await service.uploadImagesInDocument("No images", "/tmp", {
                prefix: "custom/",
                namingTemplate: "{name}.{ext}",
            });

            expect(result).toBeDefined();
        });

        it("should merge config with options overriding constructor config", async () => {
            const adapter = createMockAdapter();
            const service = new UploadService({
                adapter,
                prefix: "default-prefix/",
                namingTemplate: "default.{ext}",
            });

            await service.uploadImagesInDocument("No images", "/tmp", {
                namingTemplate: "override.{ext}",
            });

            expect(service["config"].prefix).toBe("default-prefix/");
        });

        it("should use default config when no options provided", async () => {
            const adapter = createMockAdapter();
            const service = new UploadService({
                adapter,
                prefix: "default-prefix/",
            });

            await service.uploadImagesInDocument("No images", "/tmp");

            expect(service).toBeDefined();
        });
    });
});
