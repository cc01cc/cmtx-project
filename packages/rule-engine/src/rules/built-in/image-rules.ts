/* eslint-disable no-console */

/**
 * 图片处理 Rules
 *
 * @module image-rules
 * @description
 * 提供图片处理相关的 Rules，如转换 HTML、上传等。
 */

import { DeleteService } from "@cmtx/asset";
import type {
    ConflictResolutionStrategy,
    DownloadAssetsService,
    Rule,
    RuleContext,
    RuleResult,
    TransferAssetsService,
    UploadService,
} from "../rule-types.js";

/**
 * 图片转换 Rule 配置
 */
interface ConvertImagesConfig {
    /** 是否转换为 HTML（true）或 Markdown（false） */
    convertToHtml?: boolean;
}

/**
 * 图片转换 Rule
 *
 * @description
 * 支持 Markdown 图片语法与 HTML img 标签之间的双向转换。
 */
export const convertImagesRule: Rule = {
    id: "convert-images",
    name: "图片格式转换",
    description: "将 Markdown 图片语法与 HTML img 标签互相转换",

    execute(context: RuleContext, config?: ConvertImagesConfig): RuleResult {
        const { document } = context;
        const convertToHtml = config?.convertToHtml ?? true;

        let newContent = document;
        let matchCount = 0;

        if (convertToHtml) {
            // Markdown -> HTML
            // Markdown 图片语法：![alt](url "title")
            const markdownImageRegex = /!\[([^\]]*)\]\(([^)"]+)(?:\s+"([^"]*)")?\)/g;

            newContent = document.replace(markdownImageRegex, (_match, alt, url, title) => {
                matchCount++;
                const titleAttr = title ? ` title="${title}"` : "";
                return `<img src="${url}" alt="${alt}"${titleAttr} />`;
            });
        } else {
            // HTML -> Markdown
            // 匹配 HTML img 标签
            const htmlImageRegex = /<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi;

            newContent = document.replace(htmlImageRegex, (match) => {
                matchCount++;
                // 提取 alt 属性
                const altMatch = match.match(/alt\s*=\s*["']([^"']*)["']/i);
                const alt = altMatch ? altMatch[1] : "";
                // 提取 src 属性
                const srcMatch = match.match(/src\s*=\s*["']([^"']+)["']/i);
                const src = srcMatch ? srcMatch[1] : "";
                // 提取 title 属性
                const titleMatch = match.match(/title\s*=\s*["']([^"']*)["']/i);
                const title = titleMatch ? ` "${titleMatch[1]}"` : "";
                return `![${alt}](${src}${title})`;
            });
        }

        const modified = newContent !== document;

        return {
            content: newContent,
            modified,
            messages: modified
                ? [`转换了 ${matchCount} 个图片`]
                : convertToHtml
                  ? ["没有 Markdown 图片需要转换"]
                  : ["没有 HTML 图片需要转换"],
        };
    },
};

/**
 * 图片上传 Rule 配置
 */
interface UploadImagesRuleConfig {
    /** 是否上传 */
    upload?: boolean;

    /** 选区范围（用于只处理部分文档） */
    selection?: {
        startOffset: number;
        endOffset: number;
    };

    /** 冲突处理策略 */
    conflictStrategy?: ConflictResolutionStrategy;
}

/**
 * 图片上传 Rule
 */
export const uploadImagesRule: Rule = {
    id: "upload-images",
    name: "上传图片",
    description: "上传本地图片到云端存储",

    async execute(context: RuleContext, config?: UploadImagesRuleConfig): Promise<RuleResult> {
        const { document, baseDirectory, services } = context;
        const shouldUpload = config?.upload ?? true;

        if (!shouldUpload) {
            return {
                content: document,
                modified: false,
                messages: ["未启用上传"],
            };
        }

        // 从 services 获取上传服务
        const uploadService = services.get<UploadService>("upload");

        if (!uploadService) {
            return {
                content: document,
                modified: false,
                messages: ["缺少 UploadService，跳过上传"],
            };
        }

        try {
            // 如果有选区配置，只处理选区范围内的内容
            let contentToProcess = document;
            const selection = config?.selection;

            if (selection) {
                contentToProcess = document.substring(selection.startOffset, selection.endOffset);
            }

            // 使用 UploadService
            const result = await uploadService.uploadImagesInDocument(
                contentToProcess,
                baseDirectory!,
            );

            // 如果有选区，需要将处理后的内容拼接回原文档
            const finalContent = applySelection(document, result.content, selection);

            const messages = buildUploadResultMessages(result);

            return {
                content: finalContent,
                modified: result.uploaded > 0,
                messages,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                content: document,
                modified: false,
                messages: [`上传失败：${message}`],
            };
        }
    },
};

/**
 * 图片下载 Rule 配置
 */
export interface DownloadImagesConfig {
    /** 是否启用下载 */
    download?: boolean;

    /** 输出目录 */
    outputDir?: string;

    /** 域名过滤 */
    domain?: string;
}

/**
 * 图片下载 Rule
 *
 * @description
 * 下载远程图片到本地，不修改文档中的图片路径。
 */
export const downloadImagesRule: Rule = {
    id: "download-images",
    name: "下载图片",
    description: "下载远程图片到本地（不修改文档路径）",

    async execute(context: RuleContext, config?: DownloadImagesConfig): Promise<RuleResult> {
        const { document, baseDirectory, services } = context;
        const shouldDownload = config?.download ?? true;

        if (!shouldDownload) {
            return {
                content: document,
                modified: false,
                messages: ["未启用下载"],
            };
        }

        // 从 services 获取下载服务
        const downloadService = services.get<DownloadAssetsService>("download");

        if (!downloadService) {
            return {
                content: document,
                modified: false,
                messages: ["缺少 DownloadAssetsService，跳过下载"],
            };
        }

        try {
            // 使用 DownloadAssetsService 的下载功能
            const outputDir = config?.outputDir ?? baseDirectory ?? "./images";
            const result = await downloadService.downloadImages(document, outputDir, {
                domain: config?.domain,
            });

            const messages: string[] = [];
            if (result.success > 0) {
                messages.push(`✓ 下载 ${result.success} 个图片`);
            }
            if (result.skipped > 0) {
                messages.push(`○ 跳过 ${result.skipped} 个文件`);
            }
            if (result.failed > 0) {
                messages.push(`✗ 失败 ${result.failed} 个文件`);
            }

            return {
                content: document, // 下载不修改文档内容
                modified: result.success > 0,
                messages: messages.length > 0 ? messages : ["没有文件下载"],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                content: document,
                modified: false,
                messages: [`下载失败：${message}`],
            };
        }
    },
};

/**
 * 图片删除 Rule 配置
 */
export interface DeleteImageConfig {
    /** 是否启用删除 */
    delete?: boolean;

    /** 删除策略 */
    strategy?: "trash" | "move" | "hard-delete";

    /** 是否从 Markdown 中移除引用 */
    removeFromMarkdown?: boolean;

    /** 是否强制删除（忽略引用检查） */
    force?: boolean;
}

/**
 * 图片删除 Rule
 *
 * @description
 * 删除本地图片文件，可选择从所有引用的 Markdown 文件中移除引用。
 */
export const deleteImageRule: Rule = {
    id: "delete-image",
    name: "删除图片",
    description: "删除本地图片文件并清理引用",

    async execute(context: RuleContext, config?: DeleteImageConfig): Promise<RuleResult> {
        const { document, baseDirectory } = context;
        const shouldDelete = config?.delete ?? true;

        if (!shouldDelete) {
            return {
                content: document,
                modified: false,
                messages: ["未启用删除"],
            };
        }

        if (!baseDirectory) {
            return {
                content: document,
                modified: false,
                messages: ["缺少 baseDirectory，跳过删除"],
            };
        }

        try {
            // 直接使用 DeleteService（纯本地操作，不需要存储适配器）
            const deleteService = new DeleteService({
                workspaceRoot: baseDirectory,
                options: {
                    strategy: config?.strategy ?? "trash",
                    removeFromMarkdown: config?.removeFromMarkdown ?? true,
                    force: config?.force ?? false,
                },
            });

            // 从文档中提取本地图片引用
            const { filterImagesInText } = await import("@cmtx/core");
            const images = filterImagesInText(document, {
                mode: "sourceType",
                value: "local",
            });

            if (images.length === 0) {
                return {
                    content: document,
                    modified: false,
                    messages: ["没有本地图片需要删除"],
                };
            }

            let totalDeleted = 0;
            let totalReferencesRemoved = 0;

            for (const img of images) {
                const { isAbsolute, resolve } = await import("node:path");
                const absPath = isAbsolute(img.src)
                    ? resolve(img.src)
                    : resolve(baseDirectory, img.src);

                const target = await deleteService.scanReferences(absPath);
                const deleteResult = await deleteService.delete(target);

                totalDeleted += deleteResult.details.filter((d) => d.success).length;
                totalReferencesRemoved += deleteResult.referencesRemovedFrom;
            }

            const messages: string[] = [];
            if (totalDeleted > 0) {
                messages.push(`删除 ${totalDeleted} 个文件`);
            }
            if (totalReferencesRemoved > 0) {
                messages.push(`从 ${totalReferencesRemoved} 个文件移除引用`);
            }

            return {
                content: document,
                modified: totalDeleted > 0,
                messages: messages.length > 0 ? messages : ["没有文件删除"],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                content: document,
                modified: false,
                messages: [`删除失败：${message}`],
            };
        }
    },
};

/**
 * 图片尺寸调整 Rule 配置
 */
export interface ResizeImageConfig {
    /** 是否启用尺寸调整 */
    resize?: boolean;

    /** 目标宽度（像素或百分比，如 480 或 '60%'） */
    targetWidth?: number | string;

    /** 目标高度（像素或 'auto'） */
    targetHeight?: number | string;

    /** 调整方向（'in' 放大，'out' 缩小） */
    direction?: "in" | "out";

    /** 可用宽度列表 */
    availableWidths?: number[];

    /** 选区范围（用于只处理部分文档） */
    selection?: {
        startOffset: number;
        endOffset: number;
    };
}

/**
 * 设置图片尺寸属性（width 和 height）
 */
function setImageDimensions(
    html: string,
    targetWidth?: number | string,
    targetHeight?: number | string,
): string {
    let result = html;

    // 处理 width
    if (targetWidth !== undefined) {
        const widthStr = String(targetWidth);
        // 检查是否已有 width 属性
        if (/width\s*=\s*["'][^"']*["']/.test(result) || /width\s*=\s*\d+/.test(result)) {
            // 替换现有 width
            result = result.replace(/width\s*=\s*["']?\d+["']?/, `width="${widthStr}"`);
        } else {
            // 在 src 属性后添加 width
            result = result.replace(
                /(<img\s+[^>]*src\s*=\s*["'][^'"]+["'])/,
                `$1 width="${widthStr}"`,
            );
        }
    }

    // 处理 height
    if (targetHeight !== undefined) {
        const heightStr = String(targetHeight);
        // 检查是否已有 height 属性
        if (/height\s*=\s*["'][^"']*["']/.test(result) || /height\s*=\s*\d+/.test(result)) {
            // 替换现有 height
            result = result.replace(/height\s*=\s*["']?\d+["']?/, `height="${heightStr}"`);
        } else {
            // 在 width 属性后添加 height（如果没有 width 则在 src 后）
            if (targetWidth !== undefined) {
                result = result.replace(/(width\s*=\s*["'][^"']*["'])/, `$1 height="${heightStr}"`);
            } else {
                result = result.replace(
                    /(<img\s+[^>]*src\s*=\s*["'][^'"]+["'])/,
                    `$1 height="${heightStr}"`,
                );
            }
        }
    }

    return result;
}

/**
 * 将 Markdown 图片转换为带尺寸的 HTML img 标签
 */
function convertMarkdownImageToHtmlWithDimensions(
    markdown: string,
    targetWidth?: number | string,
    targetHeight?: number | string,
): string {
    return markdown.replace(
        /!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]*)")?\)/g,
        (_match, alt: string, src: string, title?: string) => {
            let html = `<img src="${src}" alt="${alt}"`;
            if (targetWidth !== undefined) {
                html += ` width="${targetWidth}"`;
            }
            if (targetHeight !== undefined) {
                html += ` height="${targetHeight}"`;
            }
            if (title) {
                html += ` title="${title}"`;
            }
            html += ">";
            return html;
        },
    );
}

/**
 * 图片尺寸调整 Rule
 *
 * @description
 * 调整 HTML 图片的宽度和高度属性，支持 Markdown 转 HTML。
 */
export const resizeImageRule: Rule = {
    id: "resize-image",
    name: "调整图片尺寸",
    description: "调整图片宽度和高度（HTML 格式）",

    execute(context: RuleContext, config?: ResizeImageConfig): RuleResult {
        const { document } = context;
        const shouldResize = config?.resize ?? true;

        if (!shouldResize) {
            return {
                content: document,
                modified: false,
                messages: ["未启用尺寸调整"],
            };
        }

        // 导入 resize 模块函数
        const { parseImageElements } = require("@cmtx/core");

        const availableWidths = config?.availableWidths ?? [200, 400, 600, 800];
        const targetWidth = config?.targetWidth;
        const targetHeight = config?.targetHeight;

        // 处理选区
        let contentToProcess = document;
        const selection = config?.selection;

        if (selection) {
            contentToProcess = document.substring(selection.startOffset, selection.endOffset);
        }

        // 解析图片元素
        const elements = parseImageElements(contentToProcess);

        if (elements.length === 0) {
            return {
                content: document,
                modified: false,
                messages: ["没有找到图片"],
            };
        }

        // 计算目标宽度
        const finalTargetWidth = resolveTargetWidth(targetWidth, config, elements, availableWidths);

        // 处理图片元素
        const newContent = processImageElements(
            contentToProcess,
            elements,
            finalTargetWidth,
            targetHeight,
        );

        // 如果有选区，拼接回原文档
        const finalContent = applySelection(document, newContent, selection);

        const modified = finalContent !== document;

        const widthDesc = finalTargetWidth !== undefined ? `width=${finalTargetWidth}` : "";
        const heightDesc = targetHeight !== undefined ? `height=${targetHeight}` : "";
        const sizeDesc = [widthDesc, heightDesc].filter(Boolean).join(", ");

        return {
            content: finalContent,
            modified,
            messages: modified ? [`调整尺寸：${sizeDesc}`] : ["没有修改"],
        };
    },
};

/**
 * 构建上传结果消息列表
 */
function buildUploadResultMessages(result: {
    uploaded: number;
    skipped: unknown[] | undefined;
    failed: unknown[] | undefined;
}): string[] {
    const messages: string[] = [];
    const uploadedCount = result.uploaded;
    const skippedCount = (result.skipped as unknown[] | undefined)?.length ?? 0;
    const failedCount = (result.failed as unknown[] | undefined)?.length ?? 0;

    if (uploadedCount > 0) {
        messages.push(`✓ 上传 ${uploadedCount} 个图片`);
    }
    if (skippedCount > 0) {
        messages.push(`○ 跳过 ${skippedCount} 个文件`);
    }
    if (failedCount > 0) {
        messages.push(`✗ 失败 ${failedCount} 个文件`);
    }

    return messages;
}

/**
 * 应用选区拼接
 */
function applySelection(
    document: string,
    resultContent: string,
    selection?: { startOffset: number; endOffset: number },
): string {
    if (selection) {
        return (
            document.substring(0, selection.startOffset) +
            resultContent +
            document.substring(selection.endOffset)
        );
    }
    return resultContent;
}

/**
 * 解析目标宽度
 */
function resolveTargetWidth(
    targetWidth: number | string | undefined,
    config: ResizeImageConfig | undefined,
    elements: { type: string; originalText: string }[],
    availableWidths: number[],
): number | string | undefined {
    if (targetWidth !== undefined) return targetWidth;
    if (config?.direction) {
        const { detectCurrentWidth, calculateTargetWidth } = require("@cmtx/core");
        const currentWidth = detectCurrentWidth(elements, availableWidths);
        return calculateTargetWidth(currentWidth, config.direction, availableWidths);
    }
    return availableWidths[Math.floor(availableWidths.length / 2)];
}

/**
 * 处理图片元素（Markdown + HTML）
 */
function processImageElements(
    content: string,
    elements: { type: string; originalText: string }[],
    finalTargetWidth: number | string | undefined,
    targetHeight: number | string | undefined,
): string {
    let newContent = content;
    for (const element of elements.filter((e) => e.type === "markdown")) {
        newContent = newContent.replace(
            element.originalText,
            convertMarkdownImageToHtmlWithDimensions(
                element.originalText,
                finalTargetWidth,
                targetHeight,
            ),
        );
    }
    for (const element of elements.filter((e) => e.type === "html")) {
        newContent = newContent.replace(
            element.originalText,
            setImageDimensions(element.originalText, finalTargetWidth, targetHeight),
        );
    }
    return newContent;
}

/**
 * 转移图片 Rule 配置
 */
export interface TransferImagesConfig {
    /** 是否启用 */
    transfer?: boolean;
    /** 源存储域名（用于过滤，可选） */
    sourceDomain?: string;
    /** 目标存储自定义域名 */
    targetDomain?: string;
    /** 目标存储前缀 */
    targetPrefix?: string;
    /** 命名模板 */
    namingTemplate?: string;
    /** 并发数 */
    concurrency?: number;
    /** 是否删除源文件（move 模式） */
    deleteSource?: boolean;
}

/**
 * 转移图片 Rule
 *
 * @description
 * 在对象存储之间转移图片，自动替换 Markdown 引用。
 * 组合 Download（多存储源）+ Upload（单存储目标）。
 */
export const transferImagesRule: Rule = {
    id: "transfer-images",
    name: "转移图片",
    description: "在对象存储之间转移图片，自动替换 Markdown 引用",

    async execute(context: RuleContext, config?: TransferImagesConfig): Promise<RuleResult> {
        const { document, filePath, services } = context;
        const shouldTransfer = config?.transfer ?? true;

        if (!shouldTransfer) {
            return {
                content: document,
                modified: false,
                messages: ["未启用转移"],
            };
        }

        // 从 services 获取转移服务
        const transferService = services.get<TransferAssetsService>("transfer");

        if (!transferService) {
            return {
                content: document,
                modified: false,
                messages: ["缺少 TransferAssetsService，跳过转移"],
            };
        }

        try {
            const result = await transferService.transferImages(document, filePath, {
                sourceDomain: config?.sourceDomain,
                targetDomain: config?.targetDomain,
                concurrency: config?.concurrency,
                deleteSource: config?.deleteSource,
            });

            const messages: string[] = [];
            if (result.transferred > 0) {
                messages.push(`转移 ${result.transferred} 张图片`);
            }
            if (result.skipped > 0) {
                messages.push(`跳过 ${result.skipped} 个文件`);
            }
            if (result.failed > 0) {
                messages.push(`失败 ${result.failed} 个文件`);
            }

            return {
                content: result.content,
                modified: result.transferred > 0,
                messages: messages.length > 0 ? messages : ["没有图片需要转移"],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                content: document,
                modified: false,
                messages: [`转移失败：${message}`],
            };
        }
    },
};

/**
 * 导出所有图片处理 Rules
 */
export const imageRules: Rule[] = [
    convertImagesRule,
    uploadImagesRule,
    downloadImagesRule,
    deleteImageRule,
    resizeImageRule,
    transferImagesRule,
];
