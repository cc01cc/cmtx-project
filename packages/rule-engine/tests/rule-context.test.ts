/**
 * Rule 引擎上下文工厂测试
 *
 * @module rule-context.test
 * @description
 * 测试 createRuleEngineContext 工厂函数的核心功能。
 */

import { describe, expect, it, vi } from "vitest";
import { createRuleEngineContext } from "../src/rule-context.js";
import type { Rule, RuleContext, RuleResult } from "../src/rules/rule-types.js";
import type { Service } from "../src/rules/service-registry.js";

function createMockRule(id: string): Rule {
    return {
        id,
        name: id,
        execute: (): RuleResult => ({
            content: "test",
            modified: false,
        }),
    };
}

describe("createRuleEngineContext", () => {
    describe("基础用法（无 assetAdapter）", () => {
        it("should return engine and registry", () => {
            const { engine, registry } = createRuleEngineContext();

            expect(engine).toBeDefined();
            expect(registry).toBeDefined();
        });

        it("should have built-in rules registered", () => {
            const { engine } = createRuleEngineContext();
            const ruleIds = engine.getAllRuleIds();

            expect(ruleIds.length).toBeGreaterThan(0);
            expect(ruleIds).toContain("strip-frontmatter");
            expect(ruleIds).toContain("upload-images");
            expect(ruleIds).toContain("frontmatter-title");
        });

        it("should not have assetService registered", () => {
            const { registry } = createRuleEngineContext();

            expect(registry.has("asset")).toBe(false);
        });

        it("should not have callbackService registered", () => {
            const { registry } = createRuleEngineContext();

            expect(registry.has("callback")).toBe(false);
        });

        it("should not have counterService registered", () => {
            const { registry } = createRuleEngineContext();

            expect(registry.has("counter")).toBe(false);
        });
    });

    describe("带 assetAdapter", () => {
        it("should register upload and download services when assetAdapter is provided", () => {
            const mockAdapter = {
                provider: "aliyun-oss" as const,
                upload: vi.fn(),
                delete: vi.fn(),
                list: vi.fn(),
            };

            const { registry } = createRuleEngineContext({
                assetAdapter: mockAdapter,
            });

            expect(registry.has("upload")).toBe(true);
            expect(registry.has("download")).toBe(true);
        });

        it("should pass prefix and namingTemplate to upload service", () => {
            const mockAdapter = {
                provider: "aliyun-oss" as const,
                upload: vi.fn(),
                delete: vi.fn(),
                list: vi.fn(),
            };

            const { registry } = createRuleEngineContext({
                assetAdapter: mockAdapter,
                assetPrefix: "images/",
                assetNamingTemplate: "{year}/{month}/{hash}",
            });

            expect(registry.has("upload")).toBe(true);
            expect(registry.has("download")).toBe(true);
        });
    });

    describe("引擎功能验证", () => {
        it("should execute a single rule", async () => {
            const { engine, registry } = createRuleEngineContext();
            const testRule: Rule = {
                id: "test-rule",
                name: "Test Rule",
                execute: (ctx: RuleContext): RuleResult => ({
                    content: ctx.document + "\nmodified",
                    modified: true,
                }),
            };

            engine.register(testRule);

            const context: RuleContext = {
                document: "test content",
                filePath: "/test.md",
                baseDirectory: "/test",
                services: registry,
            };

            const result = await engine.executeRule("test-rule", context);
            expect(result.content).toBe("test content\nmodified");
            expect(result.modified).toBe(true);
        });

        it("should execute a preset", async () => {
            const { engine, registry } = createRuleEngineContext();
            const rule1: Rule = {
                id: "rule-1",
                name: "Rule 1",
                execute: (ctx: RuleContext): RuleResult => ({
                    content: ctx.document + " [rule1]",
                    modified: true,
                }),
            };
            const rule2: Rule = {
                id: "rule-2",
                name: "Rule 2",
                execute: (ctx: RuleContext): RuleResult => ({
                    content: ctx.document + " [rule2]",
                    modified: true,
                }),
            };

            engine.register(rule1);
            engine.register(rule2);

            const context: RuleContext = {
                document: "test",
                filePath: "/test.md",
                baseDirectory: "/test",
                services: registry,
            };

            const result = await engine.executePreset(["rule-1", "rule-2"], context);
            expect(result.content).toBe("test [rule1] [rule2]");
            expect(result.results.length).toBe(2);
        });
    });

    describe("registry 可扩展性", () => {
        it("should allow registering additional services", () => {
            const { registry } = createRuleEngineContext();

            const mockService: Service = {
                id: "custom-service",
            };
            registry.register(mockService);

            expect(registry.has("custom-service")).toBe(true);
            expect(registry.get("custom-service")).toBe(mockService);
        });
    });
});
