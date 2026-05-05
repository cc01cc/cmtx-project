import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    batchUploadImages,
    matchesToSources,
    renderReplacementText,
    applyReplacementOps,
    type BatchUploadResultItem,
} from "../src/upload/index.js";
import type { ReplacementOp, UploadSource } from "../src/upload/strategies.js";
import { filterImagesInText, isWebSource } from "@cmtx/core";
import { renderTemplate } from "@cmtx/template";

const TEST_DIR = resolve(process.cwd(), ".test-integration");
const DOCS_DIR = join(TEST_DIR, "docs");
const IMAGES_DIR = join(TEST_DIR, "images");

class MockStorageAdapter {
    public uploadedFiles: Array<{
        localPath: string;
        remotePath: string;
    }> = [];

    async upload(localPath: string, remotePath: string) {
        this.uploadedFiles.push({ localPath, remotePath });
        return { name: remotePath, url: `https://cdn.example.com/${remotePath}` };
    }

    async exists() {
        return false;
    }

    buildUrl(remotePath: string) {
        return `https://cdn.example.com/${remotePath}`;
    }

    reset() {
        this.uploadedFiles = [];
    }
}

/**
 * 用 batchUploadImages 完成上传 + 文本替换，返回替换后的内容。
 */
async function uploadContent(
    content: string,
    baseDir: string,
    adapter: any,
    namingTemplate?: string,
): Promise<{ content: string; uploaded: BatchUploadResultItem[] }> {
    const allMatches = filterImagesInText(content);
    const localMatches = allMatches.filter((m) => !isWebSource(m.src));

    if (localMatches.length === 0) {
        return { content, uploaded: [] };
    }

    const sources = matchesToSources(localMatches, baseDir);
    const result = await batchUploadImages(sources, {
        adapter,
        namingTemplate: namingTemplate ?? "{name}.{ext}",
        prefix: "",
    });

    const ops: ReplacementOp[] = [];
    for (let i = 0; i < localMatches.length; i++) {
        const cloudResult = result.lookup(sources[i]);
        if (!cloudResult || cloudResult.action === "skipped") continue;
        const newText = renderReplacementText(localMatches[i], {
            cloudUrl: cloudResult.cloudUrl,
            variables: cloudResult.variables,
        });
        ops.push({
            offset: content.indexOf(localMatches[i].raw),
            length: localMatches[i].raw.length,
            newText,
        });
    }

    const finalContent = applyReplacementOps(content, ops);
    return { content: finalContent, uploaded: result.uploaded };
}

describe("综合集成测试", () => {
    let mockAdapter: MockStorageAdapter;

    beforeEach(async () => {
        mockAdapter = new MockStorageAdapter();
        if (existsSync(TEST_DIR)) {
            await rm(TEST_DIR, { recursive: true, force: true });
        }
        await mkdir(DOCS_DIR, { recursive: true });
        await mkdir(IMAGES_DIR, { recursive: true });
        await writeFile(join(IMAGES_DIR, "logo.png"), "fake-image-data");
        await writeFile(join(IMAGES_DIR, "banner.jpg"), "fake-banner-data");
        await writeFile(
            join(DOCS_DIR, "README.md"),
            "# Test\n\n![Logo](../images/logo.png)\n\n![Banner](../images/banner.jpg)",
        );
        await writeFile(join(DOCS_DIR, "guide.md"), "# Guide\n\n![Logo](../images/logo.png)");
    });

    afterEach(async () => {
        if (existsSync(TEST_DIR)) {
            await rm(TEST_DIR, { recursive: true, force: true });
        }
    });

    describe("模板渲染验证", () => {
        it("应该正确处理模板渲染", () => {
            const ctx = {
                cloudSrc: "https://cdn.example.com/logo.png",
                originalValue: "公司Logo",
            };
            const newSrc = renderTemplate("{cloudSrc}?quality=80", ctx, {
                emptyString: "preserve",
            });
            expect(newSrc).toBe("https://cdn.example.com/logo.png?quality=80");
        });
    });

    describe("端到端上传流程", () => {
        it("应该成功上传单个 Markdown 文件中的图片", async () => {
            const content = await readFile(join(DOCS_DIR, "README.md"), "utf-8");
            const { uploaded } = await uploadContent(content, DOCS_DIR, mockAdapter);

            expect(uploaded).toHaveLength(2);
            expect(mockAdapter.uploadedFiles).toHaveLength(2);
        });

        it("应该支持自定义命名模板", async () => {
            const content = await readFile(join(DOCS_DIR, "README.md"), "utf-8");
            await uploadContent(content, DOCS_DIR, mockAdapter, "{md5_8}_{fileName}");

            expect(mockAdapter.uploadedFiles).toHaveLength(2);
            const logoUpload = mockAdapter.uploadedFiles.find((f) =>
                f.localPath.includes("logo.png"),
            );
            expect(logoUpload?.remotePath).toMatch(/^[a-f0-9]{8}_logo\.png$/);
        });

        it("应该支持字段模板替换（通过 renderReplacementText）", async () => {
            const content = await readFile(join(DOCS_DIR, "README.md"), "utf-8");
            const { uploaded, content: newContent } = await uploadContent(
                content,
                DOCS_DIR,
                mockAdapter,
            );

            expect(uploaded).toHaveLength(2);
            expect(newContent).not.toBe(content);
            expect(newContent).toContain("https://cdn.example.com/");
            expect(newContent).not.toContain("../images/logo.png");
        });
    });

    describe("错误处理和边界情况", () => {
        it("单个图片上传失败不应中断整个流程", async () => {
            const content = await readFile(join(DOCS_DIR, "README.md"), "utf-8");
            const failingAdapter = {
                async upload(localPath: string, remotePath: string) {
                    if (localPath.includes("logo.png")) {
                        throw new Error("Mock upload failure");
                    }
                    return {
                        name: remotePath,
                        url: `https://cdn.example.com/${remotePath}`,
                    };
                },
                async exists() {
                    return false;
                },
                buildUrl(remotePath: string) {
                    return `https://cdn.example.com/${remotePath}`;
                },
            };

            const allMatches = filterImagesInText(content);
            const localMatches = allMatches.filter((m) => !isWebSource(m.src));
            const sources = matchesToSources(localMatches, DOCS_DIR);

            const result = await batchUploadImages(sources, {
                adapter: failingAdapter as any,
                namingTemplate: "{name}.{ext}",
                prefix: "",
            });

            // One succeeds, one fails
            expect(result.uploaded.length + result.failed.length).toBe(2);
        });

        it("应该处理没有本地图片的情况", async () => {
            const noImageContent = "# No Images\n\nThis document has no local images.";
            const { uploaded } = await uploadContent(noImageContent, DOCS_DIR, mockAdapter);

            expect(uploaded).toHaveLength(0);
        });
    });

    describe("batchUploadImages 行为验证", () => {
        it("不同文件应各自上传且去重", async () => {
            const content1 = "![A](../images/logo.png)";
            const content2 = "![A](../images/logo.png)\n![B](../images/banner.jpg)";

            const result1 = await uploadContent(content1, DOCS_DIR, mockAdapter);
            const result2 = await uploadContent(content2, DOCS_DIR, mockAdapter);

            // Each call is independent
            expect(result1.uploaded).toHaveLength(1);
            expect(result2.uploaded).toHaveLength(2);
        });
    });
});
