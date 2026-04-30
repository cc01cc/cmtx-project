/**
 * 现代化模板渲染测试
 * 基于 @cmtx/template/renderTemplate API
 */

import { renderTemplate } from "@cmtx/template";
import { describe, expect, it } from "vitest";
import { createContext } from "../src/upload/template-renderer.js";

describe("模板渲染器测试", () => {
    describe("基础渲染功能", () => {
        it("应该正确渲染基本变量", () => {
            const context = createContext("/test/image.png", {
                cloudUrl: "https://cdn.example.com/image.png",
                originalValue: "原始文本",
            });

            expect(renderTemplate("{cloudSrc}", context, { emptyString: "preserve" })).toBe(
                "https://cdn.example.com/image.png",
            );
            expect(renderTemplate("{originalValue}", context, { emptyString: "preserve" })).toBe(
                "原始文本",
            );
        });

        it("应该正确处理组合模板", () => {
            const context = createContext("/test/image.png", {
                cloudUrl: "https://cdn.example.com/image.png",
                originalValue: "原始文本",
            });

            expect(
                renderTemplate("{originalValue} - 已更新", context, {
                    emptyString: "preserve",
                }),
            ).toBe("原始文本 - 已更新");
            expect(
                renderTemplate("{cloudSrc}?quality=80", context, {
                    emptyString: "preserve",
                }),
            ).toBe("https://cdn.example.com/image.png?quality=80");
        });

        it("应该正确处理固定文本", () => {
            const context = createContext("/test/image.png", {
                cloudUrl: "https://cdn.example.com/image.png",
            });

            expect(renderTemplate("固定标题", context, { emptyString: "preserve" })).toBe(
                "固定标题",
            );
        });

        it("应该保持未知变量不变", () => {
            const context = createContext("/test/image.png", {
                cloudUrl: "https://cdn.example.com/image.png",
            });

            expect(renderTemplate("{unknownVar}", context, { emptyString: "preserve" })).toBe(
                "{unknownVar}",
            );
        });
    });

    describe("复杂上下文处理", () => {
        it("应该处理多变量上下文", () => {
            const context = createContext("/path/image.jpg", {
                cloudUrl: "https://cdn.example.com/image.jpg",
                originalValue: "测试图片",
                author: "张三",
                date: "2024-01-01",
            });

            expect(
                renderTemplate("{originalValue} by {author}", context, {
                    emptyString: "preserve",
                }),
            ).toBe("测试图片 by 张三");
            expect(renderTemplate("上传于 {date}", context, { emptyString: "preserve" })).toBe(
                "上传于 2024-01-01",
            );
        });

        it("应该正确处理空模板", () => {
            const context = createContext("/test/image.png", {
                cloudUrl: "https://cdn.example.com/image.png",
            });

            expect(renderTemplate("", context, { emptyString: "preserve" })).toBe("");
            expect(renderTemplate("{}", context, { emptyString: "preserve" })).toBe("{}");
        });

        it("应该正确处理 undefined 值", () => {
            const context = createContext("/test/image.png", {
                cloudUrl: "https://cdn.example.com/image.png",
            });

            expect(renderTemplate("{originalValue}", context, { emptyString: "preserve" })).toBe(
                "{originalValue}",
            );
        });
    });

    describe("性能测试", () => {
        it("应该高效处理大量渲染", () => {
            const context = createContext("/test/image.png", {
                cloudUrl: "https://cdn.example.com/image.png",
                originalValue: "test image",
            });

            const startTime = Date.now();

            // 执行 1000 次渲染
            for (let i = 0; i < 1000; i++) {
                renderTemplate(`{cloudSrc}?v=${i}`, context, {
                    emptyString: "preserve",
                });
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // 应该在 100ms 内完成
            expect(duration).toBeLessThan(100);
        });
    });

    describe("边界情况测试", () => {
        it("应该正确处理特殊字符", () => {
            const context = createContext("/test/image[1].png", {
                cloudUrl: "https://cdn.example.com/image%5B1%5D.png",
                originalValue: "测试[图片]",
            });

            expect(renderTemplate("{originalValue}", context, { emptyString: "preserve" })).toBe(
                "测试[图片]",
            );
            expect(renderTemplate("URL: {cloudSrc}", context, { emptyString: "preserve" })).toBe(
                "URL: https://cdn.example.com/image%5B1%5D.png",
            );
        });

        it("应该正确处理嵌套变量占位符", () => {
            const context = createContext("/test/image.png", {
                cloudUrl: "https://cdn.example.com/image.png",
                originalValue: "{nested}",
            });

            // 嵌套变量应该保持原样
            expect(renderTemplate("{originalValue}", context, { emptyString: "preserve" })).toBe(
                "{nested}",
            );
        });
    });
});
