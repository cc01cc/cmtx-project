import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface FileAccessor {
    readText(path: string): Promise<string>;
    writeText(path: string, content: string): Promise<void>;
}

export class FsFileAccessor implements FileAccessor {
    async readText(path: string): Promise<string> {
        return await readFile(path, "utf-8");
    }

    async writeText(path: string, content: string): Promise<void> {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content, "utf-8");
    }
}
