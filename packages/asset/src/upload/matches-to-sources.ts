import { isAbsolute, resolve } from "node:path";
import type { ImageMatch } from "@cmtx/core";
import { isWebSource } from "@cmtx/core";
import type { UploadSource } from "./strategies.js";

/**
 * 将 ImageMatch[] 从 markdown 解析结果转换为可供 batchUploadImages 使用的 UploadSource[]。
 * 纯函数，不包含文件 I/O。
 */
export function matchesToSources(matches: ImageMatch[], baseDir: string): UploadSource[] {
    const sources: UploadSource[] = [];

    for (const match of matches) {
        if (match.src.startsWith("data:image/")) {
            const dataUriRegex = /data:image\/([^;]+);base64,(.+)/;
            const base64Match = dataUriRegex.exec(match.src);
            if (base64Match) {
                sources.push({
                    kind: "buffer",
                    buffer: Buffer.from(base64Match[2], "base64"),
                    ext: `.${base64Match[1]}`,
                });
            }
            continue;
        }

        if (isWebSource(match.src)) {
            continue;
        }

        const absPath = isAbsolute(match.src) ? resolve(match.src) : resolve(baseDir, match.src);

        sources.push({ kind: "file", absPath });
    }

    return sources;
}
