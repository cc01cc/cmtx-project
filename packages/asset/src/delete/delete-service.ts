import { glob } from "tinyglobby";

/**
 * DeleteService - 图片删除服务
 *
 * @module delete/delete-service
 * @description
 * 提供图片删除功能，包括：
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
import { isAbsolute, relative, resolve } from "node:path";
import type { DeleteFileOptions, Logger } from "@cmtx/core";
import { FileService } from "../file/file-service.js";
import type {
    DeleteDetail,
    DeleteOptions,
    DeleteResult,
    DeleteServiceConfig,
    DeleteTarget,
    ReferenceInfo,
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
        if (options.removeFromMarkdown && !options.force) {
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

        // 查找所有 Markdown 文件
        const mdFiles = await this.findMarkdownFiles(workspaceRoot);

        for (const filePath of mdFiles) {
            try {
                const content = await fs.readFile(filePath, "utf-8");
                const normalizedPath = isLocal ? this.normalizeLocalPath(imagePath) : imagePath;

                // 检查文件是否引用该图片
                const count = this.countReferences(content, normalizedPath);

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
     * 计算文件中对指定图片的引用次数
     */
    private countReferences(content: string, normalizedPath: string): number {
        // 转义正则特殊字符
        const escapedPath = normalizedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`!\\[[^\\]]*\\]\\([^)]*${escapedPath}[^)]*\\)`, "g");
        const matches = content.match(regex);
        return matches?.length ?? 0;
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
     * @returns 移除引用的文件数
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

                // 使用正则替换移除图片引用
                const escapedPath = normalizedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const imageRegex = new RegExp(
                    `!\\[[^\\]]*\\]\\([^)]*${escapedPath}[^)]*\\)\\s*`,
                    "g",
                );
                const newContent = content.replace(imageRegex, "");

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
