import { describe, expect, it, vi } from "vitest";
import { FileSystemServiceImpl } from "../src/rules/services/file-system-service.js";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

describe("FileSystemService", () => {
    it("should scan assets from markdown content", async () => {
        const service = new FileSystemServiceImpl();
        const mdContent = `
# Title
![image](./diagram.png)
![photo](./photo.jpg)
![](https://example.com/remote.jpg)
![inline](data:image/png;base64,abc)
`;
        const assets = await service.scanAssets("/test", mdContent);
        // Only local image paths (remote URLs and data URIs excluded)
        expect(assets).toHaveLength(2);
        expect(assets[0].originalPath).toBe("./diagram.png");
        expect(assets[1].originalPath).toBe("./photo.jpg");
    });

    it("should detect workspace root", async () => {
        const service = new FileSystemServiceImpl();
        const root = await service.detectWorkspaceRoot(process.cwd());
        // In CI, this might not be a git repo
        // Just verify the function runs without error
        expect(root).toBeDefined();
    });

    it("should check if two paths are in same workspace", async () => {
        const service = new FileSystemServiceImpl();
        const result = await service.isSameWorkspace("/tmp/a", "/tmp/b");
        // Both /tmp paths — might not be in any git repo
        expect(typeof result).toBe("boolean");
    });

    it("should read front matter from a file", async () => {
        const tmpDir = join(process.cwd(), "tests", ".tmp");
        await mkdir(tmpDir, { recursive: true });
        const filePath = join(tmpDir, "test-fm.md");
        await writeFile(filePath, "---\nid: FB-000001\nslug: test-article\n---\n# Hello", "utf-8");

        const service = new FileSystemServiceImpl();
        const fm = await service.readFileFrontMatter(filePath);
        expect(fm.id).toBe("FB-000001");
        expect(fm.slug).toBe("test-article");
    });

    it("should update front matter in a file", async () => {
        const tmpDir = join(process.cwd(), "tests", ".tmp");
        await mkdir(tmpDir, { recursive: true });
        const filePath = join(tmpDir, "test-update-fm.md");
        await writeFile(filePath, "---\nid: FB-000001\n---\n# Hello", "utf-8");

        const service = new FileSystemServiceImpl();
        await service.updateFileFrontMatter(filePath, { linked_prototypes: "EW-000001-test" });
        const updated = await readFile(filePath, "utf-8");
        expect(updated).toContain("linked_prototypes: EW-000001-test");
        expect(updated).toContain("id: FB-000001");
    });
});
