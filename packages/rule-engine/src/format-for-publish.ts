/* eslint-disable no-console */

/**
 * 发布格式化函数 - 为发布准备 Markdown 文档
 *
 * @module format-for-publish
 * @description
 * 提供完整的 Markdown 文档发布格式化功能：
 * 1. Markdown img → HTML img 转换
 * 2. 调整 HTML img 尺寸
 * 3. 上传本地图片到云端
 * 4. 添加 YAML front matter（将一级标题转为 title 字段）
 * 5. 自动元数据处理（ID、date、updated）
 *
 * @example
 * ```typescript
 * import { formatForPublish } from '@cmtx/rule-engine';
 *
 * const result = await formatForPublish('./article.md', {
 *   convertToHtml: true,
 *   convertTitle: true,
 *   frontmatter: { date: '2026-04-05', tags: ['blog'] },
 *   autoMetadata: {
 *     generateId: true,
 *     idOptions: {
 *       encryptionKey: 'my-secret-key-32-bytes-long',
 *       plaintext: 'ABC123',  // FF1 格式保留：输入 6 位，输出 6 位
 *     },
 *     autoDate: true,
 *     autoUpdated: true,
 *   },
 * });
 *
 * console.log(result.content);
 * console.log(result.stats);
 * ```
 */

import {
    convertHeadingToFrontmatter,
    parseFrontmatter,
    parseYamlFrontmatter,
    upsertFrontmatterFields,
} from "@cmtx/core";
import { IdGenerator } from "./metadata/id-generator.js";
import { processImagesForPublish } from "./process-images.js";
import type { FormatForPublishOptions, FormatForPublishResult } from "./types.js";

function hasFrontmatterField(markdown: string, field: string): boolean {
    const { hasFrontmatter, data } = parseFrontmatter(markdown);
    if (!hasFrontmatter) return false;
    try {
        const parsed = parseYamlFrontmatter(data);
        return parsed[field] !== undefined && parsed[field] !== null;
    } catch {
        return false;
    }
}

interface ApplyTitleConversionResult {
    content: string;
    converted: boolean;
}

function applyTitleConversion(content: string): ApplyTitleConversionResult {
    const newContent = convertHeadingToFrontmatter(content, { headingLevel: 1 });
    return { content: newContent, converted: newContent !== content };
}

function applyFrontmatter(content: string, frontmatter: Record<string, string | string[]>): string {
    return upsertFrontmatterFields(content, frontmatter).markdown;
}

interface ApplyAutoMetadataResult {
    content: string;
    idGenerated: boolean;
    dateAdded: boolean;
    updatedAdded: boolean;
    frontmatterUpdated: boolean;
}

function applyAutoMetadata(
    content: string,
    options: Exclude<FormatForPublishOptions["autoMetadata"], undefined>,
): ApplyAutoMetadataResult {
    const autoFields: Record<string, string> = {};
    let idGenerated = false;
    let dateAdded = false;
    let updatedAdded = false;
    let frontmatterUpdated = false;
    const { generateId, idOptions, autoDate, autoUpdated } = options;

    if (generateId && idOptions?.encryptionKey && idOptions?.plaintext) {
        if (!hasFrontmatterField(content, "id")) {
            const generator = new IdGenerator();
            autoFields.id = generator.encryptFF1(idOptions.plaintext, idOptions.encryptionKey, {
                radix: idOptions.radix,
                withChecksum: idOptions.withChecksum,
            });
            idGenerated = true;
        }
    }

    if (autoDate && !hasFrontmatterField(content, "date")) {
        autoFields.date = new Date().toISOString().split("T")[0];
        dateAdded = true;
    }

    if (autoUpdated) {
        autoFields.updated = new Date().toISOString().split("T")[0];
        updatedAdded = true;
    }

    if (Object.keys(autoFields).length > 0) {
        const result = upsertFrontmatterFields(content, autoFields);
        content = result.markdown;
        frontmatterUpdated = true;
    }

    return { content, idGenerated, dateAdded, updatedAdded, frontmatterUpdated };
}

/**
 * 为发布准备 Markdown 文档
 *
 * @param filePath - Markdown 文件路径
 * @param options - 格式化选项
 * @returns 格式化后的内容和统计信息
 *
 * @public
 */
export async function formatForPublish(
    filePath: string,
    options: FormatForPublishOptions = {},
): Promise<FormatForPublishResult> {
    const imageResult = await processImagesForPublish(filePath, {
        convertToHtml: options.convertToHtml,
        width: options.width,
        height: options.height,
        upload: options.upload,
        dryRun: options.dryRun,
    });

    let content = imageResult.content;
    let titleConverted = false;
    let frontmatterUpdated = false;
    let idGenerated = false;
    let dateAdded = false;
    let updatedAdded = false;

    if (options.convertTitle) {
        const result = applyTitleConversion(content);
        content = result.content;
        titleConverted = result.converted;
        frontmatterUpdated = result.converted;
    }

    if (options.frontmatter && Object.keys(options.frontmatter).length > 0) {
        content = applyFrontmatter(content, options.frontmatter);
        frontmatterUpdated = true;
    }

    if (options.autoMetadata) {
        const result = applyAutoMetadata(content, options.autoMetadata);
        content = result.content;
        idGenerated = result.idGenerated;
        dateAdded = result.dateAdded;
        updatedAdded = result.updatedAdded;
        if (result.frontmatterUpdated) {
            frontmatterUpdated = true;
        }
    }

    return {
        content,
        stats: {
            ...imageResult.stats,
            titleConverted,
            frontmatterUpdated,
            idGenerated,
            dateAdded,
            updatedAdded,
        },
    };
}
