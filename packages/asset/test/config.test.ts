/**
 * 现代化配置构建器测试
 * 基于新的 types.ts API
 */

import { describe, expect, it } from "vitest";
import { ConfigBuilder } from "../src/upload/config.js";

describe("配置构建器测试", () => {
    describe("基础配置构建", () => {
        it("应该正确构建最小配置", () => {
            const config = new ConfigBuilder()
                .storages({
                    default: {
                        adapter: {
                            upload: async () => ({
                                name: "test",
                                url: "https://cdn.example.com/uploaded",
                            }),
                        } as any,
                    },
                })
                .useStorage("default")
                .build();

            expect(config.storages["default"]).toBeDefined();
            expect(config.storages["default"].adapter).toBeDefined();
            expect(config.replace).toBeDefined();
        });

        it("应该正确处理存储配置", () => {
            const config = new ConfigBuilder()
                .storages({
                    default: {
                        adapter: {
                            upload: async () => ({
                                name: "test",
                                url: "https://cdn.example.com/uploaded",
                            }),
                        } as any,
                        namingTemplate: "{name}_{hash}{ext}",
                    },
                })
                .useStorage("default")
                .prefix("uploads/")
                .build();

            expect(config.prefix).toBe("uploads/");
            expect(config.storages["default"].namingTemplate).toBe("{name}_{hash}{ext}");
        });
    });

    describe("字段模板配置", () => {
        it("应该正确处理字段模板", () => {
            const config = new ConfigBuilder()
                .storages({
                    default: {
                        adapter: {} as any,
                    },
                })
                .useStorage("default")
                .fieldTemplates({
                    src: "{cloudSrc}?optimize=true",
                    alt: "{originalValue} [processed]",
                    title: "固定标题",
                })
                .build();

            expect(config.replace?.fields.src).toBe("{cloudSrc}?optimize=true");
            expect(config.replace?.fields.alt).toBe("{originalValue} [processed]");
            expect(config.replace?.fields.title).toBe("固定标题");
        });

        it("应该正确处理完整替换配置", () => {
            const config = new ConfigBuilder()
                .storages({
                    default: {
                        adapter: {} as any,
                    },
                })
                .useStorage("default")
                .replace({
                    fields: {
                        alt: "{originalValue} [新版]",
                    },
                    context: {
                        author: "测试作者",
                    },
                })
                .build();

            expect(config.replace?.fields.alt).toBe("{originalValue} [新版]");
            expect(config.replace?.context?.author).toBe("测试作者");
        });
    });

    describe("事件配置", () => {
        it("应该正确处理事件回调", () => {
            const mockProgress = () => {};
            const mockLogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

            const config = new ConfigBuilder()
                .storages({
                    default: {
                        adapter: {} as any,
                    },
                })
                .useStorage("default")
                .events(mockProgress, mockLogger)
                .build();

            expect(config.events?.onProgress).toBe(mockProgress);
            expect(config.events?.logger).toBe(mockLogger);
        });
    });

    describe("错误处理", () => {
        it("应该在缺少存储配置时报错", () => {
            expect(() => {
                new ConfigBuilder().build();
            }).toThrow("Storage pool configuration is required");
        });

        it("应该正确处理空字段模板", () => {
            const config = new ConfigBuilder()
                .storages({
                    default: {
                        adapter: {} as any,
                    },
                })
                .useStorage("default")
                .fieldTemplates({})
                .build();

            expect(config.replace?.fields).toEqual({});
        });
    });

    describe("配置验证", () => {
        it("应该提供合理的默认值", () => {
            const config = new ConfigBuilder()
                .storages({
                    default: {
                        adapter: {} as any,
                    },
                })
                .useStorage("default")
                .build();

            // 检查默认值
            expect(config.replace?.fields.src).toBe("{cloudSrc}");
            expect(config.replace?.fields.alt).toBe("{originalAlt}");
        });

        it("应该正确合并配置", () => {
            const config = new ConfigBuilder()
                .storages({
                    default: {
                        adapter: {} as any,
                    },
                })
                .useStorage("default")
                .prefix("test/")
                .fieldTemplates({ src: "custom-{cloudSrc}" })
                .build();

            expect(config.prefix).toBe("test/");
            expect(config.replace?.fields.src).toBe("custom-{cloudSrc}");
        });
    });
});
