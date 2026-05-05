/**
 * 图片处理组合函数 - 为发布准备 Markdown 图片
 *
 * @module process-images
 * @description
 * 提供将 Markdown 图片准备为发布状态的组合功能：
 * 1. Markdown img → HTML img 转换
 * 2. 调整 HTML img 尺寸
 * 3. 上传本地图片到云端
 *
 * @example
 * ```typescript
 * import { processImagesForPublish } from '@cmtx/rule-engine';
 * import { ConfigBuilder } from '@cmtx/asset/upload';
 *
 * const result = await processImagesForPublish('./article.md', {
 *   convertToHtml: true,
 *   width: '480',
 *   upload: config,
 * });
 *
 * console.log(result.content);
 * console.log(result.stats);
 * ```
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
    batchUploadImages,
    matchesToSources,
    renderReplacementText,
    applyReplacementOps,
    type ReplacementOp,
} from "@cmtx/asset/upload";
import { filterImagesInText, isWebSource } from "@cmtx/core";
import { formatHtmlImage, parseImages, updateImageAttribute } from "@cmtx/core";
import type { ProcessImagesOptions, ProcessImagesResult } from "./types.js";

/**
 * 处理 Markdown 文件中的图片以准备发布
 *
 * @param filePath - Markdown 文件路径
 * @param options - 处理选项
 * @returns 处理后的内容和统计信息
 *
 * @public
 */
export async function processImagesForPublish(
    filePath: string,
    options: ProcessImagesOptions = {},
): Promise<ProcessImagesResult> {
    const absolutePath = resolve(filePath);
    const content = await readFile(absolutePath, "utf-8");

    let currentContent = content;
    const stats = { converted: 0, resized: 0, uploaded: 0 };

    // Step 1: MD img → HTML img
    if (options.convertToHtml) {
        const result = convertMarkdownImagesToHtml(currentContent, {
            width: options.width,
            height: options.height,
        });
        currentContent = result.content;
        stats.converted = result.count;
    }

    // Step 2: 调整 HTML img size
    if (options.width || options.height) {
        const result = resizeHtmlImages(currentContent, {
            width: options.width,
            height: options.height,
        });
        currentContent = result.content;
        stats.resized = result.count;
    }

    // Step 3: 上传本地图片
    if (options.upload && !options.dryRun) {
        const result = await uploadImages(absolutePath, currentContent, options.upload);
        currentContent = result.content;
        stats.uploaded = result.count;
    }

    return { content: currentContent, stats };
}

/**
 * Step 1: 将 Markdown 图片转换为 HTML img 标签
 */
function convertMarkdownImagesToHtml(
    content: string,
    options: { width?: string; height?: string },
): { content: string; count: number } {
    const images = parseImages(content);
    const mdImages = images.filter((img) => img.syntax === "md");

    let newContent = content;
    let count = 0;

    for (const img of mdImages) {
        const htmlImg = formatHtmlImage({
            src: img.src,
            alt: img.alt || "",
            attributes: {
                width: options.width,
                height: options.height,
            },
        });

        newContent = newContent.replace(img.raw, htmlImg);
        count++;
    }

    return { content: newContent, count };
}

/**
 * Step 2: 调整 HTML img 标签的尺寸属性
 */
function resizeHtmlImages(
    content: string,
    options: { width?: string; height?: string },
): { content: string; count: number } {
    const images = parseImages(content);
    const htmlImages = images.filter((img) => img.syntax === "html");

    let newContent = content;
    let count = 0;

    for (const img of htmlImages) {
        let newImg = img.raw;

        if (options.width) {
            newImg = updateImageAttribute(newImg, "width", options.width);
        }
        if (options.height) {
            newImg = updateImageAttribute(newImg, "height", options.height);
        }

        if (newImg !== img.raw) {
            newContent = newContent.replace(img.raw, newImg);
            count++;
        }
    }

    return { content: newContent, count };
}

/**
 * Step 3: 上传本地图片到云端
 */
async function uploadImages(
    _originalPath: string,
    content: string,
    uploadConfig: ProcessImagesOptions["upload"],
): Promise<{ content: string; count: number }> {
    if (!uploadConfig) {
        return { content, count: 0 };
    }

    const storage = uploadConfig.storages?.default;
    if (!storage?.adapter) {
        return { content, count: 0 };
    }

    const allMatches = filterImagesInText(content);
    const localMatches = allMatches.filter((m) => !isWebSource(m.src));

    const baseDir = dirname(resolve(_originalPath));
    const sources = matchesToSources(localMatches, baseDir);

    const result = await batchUploadImages(sources, {
        adapter: storage.adapter,
        namingTemplate: storage.namingTemplate,
    });

    const ops: ReplacementOp[] = [];
    for (let i = 0; i < localMatches.length; i++) {
        const cloudResult = result.lookup(sources[i]);
        if (!cloudResult || cloudResult.action === "skipped") continue;
        const newText = renderReplacementText(localMatches[i], {
            cloudUrl: cloudResult.cloudUrl,
            variables: cloudResult.variables,
        });
        ops.push({
            offset: content.indexOf(localMatches[i].raw),
            length: localMatches[i].raw.length,
            newText,
        });
    }

    return {
        content: applyReplacementOps(content, ops),
        count: result.uploaded.length,
    };
}
