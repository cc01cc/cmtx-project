import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileCopyRule } from "../src/rules/built-in/file-copy-rule.js";
import type { RuleContext } from "../src/rules/rule-types.js";
import { FileSystemServiceImpl } from "../src/rules/services/file-system-service.js";

function createTempDir(): string {
    const dir = mkdtempSync("file-copy-test-");
    return dir;
}

describe("file-copy-rule", () => {
    it("should skip on dry run", async () => {
        const services = {
            get: vi.fn(),
            register: vi.fn(),
            has: vi.fn(),
            getAllIds: vi.fn(() => []),
        };
        const context: RuleContext = {
            document: "# Hello",
            filePath: "test.md",
            services: services as never,
            dryRun: true,
        };
        const result = await fileCopyRule.execute(context, { targetName: "prototype.md" });
        expect(result.messages?.[0]).toContain("dry-run");
    });

    it("should throw if FileSystemService is missing", async () => {
        const services = {
            get: vi.fn(() => undefined),
            register: vi.fn(),
            has: vi.fn(),
            getAllIds: vi.fn(() => []),
        };
        const context: RuleContext = {
            document: "# Hello",
            filePath: "test.md",
            services: services as never,
        };
        await expect(fileCopyRule.execute(context, {})).rejects.toThrow(
            "FileSystemService not found",
        );
    });

    it("should write target file and update links", async () => {
        const tmpDir = createTempDir();
        const sourceFile = join(tmpDir, "source.md");
        const toDir = join(tmpDir, "output");

        writeFileSync(sourceFile, "---\nid: FB-000001\nslug: test\n---\n# Hello", "utf-8");

        const services = {
            get: vi.fn(() => new FileSystemServiceImpl()),
            register: vi.fn(),
            has: vi.fn(),
            getAllIds: vi.fn(() => []),
        };
        const context: RuleContext = {
            document: "---\nprivate_id: EW-000001\nslug: test\n---\n# Hello",
            filePath: sourceFile,
            services: services as never,
            input: { "to-dir": toDir },
        };

        const result = await fileCopyRule.execute(context, {
            targetName: "prototype.md",
            links: {
                forwardKey: "linked_prototypes",
                forwardValue: "${rule.target.private_id}-${rule.target.slug}",
                backwardKey: "linked_sources",
                backwardValue: "${rule.source.id}-${rule.source.slug}",
            },
        });

        expect(result.messages?.some((m) => m.includes("written"))).toBe(true);
        expect(result.messages?.some((m) => m.includes("forward link"))).toBe(true);
        expect(result.messages?.some((m) => m.includes("backward link"))).toBe(true);

        // Cleanup
        rmSync(tmpDir, { recursive: true, force: true });
    });
});
