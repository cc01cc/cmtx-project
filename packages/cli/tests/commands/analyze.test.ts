import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileService } from "@cmtx/asset/file";

const TEST_DIR = resolve(process.cwd(), ".test-analyze-cli");

describe("analyze command integration", () => {
    let fileService: FileService;

    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
        fileService = new FileService();
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    it("should return referenced images via analyzeDirectory", async () => {
        await writeFile(join(TEST_DIR, "doc.md"), "![img](./img.png)");
        await writeFile(join(TEST_DIR, "img.png"), "content");

        const result = await fileService.analyzeDirectory(TEST_DIR);
        expect(result.images).toHaveLength(1);
        expect(result.images[0].type).toBe("local");
        if (result.images[0].type === "local") {
            expect(result.images[0].orphan).toBe(false);
            expect(result.images[0].referencedBy).toHaveLength(1);
        }
    });

    it("should return orphan images when only image files exist", async () => {
        await writeFile(join(TEST_DIR, "orphan.png"), "content");

        const result = await fileService.analyzeDirectory(TEST_DIR);
        expect(result.images).toHaveLength(1);
        expect(result.images[0].type).toBe("local");
        if (result.images[0].type === "local") {
            expect(result.images[0].orphan).toBe(true);
        }
    });

    it("should merge referenced and orphan correctly", async () => {
        await writeFile(join(TEST_DIR, "doc.md"), "![used](./used.png)");
        await writeFile(join(TEST_DIR, "used.png"), "content");
        await writeFile(join(TEST_DIR, "orphan1.png"), "content");
        await writeFile(join(TEST_DIR, "orphan2.jpg"), "content");

        const result = await fileService.analyzeDirectory(TEST_DIR);
        expect(result.summary.referenced).toBe(1);
        expect(result.summary.orphan).toBe(2);
    });

    it("should apply maxSize to orphan images only", async () => {
        await writeFile(join(TEST_DIR, "doc.md"), "![ref](./ref.png)");
        await writeFile(join(TEST_DIR, "ref.png"), "data");
        await writeFile(join(TEST_DIR, "large-orphan.png"), "x".repeat(100));

        const sliced = await fileService.analyzeDirectory(TEST_DIR, { maxSize: 10 });

        expect(sliced.images).toHaveLength(1);
        expect(sliced.images[0].type).toBe("local");
        if (sliced.images[0].type === "local") {
            expect(sliced.images[0].orphan).toBe(false);
        }
    });
});
