/**
 * 工具函数测试
 *
 * 测试 normalizePath、isWebSource 和类型守卫函数：
 * - 路径规范化（跨平台兼容）
 * - Web/Local 来源判断
 * - ImageMatch 类型守卫
 */

import { describe, expect, it } from "vitest";
import type {
    ImageMatch,
    LocalImageMatchWithAbsPath,
    LocalImageMatchWithRelativePath,
    WebImageMatch,
} from "../src/types.js";
import {
    formatHtmlImage,
    formatMarkdownImage,
    isLocalAbsolutePath,
    isLocalImage,
    isLocalImageWithAbsPath,
    isLocalImageWithRelativePath,
    isValidUrl,
    isWebImage,
    isWebSource,
    normalizePath,
    parseUrlSafe,
    replaceAltVariables,
} from "../src/utils.js";

describe("normalizePath", () => {
    describe("基本规范化", () => {
        it("应该将反斜杠转换为正斜杠", () => {
            const path = String.raw`C:\Users\project\file.txt`;
            const normalized = normalizePath(path);
            expect(normalized).not.toContain("\\");
            expect(normalized).toContain("/");
        });

        it("应该保留已经是正斜杠的路径", () => {
            const path = "/home/user/project/file.txt";
            const normalized = normalizePath(path);
            expect(normalized).toBe(path);
        });

        it("应该处理混合分隔符", () => {
            const path = String.raw`C:/Users\project/file.txt`;
            const normalized = normalizePath(path);
            if (process.platform === "win32") {
                expect(normalized).toBe("c:/users/project/file.txt");
            } else {
                expect(normalized).toBe("C:/Users/project/file.txt");
            }
        });
    });

    describe("Windows 路径处理", () => {
        it("应该在 Windows 上将路径转为小写", () => {
            const path = "C:/Users/Project/File.TXT";
            const normalized = normalizePath(path);

            if (process.platform === "win32") {
                expect(normalized).toBe("c:/users/project/file.txt");
            } else {
                expect(normalized).toBe("C:/Users/Project/File.TXT");
            }
        });

        it("应该处理 Windows 盘符", () => {
            const path = String.raw`D:\Projects\MyApp`;
            const normalized = normalizePath(path);
            if (process.platform === "win32") {
                expect(normalized).toContain("d:");
            } else {
                expect(normalized).toContain("D:");
            }
            expect(normalized).not.toContain("\\");
        });
    });

    describe("边界情况", () => {
        it("应该处理空字符串", () => {
            const result = normalizePath("");
            expect(result === "" || result === ".").toBe(true);
        });

        it("应该处理只有分隔符的路径", () => {
            expect(normalizePath("/")).toBe("/");
            expect(normalizePath("\\")).toBe("/");
        });

        it("应该处理相对路径", () => {
            const path = "./images/logo.png";
            const normalized = normalizePath(path);
            expect(normalized === "./images/logo.png" || normalized === "images/logo.png").toBe(
                true,
            );
        });

        it("应该处理包含 .. 的路径", () => {
            const path = "../images/../assets/logo.png";
            const normalized = normalizePath(path);
            expect(normalized).not.toContain("../images/..");
        });

        it("应该处理包含 . 的路径", () => {
            const path = "./images/./logo.png";
            const normalized = normalizePath(path);
            expect(normalized).not.toContain("/./");
        });

        it("应该处理各种绝对路径格式", () => {
            // Unix绝对路径
            expect(normalizePath("/usr/local/bin")).toBe("/usr/local/bin");
            expect(normalizePath("/home/user/documents")).toBe("/home/user/documents");

            // Windows绝对路径
            if (process.platform === "win32") {
                expect(normalizePath(String.raw`\Program Files\App`)).toBe("/program files/app");
                expect(normalizePath(String.raw`C:\Users\username\documents`)).toBe(
                    "c:/users/username/documents",
                );
                expect(normalizePath("D:/data/files")).toBe("d:/data/files");
            } else {
                expect(normalizePath(String.raw`\Program Files\App`)).toBe("/Program Files/App");
                expect(normalizePath(String.raw`C:\Users\username\documents`)).toBe(
                    "C:/Users/username/documents",
                );
                expect(normalizePath("D:/data/files")).toBe("D:/data/files");
            }
        });

        it("应该处理国际化路径", () => {
            // 中文路径
            expect(normalizePath("./图片/照片.png")).toContain("图片");
            expect(normalizePath("/用户/文档/file.txt")).toContain("用户");

            // 日文路径
            expect(normalizePath("./画像/写真.jpg")).toContain("画像");
            expect(normalizePath("/ユーザー/ドキュメント/doc.pdf")).toContain("ユーザー");

            // 韩文路径
            expect(normalizePath("./이미지/사진.gif")).toContain("이미지");
            expect(normalizePath("/사용자/문서/document.doc")).toContain("사용자");

            // 混合多语言路径
            expect(normalizePath("./photos/图片/photo 图片@2x.png")).toContain("图片");
        });
    });

    describe("特殊字符", () => {
        it("应该保留空格", () => {
            const path = "/path with spaces/file.txt";
            expect(normalizePath(path)).toBe("/path with spaces/file.txt");
        });

        it("应该保留 Unicode 字符", () => {
            const path = "/用户/项目/文件.txt";
            expect(normalizePath(path)).toBe("/用户/项目/文件.txt");
        });

        it("应该保留 URL 编码字符", () => {
            const path = "/path%20encoded/file.txt";
            expect(normalizePath(path)).toBe("/path%20encoded/file.txt");
        });
    });
});

describe("isWebSource", () => {
    describe("Web URL 识别", () => {
        it("应该识别 http:// URL", () => {
            expect(isWebSource("http://example.com/image.png")).toBe(true);
        });

        it("应该识别 https:// URL", () => {
            expect(isWebSource("https://example.com/image.png")).toBe(true);
        });

        it("应该识别协议相对 URL", () => {
            expect(isWebSource("//cdn.example.com/image.png")).toBe(true);
        });

        it("应该识别带路径的 URL", () => {
            expect(isWebSource("https://cdn.example.com/path/to/image.png")).toBe(true);
        });

        it("应该识别带查询参数的 URL", () => {
            expect(isWebSource("https://example.com/image.png?v=123")).toBe(true);
        });
    });

    describe("本地路径识别", () => {
        it("应该识别相对路径", () => {
            expect(isWebSource("./image.png")).toBe(false);
            expect(isWebSource("../images/logo.png")).toBe(false);
            expect(isWebSource("images/photo.jpg")).toBe(false);
            expect(isWebSource("assets/images/banner.gif")).toBe(false);
        });

        it("应该识别绝对路径", () => {
            expect(isWebSource("/home/user/image.png")).toBe(false);
            expect(isWebSource("C:/Users/image.png")).toBe(false);
            expect(isWebSource(String.raw`\Network\Share\file.png`)).toBe(false);
            expect(isWebSource(String.raw`D:\Data\Files\document.pdf`)).toBe(false);
        });

        it("应该识别纯文件名", () => {
            expect(isWebSource("image.png")).toBe(false);
            expect(isWebSource("photo.jpg")).toBe(false);
        });

        it("应该识别带目录的相对路径", () => {
            expect(isWebSource("images/logo.png")).toBe(false);
            expect(isWebSource("assets/images/banner.jpg")).toBe(false);
            expect(isWebSource("../shared/icons/icon.svg")).toBe(false);
        });

        it("应该处理各种操作系统路径格式", () => {
            // Unix/Linux风格路径
            expect(isWebSource("/usr/local/bin/executable")).toBe(false);
            expect(isWebSource("~/Documents/file.txt")).toBe(false);

            // Windows风格路径
            expect(isWebSource(String.raw`C:\Windows\System32\cmd.exe`)).toBe(false);
            expect(isWebSource(String.raw`\\Server\Share\file.doc`)).toBe(false);

            // 混合格式
            expect(isWebSource("C:/Program Files/Application/app.exe")).toBe(false);
        });
    });

    describe("边界情况", () => {
        it("应该处理带空格的 URL", () => {
            expect(isWebSource("  https://example.com/image.png  ")).toBe(true);
        });

        it("应该处理空字符串", () => {
            expect(isWebSource("")).toBe(false);
        });

        it("应该处理只有空白字符的字符串", () => {
            expect(isWebSource("   ")).toBe(false);
        });

        it("应该处理看起来像 URL 但不是的字符串", () => {
            expect(isWebSource("http-not-a-url")).toBe(false);
            expect(isWebSource("httpsite.com")).toBe(false);
        });

        it("应该处理大写的协议", () => {
            expect(isWebSource("HTTP://example.com/image.png")).toBe(true);
            expect(isWebSource("HTTPS://example.com/image.png")).toBe(true);
        });
    });
});

describe("类型守卫函数", () => {
    const createWebImage = (): WebImageMatch => ({
        type: "web",
        alt: "Web Image",
        src: "https://example.com/image.png",
        raw: "![Web Image](https://example.com/image.png)",
        syntax: "md",
        source: "text",
    });

    const createLocalImageWithRelativePath = (): LocalImageMatchWithRelativePath => ({
        type: "local",
        alt: "Local Image",
        src: "./image.png",
        raw: "![Local Image](./image.png)",
        syntax: "md",
        source: "text",
    });

    const createLocalImageWithAbsPath = (): LocalImageMatchWithAbsPath => ({
        type: "local",
        alt: "Local Image",
        src: "./image.png",
        absLocalPath: "/home/user/project/image.png",
        raw: "![Local Image](./image.png)",
        syntax: "md",
        source: "file",
    });

    describe("isWebImage", () => {
        it("应该识别 WebImageMatch", () => {
            const image = createWebImage();
            expect(isWebImage(image)).toBe(true);
        });

        it("不应该识别 LocalImageMatch", () => {
            const image = createLocalImageWithRelativePath();
            expect(isWebImage(image)).toBe(false);
        });

        it("类型守卫应该正确收窄类型", () => {
            const image: ImageMatch = createWebImage();
            if (isWebImage(image)) {
                expect(image.src).toBe("https://example.com/image.png");
            }
        });
    });

    describe("isLocalImage", () => {
        it("应该识别 LocalImageMatchWithRelativePath", () => {
            const image = createLocalImageWithRelativePath();
            expect(isLocalImage(image)).toBe(true);
        });

        it("应该识别 LocalImageMatchWithAbsPath", () => {
            const image = createLocalImageWithAbsPath();
            expect(isLocalImage(image)).toBe(true);
        });

        it("不应该识别 WebImageMatch", () => {
            const image = createWebImage();
            expect(isLocalImage(image)).toBe(false);
        });
    });

    describe("isLocalImageWithAbsPath", () => {
        it("应该识别带绝对路径的本地图片", () => {
            const image = createLocalImageWithAbsPath();
            expect(isLocalImageWithAbsPath(image)).toBe(true);
        });

        it("不应该识别相对路径的本地图片", () => {
            const image = createLocalImageWithRelativePath();
            expect(isLocalImageWithAbsPath(image)).toBe(false);
        });

        it("不应该识别 Web 图片", () => {
            const image = createWebImage();
            expect(isLocalImageWithAbsPath(image)).toBe(false);
        });

        it("类型守卫应该正确收窄类型", () => {
            const image: ImageMatch = createLocalImageWithAbsPath();
            if (isLocalImageWithAbsPath(image)) {
                expect(image.absLocalPath).toBe("/home/user/project/image.png");
            }
        });
    });

    describe("isLocalImageWithRelativePath", () => {
        it("应该识别带相对路径的本地图片", () => {
            const image = createLocalImageWithRelativePath();
            expect(isLocalImageWithRelativePath(image)).toBe(true);
        });

        it("不应该识别带绝对路径的本地图片", () => {
            const image = createLocalImageWithAbsPath();
            expect(isLocalImageWithRelativePath(image)).toBe(false);
        });

        it("不应该识别 Web 图片", () => {
            const image = createWebImage();
            expect(isLocalImageWithRelativePath(image)).toBe(false);
        });

        it("类型守卫应该正确收窄类型", () => {
            const image: ImageMatch = createLocalImageWithRelativePath();
            if (isLocalImageWithRelativePath(image)) {
                expect("absLocalPath" in image).toBe(false);
            }
        });
    });

    describe("类型守卫组合使用", () => {
        it("应该能够区分所有图片类型", () => {
            const images: ImageMatch[] = [
                createWebImage(),
                createLocalImageWithRelativePath(),
                createLocalImageWithAbsPath(),
            ];

            const webImages = images.filter(isWebImage);
            const localImages = images.filter(isLocalImage);
            const localWithAbsPath = images.filter(isLocalImageWithAbsPath);
            const localWithRelativePath = images.filter(isLocalImageWithRelativePath);

            expect(webImages).toHaveLength(1);
            expect(localImages).toHaveLength(2);
            expect(localWithAbsPath).toHaveLength(1);
            expect(localWithRelativePath).toHaveLength(1);
        });

        it("应该正确处理类型收窄", () => {
            const processImage = (image: ImageMatch): string => {
                if (isWebImage(image)) {
                    return `Web: ${image.src}`;
                }
                if (isLocalImageWithAbsPath(image)) {
                    return `Local (abs): ${image.absLocalPath}`;
                }
                if (isLocalImageWithRelativePath(image)) {
                    return `Local (rel): ${image.src}`;
                }
                return "Unknown";
            };

            expect(processImage(createWebImage())).toContain("Web:");
            expect(processImage(createLocalImageWithAbsPath())).toContain("Local (abs):");
            expect(processImage(createLocalImageWithRelativePath())).toContain("Local (rel):");
        });
    });
});

describe("isLocalAbsolutePath", () => {
    describe("Unix 绝对路径", () => {
        it("应该识别 Unix 绝对路径", () => {
            expect(isLocalAbsolutePath("/home/user/image.png")).toBe(true);
            expect(isLocalAbsolutePath("/usr/local/bin")).toBe(true);
            expect(isLocalAbsolutePath("/")).toBe(true);
        });

        it("应该识别带空格的 Unix 路径", () => {
            expect(isLocalAbsolutePath("/path with spaces/file.txt")).toBe(true);
        });
    });

    describe("Windows 绝对路径", () => {
        it("应该识别 Windows 盘符路径", () => {
            expect(isLocalAbsolutePath("C:\\Users\\file.txt")).toBe(true);
            expect(isLocalAbsolutePath("D:/data/file.txt")).toBe(true);
            expect(isLocalAbsolutePath("E:\\Projects\\app")).toBe(true);
        });

        it("应该识别 Windows UNC 路径", () => {
            expect(isLocalAbsolutePath("\\\\Server\\Share\\file.txt")).toBe(true);
        });

        it("应该识别 Windows 反斜杠开头路径", () => {
            expect(isLocalAbsolutePath("\\Program Files\\app.exe")).toBe(true);
        });
    });

    describe("非绝对路径", () => {
        it("不应该识别相对路径", () => {
            expect(isLocalAbsolutePath("./image.png")).toBe(false);
            expect(isLocalAbsolutePath("../images/logo.png")).toBe(false);
            expect(isLocalAbsolutePath("images/photo.jpg")).toBe(false);
        });

        it("不应该识别 Web URL", () => {
            expect(isLocalAbsolutePath("https://example.com/image.png")).toBe(false);
            expect(isLocalAbsolutePath("http://localhost:3000/file.txt")).toBe(false);
        });

        it("不应该识别纯文件名", () => {
            expect(isLocalAbsolutePath("image.png")).toBe(false);
            expect(isLocalAbsolutePath("file.txt")).toBe(false);
        });
    });

    describe("边界情况", () => {
        it("应该处理带空格的输入", () => {
            expect(isLocalAbsolutePath("  /home/user/file.txt  ")).toBe(true);
        });

        it("应该处理空字符串", () => {
            expect(isLocalAbsolutePath("")).toBe(false);
        });

        it("应该处理特殊字符路径", () => {
            expect(isLocalAbsolutePath("/path-with-dashes/file_name.txt")).toBe(true);
            expect(isLocalAbsolutePath("/path.with.dots/file.txt")).toBe(true);
        });
    });
});

describe("URL 工具函数", () => {
    describe("isValidUrl", () => {
        it("应该验证有效的 HTTP URL", () => {
            expect(isValidUrl("https://example.com")).toBe(true);
            expect(isValidUrl("http://localhost:3000")).toBe(true);
        });

        it("应该验证有效的文件 URL", () => {
            expect(isValidUrl("file:///path/to/file.txt")).toBe(true);
        });

        it("应该验证有效的 data URL", () => {
            expect(isValidUrl("data:image/png;base64,abc123")).toBe(true);
        });

        it("不应该验证无效的 URL", () => {
            expect(isValidUrl("not-a-url")).toBe(false);
            expect(isValidUrl("")).toBe(false);
            expect(isValidUrl("just text")).toBe(false);
        });

        it("不应该验证相对路径", () => {
            expect(isValidUrl("./image.png")).toBe(false);
            expect(isValidUrl("/absolute/path")).toBe(false);
        });
    });

    describe("parseUrlSafe", () => {
        it("应该成功解析有效的 URL", () => {
            const url = parseUrlSafe("https://example.com/path?query=1");
            expect(url).not.toBeNull();
            expect(url?.hostname).toBe("example.com");
            expect(url?.pathname).toBe("/path");
        });

        it("应该返回 null 当 URL 无效", () => {
            expect(parseUrlSafe("invalid-url")).toBeNull();
            expect(parseUrlSafe("")).toBeNull();
        });

        it("应该解析包含特殊字符的 URL", () => {
            const url = parseUrlSafe("https://user:pass@example.com:8080/path");
            expect(url).not.toBeNull();
            expect(url?.hostname).toBe("example.com");
            expect(url?.port).toBe("8080");
        });
    });
});

describe("formatMarkdownImage", () => {
    it("应该生成 Markdown 图片链接", () => {
        const result = formatMarkdownImage({
            src: "https://example.com/image.png",
            alt: "描述",
        });
        expect(result).toBe("![描述](https://example.com/image.png)");
    });

    it("应该处理空 alt 文本", () => {
        const result = formatMarkdownImage({
            src: "https://example.com/image.png",
            alt: "",
        });
        expect(result).toBe("![](https://example.com/image.png)");
    });

    it("应该保留 alt 中的特殊字符", () => {
        const result = formatMarkdownImage({
            src: "https://example.com/image.png",
            alt: "描述 [特殊]",
        });
        expect(result).toBe("![描述 [特殊]](https://example.com/image.png)");
    });

    it("应该支持 title 属性", () => {
        const result = formatMarkdownImage({
            src: "https://example.com/image.png",
            alt: "描述",
            title: "图片标题",
        });
        expect(result).toBe('![描述](https://example.com/image.png "图片标题")');
    });
});

describe("formatHtmlImage", () => {
    it("应该生成 HTML img 标签", () => {
        const result = formatHtmlImage({
            src: "https://example.com/image.png",
            alt: "描述",
        });
        expect(result).toBe('<img src="https://example.com/image.png" alt="描述">');
    });

    it("应该转义 alt 中的双引号", () => {
        const result = formatHtmlImage({
            src: "https://example.com/image.png",
            alt: '描述 "quoted"',
        });
        expect(result).toBe(
            '<img src="https://example.com/image.png" alt="描述 &quot;quoted&quot;">',
        );
    });

    it("应该处理空 alt", () => {
        const result = formatHtmlImage({
            src: "https://example.com/image.png",
            alt: "",
        });
        expect(result).toBe('<img src="https://example.com/image.png">');
    });

    it("应该支持标准属性", () => {
        const result = formatHtmlImage({
            src: "https://example.com/image.png",
            alt: "描述",
            attributes: {
                width: 300,
                height: 200,
                loading: "lazy",
            },
        });
        expect(result).toBe(
            '<img src="https://example.com/image.png" alt="描述" width="300" height="200" loading="lazy">',
        );
    });

    it("应该支持额外属性", () => {
        const result = formatHtmlImage({
            src: "https://example.com/image.png",
            alt: "描述",
            extraAttributes: {
                class: "responsive-img",
                "data-src": "high-res.png",
            },
        });
        expect(result).toBe(
            '<img src="https://example.com/image.png" alt="描述" class="responsive-img" data-src="high-res.png">',
        );
    });
});

describe("replaceAltVariables", () => {
    it("应该替换 {filename} 变量", () => {
        const result = replaceAltVariables("{filename}", "my-image.png");
        expect(result).toBe("my-image.png");
    });

    it("应该替换 {timestamp} 变量", () => {
        const result = replaceAltVariables("{timestamp}", "test.png");
        expect(result).toMatch(/^\d+$/);
        const timestamp = Number.parseInt(result, 10);
        expect(timestamp).toBeGreaterThan(0);
    });

    it("应该替换 {date} 变量", () => {
        const result = replaceAltVariables("{date}", "test.png");
        expect(result).toMatch(/^\d{8}$/);
    });

    it("应该替换 {time} 变量", () => {
        const result = replaceAltVariables("{time}", "test.png");
        expect(result).toMatch(/^\d{6}$/);
    });

    it("应该替换 {datetime} 变量", () => {
        const result = replaceAltVariables("{datetime}", "test.png");
        expect(result).toMatch(/^\d{14}$/);
    });

    it("应该替换时间组件变量", () => {
        const template = "{year}-{month}-{day} {hour}:{minute}:{second}";
        const result = replaceAltVariables(template, "test.png");
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it("应该处理多个变量", () => {
        const template = "{filename} - {date}";
        const result = replaceAltVariables(template, "my-image.png");
        expect(result).toMatch(/^my-image\.png - \d{8}$/);
    });

    it("应该使用默认文件名当未提供", () => {
        const result = replaceAltVariables("{filename}");
        expect(result).toBe("image");
    });

    it("应该保留非变量文本", () => {
        const template = "Image: {filename} captured on {date}";
        const result = replaceAltVariables(template, "photo.jpg");
        expect(result).toContain("Image: ");
        expect(result).toContain(" captured on ");
        expect(result).toContain("photo.jpg");
    });
});
