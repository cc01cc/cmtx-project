/**
 * FileService 测试
 *
 * 测试 FileService 的文件操作功能：
 * - filterImagesFromFile、filterImagesFromDirectory
 * - replaceImagesInFile、replaceImagesInDirectory
 * - deleteLocalImage、deleteLocalImageSafely
 * - readFileContent、writeFileContent、scanDirectory
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileService } from "../src/file/file-service.js";

const TEST_DIR = resolve(process.cwd(), ".test-file-service");

describe("FileService", () => {
    let fileService: FileService;

    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
        fileService = new FileService();
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    describe("filterImagesFromFile", () => {
        it("应该从文件中筛选图片", async () => {
            const content = `# Title

![Logo](./logo.png)
![Banner](./banner.jpg)
`;
            const filePath = join(TEST_DIR, "test.md");
            await writeFile(filePath, content, "utf-8");

            const images = await fileService.filterImagesFromFile(filePath);

            expect(images).toHaveLength(2);
            expect(images[0].alt).toBe("Logo");
            expect(images[1].alt).toBe("Banner");
        });

        it("本地图片应该包含 absLocalPath", async () => {
            const content = "![Logo](./logo.png)";
            const filePath = join(TEST_DIR, "test.md");
            await writeFile(filePath, content, "utf-8");

            const images = await fileService.filterImagesFromFile(filePath);

            expect(images).toHaveLength(1);
            expect(images[0].type).toBe("local");
            expect("absLocalPath" in images[0]).toBe(true);
            if ("absLocalPath" in images[0]) {
                expect(images[0].absLocalPath).toContain("logo.png");
            }
        });

        it("应该正确处理相对路径", async () => {
            const content = "![Relative](../images/logo.png)";
            const subDir = join(TEST_DIR, "docs");
            await mkdir(subDir, { recursive: true });
            const filePath = join(subDir, "test.md");
            await writeFile(filePath, content, "utf-8");

            const images = await fileService.filterImagesFromFile(filePath);

            expect(images).toHaveLength(1);
            if ("absLocalPath" in images[0]) {
                expect(images[0].absLocalPath).toContain("images");
                expect(images[0].absLocalPath).toContain("logo.png");
                expect(images[0].absLocalPath).not.toContain("docs");
            }
        });

        it("应该设置 source 为 file", async () => {
            const content = "![Image](./image.png)";
            const filePath = join(TEST_DIR, "test.md");
            await writeFile(filePath, content, "utf-8");

            const images = await fileService.filterImagesFromFile(filePath);

            expect(images[0].source).toBe("file");
        });

        it("应该抛出错误当文件不存在", async () => {
            const nonExistentPath = join(TEST_DIR, "non-existent.md");
            await expect(fileService.filterImagesFromFile(nonExistentPath)).rejects.toThrow();
        });
    });

    describe("filterImagesFromDirectory", () => {
        it("应该从目录中的所有 Markdown 文件筛选图片", async () => {
            await writeFile(join(TEST_DIR, "file1.md"), "![Image1](./img1.png)");
            await writeFile(join(TEST_DIR, "file2.md"), "![Image2](https://example.com/img2.png)");

            const images = await fileService.filterImagesFromDirectory(TEST_DIR);

            expect(images).toHaveLength(2);
            expect(images.some((img) => img.src === "./img1.png")).toBe(true);
            expect(images.some((img) => img.src === "https://example.com/img2.png")).toBe(true);
        });

        it("应该支持 sourceType 过滤（只获取本地图片）", async () => {
            await writeFile(
                join(TEST_DIR, "test.md"),
                `![Local1](./img1.png)
![Web](https://example.com/img.jpg)
![Local2](../images/img2.png)`,
            );

            const images = await fileService.filterImagesFromDirectory(TEST_DIR, {
                mode: "sourceType",
                value: "local",
            });

            expect(images).toHaveLength(2);
            expect(images.every((img) => img.type === "local")).toBe(true);
        });

        it("应该支持子目录搜索", async () => {
            await mkdir(join(TEST_DIR, "docs"), { recursive: true });
            await mkdir(join(TEST_DIR, "blog"), { recursive: true });

            await writeFile(join(TEST_DIR, "docs", "readme.md"), "![Doc](./doc.png)");
            await writeFile(join(TEST_DIR, "blog", "post.md"), "![Blog](./blog.png)");

            const images = await fileService.filterImagesFromDirectory(TEST_DIR);

            expect(images).toHaveLength(2);
        });
    });

    describe("replaceImagesInFile", () => {
        it("应该替换文件中的图片引用", async () => {
            const content = "![Logo](./logo.png)";
            const filePath = join(TEST_DIR, "test.md");
            await writeFile(filePath, content, "utf-8");

            const result = await fileService.replaceImagesInFile(filePath, [
                {
                    field: "src",
                    pattern: "./logo.png",
                    newSrc: "https://cdn.example.com/logo.png",
                },
            ]);

            expect(result.success).toBe(true);
            expect(result.result?.replacements).toHaveLength(1);

            // 验证文件已更新
            const updatedContent = await fileService.readFileContent(filePath);
            expect(updatedContent).toContain("https://cdn.example.com/logo.png");
        });
    });

    describe("deleteLocalImage / deleteLocalImageSafely", () => {
        it("应该安全删除图片（检查引用）", async () => {
            const imagePath = join(TEST_DIR, "image.png");
            await writeFile(imagePath, "fake image content", "utf-8");

            const result = await fileService.deleteLocalImageSafely(imagePath, TEST_DIR, {
                strategy: "move",
            });

            // 由于没有引用此图片的 Markdown 文件，应该成功删除
            expect(result.status).toBe("success");
        });

        it("应该拒绝删除被引用的图片", async () => {
            // 创建图片
            const imagePath = join(TEST_DIR, "referenced.png");
            await writeFile(imagePath, "fake image content", "utf-8");

            // 创建引用此图片的 Markdown 文件
            await writeFile(join(TEST_DIR, "doc.md"), `![Referenced](./referenced.png)`);

            const result = await fileService.deleteLocalImageSafely(imagePath, TEST_DIR, {
                strategy: "move",
            });

            // 由于图片被引用，应该跳过删除
            expect(result.status).toBe("skipped");
        });
    });

    describe("readFileContent / writeFileContent", () => {
        it("应该读取文件内容", async () => {
            const filePath = join(TEST_DIR, "test.txt");
            const content = "Hello, World!";
            await writeFile(filePath, content, "utf-8");

            const readContent = await fileService.readFileContent(filePath);
            expect(readContent).toBe(content);
        });

        it("应该写入文件内容", async () => {
            const filePath = join(TEST_DIR, "output.txt");
            const content = "Test content";

            await fileService.writeFileContent(filePath, content);
            const readContent = await fileService.readFileContent(filePath);
            expect(readContent).toBe(content);
        });

        it("应该抛出错误当读取不存在的文件", async () => {
            const nonExistentPath = join(TEST_DIR, "non-existent.txt");
            await expect(fileService.readFileContent(nonExistentPath)).rejects.toThrow();
        });
    });

    describe("scanDirectory", () => {
        it("应该扫描目录中的文件", async () => {
            await writeFile(join(TEST_DIR, "file1.md"), "# File 1");
            await writeFile(join(TEST_DIR, "file2.txt"), "Plain text");
            await mkdir(join(TEST_DIR, "subdir"), { recursive: true });
            await writeFile(join(TEST_DIR, "subdir", "file3.md"), "# File 3");

            const files = await fileService.scanDirectory(TEST_DIR, {
                patterns: ["**/*.md"],
            });

            expect(files).toHaveLength(2);
            expect(files.every((f) => f.endsWith(".md"))).toBe(true);
        });

        it("应该支持非递归扫描", async () => {
            await writeFile(join(TEST_DIR, "file1.md"), "# File 1");
            await mkdir(join(TEST_DIR, "subdir"), { recursive: true });
            await writeFile(join(TEST_DIR, "subdir", "file2.md"), "# File 2");

            const files = await fileService.scanDirectory(TEST_DIR, {
                patterns: ["*.md"],
            });

            expect(files).toHaveLength(1);
            expect(files[0]).not.toContain("subdir");
        });
    });

    describe("getFileInfo", () => {
        it("应该返回 true 当文件存在", async () => {
            const filePath = join(TEST_DIR, "exists.txt");
            await writeFile(filePath, "content", "utf-8");

            const info = await fileService.getFileInfo(filePath);
            expect(info.isFile).toBe(true);
            expect(info.size).toBeGreaterThan(0);
        });

        it("应该抛出错误当文件不存在", async () => {
            const filePath = join(TEST_DIR, "non-existent.txt");
            await expect(fileService.getFileInfo(filePath)).rejects.toThrow();
        });
    });
});
