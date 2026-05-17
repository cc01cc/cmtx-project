import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { handler as addHandler } from "../src/commands/section-numbers/add.js";
import { handler as removeHandler } from "../src/commands/section-numbers/remove.js";

const SAMPLE_MD = [
    "# Title",
    "",
    "## Introduction",
    "",
    "Some text here.",
    "",
    "### Background",
    "",
    "More details.",
    "",
    "## Methods",
    "",
    "### Data Collection",
    "",
    "### Analysis",
    "",
    "## Conclusion",
    "",
].join("\n");

describe("section-numbers add command", () => {
    it("adds section numbers to headings", async () => {
        const testDir = await mkdtemp(join(tmpdir(), "cmtx-cli-sn-"));
        const filePath = join(testDir, "article.md");
        await writeFile(filePath, SAMPLE_MD, "utf-8");

        await addHandler({
            filePath,
            minLevel: 2,
            maxLevel: 6,
            startLevel: 2,
            separator: ".",
            inPlace: true,
            dryRun: false,
            verbose: false,
        });

        const output = await readFile(filePath, "utf-8");

        expect(output).toContain("## 1. Introduction");
        expect(output).toContain("### 1.1. Background");
        expect(output).toContain("## 2. Methods");
        expect(output).toContain("### 2.1. Data Collection");
        expect(output).toContain("### 2.2. Analysis");
        expect(output).toContain("## 3. Conclusion");
        expect(output).not.toContain("# 1. Title");

        await rm(testDir, { recursive: true, force: true });
    });

    it("writes to output file without modifying original", async () => {
        const testDir = await mkdtemp(join(tmpdir(), "cmtx-cli-sn-"));
        const filePath = join(testDir, "article.md");
        const outputPath = join(testDir, "numbered.md");
        await writeFile(filePath, SAMPLE_MD, "utf-8");

        await addHandler({
            filePath,
            minLevel: 2,
            maxLevel: 6,
            startLevel: 2,
            separator: ".",
            outputPath: outputPath,
            dryRun: false,
            verbose: false,
        });

        const original = await readFile(filePath, "utf-8");
        const output = await readFile(outputPath, "utf-8");

        expect(original).toBe(SAMPLE_MD);
        expect(output).toContain("## 1. Introduction");

        await rm(testDir, { recursive: true, force: true });
    });

    it("uses custom separator", async () => {
        const testDir = await mkdtemp(join(tmpdir(), "cmtx-cli-sn-"));
        const filePath = join(testDir, "article.md");
        await writeFile(filePath, SAMPLE_MD, "utf-8");

        await addHandler({
            filePath,
            minLevel: 2,
            maxLevel: 6,
            startLevel: 2,
            separator: "-",
            inPlace: true,
            dryRun: false,
            verbose: false,
        });

        const output = await readFile(filePath, "utf-8");

        expect(output).toContain("## 1- Introduction");
        expect(output).toContain("### 1-1- Background");

        await rm(testDir, { recursive: true, force: true });
    });
});

describe("section-numbers remove command", () => {
    it("removes section numbers from headings", async () => {
        const testDir = await mkdtemp(join(tmpdir(), "cmtx-cli-sn-"));
        const filePath = join(testDir, "article.md");
        const numbered = [
            "# Title",
            "",
            "## 1. Introduction",
            "",
            "### 1.1. Background",
            "",
            "## 2. Methods",
            "",
            "### 2.1. Data Collection",
            "",
            "## 3. Conclusion",
            "",
        ].join("\n");
        await writeFile(filePath, numbered, "utf-8");

        await removeHandler({
            filePath,
            inPlace: true,
            dryRun: false,
            verbose: false,
        });

        const output = await readFile(filePath, "utf-8");

        expect(output).toContain("## Introduction");
        expect(output).toContain("### Background");
        expect(output).toContain("## Methods");
        expect(output).toContain("### Data Collection");
        expect(output).toContain("## Conclusion");
        expect(output).not.toContain("1.");

        await rm(testDir, { recursive: true, force: true });
    });
});

describe("section-numbers config file loading", () => {
    const CONFIG_CONTENT = [
        'version: "1"',
        "rules:",
        "  add-section-numbers:",
        "    minLevel: 3",
        "    maxLevel: 5",
        "    startLevel: 3",
        '    separator: "-"',
        "  remove-section-numbers:",
        "    minLevel: 2",
        "    maxLevel: 4",
    ].join("\n");

    it("add: reads config from --config path", async () => {
        const testDir = await mkdtemp(join(tmpdir(), "cmtx-cli-sn-config-"));
        const filePath = join(testDir, "article.md");
        const configPath = join(testDir, "cmtx.config.yaml");
        await writeFile(filePath, SAMPLE_MD, "utf-8");
        await writeFile(configPath, CONFIG_CONTENT, "utf-8");

        await addHandler({
            filePath,
            config: configPath,
            inPlace: true,
            dryRun: false,
            verbose: false,
        });

        const output = await readFile(filePath, "utf-8");

        // minLevel=3 means only ### headings get numbered
        expect(output).toContain("### 1- Background");
        expect(output).toContain("### 2- Data Collection");
        expect(output).toContain("### 3- Analysis");
        // ## headings should NOT be numbered (below minLevel=3)
        expect(output).not.toContain("## 1- Introduction");

        await rm(testDir, { recursive: true, force: true });
    });

    it("add: CLI params override config file values", async () => {
        const testDir = await mkdtemp(join(tmpdir(), "cmtx-cli-sn-override-"));
        const filePath = join(testDir, "article.md");
        const configPath = join(testDir, "cmtx.config.yaml");
        await writeFile(filePath, SAMPLE_MD, "utf-8");
        await writeFile(configPath, CONFIG_CONTENT, "utf-8");

        // Config says separator="-", but CLI overrides to "_"
        await addHandler({
            filePath,
            config: configPath,
            separator: "_",
            inPlace: true,
            dryRun: false,
            verbose: false,
        });

        const output = await readFile(filePath, "utf-8");

        // Should use CLI separator "_", not config separator "-"
        expect(output).toContain("### 1_ Background");

        await rm(testDir, { recursive: true, force: true });
    });

    it("add: graceful fallback when config file not found", async () => {
        const testDir = await mkdtemp(join(tmpdir(), "cmtx-cli-sn-nocfg-"));
        const filePath = join(testDir, "article.md");
        await writeFile(filePath, SAMPLE_MD, "utf-8");

        // No config file, should fallback to defaults
        await addHandler({
            filePath,
            minLevel: 2,
            maxLevel: 6,
            startLevel: 2,
            separator: ".",
            inPlace: true,
            dryRun: false,
            verbose: false,
        });

        const output = await readFile(filePath, "utf-8");

        expect(output).toContain("## 1. Introduction");
        expect(output).toContain("### 1.1. Background");

        await rm(testDir, { recursive: true, force: true });
    });

    it("remove: reads config from --config path", async () => {
        const testDir = await mkdtemp(join(tmpdir(), "cmtx-cli-sn-rmconfig-"));
        const filePath = join(testDir, "article.md");
        const configPath = join(testDir, "cmtx.config.yaml");
        const numbered = [
            "# Title",
            "",
            "## 1. Introduction",
            "",
            "### 1.1. Background",
            "",
            "## 2. Methods",
            "",
            "### 2.1. Data Collection",
            "",
            "## 3. Conclusion",
            "",
        ].join("\n");
        await writeFile(filePath, numbered, "utf-8");
        await writeFile(configPath, CONFIG_CONTENT, "utf-8");

        await removeHandler({
            filePath,
            config: configPath,
            inPlace: true,
            dryRun: false,
            verbose: false,
        });

        const output = await readFile(filePath, "utf-8");

        // Config says minLevel=2, maxLevel=4
        // ## headings (level 2) should be cleaned
        expect(output).toContain("## Introduction");
        expect(output).toContain("## Methods");
        expect(output).toContain("## Conclusion");
        // ### headings (level 3) should also be cleaned (within range)
        expect(output).toContain("### Background");
        expect(output).toContain("### Data Collection");

        await rm(testDir, { recursive: true, force: true });
    });

    it("remove: CLI params override config file values", async () => {
        const testDir = await mkdtemp(join(tmpdir(), "cmtx-cli-sn-rmoverride-"));
        const filePath = join(testDir, "article.md");
        const configPath = join(testDir, "cmtx.config.yaml");
        const numbered = [
            "# Title",
            "",
            "## 1. Introduction",
            "",
            "### 1.1. Background",
            "",
            "## 2. Methods",
            "",
            "### 2.1. Data Collection",
            "",
            "## 3. Conclusion",
            "",
        ].join("\n");
        await writeFile(filePath, numbered, "utf-8");
        await writeFile(configPath, CONFIG_CONTENT, "utf-8");

        // Config says minLevel=2, but CLI overrides to minLevel=3
        await removeHandler({
            filePath,
            config: configPath,
            minLevel: 3,
            inPlace: true,
            dryRun: false,
            verbose: false,
        });

        const output = await readFile(filePath, "utf-8");

        // ## headings (level 2) should保留编号 (below minLevel=3)
        expect(output).toContain("## 1. Introduction");
        expect(output).toContain("## 2. Methods");
        // ### headings (level 3) should be cleaned
        expect(output).toContain("### Background");
        expect(output).toContain("### Data Collection");

        await rm(testDir, { recursive: true, force: true });
    });
});
