import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { batchUploadImages, type BatchUploadConfig } from "../src/upload/batch-upload.js";
import type { IStorageAdapter } from "@cmtx/storage";

const TEST_DIR = resolve(process.cwd(), ".test-batch-upload");

function createMockAdapter(): IStorageAdapter {
    return {
        upload: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.png" }),
        exists: vi.fn().mockResolvedValue(false),
        buildUrl: vi.fn().mockReturnValue("https://cdn.example.com/test.png"),
    } as unknown as IStorageAdapter;
}

function makeConfig(overrides?: Partial<BatchUploadConfig>): BatchUploadConfig {
    return {
        adapter: createMockAdapter(),
        namingTemplate: "{name}.{ext}",
        prefix: "images",
        ...overrides,
    };
}

describe("batchUploadImages", () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    it("相同 absPath 应去重只传一次", async () => {
        const imgPath = join(TEST_DIR, "img.png");
        await writeFile(imgPath, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const adapter = createMockAdapter();
        const config = makeConfig({ adapter });
        const sources = [
            { kind: "file" as const, absPath: imgPath },
            { kind: "file" as const, absPath: imgPath },
        ];

        const result = await batchUploadImages(sources, config);

        expect(result.uploaded).toHaveLength(1);
        expect(adapter.upload).toHaveBeenCalledTimes(1);
    });

    it("不同文件应各自上传", async () => {
        const img1 = join(TEST_DIR, "a.png");
        const img2 = join(TEST_DIR, "b.png");
        await writeFile(img1, Buffer.from([137, 80, 78, 71]));
        await writeFile(img2, Buffer.from([137, 80, 78, 72]));
        const adapter = createMockAdapter();
        const config = makeConfig({ adapter });

        const result = await batchUploadImages(
            [
                { kind: "file" as const, absPath: img1 },
                { kind: "file" as const, absPath: img2 },
            ],
            config,
        );

        expect(result.uploaded).toHaveLength(2);
        expect(adapter.upload).toHaveBeenCalledTimes(2);
    });

    it("远程已存在且策略 skip-all 应跳过", async () => {
        const imgPath = join(TEST_DIR, "skip.png");
        await writeFile(imgPath, Buffer.from([137, 80, 78, 71]));
        const adapter = createMockAdapter();
        vi.mocked(adapter.exists!).mockResolvedValue(true);
        const config = makeConfig({ adapter, conflictStrategy: { type: "skip-all" } });

        const result = await batchUploadImages(
            [{ kind: "file" as const, absPath: imgPath }],
            config,
        );

        expect(result.uploaded).toHaveLength(0);
        expect(result.skipped).toHaveLength(1);
        expect(adapter.upload).not.toHaveBeenCalled();
    });

    it("远程已存在且策略 replace-all 应覆盖上传", async () => {
        const imgPath = join(TEST_DIR, "replace.png");
        await writeFile(imgPath, Buffer.from([137, 80, 78, 71]));
        const adapter = createMockAdapter();
        vi.mocked(adapter.exists!).mockResolvedValue(true);
        const config = makeConfig({ adapter, conflictStrategy: { type: "replace-all" } });

        const result = await batchUploadImages(
            [{ kind: "file" as const, absPath: imgPath }],
            config,
        );

        expect(result.uploaded).toHaveLength(1);
        expect(result.uploaded[0].action).toBe("replaced");
        expect(adapter.upload).toHaveBeenCalledTimes(1);
    });

    it("lookup 应按 source 返回正确结果", async () => {
        const img1 = join(TEST_DIR, "l1.png");
        const img2 = join(TEST_DIR, "l2.png");
        await writeFile(img1, "data1");
        await writeFile(img2, "data2");
        const config = makeConfig();

        const result = await batchUploadImages(
            [
                { kind: "file" as const, absPath: img1 },
                { kind: "file" as const, absPath: img2 },
            ],
            config,
        );

        expect(result.lookup({ kind: "file", absPath: img1 })).toBeDefined();
        expect(result.lookup({ kind: "file", absPath: img2 })).toBeDefined();
        expect(result.lookup({ kind: "file", absPath: "/nonexistent" })).toBeUndefined();
    });

    it("全部上传失败应返回空结果", async () => {
        const imgPath = join(TEST_DIR, "fail.png");
        await writeFile(imgPath, "data");
        const adapter = createMockAdapter();
        vi.mocked(adapter.upload).mockRejectedValue(new Error("network error"));
        const config = makeConfig({ adapter });

        const result = await batchUploadImages(
            [{ kind: "file" as const, absPath: imgPath }],
            config,
        );

        expect(result.uploaded).toHaveLength(0);
        expect(result.failed).toHaveLength(1);
    });
});
