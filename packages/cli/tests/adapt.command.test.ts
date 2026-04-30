import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { registerPreset } from "@cmtx/publish";
import { handler as adaptHandler } from "../src/commands/adapt.js";

// ---------------------------------------------------------------------------
// Integration tests: handler (using Preset API)
// ---------------------------------------------------------------------------

const wechatPreset = [
    "strip-frontmatter",
    "promote-headings",
    "add-section-numbers",
    "convert-images",
    "upload-images",
    "frontmatter-id",
    "frontmatter-date",
];

const wechatValidator = (markdown: string) => {
    const issues: Array<{
        code: string;
        level: "warning";
        message: string;
        fixable: boolean;
    }> = [];

    if (/^---[\s\S]*?---\n+/g.test(markdown)) {
        issues.push({
            code: "wechat/frontmatter",
            level: "warning",
            message: "WeChat content should not include YAML frontmatter.",
            fixable: true,
        });
    }

    if (/^# .+$/gm.test(markdown)) {
        issues.push({
            code: "wechat/h1-body",
            level: "warning",
            message: "WeChat body content should start at H2 because the title is set separately.",
            fixable: true,
        });
    }

    return issues;
};

describe("adapt command handler", () => {
    beforeAll(() => {
        registerPreset("wechat", wechatPreset, wechatValidator);
    });
    it("writes adapted file to --out path using platform preset", async () => {
        const dir = await mkdtemp(join(tmpdir(), "cmtx-adapt-handler-"));
        const inputFile = join(dir, "article.md");
        const outFile = join(dir, "output", "article.md");

        // 创建包含 frontmatter 和 H1 的测试文件（wechat 平台会处理这些）
        await writeFile(
            inputFile,
            [
                "---",
                "title: Test",
                "date: 2026-01-01",
                "---",
                "",
                "# Main Title",
                "",
                "Some content",
            ].join("\n"),
            "utf-8",
        );

        const { mkdir } = await import("node:fs/promises");
        await mkdir(join(dir, "output"), { recursive: true });

        await adaptHandler({
            input: inputFile,
            platform: "wechat",
            out: outFile,
            dryRun: false,
            verbose: false,
        } as never);

        const result = await readFile(outFile, "utf-8");
        // wechat preset 会：
        // 1. strip-frontmatter: 删除原始 frontmatter（title: Test）
        // 2. frontmatter-date: 添加新的 date frontmatter
        // 3. promote-headings: H1 被移除（wechat 标题单独设置）
        expect(result).not.toContain("title: Test"); // 原始 frontmatter 被删除
        expect(result).not.toContain("# Main Title"); // H1 被移除
        expect(result).toContain("date:"); // frontmatter-date 会添加新的 date frontmatter

        await rm(dir, { recursive: true, force: true });
    });

    it("writes all .md files to --out-dir when input is a directory", async () => {
        const dir = await mkdtemp(join(tmpdir(), "cmtx-adapt-dir-"));
        const inputDir = join(dir, "src");
        const outDir = join(dir, "out");

        const { mkdir } = await import("node:fs/promises");
        await mkdir(inputDir, { recursive: true });

        await writeFile(
            join(inputDir, "a.md"),
            ["---", "title: A", "---", "", "# Title A", "", "Content A"].join("\n"),
            "utf-8",
        );
        await writeFile(
            join(inputDir, "b.md"),
            ["---", "title: B", "---", "", "# Title B", "", "Content B"].join("\n"),
            "utf-8",
        );

        await adaptHandler({
            input: inputDir,
            platform: "wechat",
            outDir,
            dryRun: false,
            verbose: false,
        } as never);

        const a = await readFile(join(outDir, "a.md"), "utf-8");
        const b = await readFile(join(outDir, "b.md"), "utf-8");
        // wechat preset 会删除原始 frontmatter 并添加新的 date frontmatter
        expect(a).not.toContain("title: A"); // 原始 frontmatter 被删除
        expect(b).not.toContain("title: B"); // 原始 frontmatter 被删除
        expect(a).toContain("date:"); // frontmatter-date 会添加新的 date frontmatter
        expect(b).toContain("date:"); // frontmatter-date 会添加新的 date frontmatter

        await rm(dir, { recursive: true, force: true });
    });

    it("checks markdown against built-in platform validators", async () => {
        const dir = await mkdtemp(join(tmpdir(), "cmtx-adapt-check-"));
        const inputFile = join(dir, "article.md");

        await writeFile(inputFile, "# Section\n", "utf-8");

        const originalExitCode = process.exitCode;
        process.exitCode = undefined;

        await adaptHandler({
            input: inputFile,
            platform: "wechat",
            check: true,
            dryRun: false,
            verbose: false,
        } as never);

        expect(process.exitCode).toBe(1);
        process.exitCode = originalExitCode;

        await rm(dir, { recursive: true, force: true });
    });

    it("fails when neither --rule-file nor --platform is provided", async () => {
        const dir = await mkdtemp(join(tmpdir(), "cmtx-adapt-missing-mode-"));
        const inputFile = join(dir, "article.md");

        await writeFile(inputFile, "## Section\n", "utf-8");

        const originalExitCode = process.exitCode;
        process.exitCode = undefined;

        await adaptHandler({
            input: inputFile,
            dryRun: true,
            verbose: false,
        } as never);

        expect(process.exitCode).toBe(1);
        process.exitCode = originalExitCode;

        await rm(dir, { recursive: true, force: true });
    });
});
