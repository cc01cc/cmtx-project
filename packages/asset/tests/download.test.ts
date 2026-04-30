/**
 * Download 模块单元测试
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderTemplate } from "@cmtx/template";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDownloadService } from "../src/download/download-service.js";
import {
    generateNamingVariables,
    generateUniqueFileName,
    parseUrlForNaming,
} from "../src/download/naming-handler.js";
import { createUrlMatcher } from "../src/download/url-matcher.js";

describe("Naming Handler", () => {
    describe("parseUrlForNaming", () => {
        it("should parse URL with extension", () => {
            const result = parseUrlForNaming("https://example.com/images/photo.png");
            expect(result.baseName).toBe("photo");
            expect(result.ext).toBe("png"); // 不含点
        });

        it("should parse URL without extension", () => {
            const result = parseUrlForNaming("https://example.com/images/readme");
            expect(result.baseName).toBe("readme");
            expect(result.ext).toBe("bin"); // 不含点
        });

        it("should parse URL with multiple dots", () => {
            const result = parseUrlForNaming("https://example.com/file.name.test.jpg");
            expect(result.baseName).toBe("file.name.test");
            expect(result.ext).toBe("jpg"); // 不含点
        });

        it("should handle invalid URL", () => {
            const result = parseUrlForNaming("not-a-url");
            expect(result.baseName).toBe("image");
            expect(result.ext).toBe("bin"); // 不含点
        });
    });

    describe("generateNamingVariables", () => {
        it("should generate all variables", () => {
            const result = generateNamingVariables("photo", "png", undefined, 1); // 不含点

            expect(result.name).toBe("photo");
            expect(result.ext).toBe("png"); // 不含点
            expect(result.md5).toBe("00000000000000000000000000000000");
            expect(result.md5_8).toBe("00000000");
            expect(result.md5_16).toBe("0000000000000000");
            expect(result.timestamp).toMatch(/^\d+$/);
            expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(result.sequence).toBe("001");
        });

        it("should generate md5 from content", () => {
            const content = Buffer.from("test content");
            const result = generateNamingVariables("photo", "png", content, 1); // 不含点

            expect(result.md5).toMatch(/^[a-f0-9]{32}$/);
            expect(result.md5_8).toMatch(/^[a-f0-9]{8}$/);
            expect(result.md5_16).toMatch(/^[a-f0-9]{16}$/);
        });

        it("should pad sequence number", () => {
            const result = generateNamingVariables("photo", "png", undefined, 42); // 不含点
            expect(result.sequence).toBe("042");
        });
    });

    describe("renderTemplate (naming)", () => {
        it("should render simple template", () => {
            const vars = generateNamingVariables("photo", "png", undefined, 1); // 不含点
            const result = renderTemplate("{name}.{ext}", vars, {
                postProcess: (r) => r.replace(/\/+/g, "/"),
            });
            expect(result).toBe("photo.png");
        });

        it("should render template with date", () => {
            const vars = generateNamingVariables("photo", "png", undefined, 1); // 不含点
            const result = renderTemplate("{date}/{name}.{ext}", vars, {
                postProcess: (r) => r.replace(/\/+/g, "/"),
            });
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}\/photo\.png$/);
        });

        it("should render template with md5_8", () => {
            const vars = generateNamingVariables("photo", "png", undefined, 1); // 不含点
            const result = renderTemplate("{name}_{md5_8}.{ext}", vars, {
                postProcess: (r) => r.replace(/\/+/g, "/"),
            });
            expect(result).toBe("photo_00000000.png");
        });

        it("should render template with md5_16", () => {
            const vars = generateNamingVariables("photo", "png", undefined, 1); // 不含点
            const result = renderTemplate("{name}_{md5_16}.{ext}", vars, {
                postProcess: (r) => r.replace(/\/+/g, "/"),
            });
            expect(result).toBe("photo_0000000000000000.png");
        });

        it("should render template with sequence", () => {
            const vars = generateNamingVariables("photo", "png", undefined, 5); // 不含点
            const result = renderTemplate("{sequence}_{name}.{ext}", vars, {
                postProcess: (r) => r.replace(/\/+/g, "/"),
            });
            expect(result).toBe("005_photo.png");
        });
    });

    describe("generateUniqueFileName", () => {
        it("should return original if not exists", () => {
            const existing = new Set<string>();
            const result = generateUniqueFileName("photo.png", existing);
            expect(result).toBe("photo.png");
        });

        it("should add suffix if exists", () => {
            const existing = new Set(["photo.png"]);
            const result = generateUniqueFileName("photo.png", existing);
            expect(result).toBe("photo-1.png");
        });

        it("should increment suffix until unique", () => {
            const existing = new Set(["photo.png", "photo-1.png", "photo-2.png"]);
            const result = generateUniqueFileName("photo.png", existing);
            expect(result).toBe("photo-3.png");
        });
    });
});

describe("URL Matcher", () => {
    describe("extractUrls", () => {
        it("should extract all web images", () => {
            const markdown = `
# Article

![local](./local.png)
![remote](https://cdn.example.com/photo.png)
![another](http://other.com/image.jpg)
`;
            const matcher = createUrlMatcher();
            const urls = matcher.extractUrls(markdown);

            expect(urls).toHaveLength(2);
            expect(urls[0].baseName).toBe("photo");
            expect(urls[1].baseName).toBe("image");
        });

        it("should filter by domain", () => {
            const markdown = `
![photo](https://cdn.example.com/photo.png)
![logo](https://other.com/logo.png)
![icon](https://cdn.example.com/icon.png)
`;
            const matcher = createUrlMatcher({ domain: "cdn.example.com" });
            const urls = matcher.extractUrls(markdown);

            const matched = urls.filter((u) => u.isMatch);
            expect(matched).toHaveLength(2);
        });

        it("should include subdomains by default", () => {
            const markdown = `
![photo](https://images.cdn.example.com/photo.png)
`;
            const matcher = createUrlMatcher({ domain: "cdn.example.com" });
            const urls = matcher.extractUrls(markdown);

            expect(urls[0].isMatch).toBe(true);
        });
    });

    describe("parseUrl", () => {
        it("should parse valid URL", () => {
            const matcher = createUrlMatcher();
            const result = matcher.parseUrl("https://cdn.example.com/path/to/photo.png");

            expect(result).not.toBeNull();
            expect(result!.baseName).toBe("photo");
            expect(result!.ext).toBe(".png");
            expect(result!.remotePath).toBe("path/to/photo.png");
        });

        it("should return null for invalid URL", () => {
            const matcher = createUrlMatcher();
            const result = matcher.parseUrl("not-a-url");

            expect(result).toBeNull();
        });
    });
});

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
});
