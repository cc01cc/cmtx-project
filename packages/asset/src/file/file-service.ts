/**
 * FileService - 文件操作服务
 *
 * @module file/file-service
 * @description
 * 提供文件级别的图片处理功能，包括：
 * - 图片筛选（从 core 迁移）
 * - 图片替换（从 core 迁移）
 * - 图片删除（从 core 迁移）
 * - 文件适配、渲染、校验（从 publish 迁移）
 * - 通用文件操作
 *
 * @remarks
 * ## 设计原则
 *
 * - **依赖单向**: FileService 依赖 @cmtx/core 进行纯文本处理
 * - **无循环依赖**: @cmtx/core 不依赖 @cmtx/asset
 * - **职责清晰**: 文件操作在此，文本处理在 core
 *
 * ## 实现方式
 *
 * 所有文件操作遵循相同模式：
 * 1. 读取文件内容
 * 2. 调用 @cmtx/core 的纯文本处理函数
 * 3. 如有修改，写回文件
 */

import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
// 从 core 导入类型
import type { DeleteFileOptions, DeleteFileResult } from "../delete/types.js";
import type { FileReplaceResult, DirectoryReplaceResult } from "./types.js";

// 从 core 导入纯文本处理函数
import {
    filterImagesInText,
    type ImageFilterOptions,
    type ImageMatch,
    type ReplaceOptions,
    type ReplaceResult,
    replaceImagesInText,
} from "@cmtx/core";
import { glob } from "tinyglobby";
import trash from "trash";
import { type FileAccessor, FsFileAccessor } from "./file-accessor.js";

import type {
    AnalyzeOptions,
    DirectoryAnalysis,
    DirectoryScanOptions,
    FileInfo,
    FileImageMatch,
    FileServiceConfig,
    IFileService,
    LocalFileImageMatch,
    LocalImageEntry,
    WebFileImageMatch,
    WebImageEntry,
} from "./types.js";

/**
 * 文件操作服务实现
 *
 * @example
 * ```typescript
 * import { FileService } from '@cmtx/asset/file';
 *
 * const service = new FileService();
 *
 * // 从文件筛选图片
 * const images = await service.filterImagesFromFile('/path/to/file.md');
 *
 * // 替换文件中的图片
 * const result = await service.replaceImagesInFile('/path/to/file.md', [
 *   { field: 'src', pattern: './old.png', newSrc: './new.png' }
 * ]);
 *
 * // 删除本地图片
 * const deleteResult = await service.deleteLocalImage('/path/to/image.png', {
 *   strategy: 'trash'
 * });
 * ```
 */
export class FileService implements IFileService {
    private accessor: FileAccessor;

    constructor(accessor?: FileAccessor) {
        this.accessor = accessor ?? new FsFileAccessor();
    }
    // ==================== 图片筛选（从 core 迁移）====================

    /**
     * 从文件中筛选图片
     *
     * @param fileAbsPath - 文件绝对路径
     * @param options - 筛选选项
     * @returns 匹配到的图片列表
     */
    async filterImagesFromFile(
        fileAbsPath: string,
        options?: ImageFilterOptions,
    ): Promise<FileImageMatch[]> {
        const content = await this.accessor.readText(fileAbsPath);
        const images = filterImagesInText(content, options);
        const fileDir = dirname(fileAbsPath);

        return images.map((img: ImageMatch) => {
            if (img.type === "local") {
                const absPath = isAbsolute(img.src) ? resolve(img.src) : resolve(fileDir, img.src);
                const match: LocalFileImageMatch = {
                    type: "local",
                    match: img,
                    filePath: fileAbsPath,
                    absPath,
                };
                return match;
            }
            return {
                type: "web" as const,
                match: img,
                filePath: fileAbsPath,
            };
        });
    }

    /**
     * 从目录中批量筛选图片
     *
     * @param dirAbsPath - 目录绝对路径
     * @param options - 筛选选项
     * @param scanOptions - 目录扫描选项
     * @returns 所有匹配到的图片列表
     */
    async filterImagesFromDirectory(
        dirAbsPath: string,
        options?: ImageFilterOptions,
        scanOptions?: DirectoryScanOptions,
    ): Promise<FileImageMatch[]> {
        const files = await this.scanDirectory(dirAbsPath, scanOptions);
        const allMatches: FileImageMatch[] = [];

        for (const filePath of files) {
            const matches = await this.filterImagesFromFile(filePath, options);
            allMatches.push(...matches);
        }

        return allMatches;
    }

    /**
     * 分析目录下的所有图片
     *
     * 两路数据源合并：
     *   流程 A: 扫描 md 文件提取引用图片
     *   流程 B: 扫描目录下图片文件
     *   合并: md 引用的图片 → referencedBy 有值；仅文件扫描发现的 → orphan = true
     *
     * @param dirAbsPath - 目录绝对路径
     * @param options - 分析选项
     */
    async analyzeDirectory(
        dirAbsPath: string,
        options?: AnalyzeOptions,
    ): Promise<DirectoryAnalysis> {
        const fileMatches = await this.filterImagesFromDirectory(dirAbsPath);
        const mdFiles = new Set<string>();

        const imageMap = new Map<string, LocalImageEntry | WebImageEntry>();
        const referencedAbsPaths = new Set<string>();

        for (const fmatch of fileMatches) {
            mdFiles.add(fmatch.filePath);
            const src = fmatch.match.src;

            if (imageMap.has(src)) {
                imageMap.get(src)!.referencedBy.push(fmatch.filePath);
                continue;
            }

            if (fmatch.type === "local") {
                let fileSize = 0;
                try {
                    const st = await stat(fmatch.absPath);
                    fileSize = st.size;
                } catch {
                    // file not found, keep 0
                }
                referencedAbsPaths.add(fmatch.absPath);
                imageMap.set(src, {
                    type: "local",
                    src,
                    absPath: fmatch.absPath,
                    fileSize,
                    referencedBy: [fmatch.filePath],
                    orphan: false,
                });
            } else {
                imageMap.set(src, {
                    type: "web",
                    src,
                    referencedBy: [fmatch.filePath],
                });
            }
        }

        const extensions = options?.extensions ?? ["png", "jpg", "jpeg", "gif", "svg", "webp"];
        const pattern =
            extensions.length === 1 ? `**/*.${extensions[0]}` : `**/*.{${extensions.join(",")}}`;
        const imageFiles = await glob(pattern, {
            cwd: dirAbsPath,
            ignore: ["node_modules/**"],
            absolute: true,
        });

        for (const absPath of imageFiles) {
            if (referencedAbsPaths.has(absPath)) {
                continue;
            }
            let fileSize = 0;
            try {
                const st = await stat(absPath);
                if (options?.maxSize && st.size > options.maxSize) {
                    continue;
                }
                fileSize = st.size;
            } catch {
                continue;
            }
            imageMap.set(absPath, {
                type: "local",
                src: absPath,
                absPath,
                fileSize,
                referencedBy: [],
                orphan: true,
            });
        }

        const images = [...imageMap.values()];
        const totalSize = images.reduce(
            (sum, img) => sum + (img.type === "local" ? img.fileSize : 0),
            0,
        );
        const referenced =
            images.filter((i) => i.type === "local" && !i.orphan).length +
            images.filter((i) => i.type === "web").length;
        const orphan = images.filter((i) => i.type === "local" && i.orphan).length;

        return {
            images,
            summary: {
                referenced,
                orphan,
                totalSize,
                mdFiles: mdFiles.size,
            },
        };
    }

    // ==================== 图片替换（从 core 迁移）====================

    /**
     * 在文件中替换图片
     *
     * @param fileAbsPath - 文件绝对路径
     * @param replaceOptions - 替换选项列表
     * @returns 文件替换结果
     */
    async replaceImagesInFile(
        fileAbsPath: string,
        replaceOptions: ReplaceOptions[],
    ): Promise<FileReplaceResult> {
        const content = await this.accessor.readText(fileAbsPath);
        const result: ReplaceResult = replaceImagesInText(content, replaceOptions);

        if (result.replacements.length > 0) {
            await this.accessor.writeText(fileAbsPath, result.newText);
        }

        return {
            relativePath: fileAbsPath,
            absolutePath: resolve(fileAbsPath),
            success: true,
            result,
        };
    }

    /**
     * 在目录中批量替换图片
     *
     * @param dirAbsPath - 目录绝对路径
     * @param replaceOptions - 替换选项列表
     * @param scanOptions - 目录扫描选项
     * @returns 目录替换结果
     */
    async replaceImagesInDirectory(
        dirAbsPath: string,
        replaceOptions: ReplaceOptions[],
        scanOptions?: DirectoryScanOptions,
    ): Promise<DirectoryReplaceResult> {
        const files = await this.scanDirectory(dirAbsPath, scanOptions);
        const fileResults: FileReplaceResult[] = [];
        let totalReplacements = 0;
        let successfulFiles = 0;
        let failedFiles = 0;

        for (const filePath of files) {
            try {
                const result = await this.replaceImagesInFile(filePath, replaceOptions);
                fileResults.push(result);
                successfulFiles++;
                totalReplacements += result.result?.replacements.length ?? 0;
            } catch (error) {
                failedFiles++;
                fileResults.push({
                    relativePath: filePath,
                    absolutePath: resolve(filePath),
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return {
            totalFiles: files.length,
            successfulFiles,
            failedFiles,
            totalReplacements,
            results: fileResults,
        };
    }

    // ==================== 图片删除（从 core 迁移）====================

    /**
     * 执行单次删除操作
     */
    private async executeDelete(
        filePath: string,
        strategy: DeleteFileOptions["strategy"],
        trashDir?: string,
    ): Promise<void> {
        switch (strategy) {
            case "trash": {
                await trash([filePath]);
                break;
            }
            case "move":
                await this.deleteByMove(filePath, trashDir);
                break;
            default:
                await unlink(filePath);
        }
    }

    /**
     * 带重试的删除操作
     */
    private async deleteWithRetry(
        filePath: string,
        strategy: DeleteFileOptions["strategy"],
        trashDir: string | undefined,
        maxRetries: number,
        baseDelayMs: number,
    ): Promise<{ success: boolean; error?: string }> {
        let retries = 0;
        let lastError: Error | undefined;

        while (retries <= maxRetries) {
            try {
                if (retries > 0) {
                    await this.delay(baseDelayMs * 2 ** (retries - 1));
                }
                await this.executeDelete(filePath, strategy, trashDir);
                return { success: true };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                retries++;
            }
        }

        return { success: false, error: lastError?.message ?? "Unknown error" };
    }

    /**
     * 删除本地图片
     *
     * @param filePath - 图片绝对路径
     * @param options - 删除选项
     * @returns 删除结果
     */
    async deleteLocalImage(
        filePath: string,
        options: DeleteFileOptions,
    ): Promise<DeleteFileResult> {
        const { strategy, trashDir, maxRetries = 3, baseDelayMs = 100 } = options;

        const result = await this.deleteWithRetry(
            filePath,
            strategy,
            trashDir,
            maxRetries,
            baseDelayMs,
        );

        if (result.success) {
            return { status: "success", retries: 0 };
        }

        // trash 失败时降级为 move
        if (strategy === "trash") {
            const fallback = await this.deleteByMove(filePath, trashDir);
            if (fallback.status === "success") {
                return fallback;
            }
        }

        return {
            status: "failed",
            retries: maxRetries,
            error: result.error,
        };
    }

    /**
     * 安全删除本地图片（先检查引用再删除）
     *
     * @param imgAbsPath - 图片绝对路径
     * @param rootAbsPath - 根目录绝对路径（用于检查引用）
     * @param options - 删除选项
     * @returns 删除结果
     */
    async deleteLocalImageSafely(
        imgAbsPath: string,
        rootAbsPath: string,
        options: DeleteFileOptions,
    ): Promise<DeleteFileResult> {
        // 检查图片是否在根目录的其他文件中被引用
        const files = await this.scanDirectory(rootAbsPath, {
            patterns: ["**/*.md"],
        });

        for (const file of files) {
            const content = await this.accessor.readText(file);
            const images = filterImagesInText(content);

            const isReferenced = images.some((img: ImageMatch) => {
                if (img.type !== "local") {
                    return false;
                }
                // 将相对路径解析为绝对路径进行比较
                const fileDir = dirname(file);
                const resolvedPath = resolve(fileDir, img.src);
                return resolvedPath === imgAbsPath;
            });

            if (isReferenced) {
                return { status: "skipped", retries: 0 };
            }
        }

        // 没有引用，执行删除
        return this.deleteLocalImage(imgAbsPath, options);
    }

    /**
     * 通过移动到指定目录来删除文件
     *
     * @internal
     */
    private async deleteByMove(filePath: string, trashDir?: string): Promise<DeleteFileResult> {
        const targetDir = trashDir ?? resolve(dirname(filePath), ".trash");
        await mkdir(targetDir, { recursive: true });

        const fileName = filePath.split("/").pop() ?? "unknown";
        const targetPath = resolve(targetDir, fileName);

        const content = await readFile(filePath);
        await writeFile(targetPath, content);
        await unlink(filePath);

        return { status: "success", retries: 0, actualStrategy: "move" };
    }

    /**
     * 延迟函数
     *
     * @internal
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ==================== 通用文件操作 ====================

    /**
     * 读取文件内容
     *
     * @param filePath - 文件绝对路径
     * @returns 文件内容
     */
    async readFileContent(filePath: string): Promise<string> {
        return this.accessor.readText(filePath);
    }

    /**
     * 写入文件内容
     *
     * @param filePath - 文件绝对路径
     * @param content - 文件内容
     */
    async writeFileContent(filePath: string, content: string): Promise<void> {
        await this.accessor.writeText(filePath, content);
    }

    /**
     * 获取文件信息
     *
     * @param filePath - 文件绝对路径
     * @returns 文件信息
     */
    async getFileInfo(filePath: string): Promise<FileInfo> {
        const stats = await stat(filePath);
        return {
            size: stats.size,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
        };
    }

    /**
     * 扫描目录获取文件列表
     *
     * @param dirAbsPath - 目录绝对路径
     * @param options - 扫描选项
     * @returns 文件路径列表（绝对路径）
     */
    async scanDirectory(dirAbsPath: string, options?: DirectoryScanOptions): Promise<string[]> {
        const patterns = options?.patterns ?? ["**/*.md"];
        const ignore = options?.ignore ?? ["node_modules/**"];

        return glob(patterns, {
            cwd: dirAbsPath,
            ignore,
            absolute: true,
        });
    }
}

/**
 * 创建 FileService 实例
 *
 * @returns FileService 实例
 *
 * @example
 * ```typescript
 * import { createFileService } from '@cmtx/asset/file';
 *
 * const fileService = createFileService();
 * ```
 */
export function createFileService(
    config?: FileServiceConfig & { accessor?: FileAccessor },
): FileService {
    return new FileService(config?.accessor);
}
