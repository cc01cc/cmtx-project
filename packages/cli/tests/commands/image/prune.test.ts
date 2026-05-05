import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DeleteService } from "@cmtx/asset";

const TEST_DIR = resolve(process.cwd(), ".test-prune-cli");

describe("prune command integration", () => {
    let service: DeleteService;

    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
        service = new DeleteService({
            workspaceRoot: TEST_DIR,
            options: { strategy: "hard-delete" },
        });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    it("should delete orphan images via pruneDirectory", async () => {
        await writeFile(join(TEST_DIR, "doc.md"), "![used](./used.png)");
        await writeFile(join(TEST_DIR, "used.png"), "content");
        await writeFile(join(TEST_DIR, "orphan.png"), "orphan-content");

        const result = await service.pruneDirectory(TEST_DIR);

        expect(result.totalOrphans).toBe(1);
        expect(result.deletedCount).toBe(1);
        expect(result.entries[0].status).toBe("deleted");

        // referenced image still exists
        await expect(
            import("node:fs/promises").then((fs) => fs.stat(join(TEST_DIR, "used.png"))),
        ).resolves.toBeDefined();

        // orphan deleted
        await expect(
            import("node:fs/promises").then((fs) => fs.stat(join(TEST_DIR, "orphan.png"))),
        ).rejects.toThrow("ENOENT");
    });

    it("should handle directory with no orphans", async () => {
        await writeFile(join(TEST_DIR, "doc.md"), "![img](./img.png)");
        await writeFile(join(TEST_DIR, "img.png"), "content");

        const result = await service.pruneDirectory(TEST_DIR);

        expect(result.totalOrphans).toBe(0);
        expect(result.deletedCount).toBe(0);
    });

    it("should filter by extensions", async () => {
        await writeFile(join(TEST_DIR, "img.png"), "content");
        await writeFile(join(TEST_DIR, "img.svg"), "content");

        const result = await service.pruneDirectory(TEST_DIR, {
            extensions: ["svg"],
        });

        expect(result.totalOrphans).toBe(1);
        expect(result.entries[0].absPath).toContain(".svg");
    });
});
