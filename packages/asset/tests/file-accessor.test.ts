import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FsFileAccessor } from "../src/file/file-accessor.js";

const TEST_DIR = resolve(process.cwd(), ".test-file-accessor");

describe("FsFileAccessor", () => {
    let accessor: FsFileAccessor;

    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
        accessor = new FsFileAccessor();
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    it("readText 应读取文件内容", async () => {
        const filePath = join(TEST_DIR, "test.txt");
        await writeFile(filePath, "hello world", "utf-8");

        const content = await accessor.readText(filePath);
        expect(content).toBe("hello world");
    });

    it("writeText 应写入文件内容", async () => {
        const filePath = join(TEST_DIR, "output.txt");
        await accessor.writeText(filePath, "test content");

        const content = await readFile(filePath, "utf-8");
        expect(content).toBe("test content");
    });

    it("writeText 应自动创建目录", async () => {
        const filePath = join(TEST_DIR, "sub", "nested", "output.txt");
        await accessor.writeText(filePath, "nested content");

        const content = await readFile(filePath, "utf-8");
        expect(content).toBe("nested content");
    });

    it("readText 对不存在的文件应抛错", async () => {
        await expect(accessor.readText("/nonexistent/path.txt")).rejects.toThrow();
    });
});
