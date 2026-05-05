import { describe, expect, it, vi } from "vitest";
import { idGenerateRule } from "../src/rules/built-in/id-generate-rule.js";
import type { RuleContext } from "../src/rules/rule-types.js";
import type { CounterService } from "../src/rules/service-registry.js";

function makeContext(document: string, counter?: CounterService): RuleContext {
    const services = {
        get: vi.fn((id: string) => (id === "counter" ? counter : undefined)),
        register: vi.fn(),
        has: vi.fn(() => true),
        getAllIds: vi.fn(() => ["counter"]),
    };
    return { document, filePath: "test.md", services: services as never };
}

describe("id-generate-rule", () => {
    it("should inject private_id and public_id with counter", () => {
        const counter: CounterService = {
            id: "counter",
            next: () => 1,
            current: () => 1,
            reset: vi.fn(),
        };
        const doc = "---\ntitle: Test\n---\n# Hello";
        const result = idGenerateRule.execute(makeContext(doc, counter), {
            privatePrefix: "EW-",
            publicKey: "id",
            privateKey: "private_id",
            encryptionKey: "test-key-12345",
        });

        expect(result.modified).toBe(true);
        expect(result.content).toContain("private_id: EW-000001");
        expect(result.messages?.[0]).toContain("id-generate");
    });

    it("should generate without encryption key (placeholder)", () => {
        const counter: CounterService = {
            id: "counter",
            next: () => 42,
            current: () => 42,
            reset: vi.fn(),
        };
        const doc = "---\ntitle: Test\n---\n# Hello";
        const result = idGenerateRule.execute(makeContext(doc, counter), {
            privatePrefix: "EW-",
            publicKey: "id",
            privateKey: "private_id",
        });

        expect(result.content).toContain("private_id: EW-000042");
    });

    it("should use default config values when not provided", () => {
        const counter: CounterService = {
            id: "counter",
            next: () => 5,
            current: () => 5,
            reset: vi.fn(),
        };
        const doc = "---\ntitle: Test\n---\n# Hello";
        const result = idGenerateRule.execute(makeContext(doc, counter), {});

        expect(result.content).toContain("private_id: EW-000005");
    });

    it("should work without counter service", () => {
        const doc = "---\ntitle: Test\n---\n# Hello";
        const result = idGenerateRule.execute(makeContext(doc), {
            privatePrefix: "EW-",
            publicKey: "id",
            privateKey: "private_id",
        });

        expect(result.content).toContain("private_id: EW-TEMP");
    });
});
