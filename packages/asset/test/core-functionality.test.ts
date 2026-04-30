/**
 * 核心功能验证测试
 */

import { renderTemplate } from "@cmtx/template";
import { describe, expect, it } from "vitest";
import { ConfigBuilder } from "../src/upload/config.js";
import { createContext } from "../src/upload/template-renderer.js";

function checkCondition(value: string, condition: any): boolean {
    if (!condition) return true;

    if (condition.includes && !value.includes(condition.includes)) {
        return false;
    }

    if (condition.match) {
        const regex =
            condition.match instanceof RegExp ? condition.match : new RegExp(condition.match);
        if (!regex.test(value)) {
            return false;
        }
    }

    if (condition.equals && value !== condition.equals) {
        return false;
    }

    return true;
}

describe("核心功能测试", () => {
    it("应该正确渲染模式", () => {
        const context = createContext("/test/image.png", {
            cloudUrl: "https://cdn.example.com/test.png",
            originalValue: "原始ALT文本",
        });

        const result = renderTemplate("{cloudSrc}", context, {
            emptyString: "preserve",
        });
        expect(result).toBe("https://cdn.example.com/test.png");

        const result2 = renderTemplate("{originalValue} - 已更新", context, {
            emptyString: "preserve",
        });
        expect(result2).toBe("原始ALT文本 - 已更新");
    });

    it("应该正确构建配置", () => {
        const config = new ConfigBuilder()
            .storages({
                default: {
                    adapter: {
                        upload: async (_localPath: string, remotePath: string) => {
                            return `https://cdn.mock.com/${remotePath}`;
                        },
                    } as any,
                    namingTemplate: "{date}_{md5_8}{ext}",
                },
            })
            .useStorage("default")
            .prefix("uploads/blog/")
            .fieldTemplates({
                src: "{cloudSrc}?optimize=true",
                alt: "{originalValue} [processed]",
            })
            .delete({
                strategy: "trash",
                maxRetries: 3,
            })
            .build();

        expect(config.prefix).toBe("uploads/blog/");
        expect(config.replace?.fields.src).toBe("{cloudSrc}?optimize=true");
        expect(config.delete?.strategy).toBe("trash");
    });

    it("应该正确处理条件替换", () => {
        const testCases = [
            {
                original: "待更新的图片",
                condition: { includes: "待更新" },
                shouldReplace: true,
            },
            {
                original: "普通图片",
                condition: { includes: "待更新" },
                shouldReplace: false,
            },
            {
                original: "v1.0 版本",
                condition: { match: /v\d+\.\d+/ },
                shouldReplace: true,
            },
            {
                original: "普通文本",
                condition: { match: /v\d+\.\d+/ },
                shouldReplace: false,
            },
        ];

        testCases.forEach(({ original, condition, shouldReplace }) => {
            const result = checkCondition(original, condition);
            expect(result).toBe(shouldReplace);
        });
    });

    it("应该正确处理字段分离", () => {
        const mockImageReferences = [
            { src: "./images/logo.png", alt: "公司Logo" },
            { src: "../images/logo.png", alt: "Brand Logo" },
            { src: "../../images/logo.png", alt: "企业标识" },
        ];

        mockImageReferences.forEach((ref) => {
            const ctx = createContext("/path/to/image.png", {
                cloudUrl: "https://cdn.example.com/logo.png",
                originalValue: ref.alt,
            });

            const newSrc = renderTemplate("{cloudSrc}", ctx, {
                emptyString: "preserve",
            });
            const newAlt = renderTemplate("{originalValue} [已处理]", ctx, {
                emptyString: "preserve",
            });

            expect(newSrc).toBe("https://cdn.example.com/logo.png");
            expect(newAlt).toBe(`${ref.alt} [已处理]`);
        });
    });
});
