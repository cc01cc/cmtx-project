import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DeleteService } from "../src/delete/delete-service.js";

const TEST_DIR = resolve(process.cwd(), ".test-delete-service");

describe("DeleteService", () => {
    let service: DeleteService;
    let imagePath: string;
    let mdFilePath: string;

    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });

        imagePath = join(TEST_DIR, "photo.png");
        await writeFile(imagePath, "fake-image-content");

        mdFilePath = join(TEST_DIR, "doc.md");
        await writeFile(mdFilePath, `# Doc\n\n![Photo](photo.png)\n`, "utf-8");

        service = new DeleteService({
            workspaceRoot: TEST_DIR,
            options: {
                strategy: "hard-delete",
            },
        });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    describe("pruneDirectory", () => {
        it("should delete orphan images and skip referenced ones", async () => {
            const orphanPath = join(TEST_DIR, "orphan.png");
            await writeFile(orphanPath, "orphan-content");

            const result = await service.pruneDirectory(TEST_DIR);

            expect(result.totalOrphans).toBe(1);
            expect(result.deletedCount).toBe(1);
            expect(result.failedCount).toBe(0);
            expect(result.entries[0].status).toBe("deleted");
            expect(result.entries[0].absPath).toBe(orphanPath);
        });

        it("should return empty result when no orphan images", async () => {
            const result = await service.pruneDirectory(TEST_DIR);

            expect(result.totalOrphans).toBe(0);
            expect(result.deletedCount).toBe(0);
            expect(result.failedCount).toBe(0);
        });

        it("should keep referenced images untouched", async () => {
            const orphanPath = join(TEST_DIR, "orphan.png");
            await writeFile(orphanPath, "orphan-content");

            const result = await service.pruneDirectory(TEST_DIR);

            expect(result.deletedCount).toBe(1);
            expect(result.totalOrphans).toBe(1);

            // referenced image (photo.png) should still exist
            await expect(
                import("node:fs/promises").then((fs) => fs.stat(imagePath)),
            ).resolves.toBeDefined();

            // orphan should be deleted
            await expect(
                import("node:fs/promises").then((fs) => fs.stat(orphanPath)),
            ).rejects.toThrow("ENOENT");
        });

        it("should filter by extensions option", async () => {
            await writeFile(join(TEST_DIR, "img.png"), "content");
            await writeFile(join(TEST_DIR, "img.svg"), "content");

            const result = await service.pruneDirectory(TEST_DIR, {
                extensions: ["svg"],
            });

            expect(result.totalOrphans).toBe(1);
            expect(result.entries[0].absPath).toContain("img.svg");
        });

        it("should report freed size correctly", async () => {
            const content = "x".repeat(100);
            await writeFile(join(TEST_DIR, "orphan.png"), content);

            const result = await service.pruneDirectory(TEST_DIR);

            expect(result.freedSize).toBeGreaterThan(0);
            expect(result.totalSizeBefore).toBeGreaterThan(0);
        });

        it("should return empty result for non-existent directory", async () => {
            const nonExistentDir = join(TEST_DIR, "does-not-exist");

            const result = await service.pruneDirectory(nonExistentDir);

            expect(result.totalOrphans).toBe(0);
            expect(result.deletedCount).toBe(0);
            expect(result.failedCount).toBe(0);
            expect(result.totalSizeBefore).toBe(0);
            expect(result.freedSize).toBe(0);
        });
    });

    describe("safeDelete", () => {
        it("should delete image with no references", async () => {
            const orphanDir = join(TEST_DIR, "sub");
            await mkdir(orphanDir, { recursive: true });
            const orphanPath = join(orphanDir, "orphan.png");
            await writeFile(orphanPath, "orphan-content");

            const result = await service.safeDelete(orphanPath);

            expect(result.success).toBe(true);
            expect(result.deleted).toBe(true);
            expect(result.detail.hasReferences).toBe(false);
            expect(result.detail.forceDeleted).toBe(false);
        });

        it("should skip deletion when referenced and force:false", async () => {
            const result = await service.safeDelete(imagePath, { force: false });

            expect(result.success).toBe(false);
            expect(result.deleted).toBe(false);
            expect(result.detail.hasReferences).toBe(true);
            expect(result.detail.forceDeleted).toBe(false);
        });

        it("should delete when referenced and force:true", async () => {
            const result = await service.safeDelete(imagePath, { force: true });

            expect(result.success).toBe(true);
            expect(result.deleted).toBe(true);
            expect(result.detail.hasReferences).toBe(true);
            expect(result.detail.forceDeleted).toBe(true);
        });

        it("should clean up references when force+removeFromMarkdown", async () => {
            const result = await service.safeDelete(imagePath, {
                force: true,
                removeFromMarkdown: true,
            });

            expect(result.success).toBe(true);
            expect(result.deleted).toBe(true);
            expect(result.deleteResult?.referencesRemovedFrom).toBe(1);

            const mdContent = await import("node:fs/promises").then((fs) =>
                fs.readFile(mdFilePath, "utf-8"),
            );
            expect(mdContent).not.toContain("photo.png");
        });

        it("should clean up references without deleting file when not forced", async () => {
            const result = await service.safeDelete(imagePath, {
                force: false,
                removeFromMarkdown: true,
            });

            expect(result.success).toBe(false);
            expect(result.deleted).toBe(false);
            expect(result.detail.hasReferences).toBe(true);

            const mdContent = await import("node:fs/promises").then((fs) =>
                fs.readFile(mdFilePath, "utf-8"),
            );
            expect(mdContent).not.toContain("photo.png");
        });

        it("should return failure for non-existent file", async () => {
            const result = await service.safeDelete(join(TEST_DIR, "nonexistent.png"));

            expect(result.success).toBe(false);
            expect(result.deleted).toBe(true);
            expect(result.deleteResult?.details[0].success).toBe(false);
        });

        it("should handle removeFromMarkdown without force and no references", async () => {
            const orphanDir = join(TEST_DIR, "sub2");
            await mkdir(orphanDir, { recursive: true });
            const orphanPath = join(orphanDir, "orphan2.png");
            await writeFile(orphanPath, "orphan-content");

            const result = await service.safeDelete(orphanPath, {
                removeFromMarkdown: true,
            });

            expect(result.success).toBe(true);
            expect(result.deleted).toBe(true);
        });
    });
});
