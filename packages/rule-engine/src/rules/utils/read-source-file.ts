import { readFile } from "node:fs/promises";

export async function readSourceFile(filePath: string): Promise<string> {
    try {
        return await readFile(filePath, "utf-8");
    } catch {
        return "";
    }
}
