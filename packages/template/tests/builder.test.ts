import { describe, expect, it } from "vitest";
import { BaseTemplateBuilder } from "../src/builder/index.js";

// 创建一个测试用的 Builder 实现
class TestBuilder extends BaseTemplateBuilder {
    build(): string {
        return JSON.stringify(this.getContext());
    }
}

describe("Builder 模式测试", () => {
    describe("基础功能", () => {
        it("应该创建带有内置变量的 Builder", () => {
            const builder = new TestBuilder();
            const context = builder.getContext();

            expect(context.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(context.timestamp).toBeDefined();
            expect(context.uuid).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            );
        });

        it("应该支持链式调用添加变量", () => {
            const builder = new TestBuilder()
                .withDate()
                .withTimestamp()
                .addVariable("name", "test")
                .addVariable("count", 42);

            const context = builder.getContext();
            expect(context.name).toBe("test");
            expect(context.count).toBe(42);
        });

        it("应该支持批量添加变量", () => {
            const variables = {
                firstName: "John",
                lastName: "Doe",
                age: 30,
            };

            const builder = new TestBuilder().addVariables(variables);
            const context = builder.getContext();

            expect(context.firstName).toBe("John");
            expect(context.lastName).toBe("Doe");
            expect(context.age).toBe(30);
        });
    });

    describe("上下文操作", () => {
        it("应该支持合并上下文", () => {
            const builder1 = new TestBuilder().addVariable("name", "John");
            const builder2 = new TestBuilder().addVariable("age", 30);

            const merged = new TestBuilder()
                .merge(builder1.getContext())
                .merge(builder2.getContext());

            const context = merged.getContext();
            expect(context.name).toBe("John");
            expect(context.age).toBe(30);
        });

        it("应该支持清空变量（保留内置变量）", () => {
            const builder = new TestBuilder().addVariable("custom", "value").clear();

            const context = builder.getContext();
            // 自定义变量应该被清除
            expect(context.custom).toBeUndefined();
            // 内置变量应该保留
            expect(context.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(context.timestamp).toBeDefined();
        });
    });

    describe("构建功能", () => {
        it("应该正确构建结果", () => {
            const result = new TestBuilder().addVariable("test", "value").build();

            const parsed = JSON.parse(result);
            expect(parsed.test).toBe("value");
            expect(parsed.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe("UUID 功能", () => {
        it("应该支持 withUUID() 方法", () => {
            const builder = new TestBuilder().withUUID();
            const context = builder.getContext();

            expect(context.uuid).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            );
        });

        it("withUUID() 应该生成新的 UUID", () => {
            const builder1 = new TestBuilder().withUUID();
            const builder2 = new TestBuilder().withUUID();

            const uuid1 = builder1.getContext().uuid;
            const uuid2 = builder2.getContext().uuid;

            expect(uuid1).not.toBe(uuid2);
        });
    });

    describe("clear() 边界情况", () => {
        it("clear() 应该返回 this 支持链式调用", () => {
            const builder = new TestBuilder();
            const result = builder.clear();

            expect(result).toBe(builder);
        });

        it("多次 clear() 应该正常工作", () => {
            const builder = new TestBuilder()
                .addVariable("key1", "value1")
                .clear()
                .addVariable("key2", "value2")
                .clear();

            const context = builder.getContext();
            expect(context.key1).toBeUndefined();
            expect(context.key2).toBeUndefined();
            expect(context.date).toBeDefined();
        });

        it("clear() 后应该重新初始化内置变量", () => {
            const builder = new TestBuilder();
            const contextBefore = builder.getContext();
            const _originalDate = contextBefore.date;

            // 等待一小段时间确保日期可能变化
            builder.clear();
            const contextAfter = builder.getContext();

            // 内置变量应该仍然存在
            expect(contextAfter.date).toBeDefined();
            expect(contextAfter.timestamp).toBeDefined();
            expect(contextAfter.uuid).toBeDefined();
        });
    });
});
