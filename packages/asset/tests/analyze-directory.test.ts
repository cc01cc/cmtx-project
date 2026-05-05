import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileService } from "../src/file/file-service.js";
import type { LocalImageEntry, WebImageEntry } from "../src/file/types.js";

const TEST_DIR = resolve(process.cwd(), ".test-analyze-directory");

function isLocal(entry: { type: string }): entry is LocalImageEntry {
    return entry.type === "local";
}

function isWeb(entry: { type: string }): entry is WebImageEntry {
    return entry.type === "web";
}

describe("FileService.analyzeDirectory", () => {
    let fileService: FileService;

    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
        fileService = new FileService();
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    it("should find referenced and orphan images", async () => {
        await writeFile(join(TEST_DIR, "doc.md"), "![used](./used.png)");
        await writeFile(join(TEST_DIR, "used.png"), "content");
        await writeFile(join(TEST_DIR, "orphan.png"), "content");

        const result = await fileService.analyzeDirectory(TEST_DIR);

        expect(result.images).toHaveLength(2);
        expect(result.summary.referenced).toBe(1);
        expect(result.summary.orphan).toBe(1);

        const used = result.images.find((i) => i.type === "local" && i.src === "./used.png");
        expect(used).toBeDefined();
        if (used && isLocal(used)) {
            expect(used.orphan).toBe(false);
            expect(used.referencedBy).toHaveLength(1);
        }

        const orphan = result.images.find((i) => isLocal(i) && i.orphan);
        expect(orphan).toBeDefined();
        if (orphan && isLocal(orphan)) {
            expect(orphan.src).toContain("orphan.png");
            expect(orphan.referencedBy).toHaveLength(0);
        }
    });

    it("should mark all images as orphan when no md files", async () => {
        await writeFile(join(TEST_DIR, "img.png"), "content");
        await writeFile(join(TEST_DIR, "pic.jpg"), "content");

        const result = await fileService.analyzeDirectory(TEST_DIR);

        expect(result.summary.referenced).toBe(0);
        expect(result.summary.orphan).toBe(2);
        expect(result.images.every((i) => isLocal(i) && i.orphan)).toBe(true);
    });

    it("should return empty when no images exist", async () => {
        await writeFile(join(TEST_DIR, "doc.md"), "# no images");

        const result = await fileService.analyzeDirectory(TEST_DIR);

        expect(result.images).toHaveLength(0);
        expect(result.summary.referenced).toBe(0);
        expect(result.summary.orphan).toBe(0);
    });

    it("should filter by maxSize option", async () => {
        await writeFile(join(TEST_DIR, "small.png"), "x");
        await writeFile(join(TEST_DIR, "large.png"), "x".repeat(1000));

        const result = await fileService.analyzeDirectory(TEST_DIR, { maxSize: 100 });

        expect(result.images).toHaveLength(1);
        expect(result.images[0].type).toBe("local");
        if (isLocal(result.images[0])) {
            expect(result.images[0].src).toContain("small.png");
        }
    });

    it("should filter by custom extensions", async () => {
        await writeFile(join(TEST_DIR, "img.png"), "content");
        await writeFile(join(TEST_DIR, "img.svg"), "content");

        const result = await fileService.analyzeDirectory(TEST_DIR, {
            extensions: ["svg"],
        });

        expect(result.images).toHaveLength(1);
        expect(result.images[0].type).toBe("local");
        if (isLocal(result.images[0])) {
            expect(result.images[0].src).toContain(".svg");
        }
    });

    it("should report fileSize for existing local images", async () => {
        await writeFile(join(TEST_DIR, "doc.md"), "![img](./img.png)");
        await writeFile(join(TEST_DIR, "img.png"), "some-data");

        const result = await fileService.analyzeDirectory(TEST_DIR);

        expect(result.images).toHaveLength(1);
        if (isLocal(result.images[0])) {
            expect(result.images[0].fileSize).toBeGreaterThan(0);
        }
        expect(result.summary.totalSize).toBeGreaterThan(0);
    });

    it("should handle remote images in md files", async () => {
        await writeFile(join(TEST_DIR, "doc.md"), "![web](https://example.com/img.png)");

        const result = await fileService.analyzeDirectory(TEST_DIR);

        expect(result.images).toHaveLength(1);
        expect(isWeb(result.images[0])).toBe(true);
        expect(result.images[0].src).toBe("https://example.com/img.png");
    });
});
