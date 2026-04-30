import { describe, expect, it } from "vitest";
import { ContextManager } from "../src/core/context.js";
import { renderTemplate } from "../src/core/template-engine.js";
import type { TemplateContext } from "../src/core/types.js";

describe("模板引擎核心功能测试", () => {
    describe("renderTemplate", () => {
        it("应该正确替换简单的变量", () => {
            const template = "Hello {name}!";
            const context: TemplateContext = { name: "World" };
            const result = renderTemplate(template, context);
            expect(result).toBe("Hello World!");
        });

        it("应该正确处理多个变量", () => {
            const template = "{greeting} {name}!";
            const context: TemplateContext = {
                greeting: "Hello",
                name: "World",
            };
            const result = renderTemplate(template, context);
            expect(result).toBe("Hello World!");
        });

        it("应该保留未定义的变量", () => {
            const template = "Hello {name}!";
            const context: TemplateContext = {};
            const result = renderTemplate(template, context);
            expect(result).toBe("Hello {name}!");
        });

        it("应该处理数字和布尔值", () => {
            const template = "Count: {count}, Active: {active}";
            const context: TemplateContext = {
                count: 42,
                active: true,
            };
            const result = renderTemplate(template, context);
            expect(result).toBe("Count: 42, Active: true");
        });

        it("应该处理变量名中的空格", () => {
            const template = "Hello { user name }!";
            const context: TemplateContext = { "user name": "John" };
            const result = renderTemplate(template, context);
            expect(result).toBe("Hello John!");
        });
    });

    describe("renderTemplate options", () => {
        describe("emptyString option", () => {
            it("默认行为：空字符串替换为空", () => {
                const result = renderTemplate("Hello {name}!", { name: "" });
                expect(result).toBe("Hello !");
            });

            it('emptyString: "replace" 显式指定', () => {
                const result = renderTemplate(
                    "Hello {name}!",
                    { name: "" },
                    { emptyString: "replace" },
                );
                expect(result).toBe("Hello !");
            });

            it('emptyString: "preserve" 保留占位符', () => {
                const result = renderTemplate(
                    "Hello {name}!",
                    { name: "" },
                    { emptyString: "preserve" },
                );
                expect(result).toBe("Hello {name}!");
            });

            it("undefined 始终保留占位符", () => {
                const result = renderTemplate("Hello {name}!", {}, { emptyString: "preserve" });
                expect(result).toBe("Hello {name}!");
            });
        });

        describe("trimWhitespace option", () => {
            it("默认行为：trim 变量名空格", () => {
                const result = renderTemplate("Hello { user name }!", {
                    "user name": "John",
                });
                expect(result).toBe("Hello John!");
            });

            it("trimWhitespace: true 显式指定", () => {
                const result = renderTemplate(
                    "Hello { user name }!",
                    { "user name": "John" },
                    { trimWhitespace: true },
                );
                expect(result).toBe("Hello John!");
            });

            it("trimWhitespace: false 保留原始变量名", () => {
                const result = renderTemplate(
                    "Hello { user name }!",
                    { "user name": "John" },
                    { trimWhitespace: false },
                );
                expect(result).toBe("Hello { user name }!");
            });
        });

        describe("postProcess option", () => {
            it("应该应用后处理函数", () => {
                const result = renderTemplate(
                    "{date}//{name}",
                    { date: "2026-04-25", name: "photo" },
                    { postProcess: (s) => s.replace(/\/+/g, "/") },
                );
                expect(result).toBe("2026-04-25/photo");
            });

            it("后处理函数可以链式调用", () => {
                const result = renderTemplate(
                    "{name}  ",
                    { name: "photo" },
                    { postProcess: (s) => s.trim() },
                );
                expect(result).toBe("photo");
            });
        });

        describe("向后兼容性", () => {
            it("不传 options 时行为不变", () => {
                const result = renderTemplate("Hello {name}!", { name: "World" });
                expect(result).toBe("Hello World!");
            });

            it("undefined 变量保留占位符", () => {
                const result = renderTemplate("Hello {name}!", {});
                expect(result).toBe("Hello {name}!");
            });
        });
    });
});

describe("ContextManager 测试", () => {
    describe("has() 方法", () => {
        it("应该返回 true 当变量存在", () => {
            const manager = new ContextManager();
            manager.set("key", "value");
            expect(manager.has("key")).toBe(true);
        });

        it("应该返回 false 当变量不存在", () => {
            const manager = new ContextManager();
            expect(manager.has("nonexistent")).toBe(false);
        });

        it("应该正确检查多个变量", () => {
            const manager = new ContextManager();
            manager.set("key1", "value1");
            manager.set("key2", "value2");

            expect(manager.has("key1")).toBe(true);
            expect(manager.has("key2")).toBe(true);
            expect(manager.has("key3")).toBe(false);
        });
    });

    describe("delete() 方法", () => {
        it("应该删除存在的变量", () => {
            const manager = new ContextManager();
            manager.set("key", "value");
            manager.delete("key");
            expect(manager.has("key")).toBe(false);
        });

        it("删除不存在的变量应该静默处理", () => {
            const manager = new ContextManager();
            expect(() => manager.delete("nonexistent")).not.toThrow();
        });

        it("删除后其他变量应该保留", () => {
            const manager = new ContextManager();
            manager.set("key1", "value1");
            manager.set("key2", "value2");
            manager.delete("key1");

            expect(manager.has("key1")).toBe(false);
            expect(manager.has("key2")).toBe(true);
            expect(manager.get().key2).toBe("value2");
        });
    });

    describe("边界情况", () => {
        it("应该处理空字符串 key", () => {
            const manager = new ContextManager();
            manager.set("", "value");
            expect(manager.has("")).toBe(true);
            expect(manager.get()[""]).toBe("value");
        });

        it("clear() 应该清空所有变量", () => {
            const manager = new ContextManager();
            manager.set("key1", "value1");
            manager.set("key2", "value2");
            manager.clear();

            expect(manager.has("key1")).toBe(false);
            expect(manager.has("key2")).toBe(false);
            expect(Object.keys(manager.get())).toHaveLength(0);
        });

        it("get() 应该返回副本", () => {
            const manager = new ContextManager();
            manager.set("key", "value");

            const context1 = manager.get();
            context1.key = "modified";

            const context2 = manager.get();
            expect(context2.key).toBe("value");
        });
    });
});
