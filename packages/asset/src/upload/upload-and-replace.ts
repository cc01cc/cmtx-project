import type { ImageMatch, ReplaceOptions } from "@cmtx/core";
import { type FileAccessor, FileService, FsFileAccessor } from "../file/index.js";
import { type BatchUploadConfig, batchUploadImages } from "./batch-upload.js";
import { matchesToSources } from "./matches-to-sources.js";

export interface ImageRef {
    match: ImageMatch;
    absPath: string;
    mdFile: string;
}

export interface UploadReplaceResult {
    uploaded: number;
    skipped: number;
    failed: number;
    updatedFiles: string[];
}

function getFileAccessor(accessor?: FileAccessor): FileAccessor {
    return accessor ?? new FsFileAccessor();
}

/**
 * 单文件：上传所有图片并替换文件中的引用。
 *
 * @param filePath - Markdown 文件路径
 * @param matches - 来自 filterImagesFromFile 的 ImageMatch[]（仅 local 类型）
 * @param baseDir - 解析相对路径的基础目录
 * @param config - 上传配置
 * @param accessor - 可选文件访问器（默认 FsFileAccessor）
 */
export async function uploadAndReplaceFile(
    filePath: string,
    matches: ImageMatch[],
    baseDir: string,
    config: BatchUploadConfig,
    accessor?: FileAccessor,
): Promise<UploadReplaceResult> {
    const sources = matchesToSources(matches, baseDir);

    // 保存 absPath → match 映射
    const matchByAbsPath = new Map<string, ImageMatch>();
    for (let i = 0; i < matches.length; i++) {
        const source = sources[i];
        if (source.kind === "file") {
            matchByAbsPath.set(source.absPath, matches[i]);
        }
    }

    const result = await batchUploadImages(sources, config);

    // 构建 ReplaceOptions
    const replaceOptions: ReplaceOptions[] = [];
    for (const source of sources) {
        if (source.kind !== "file") continue;
        const match = matchByAbsPath.get(source.absPath);
        if (!match) continue;
        const uploadResult = result.lookup(source);
        if (!uploadResult || uploadResult.action === "skipped") continue;
        replaceOptions.push({
            field: "raw",
            pattern: match.raw,
            newSrc: uploadResult.cloudUrl,
        });
    }

    const updatedFiles: string[] = [];
    if (replaceOptions.length > 0) {
        const fileService = new FileService(getFileAccessor(accessor));
        await fileService.replaceImagesInFile(filePath, replaceOptions);
        updatedFiles.push(filePath);
    }

    return {
        uploaded: result.uploaded.length,
        skipped: result.skipped.length,
        failed: result.failed.length,
        updatedFiles,
    };
}

/**
 * 目录批量：上传所有图片并按文件分组写回。
 *
 * @param refs - ImageRef[] 数组，每个元素包含 match、图片绝对路径和引用它的 md 文件路径
 * @param config - 上传配置
 * @param accessor - 可选文件访问器（默认 FsFileAccessor）
 */
export async function uploadAndReplaceBatch(
    refs: ImageRef[],
    config: BatchUploadConfig,
    accessor?: FileAccessor,
): Promise<UploadReplaceResult> {
    const sources = refs.map((r) => ({ kind: "file" as const, absPath: r.absPath }));
    const result = await batchUploadImages(sources, config);

    // 按 md 文件分组构建 ReplaceOptions
    const replaceByFile = new Map<string, ReplaceOptions[]>();
    for (const ref of refs) {
        const uploadResult = result.lookup({ kind: "file", absPath: ref.absPath });
        if (!uploadResult || uploadResult.action === "skipped") continue;
        if (!replaceByFile.has(ref.mdFile)) {
            replaceByFile.set(ref.mdFile, []);
        }
        replaceByFile.get(ref.mdFile)!.push({
            field: "raw",
            pattern: ref.match.raw,
            newSrc: uploadResult.cloudUrl,
        });
    }

    // 逐文件写回
    const fileService = new FileService(getFileAccessor(accessor));
    for (const mdFile of replaceByFile.keys()) {
        await fileService.replaceImagesInFile(mdFile, replaceByFile.get(mdFile)!);
    }

    return {
        uploaded: result.uploaded.length,
        skipped: result.skipped.length,
        failed: result.failed.length,
        updatedFiles: [...replaceByFile.keys()],
    };
}
