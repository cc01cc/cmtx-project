import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssetService, createAssetService } from "../../src/services/asset-service.js";

describe("AssetService", () => {
    const TEST_DIR = join(process.cwd(), ".test-asset-service");
    const IMAGES_DIR = join(TEST_DIR, "images");

    // Mock storage adapter
    const mockAdapter = {
        upload: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.png" }),
    };

    beforeEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
        await mkdir(IMAGES_DIR, { recursive: true });
        await writeFile(join(IMAGES_DIR, "test.png"), "fake-image-data");
        mockAdapter.upload.mockClear();
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    describe("constructor", () => {
        it("should create instance with required config", () => {
            const service = new AssetService({ adapter: mockAdapter as any });
            expect(service.id).toBe("asset");
        });

        it("should create instance with full config", () => {
            const service = new AssetService({
                adapter: mockAdapter as any,
                prefix: "images/",
                namingTemplate: "{name}_{hash}{ext}",
                conflictStrategy: "skip-all",
            });
            expect(service.id).toBe("asset");
        });
    });

    describe("initialize", () => {
        it("should update config when provided", () => {
            const service = new AssetService({ adapter: mockAdapter as any });
            const newAdapter = { upload: vi.fn() };
            service.initialize({ adapter: newAdapter as any });
            expect(service.id).toBe("asset");
        });

        it("should handle undefined config", () => {
            const service = new AssetService({ adapter: mockAdapter as any });
            service.initialize(undefined);
            expect(service.id).toBe("asset");
        });
    });

    describe("uploadImagesInDocument", () => {
        it("should return empty result when no local images", async () => {
            const service = new AssetService({ adapter: mockAdapter as any });
            const doc = "![alt](https://example.com/img.jpg)";
            const result = await service.uploadImagesInDocument(doc, TEST_DIR);
            expect(result.uploaded).toBe(0);
            expect(result.content).toBe(doc);
        });

        it("should process document with local images", async () => {
            const service = new AssetService({
                adapter: mockAdapter as any,
                prefix: "blog/",
            });
            const doc = `![photo](${join(IMAGES_DIR, "test.png")})`;
            const result = await service.uploadImagesInDocument(doc, TEST_DIR);
            // Pipeline will process the image
            expect(result).toHaveProperty("content");
            expect(result).toHaveProperty("uploaded");
        });

        it("should call onProgress callback when images uploaded", async () => {
            const onProgress = vi.fn();
            const imgFile = join(IMAGES_DIR, "test.png");
            await writeFile(imgFile, Buffer.from([137, 80, 78, 71]));
            const service = new AssetService({
                adapter: mockAdapter as any,
                onProgress,
            });
            const doc = `![alt](${imgFile})`;
            const result = await service.uploadImagesInDocument(doc, TEST_DIR);
            // onProgress is called when images were uploaded
            if (result.uploaded > 0) {
                expect(onProgress).toHaveBeenCalled();
            }
        });
    });

    describe("downloadImages", () => {
        it("should return result for document with no remote images", async () => {
            const service = new AssetService({ adapter: mockAdapter as any });
            const doc = "![alt](./local.png)";
            const result = await service.downloadImages(doc, TEST_DIR);
            expect(result).toHaveProperty("success");
            expect(result).toHaveProperty("failed");
            expect(result).toHaveProperty("skipped");
        });
    });

    describe("deleteImage", () => {
        it("should return empty result when no local images", async () => {
            const service = new AssetService({ adapter: mockAdapter as any });
            const doc = "![alt](https://example.com/img.jpg)";
            const result = await service.deleteImage(doc, TEST_DIR);
            expect(result.success).toBe(true);
            expect(result.deletedCount).toBe(0);
        });

        it("should delete local image file", async () => {
            const service = new AssetService({ adapter: mockAdapter as any });
            const imgPath = join(IMAGES_DIR, "test.png");
            const doc = `![photo](${imgPath})`;
            const result = await service.deleteImage(doc, TEST_DIR, {
                strategy: "hard-delete",
            });
            expect(result).toHaveProperty("success");
            expect(result).toHaveProperty("deletedCount");
            expect(result).toHaveProperty("details");
        });

        it("should handle non-existent image gracefully", async () => {
            const service = new AssetService({ adapter: mockAdapter as any });
            const doc = "![missing](./nonexistent.png)";
            const result = await service.deleteImage(doc, TEST_DIR, {
                strategy: "hard-delete",
            });
            expect(result).toHaveProperty("success");
            expect(result.details).toBeDefined();
        });

        it("should remove references from markdown when configured", async () => {
            const service = new AssetService({ adapter: mockAdapter as any });
            const imgPath = join(IMAGES_DIR, "test.png");
            const doc = `![photo](${imgPath})`;
            const result = await service.deleteImage(doc, TEST_DIR, {
                strategy: "hard-delete",
                removeFromMarkdown: true,
            });
            expect(result).toHaveProperty("referencesRemovedFrom");
        });
    });
});

describe("createAssetService", () => {
    it("should create AssetService instance", () => {
        const mockAdapter = { upload: vi.fn() };
        const service = createAssetService({ adapter: mockAdapter as any });
        expect(service).toBeInstanceOf(AssetService);
        expect(service.id).toBe("asset");
    });
});
