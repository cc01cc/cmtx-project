import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileService } from "@cmtx/asset/file";
import { FsFileAccessor } from "@cmtx/asset/file";
import { batchUploadImages, matchesToSources } from "@cmtx/asset/upload";

vi.mock("vscode", () => ({
    workspace: {
        getWorkspaceFolder: vi.fn().mockReturnValue({ uri: { fsPath: "/test" } }),
        textDocuments: [],
    },
    window: {
        showInformationMessage: vi.fn(),
        showErrorMessage: vi.fn(),
        showWarningMessage: vi.fn(),
        withProgress: vi
            .fn()
            .mockImplementation((_opts, fn) =>
                fn({ report: vi.fn() }, { isCancellationRequested: false }),
            ),
    },
    ProgressLocation: { Notification: 15 },
}));

const TEST_DIR = resolve(process.cwd(), ".test-explorer-upload");

describe("upload-from-explorer logic", () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    it("上传后应通过 replaceImagesInFile 写回", async () => {
        const mdFile = join(TEST_DIR, "doc.md");
        const imgFile = join(TEST_DIR, "img.png");
        await writeFile(imgFile, "fake-png-data");
        await writeFile(mdFile, `# Title\n\n![Alt](./img.png)\n`, "utf-8");

        const service = new FileService(new FsFileAccessor());
        const matches = await service.filterImagesFromFile(mdFile);
        const localMatches = matches.filter((m) => m.type === "local");
        const sources = matchesToSources(
            localMatches.map((m) => m.match),
            TEST_DIR,
        );

        const adapter = {
            upload: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/img.png" }),
            exists: vi.fn().mockResolvedValue(false),
            buildUrl: vi.fn().mockReturnValue("https://cdn.example.com/img.png"),
        };

        const result = await batchUploadImages(sources, {
            adapter,
            namingTemplate: "{name}.{ext}",
            prefix: "",
        });

        // 模拟写回
        const replaceOptions: any[] = [];
        for (let i = 0; i < localMatches.length; i++) {
            const source = sources[i];
            if (source.kind !== "file") continue;
            const uploadResult = result.lookup(source);
            if (!uploadResult || uploadResult.action === "skipped") continue;
            replaceOptions.push({
                field: "raw",
                pattern: localMatches[i].match.raw,
                newSrc: uploadResult.cloudUrl,
            });
        }

        expect(replaceOptions).toHaveLength(1);
        expect(replaceOptions[0].field).toBe("raw");
        expect(replaceOptions[0].pattern).toBe("![Alt](./img.png)");
        expect(replaceOptions[0].newSrc).toBe("https://cdn.example.com/img.png");

        // 执行写回
        await service.replaceImagesInFile(mdFile, replaceOptions);
        const updated = await readFile(mdFile, "utf-8");
        expect(updated).toContain("![Alt](https://cdn.example.com/img.png)");
        expect(updated).not.toContain("./img.png");
    });

    it("上传失败时不执行写回", async () => {
        const service = new FileService(new FsFileAccessor());
        const adapter = {
            upload: vi.fn().mockRejectedValue(new Error("upload failed")),
            exists: vi.fn().mockResolvedValue(false),
            buildUrl: vi.fn().mockReturnValue(""),
        };

        const result = await batchUploadImages(
            [{ kind: "file" as const, absPath: "/nonexistent/img.png" }],
            { adapter, namingTemplate: "{name}.{ext}", prefix: "" },
        );

        expect(result.uploaded).toHaveLength(0);
        expect(result.failed).toHaveLength(1);
    });

    it("使用 field: raw 避免误替换", () => {
        const replaceOption = {
            field: "raw" as const,
            pattern: "![Alt](./img.png)",
            newSrc: "https://cdn.example.com/img.png",
        };
        expect(replaceOption.field).toBe("raw");
        expect(replaceOption.pattern).toBe("![Alt](./img.png)");
    });
});
