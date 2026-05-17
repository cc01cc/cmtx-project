/* eslint-disable no-console */

/**
 * 图片处理 Rules
 *
 * @module image-rules
 * @description
 * 提供图片处理相关的 Rules，如转换 HTML、上传等。
 */

import { isAbsolute, resolve } from "node:path";
import { DeleteService } from "@cmtx/asset";
import type { ReplaceConfig } from "@cmtx/asset";
// type-only imports are erased at compile time - avoids Rolldown assertion panic (SPRINT-006)
import type { ParsedImage } from "@cmtx/core";
import type {
    ConflictResolutionStrategy,
    DownloadService,
    Rule,
    RuleContext,
    RuleResult,
    TransferService,
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

    /** 使用哪个存储配置 */
    useStorage?: string;

    /** 文件命名模板 */
    namingTemplate?: string;

    /** 上传路径前缀 */
    prefix?: string;

    /** 自定义域名（CDN） */
    domain?: string;

    /** 输出格式 */
    imageFormat?: "markdown" | "html";

    /** 字段替换配置 */
    replace?: ReplaceConfig;

    /** 并发数 */
    concurrency?: number;
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
                {
                    namingTemplate: config?.namingTemplate,
                    prefix: config?.prefix,
                    domain: config?.domain,
                    replace: config?.replace,
                    conflictStrategy: config?.conflictStrategy,
                },
            );

            // 如果有选区，需要将处理后的内容拼接回原文档
            const finalContent = applySelection(document, result.content, selection);

            const messages = buildUploadResultMessages(result);

            return {
                content: finalContent,
                modified: result.succeeded > 0,
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

    /** 本地保存命名模板 */
    namingTemplate?: string;

    /** 并发下载数 */
    concurrency?: number;

    /** 是否覆盖已存在文件 */
    overwrite?: boolean;
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
        const downloadService = services.get<DownloadService>("download");

        if (!downloadService) {
            return {
                content: document,
                modified: false,
                messages: ["缺少 DownloadService，跳过下载"],
            };
        }

        try {
            // 使用 DownloadService 的下载功能
            const outputDir = config?.outputDir ?? baseDirectory ?? "./images";
            const result = await downloadService.downloadImages(document, outputDir, {
                domain: config?.domain,
                namingTemplate: config?.namingTemplate,
                concurrency: config?.concurrency,
                overwrite: config?.overwrite,
            });

            const messages: string[] = [];
            if (result.succeeded > 0) {
                messages.push(`✓ 下载 ${result.succeeded} 个图片`);
            }
            if (result.skipped > 0) {
                messages.push(`○ 跳过 ${result.skipped} 个文件`);
            }
            if (result.failed > 0) {
                messages.push(`✗ 失败 ${result.failed} 个文件`);
            }

            return {
                content: document, // 下载不修改文档内容
                modified: result.succeeded > 0,
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
    /** 删除策略 */
    strategy?: "trash" | "move" | "hard-delete";

    /** 是否从 Markdown 中移除引用 */
    removeFromMarkdown?: boolean;

    /** 是否强制删除（忽略引用检查） */
    force?: boolean;

    /** move 策略的目标目录 */
    trashDir?: string;
}

/**
 * 图片删除 Rule
 *
 * @description
 * 提取当前文档中的本地图片，逐一安全检查引用后删除。
 * 有引用且非 force 模式时跳过文件删除（可独立清理引用）。
 */
export const deleteImageRule: Rule = {
    id: "delete-image",
    name: "删除图片",
    description: "安全删除当前文档的本地图片（引用检查）",

    async execute(context: RuleContext, config?: DeleteImageConfig): Promise<RuleResult> {
        const { document, baseDirectory } = context;

        if (!baseDirectory) {
            return {
                content: document,
                modified: false,
                messages: ["缺少 baseDirectory，跳过删除"],
            };
        }

        try {
            const { filterImages } = require("@cmtx/core") as {
                filterImages: (
                    md: string,
                    options: { mode: string; value: string },
                ) => Array<{ src: string }>;
            };
            const images = filterImages(document, {
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

            const deleteService = new DeleteService({
                baseDirectory,
                options: {
                    strategy: config?.strategy ?? "trash",
                    removeFromMarkdown: config?.removeFromMarkdown ?? true,
                    force: config?.force ?? false,
                },
            });

            let totalDeleted = 0;
            let totalReferencesRemoved = 0;

            for (const img of images) {
                const absPath = isAbsolute(img.src)
                    ? resolve(img.src)
                    : resolve(baseDirectory, img.src);

                const result = await deleteService.safeDelete(absPath, {
                    strategy: config?.strategy,
                    removeFromMarkdown: config?.removeFromMarkdown,
                    force: config?.force,
                    trashDir: config?.trashDir,
                });

                if (result.deleted && result.deleteResult) {
                    totalDeleted += result.deleteResult.deletedCount;
                    totalReferencesRemoved += result.deleteResult.referencesRemovedFrom;
                }
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
                modified: totalDeleted > 0 || totalReferencesRemoved > 0,
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
 * 清理图片 Rule 配置
 */
export interface CleanupImagesConfig {
    /** 删除策略 */
    strategy?: "trash" | "move" | "hard-delete";

    /** 是否强制删除（跳过引用检查，cleanup 语义下为跳过确认） */
    force?: boolean;

    /** 可选，覆盖应用层默认根目录 */
    baseDirectory?: string;

    /** move 策略的目标目录 */
    trashDir?: string;
}

/**
 * 清理图片 Rule
 *
 * @description
 * 扫描 baseDirectory 下所有未被 Markdown 引用的 orphan 图片并批量清理。
 * 使用 configuration 中的 baseDirectory 覆盖（支持相对/绝对路径），
 * 否则使用 context.baseDirectory。
 */
export const cleanupImagesRule: Rule = {
    id: "cleanup-images",
    name: "清理图片",
    description: "清理未被引用的本地图片",

    async execute(context: RuleContext, config?: CleanupImagesConfig): Promise<RuleResult> {
        const { baseDirectory: contextBaseDir } = context;

        let baseDir = contextBaseDir;
        if (config?.baseDirectory) {
            baseDir = isAbsolute(config.baseDirectory)
                ? resolve(config.baseDirectory)
                : resolve(contextBaseDir ?? "", config.baseDirectory);
        }

        if (!baseDir) {
            return {
                content: context.document,
                modified: false,
                messages: ["缺少 baseDirectory，跳过清理"],
            };
        }

        try {
            const deleteService = new DeleteService({
                baseDirectory: baseDir,
                options: {
                    strategy: config?.strategy ?? "trash",
                },
            });

            const result = await deleteService.pruneDirectory(baseDir, {
                strategy: config?.strategy,
                trashDir: config?.trashDir,
            });

            const messages: string[] = [];
            if (result.deletedCount > 0) {
                messages.push(
                    `清理 ${result.deletedCount} 个文件，释放 ${(result.freedSize / 1024).toFixed(1)}KB`,
                );
            }
            if (result.failedCount > 0) {
                messages.push(`${result.failedCount} 个文件失败`);
            }
            if (result.skippedCount > 0) {
                messages.push(`${result.skippedCount} 个文件跳过`);
            }

            return {
                content: context.document,
                modified: false,
                messages: messages.length > 0 ? messages : ["没有需要清理的图片"],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                content: context.document,
                modified: false,
                messages: [`清理失败：${message}`],
            };
        }
    },
};

/**
 * 缩放域名配置
 */
interface ResizeDomainConfig {
    /** 域名 */
    domain: string;
    /** 提供商：aliyun-oss | tencent-cos | html（html=回退客户端缩放） */
    provider?: string;
}

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
    widths?: number[];

    /**
     * 域名配置
     * 匹配的域名使用服务器端缩放（通过 URL 参数），
     * 不匹配的域名使用客户端缩放（修改 img 标签 width/height 属性）。
     * provider 取值:
     *   aliyun-oss: ?x-oss-process=image/resize,w_{width}
     *   tencent-cos: ?imageMogr2/thumbnail/{width}x
     *   html: 回退到客户端缩放
     * 参考: <https://help.aliyun.com/zh/oss/user-guide/resize-images-4>
     *      <https://cloud.tencent.com/document/product/460/36540>
     */
    domains?: ResizeDomainConfig[];

    /** 选区范围（用于只处理部分文档） */
    selection?: {
        startOffset: number;
        endOffset: number;
    };
}

// setImageDimensions/toHtmlImage/processImageElements
// 已由 @cmtx/core 提供或 replaced by replaceElementWithDimensions

/**
 * 构建服务器端缩放 URL
 *
 * @param src - 原始图片 URL
 * @param width - 目标宽度（像素）
 * @param provider - 存储提供商
 * @returns 处理后 URL，或 null（不支持的 provider/格式）
 */
function buildServerResizeUrl(src: string, width: number, provider: string): string | null {
    const separator = src.includes("?") ? "&" : "?";
    switch (provider) {
        case "aliyun-oss":
            return `${src}${separator}x-oss-process=image/resize,w_${width}`;
        case "tencent-cos":
            return `${src}${separator}imageMogr2/thumbnail/${width}x`;
        default:
            return null;
    }
}

/**
 * 检查图片 src 是否匹配已配置的缩放域名，匹配时返回对应 provider
 */
function matchResizeDomain(
    src: string,
    domains: ResizeDomainConfig[] | undefined,
): ResizeDomainConfig | undefined {
    if (!domains || domains.length === 0) return undefined;
    try {
        const url = new URL(src);
        return domains.find(
            (d) => url.hostname === d.domain || url.hostname.endsWith(`.${d.domain}`),
        );
    } catch {
        return undefined;
    }
}

function resizeElements(
    content: string,
    elements: ParsedImage[],
    finalTargetWidth: number | string | undefined,
    targetHeight: number | string | undefined,
    domains: ResizeDomainConfig[] | undefined,
    convertMdToHtml: (md: string, attrs?: Record<string, string>) => string,
    setImgDims: (html: string, attrs?: Record<string, string>) => string,
): { content: string; server: number; client: number } {
    let result = content;
    let server = 0;
    let client = 0;

    for (const element of elements) {
        const matched = matchResizeDomain(element.src, domains);
        const useServer =
            typeof finalTargetWidth === "number" &&
            matched?.provider &&
            matched.provider !== "html";

        if (useServer) {
            const serverUrl = buildServerResizeUrl(
                element.src,
                finalTargetWidth,
                matched!.provider!,
            );
            if (serverUrl) {
                result = result.replace(element.raw, element.raw.replace(element.src, serverUrl));
                server++;
                continue;
            }
        }

        result = replaceElementWithDimensions(
            result,
            element,
            finalTargetWidth,
            targetHeight,
            convertMdToHtml,
            setImgDims,
        );
        client++;
    }

    return { content: result, server, client };
}

function requireCoreImageUtils() {
    return require("@cmtx/core") as {
        parseImages: (md: string) => ParsedImage[];
        setImageDimensions: (html: string, attrs?: Record<string, string>) => string;
        toHtmlImage: (md: string, attrs?: Record<string, string>) => string;
    };
}

function buildResizeResult(
    document: string,
    content: string,
    selection: { startOffset: number; endOffset: number } | undefined,
    server: number,
    client: number,
    finalTargetWidth: number | string | undefined,
): RuleResult {
    const finalContent = selection
        ? document.substring(0, selection.startOffset) +
          content +
          document.substring(selection.endOffset)
        : content;

    const messages: string[] = [];
    if (server > 0) messages.push(`服务端缩放 ${server} 个图片（width=${finalTargetWidth}）`);
    if (client > 0) messages.push(`客户端缩放 ${client} 个图片（width=${finalTargetWidth}）`);

    return {
        content: finalContent,
        modified: server + client > 0,
        messages: messages.length > 0 ? messages : ["没有修改"],
    };
}

/**
 * 图片尺寸调整 Rule
 *
 * @description
 * 调整图片尺寸，支持两种模式：
 * 1. 服务器端缩放：匹配 domains 时，通过 URL 参数让 OSS/COS 返回缩放后的图片
 * 2. 客户端缩放：未匹配时，修改 img 标签的 width/height 属性
 */
export const resizeImageRule: Rule = {
    id: "resize-image",
    name: "调整图片尺寸",
    description: "调整图片宽度和高度，支持 OSS/COS 服务端缩放和客户端属性缩放",

    execute(context: RuleContext, config?: ResizeImageConfig): RuleResult {
        if (config?.resize === false) {
            return { content: context.document, modified: false, messages: ["未启用尺寸调整"] };
        }

        const selection = config?.selection;
        const contentToProcess = selection
            ? context.document.substring(selection.startOffset, selection.endOffset)
            : context.document;

        const { parseImages, setImageDimensions, toHtmlImage } = requireCoreImageUtils();
        const elements = parseImages(contentToProcess);

        if (elements.length === 0) {
            return { content: context.document, modified: false, messages: ["没有找到图片"] };
        }

        const widths = config?.widths ?? [200, 400, 600, 800];
        const finalTargetWidth = resolveTargetWidth(config?.targetWidth, config, elements, widths);

        const {
            content: newContent,
            server,
            client,
        } = resizeElements(
            contentToProcess,
            elements,
            finalTargetWidth,
            config?.targetHeight,
            config?.domains,
            toHtmlImage,
            setImageDimensions,
        );

        return buildResizeResult(
            context.document,
            newContent,
            selection,
            server,
            client,
            finalTargetWidth,
        );
    },
};

/**
 * 构建上传结果消息列表
 */
function buildUploadResultMessages(result: {
    succeeded: number;
    skipped: unknown[] | undefined;
    failed: unknown[] | undefined;
}): string[] {
    const messages: string[] = [];
    const uploadedCount = result.succeeded;
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
    elements: ParsedImage[],
    widths: number[],
): number | string | undefined {
    if (targetWidth !== undefined) return targetWidth;
    if (config?.direction) {
        const currentWidth = detectCurrentWidth(elements);
        return calculateTargetWidth(currentWidth, config.direction, widths);
    }
    return widths[Math.floor(widths.length / 2)];
}

function detectCurrentWidth(elements: ParsedImage[]): number {
    for (const element of elements) {
        if (element.width) {
            return parseInt(element.width, 10);
        }
    }
    return 0;
}

function calculateTargetWidth(
    currentWidth: number,
    direction: "in" | "out",
    widths: number[],
): number {
    const sorted = [...widths].sort((a, b) => a - b);
    const currentIndex = sorted.findIndex((w) => w >= currentWidth);

    if (direction === "in") {
        if (currentIndex === -1) {
            return sorted[sorted.length - 1];
        }
        return currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : sorted[currentIndex];
    } else {
        if (currentIndex <= 0) {
            return sorted[0];
        }
        return sorted[currentIndex - 1];
    }
}

/**
 * 对单个图片元素应用客户端尺寸缩放
 *
 * Markdown 元素转为带 width/height 的 HTML img 标签；
 * HTML 元素在已有 img 标签上追加 width/height 属性。
 */
function replaceElementWithDimensions(
    content: string,
    element: ParsedImage,
    finalTargetWidth: number | string | undefined,
    targetHeight: number | string | undefined,
    convertMdToHtml: (md: string, attrs?: Record<string, string>) => string,
    setImgDims: (html: string, attrs?: Record<string, string>) => string,
): string {
    const attrs: Record<string, string> = {};
    if (finalTargetWidth !== undefined) attrs.width = String(finalTargetWidth);
    if (targetHeight !== undefined) attrs.height = String(targetHeight);
    const attrsForHtml = Object.keys(attrs).length > 0 ? attrs : undefined;

    const replacement =
        element.syntax === "md"
            ? convertMdToHtml(element.raw, attrsForHtml)
            : setImgDims(element.raw, attrsForHtml);

    return content.replace(element.raw, replacement);
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
    /** 下载并发控制 */
    maxConcurrentDownloads?: number;
    /** 临时目录 */
    tempDir?: string;
    /** 是否覆盖目标文件 */
    overwrite?: boolean;
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
        const transferService = services.get<TransferService>("transfer");

        if (!transferService) {
            return {
                content: document,
                modified: false,
                messages: ["缺少 TransferService，跳过转移"],
            };
        }

        try {
            const result = await transferService.transferImages(document, filePath, {
                sourceDomain: config?.sourceDomain,
                targetDomain: config?.targetDomain,
                targetPrefix: config?.targetPrefix,
                namingTemplate: config?.namingTemplate,
                concurrency: config?.concurrency,
                deleteSource: config?.deleteSource,
            });

            const messages: string[] = [];
            if (result.succeeded > 0) {
                messages.push(`转移 ${result.succeeded} 张图片`);
            }
            if (result.skipped > 0) {
                messages.push(`跳过 ${result.skipped} 个文件`);
            }
            if (result.failed > 0) {
                messages.push(`失败 ${result.failed} 个文件`);
            }

            return {
                content: result.content,
                modified: result.succeeded > 0,
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
    cleanupImagesRule,
    resizeImageRule,
    transferImagesRule,
];
