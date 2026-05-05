import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VSCodeFileAccessor } from "../../../src/infra/vscode-file-accessor.js";

vi.mock("vscode", () => ({
    workspace: {
        textDocuments: [] as any[],
        applyEdit: vi.fn().mockResolvedValue(true),
    },
    WorkspaceEdit: class WorkspaceEdit {
        replace = vi.fn();
    },
    Range: class Range {
        constructor(
            public start: { line: number; character: number },
            public end: { line: number; character: number },
        ) {}
    },
    Position: class Position {
        constructor(
            public line: number,
            public character: number,
        ) {}
    },
}));

const TEST_DIR = resolve(process.cwd(), ".test-vscode-accessor");

describe("VSCodeFileAccessor", () => {
    let accessor: VSCodeFileAccessor;

    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
        accessor = new VSCodeFileAccessor();
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    it("文件不在编辑器中时应读取磁盘内容", async () => {
        const filePath = join(TEST_DIR, "test.md");
        await writeFile(filePath, "disk content", "utf-8");

        const content = await accessor.readText(filePath);
        expect(content).toBe("disk content");
    });

    it("文件在编辑器打开中时应返回编辑器内容", async () => {
        const vscode = await import("vscode");
        const doc = {
            uri: { fsPath: join(TEST_DIR, "open.md") },
            getText: () => "editor content",
        };
        (vscode.workspace.textDocuments as any[]) = [doc];

        const content = await accessor.readText(doc.uri.fsPath);
        expect(content).toBe("editor content");
    });

    it("文件不在编辑器中时应使用 fs.writeFile", async () => {
        const filePath = join(TEST_DIR, "new.txt");
        await accessor.writeText(filePath, "written content");

        const content = await readFile(filePath, "utf-8");
        expect(content).toBe("written content");
    });
});
