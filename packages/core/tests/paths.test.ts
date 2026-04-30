/**
 * 路径处理综合测试
 *
 * 测试各种路径格式的识别和处理能力
 */

import { describe, expect, it } from "vitest";
import { URL_REGEX } from "../src/constants/regex.js";
import { isWebSource, normalizePath } from "../src/utils.js";

describe("路径处理综合测试", () => {
    describe("绝对路径检测", () => {
        const testCases = [
            // Unix/Linux路径
            { path: "/usr/local/bin", expected: true, description: "Unix根目录路径" },
            {
                path: "/home/user/documents",
                expected: true,
                description: "Unix用户目录路径",
            },
            {
                path: "~/Downloads/file.txt",
                expected: false,
                description: "波浪号路径(相对)",
            },

            // Windows路径
            {
                path: String.raw`C:\Windows\System32`,
                expected: true,
                description: "Windows盘符路径",
            },
            {
                path: String.raw`D:\Data\Files`,
                expected: true,
                description: "Windows数据盘路径",
            },
            {
                path: String.raw`\\Server\Share`,
                expected: true,
                description: "网络共享路径",
            },
            {
                path: String.raw`\Program Files\App`,
                expected: true,
                description: "Windows根目录路径",
            },

            // 混合格式
            {
                path: "C:/Program Files/Application",
                expected: true,
                description: "正斜杠Windows路径",
            },
            { path: "D:/data/projects", expected: true, description: "小写盘符路径" },

            // 相对路径
            {
                path: "./images/logo.png",
                expected: false,
                description: "当前目录相对路径",
            },
            {
                path: "../assets/banner.jpg",
                expected: false,
                description: "父目录相对路径",
            },
            {
                path: "images/photo.png",
                expected: false,
                description: "同级目录路径",
            },
            { path: "icon.png", expected: false, description: "纯文件名" },

            // 边界情况
            { path: "", expected: false, description: "空字符串" },
            { path: "/", expected: true, description: "根目录" },
            { path: "\\", expected: true, description: "Windows根目录" },
        ];

        testCases.forEach(({ path, expected, description }) => {
            it(`应该${expected ? "识别" : "不识别"} ${description}: "${path}"`, () => {
                const result = URL_REGEX.ABSOLUTE_PATH.test(path);
                expect(result).toBe(expected);
            });
        });
    });

    describe("Web源检测", () => {
        const webUrls = [
            "https://example.com/image.png",
            "http://cdn.site.com/photos/gallery.jpg",
            "//static.domain.com/icons/loading.gif",
            "HTTPS://UPPERCASE.COM/file.jpg",
            "  https://example.com/spaces.png  ",
        ];

        const localPaths = [
            "./local.png",
            "../parent/image.jpg",
            "/absolute/path/file.gif",
            String.raw`C:\Windows\file.bmp`,
            String.raw`\\network\share\document.pdf`,
            "just-filename.png",
            "folder/nested/image.svg",
        ];

        webUrls.forEach((url) => {
            it(`应该识别Web URL: "${url}"`, () => {
                expect(isWebSource(url)).toBe(true);
            });
        });

        localPaths.forEach((path) => {
            it(`不应该识别本地路径为Web源: "${path}"`, () => {
                expect(isWebSource(path)).toBe(false);
            });
        });
    });

    describe("路径规范化", () => {
        const normalizationTests = [
            {
                input: String.raw`C:\Users\Project\File.TXT`,
                description: "Windows路径转小写和斜杠转换",
                validator: (result: string) => {
                    if (process.platform === "win32") {
                        return result === "c:/users/project/file.txt";
                    }
                    return result === "C:/Users/Project/File.TXT";
                },
            },
            {
                input: "/home/user/documents/file.txt",
                description: "Unix路径保持不变",
                validator: (result: string) => result === "/home/user/documents/file.txt",
            },
            {
                input: "./images/../assets/logo.png",
                description: "相对路径规范化",
                validator: (result: string) => !result.includes("../"),
            },
            {
                input: "C:/Program Files/Application/app.exe",
                description: "混合格式路径",
                validator: (result: string) => {
                    if (process.platform === "win32") {
                        return result === "c:/program files/application/app.exe";
                    }
                    return result === "C:/Program Files/Application/app.exe";
                },
            },
        ];

        normalizationTests.forEach(({ input, description, validator }) => {
            it(`应该正确规范化 ${description}: "${input}"`, () => {
                const result = normalizePath(input);
                expect(validator(result)).toBe(true);
            });
        });
    });

    describe("复杂路径场景", () => {
        it("应该处理包含空格的路径", () => {
            const path = "./my photos/vacation 2023/beach.jpg";
            expect(isWebSource(path)).toBe(false);
            expect(normalizePath(path)).toContain(" ");
        });

        it("应该处理Unicode字符路径", () => {
            const path = "./图片/照片@2x.png";
            expect(isWebSource(path)).toBe(false);
            expect(normalizePath(path)).toContain("图片");
        });

        it("应该处理多语言混合路径", () => {
            // 中英混合
            const cnEnPath = "./photos/图片/photo.jpg";
            expect(isWebSource(cnEnPath)).toBe(false);
            expect(normalizePath(cnEnPath)).toContain("图片");

            // 日英混合
            const jpEnPath = "./images/画像/image.png";
            expect(isWebSource(jpEnPath)).toBe(false);
            expect(normalizePath(jpEnPath)).toContain("画像");

            // 韩英混合
            const krEnPath = "./graphics/이미지/graphic.svg";
            expect(isWebSource(krEnPath)).toBe(false);
            expect(normalizePath(krEnPath)).toContain("이미지");
        });

        it("应该处理带查询参数的路径", () => {
            const path = "./cache/image.jpg?width=300&height=200";
            expect(isWebSource(path)).toBe(false);
        });

        it("应该处理带Fragment的路径", () => {
            const path = "./gallery/main.png#lightbox";
            expect(isWebSource(path)).toBe(false);
        });

        it("应该处理深度嵌套路径", () => {
            const path = "../../../very/deep/nested/folder/image.svg";
            expect(isWebSource(path)).toBe(false);
        });
    });
});
