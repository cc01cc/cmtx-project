/**
 * Download Service 单元测试
 *
 * 补充 download-service.ts 的测试覆盖率
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDownloadService } from "../src/download/download-service.js";

describe("DownloadService", () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await mkdtemp(join(tmpdir(), "cmtx-download-test-"));
    });

    afterEach(async () => {
        await rm(tempDir, { recursive: true, force: true });
    });

    describe("downloadFromContent", () => {
        it("should return empty result for no images", async () => {
            const service = createDownloadService({
                options: { outputDir: tempDir },
            });

            const result = await service.downloadFromContent("No images here");

            expect(result.total).toBe(0);
            expect(result.success).toBe(0);
            expect(result.failed).toBe(0);
            expect(result.skipped).toBe(0);
        });

        it("should return empty result when domain filter excludes all", async () => {
            const service = createDownloadService({
                options: {
                    outputDir: tempDir,
                    domain: "filtered.example.com",
                },
            });

            const markdown = `
![photo](https://other.example.com/photo.png)
![logo](https://another.example.com/logo.png)
`;
            const result = await service.downloadFromContent(markdown);

            // All URLs should be filtered out
            expect(result.total).toBe(0);
        });

        it("should handle progress callback", async () => {
            const progressCalls: any[] = [];
            const service = createDownloadService({
                options: {
                    outputDir: tempDir,
                    onProgress: (progress) => progressCalls.push(progress),
                },
            });

            // Test with no images - no progress calls expected
            await service.downloadFromContent("No images");
            expect(progressCalls).toHaveLength(0);
        });
    });

    describe("downloadFromMarkdown", () => {
        it("should read file and parse images", { timeout: 10000 }, async () => {
            const markdownPath = join(tempDir, "test.md");
            await writeFile(markdownPath, "# Test\n\n![img](https://example.com/img.png)");

            const service = createDownloadService({
                options: { outputDir: tempDir },
            });

            const result = await service.downloadFromMarkdown(markdownPath);

            // Should parse the file
            expect(result).toBeDefined();
            expect(result.items).toBeDefined();
        });
    });

    describe("downloadSingleUrl", () => {
        it("should return error for invalid URL", async () => {
            const service = createDownloadService({
                options: { outputDir: tempDir },
            });

            const result = await service.downloadSingleUrl("not-a-url", tempDir);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Invalid URL");
        });
    });

    describe("concurrency control", () => {
        it("should accept concurrency option", () => {
            const service = createDownloadService({
                options: {
                    outputDir: tempDir,
                    concurrency: 3,
                },
            });

            expect(service).toBeDefined();
        });
    });

    describe("skip existing files", () => {
        it("should accept overwrite option", () => {
            const service = createDownloadService({
                options: {
                    outputDir: tempDir,
                    overwrite: false,
                },
            });

            expect(service).toBeDefined();
        });
    });

    describe("naming template", () => {
        it("should accept custom naming template", () => {
            const service = createDownloadService({
                options: {
                    outputDir: tempDir,
                    namingTemplate: "{sequence}_{name}.{ext}",
                },
            });

            expect(service).toBeDefined();
        });

        it("should accept template with date", () => {
            const service = createDownloadService({
                options: {
                    outputDir: tempDir,
                    namingTemplate: "{date}/{name}.{ext}",
                },
            });

            expect(service).toBeDefined();
        });
    });
});
