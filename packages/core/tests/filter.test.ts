/**
 * 图片筛选功能测试
 *
 * 测试 filterImages 函数：
 * - 基本筛选功能
 * - 过滤模式（sourceType、hostname、absolutePath、regex）
 * - 错误处理
 * - 日志回调
 */

import { describe, expect, it, vi } from "vitest";
import { filterImages } from "../src/filter.js";

describe("filterImages", () => {
    describe("基本筛选", () => {
        it("应该从文本中筛选内联图片", () => {
            const markdown = `# Title

![Logo](./logo.png)

Some text`;
            const images = filterImages(markdown);

            expect(images).toHaveLength(1);
            expect(images[0]).toMatchObject({
                type: "local",
                alt: "Logo",
                src: "./logo.png",
            });
        });

        it("应该筛选 Web 图片", () => {
            const markdown = "![Web Image](https://example.com/image.png)";
            const images = filterImages(markdown);

            expect(images).toHaveLength(1);
            expect(images[0]).toMatchObject({
                type: "web",
                alt: "Web Image",
                src: "https://example.com/image.png",
            });
        });

        it("应该筛选混合类型的图片", () => {
            const markdown = `
![Local](./local.png)
![Web](https://cdn.example.com/web.png)
![Another Local](../images/another.png)
      `;
            const images = filterImages(markdown);

            expect(images).toHaveLength(3);
            expect(images[0].type).toBe("local");
            expect(images[1].type).toBe("web");
            expect(images[2].type).toBe("local");
        });

        it("应该返回空数组当没有图片", () => {
            const markdown = "# Title\n\nNo images here.";
            const images = filterImages(markdown);

            expect(images).toHaveLength(0);
        });

        it("应该正确设置 syntax 字段", () => {
            const markdown = `
![Inline](./inline.png)
<img src="./html.png" alt="HTML">
      `;
            const images = filterImages(markdown);

            expect(images).toHaveLength(2);
            expect(images[0].syntax).toBe("md");
            expect(images[1].syntax).toBe("html");
        });
    });

    describe("过滤模式 - sourceType", () => {
        const markdown = `
![Local](./local.png)
![Web](https://example.com/web.png)
![Another Local](../another.png)
    `;

        it("应该只筛选本地图片", () => {
            const images = filterImages(markdown, {
                mode: "sourceType",
                value: "local",
            });

            expect(images).toHaveLength(2);
            expect(images.every((img) => img.type === "local")).toBe(true);
        });

        it("应该只筛选 Web 图片", () => {
            const images = filterImages(markdown, {
                mode: "sourceType",
                value: "web",
            });

            expect(images).toHaveLength(1);
            expect(images[0].type).toBe("web");
            expect(images[0].src).toBe("https://example.com/web.png");
        });

        it("无过滤时应该筛选所有图片", () => {
            const images = filterImages(markdown);

            expect(images).toHaveLength(3);
        });
    });

    describe("过滤模式 - hostname", () => {
        it("应该按主机名过滤 Web 图片", () => {
            const markdown = `
![CDN](https://cdn.example.com/image.png)
![Other](https://other.com/image.png)
![Subdomain](https://assets.cdn.example.com/file.png)
      `;
            const images = filterImages(markdown, {
                mode: "hostname",
                value: "cdn.example.com",
            });

            expect(images).toHaveLength(2);
            expect(images[0].src).toContain("cdn.example.com");
            expect(images[1].src).toContain("cdn.example.com");
        });

        it("应该精确匹配主机名", () => {
            const markdown = `
![Exact](https://example.com/image.png)
![WWW](https://www.example.com/image.png)
      `;
            const images = filterImages(markdown, {
                mode: "hostname",
                value: "example.com",
            });

            expect(images.length).toBeGreaterThanOrEqual(1);
            expect(images.some((img) => img.src === "https://example.com/image.png")).toBe(true);
        });

        it("本地图片不应该匹配 hostname 过滤", () => {
            const markdown = `
![Local](./local.png)
![Web](https://example.com/web.png)
      `;
            const images = filterImages(markdown, {
                mode: "hostname",
                value: "example.com",
            });

            expect(images).toHaveLength(1);
            expect(images[0].type).toBe("web");
        });

        it("应该处理无效的 URL", () => {
            const markdown = `
![Invalid](not-a-valid-url)
![Valid](https://example.com/image.png)
      `;
            const images = filterImages(markdown, {
                mode: "hostname",
                value: "example.com",
            });

            expect(images).toHaveLength(1);
            expect(images[0].src).toBe("https://example.com/image.png");
        });
    });

    describe("过滤模式 - regex", () => {
        it("应该使用正则表达式过滤", () => {
            const markdown = `
![PNG](./image.png)
![JPG](./image.jpg)
![PNG2](./other.png)
      `;
            const images = filterImages(markdown, {
                mode: "regex",
                value: /\.png$/,
            });

            expect(images).toHaveLength(2);
            expect(images.every((img) => img.src.endsWith(".png"))).toBe(true);
        });

        it("应该支持复杂的正则表达式", () => {
            const markdown = `
![Path1](./assets/images/logo.png)
![Path2](../shared/icon.svg)
![Path3](./docs/screenshot.jpg)
      `;
            const images = filterImages(markdown, {
                mode: "regex",
                value: /assets\/images\//,
            });

            expect(images).toHaveLength(1);
            expect(images[0].src).toContain("assets/images");
        });

        it("非正则值应该被忽略", () => {
            const markdown = "![Image](./image.png)";
            const images = filterImages(markdown, {
                mode: "regex",
                value: "not-a-regex" as unknown as RegExp,
            });

            expect(images).toHaveLength(0);
        });
    });

    describe("返回类型", () => {
        it("本地图片应该有正确的类型和 src", () => {
            const markdown = "![Local](./local.png)";
            const images = filterImages(markdown);

            expect(images[0].type).toBe("local");
            expect(images[0].src).toBe("./local.png");
            expect(images[0].alt).toBe("Local");
        });

        it("Web 图片应该有正确的结构", () => {
            const markdown = `![Web](https://example.com/image.png "Title")`;
            const images = filterImages(markdown);

            const webImage = images[0];
            expect(webImage).toHaveProperty("type", "web");
            expect(webImage).toHaveProperty("alt", "Web");
            expect(webImage).toHaveProperty("src", "https://example.com/image.png");
            expect(webImage).toHaveProperty("title", "Title");
            expect(webImage).toHaveProperty("raw");
            expect(webImage).toHaveProperty("syntax");
        });
    });

    describe("过滤模式 - absolutePath", () => {
        it("应该按绝对路径过滤本地图片", () => {
            const markdown = `
![Match](./assets/images/logo.png)
![Other](./other/image.png)
![Match2](./assets/images/banner.png)
      `;
            const images = filterImages(markdown, {
                mode: "absolutePath",
                value: "assets/images",
            });

            expect(images).toHaveLength(2);
            expect(images.every((img) => img.src.includes("assets/images"))).toBe(true);
        });

        it("Web 图片不应匹配 absolutePath 过滤", () => {
            const markdown = `
![Local](./local.png)
![Web](https://example.com/image.png)
      `;
            const images = filterImages(markdown, {
                mode: "absolutePath",
                value: "local",
            });

            expect(images).toHaveLength(1);
            expect(images[0].type).toBe("local");
        });
    });

    describe("错误处理", () => {
        it("应该捕获 parseImages 抛出的异常", () => {
            const markdown = "![img](./img.png)";
            const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
            // 注入一个导致 parseImages 抛出的无效输入
            expect(() => filterImages(markdown, { logger })).not.toThrow();
        });

        it("无 filter 选项时正常返回所有图片", () => {
            const images = filterImages("![img](./img.png)");
            expect(images).toHaveLength(1);
        });
    });

    describe("提前退出路径", () => {
        it("内容无图片语法且指定 sourceType 时应返回空", () => {
            const markdown = "This is plain text without any images.";
            const images = filterImages(markdown, {
                mode: "sourceType",
                value: "local",
            });
            expect(images).toHaveLength(0);
        });

        it("内容无图片语法且指定 hostname 时应返回空", () => {
            const markdown = "Just text, no images, no URLs.";
            const images = filterImages(markdown, {
                mode: "hostname",
                value: "example.com",
            });
            expect(images).toHaveLength(0);
        });
    });
});

describe("提前退出路径 - 扩展", () => {
    it("纯文本内容指定 absolutePath 时快速返回空", () => {
        const images = filterImages("No images here.", {
            mode: "absolutePath",
            value: "assets",
        });
        expect(images).toHaveLength(0);
    });

    it("纯文本内容指定 regex 时仍应解析（regex 不进 quick check）", () => {
        const images = filterImages("No images here.", {
            mode: "regex",
            value: /\.png$/,
        });
        expect(images).toHaveLength(0);
    });
});
