import { glob } from "tinyglobby";

/**
 * DeleteService - 图片删除服务
 *
 * @module delete/delete-service
 * @description
 * 提供图片删除功能。**DeleteService 执行两项独立操作**：
 * 1. **删除图片文件** — 将图片移入回收站、移动到指定目录或永久删除
 * 2. **修改 Markdown 文件** — 从所有引用该图片的 `.md` 文件中移除 `![alt](path)` 标记
 *
 * 这两项操作由 `DeleteOptions` 控制，`removeFromMarkdown` 和 `strategy` 各自独立生效。
 *
 * 包含功能：
 * - 跨文档引用检查
 * - 本地文件安全删除
 * - 从 Markdown 文件中移除图片引用
 *
 * @remarks
 * ## 设计原则
 *
 * - **引用检查优先**: 删除前检查所有 Markdown 文件中的引用
 * - **安全删除**: 支持回收站、移动、硬删除三种策略
 * - **引用清理**: 可选择从所有引用文件中移除图片标记
 *
 * ## 使用示例
 *
 * ```typescript
 * import { DeleteService } from '@cmtx/asset/delete';
 *
 * const service = new DeleteService({
 *     workspaceRoot: '/path/to/workspace',
 *     options: {
 *         strategy: 'trash',
 *         removeFromMarkdown: true,
 *     }
 * });
 *
 * // 扫描引用
 * const target = await service.scanReferences('/path/to/image.png');
 *
 * // 执行删除
 * const result = await service.delete(target);
 * ```
 */

import { promises as fs } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { Logger } from "@cmtx/core";
import { isWebSource, parseImages } from "@cmtx/core";
import type { DeleteFileOptions } from "./types.js";
import type { LocalImageEntry } from "../file/types.js";
import { FileService } from "../file/file-service.js";
import type {
    DeleteDetail,
    DeleteOptions,
    DeleteResult,
    DeleteServiceConfig,
    DeleteTarget,
    PruneEntry,
    PruneOptions,
    PruneResult,
    ReferenceInfo,
    SafeDeleteOptions,
    SafeDeleteResult,
} from "./types.js";

/**
 * DeleteService 类
 *
 * @public
 */
export class DeleteService {
    private readonly config: DeleteServiceConfig;
    private readonly fileService: FileService;
    private logger?: Logger;

    constructor(config: DeleteServiceConfig, logger?: Logger) {
        this.config = config;
        this.fileService = new FileService();
        this.logger = logger;
    }

    // ==================== 公开 API ====================

    /**
     * 扫描图片在所有 Markdown 文件中的引用
     *
     * @param imagePath - 图片路径（相对或绝对）
     * @returns 删除目标（包含引用信息）
     */
    async scanReferences(imagePath: string): Promise<DeleteTarget> {
        this.logger?.info(`[DeleteService] Scanning references for: ${imagePath}`);

        const isLocal = !imagePath.startsWith("http");
        const references = await this.findReferencesInWorkspace(imagePath, isLocal);

        return {
            path: imagePath,
            isLocal,
            referencedIn: references,
        };
    }

    /**
     * 执行删除操作
     *
     * 分两阶段执行：
     * 1. 删除图片文件（本地文件按 strategy 策略删除，远程文件需要存储适配器）
     * 2. 当 `options.removeFromMarkdown === true` 时，从所有引用该图片的
     *    Markdown 文件中移除 `![alt](path)` 标记
     *
     * 注意：文件删除失败不影响引用清理，反之亦然。但 `success` 字段要求所有操作成功。
     * `force` 选项不影响 `removeFromMarkdown`，两者独立控制。
     *
     * @param target - 删除目标
     * @returns 删除结果
     */
    async delete(target: DeleteTarget): Promise<DeleteResult> {
        const options = this.config.options ?? {};
        const details: DeleteDetail[] = [];

        this.logger?.info(`[DeleteService] Deleting: ${target.path}`);

        // 1. 删除本地文件或远程文件
        if (target.isLocal) {
            const result = await this.deleteLocalFile(target.path, options);
            details.push(result);
        } else {
            // 远程文件删除需要存储适配器支持
            this.logger?.warn("[DeleteService] Remote file deletion requires storage adapter");
            details.push({
                path: target.path,
                success: false,
                error: "Remote file deletion requires storage adapter implementation",
            });
        }

        // 2. 从 Markdown 文件中移除引用
        let referencesRemovedFrom = 0;
        if (options.removeFromMarkdown) {
            referencesRemovedFrom = await this.removeReferencesFromMarkdown(target, options);
        }

        const success = details.every((d) => d.success);

        return {
            success,
            deletedCount: details.filter((d) => d.success).length,
            referencesRemovedFrom,
            details,
        };
    }

    /**
     * 安全删除图片
     *
     * 组合 scanReferences + delete 为一站式流程：
     * 1. 扫描图片在 Markdown 中的引用
     * 2. 如果图片被引用且非 force 模式，则跳过文件删除
     * 3. 否则执行删除（文件删除 + 可选引用清理由 options 独立控制）
     *
     * removeFromMarkdown 不受 force 影响：即使有引用且非 force 模式，
     * 仍可独立执行引用清理（不删文件）。
     *
     * @param imagePath - 图片路径（相对或绝对）
     * @param options - 安全删除选项
     * @returns 安全删除结果
     *
     * @example
     * ```typescript
     * const service = new DeleteService({
     *     workspaceRoot: '/path/to/workspace',
     * });
     *
     * // 基本用法：有引用时跳过删除
     * const result = await service.safeDelete('./images/photo.png');
     *
     * // 强制删除 + 清理引用
     * const result = await service.safeDelete('./images/photo.png', {
     *     strategy: 'trash',
     *     force: true,
     *     removeFromMarkdown: true,
     * });
     * ```
     */
    async safeDelete(imagePath: string, options?: SafeDeleteOptions): Promise<SafeDeleteResult> {
        this.logger?.info(`[DeleteService] Safe deleting: ${imagePath}`);

        // 1. 扫描引用
        const target = await this.scanReferences(imagePath);

        const hasReferences = target.referencedIn.length > 0;
        const forceMode = !!options?.force;
        const willDelete = !hasReferences || forceMode;

        if (!willDelete) {
            if (options?.removeFromMarkdown) {
                await this.removeReferencesFromMarkdown(target, { force: true });
            }
            return {
                success: false,
                deleted: false,
                detail: {
                    referencedIn: target.referencedIn,
                    hasReferences,
                    forceDeleted: false,
                },
            };
        }

        const originalOptions = this.config.options;
        this.config.options = { ...originalOptions, ...options };
        const deleteResult = await this.delete(target);
        this.config.options = originalOptions;

        return {
            success: deleteResult.success,
            deleted: true,
            deleteResult,
            detail: {
                referencedIn: target.referencedIn,
                hasReferences,
                forceDeleted: forceMode,
            },
        };
    }

    /**
     * 检查图片是否被其他文件引用
     *
     * @param imagePath - 图片路径
     * @param isLocal - 是否为本地图片
     * @returns 引用信息列表
     */
    async findReferencesInWorkspace(imagePath: string, isLocal: boolean): Promise<ReferenceInfo[]> {
        this.logger?.info(`[DeleteService] Finding references in workspace`);

        const workspaceRoot = this.config.workspaceRoot;
        const references: ReferenceInfo[] = [];
        const normalizedPath = isLocal ? this.normalizeLocalPath(imagePath) : imagePath;

        const mdFiles = await this.findMarkdownFiles(workspaceRoot);

        for (const filePath of mdFiles) {
            try {
                const allImages = await this.fileService.filterImagesFromFile(filePath);

                let count = 0;
                for (const img of allImages) {
                    if (img.type === "local" && img.absPath === normalizedPath) {
                        count++;
                    }
                }

                if (count > 0) {
                    references.push({
                        filePath,
                        relativePath: relative(workspaceRoot, filePath),
                        count,
                    });
                }
            } catch (error) {
                this.logger?.warn(`[DeleteService] Failed to read file: ${filePath}`, {
                    error,
                });
            }
        }

        this.logger?.info(
            `[DeleteService] Found ${references.length} files referencing ${imagePath}`,
        );
        return references;
    }

    /**
     * 清理目录下所有未被 Markdown 文件引用的图片
     *
     * 使用 FileService.analyzeDirectory() 识别 orphan 图片，
     * 然后逐个执行 FileService.deleteLocalImage()。
     *
     * @param dirPath - 要清理的目录绝对路径
     * @param options - prune 选项
     * @returns 清理结果
     */
    async pruneDirectory(dirPath: string, options?: PruneOptions): Promise<PruneResult> {
        this.logger?.info(`[DeleteService] Pruning directory: ${dirPath}`);

        const fileService = new FileService();
        const analysis = await fileService.analyzeDirectory(dirPath, {
            extensions: options?.extensions,
            maxSize: options?.maxSize,
        });

        const orphans = analysis.images.filter(
            (img): img is LocalImageEntry => img.type === "local" && img.orphan,
        );

        this.logger?.info(
            `[DeleteService] Found ${orphans.length} orphan images out of ${analysis.images.length} total`,
        );

        const entries: PruneEntry[] = [];
        let deletedCount = 0;
        let failedCount = 0;
        let freedSize = 0;

        for (const orphan of orphans) {
            try {
                const result = await fileService.deleteLocalImage(orphan.absPath, {
                    strategy: options?.strategy ?? "trash",
                    trashDir: options?.trashDir,
                });

                if (result.status === "success") {
                    deletedCount++;
                    freedSize += orphan.fileSize;
                    entries.push({
                        absPath: orphan.absPath,
                        fileSize: orphan.fileSize,
                        status: "deleted",
                        actualStrategy: result.actualStrategy,
                    });
                } else {
                    failedCount++;
                    entries.push({
                        absPath: orphan.absPath,
                        fileSize: orphan.fileSize,
                        status: "failed",
                        error: result.error ?? "Unknown error",
                    });
                }
            } catch (error) {
                failedCount++;
                entries.push({
                    absPath: orphan.absPath,
                    fileSize: orphan.fileSize,
                    status: "failed",
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return {
            totalOrphans: orphans.length,
            deletedCount,
            failedCount,
            skippedCount: orphans.length - deletedCount - failedCount,
            totalSizeBefore: analysis.summary.totalSize,
            freedSize,
            entries,
        };
    }

    // ==================== 私有方法 ====================

    /**
     * 查找所有 Markdown 文件
     */
    private async findMarkdownFiles(rootDir: string): Promise<string[]> {
        const files = await glob(["**/*.md", "**/*.markdown"], {
            cwd: rootDir,
            absolute: true,
            onlyFiles: true,
            ignore: ["**/node_modules/**", "**/.git/**"],
        });
        return files;
    }

    /**
     * 规范化本地路径
     */
    private normalizeLocalPath(imagePath: string): string {
        if (isAbsolute(imagePath)) {
            return resolve(imagePath);
        }
        // 相对路径相对于 workspace root
        return resolve(this.config.workspaceRoot, imagePath);
    }

    /**
     * 删除本地文件
     */
    private async deleteLocalFile(
        imagePath: string,
        options: DeleteOptions,
    ): Promise<DeleteDetail> {
        try {
            const fullPath = this.normalizeLocalPath(imagePath);

            // 检查文件是否存在
            try {
                await fs.stat(fullPath);
            } catch {
                return {
                    path: imagePath,
                    success: false,
                    error: `File not found: ${fullPath}`,
                };
            }

            // 转换为 FileService 所需的选项
            const fileOptions: DeleteFileOptions = {
                strategy: options.strategy ?? "hard-delete",
                trashDir: options.trashDir,
                maxRetries: options.maxRetries ?? 3,
            };

            const result = await this.fileService.deleteLocalImage(fullPath, fileOptions);

            if (result.status === "success") {
                this.logger?.info(`[DeleteService] Deleted: ${fullPath}`);
                return {
                    path: imagePath,
                    success: true,
                    actualStrategy: result.actualStrategy,
                };
            } else {
                return {
                    path: imagePath,
                    success: false,
                    error: result.error ?? "Unknown error",
                };
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger?.error(`[DeleteService] Failed to delete: ${imagePath}`, {
                error,
            });
            return {
                path: imagePath,
                success: false,
                error: message,
            };
        }
    }

    /**
     * 从 Markdown 文件中移除图片引用
     *
     * 遍历 `target.referencedIn` 列表中的每个 Markdown 文件，通过
     * core 的 parseImages 解析所有图片，通过 raw 字段精确移除匹配项。
     * 这会导致 Markdown 文件内容被修改。
     *
     * @returns 实际被修改的 Markdown 文件数（内容有变化的才算）
     */
    private async removeReferencesFromMarkdown(
        target: DeleteTarget,
        _options: DeleteOptions,
    ): Promise<number> {
        this.logger?.info(`[DeleteService] Removing references from Markdown files`);

        let removedCount = 0;
        const normalizedPath = target.isLocal ? this.normalizeLocalPath(target.path) : target.path;

        for (const ref of target.referencedIn) {
            try {
                const content = await fs.readFile(ref.filePath, "utf-8");

                const parsedImages = parseImages(content);
                let newContent = content;
                for (const img of parsedImages) {
                    let match = false;
                    if (target.isLocal && !isWebSource(img.src)) {
                        const resolvedSrc = isAbsolute(img.src)
                            ? resolve(img.src)
                            : resolve(dirname(ref.filePath), img.src);
                        match = resolvedSrc === normalizedPath;
                    } else {
                        match = img.src === normalizedPath || img.src.includes(normalizedPath);
                    }
                    if (match) {
                        newContent = newContent.replace(img.raw, "");
                    }
                }

                if (newContent !== content) {
                    await fs.writeFile(ref.filePath, newContent, "utf-8");
                    removedCount++;
                    this.logger?.info(`[DeleteService] Removed references from: ${ref.filePath}`);
                }
            } catch (error) {
                this.logger?.warn(
                    `[DeleteService] Failed to remove references from: ${ref.filePath}`,
                    {
                        error,
                    },
                );
            }
        }

        return removedCount;
    }
}
