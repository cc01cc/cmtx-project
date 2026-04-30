/* eslint-disable no-console */

import { glob } from "tinyglobby";
import { MarkdownMetadataExtractor } from "./markdown-metadata-extractor.js";

/**
 * ID 唯一性检查选项
 */
export interface IsUniqueIdOptions {
    /** 是否区分大小写（默认：false，不区分大小写） */
    caseSensitive?: boolean;
}

/**
 * 检查单个文件是否包含指定 ID
 */
async function checkFileForId(
    filePath: string,
    normalizedNewId: string,
    caseSensitive: boolean,
    extractor: MarkdownMetadataExtractor,
): Promise<boolean | undefined> {
    try {
        const metadata = await extractor.extractFromFile(filePath);
        if (metadata.id) {
            const existingId = caseSensitive ? metadata.id : metadata.id.toLowerCase();
            if (existingId === normalizedNewId) {
                return false;
            }
        }
    } catch (error) {
        console.warn(`Failed to extract metadata from ${filePath}:`, error);
    }
    return undefined;
}

/**
 * 检查给定的 ID 是否在指定的 Markdown 文件中唯一
 *
 * 扫描与 glob 模式匹配的所有 Markdown 文件，提取其 frontmatter 中的 ID，
 * 检查新 ID 是否与任何现有 ID 重复。仅检查包含 frontmatter 且有 ID 字段的文件。
 *
 * @param newId - 要检查的新 ID
 * @param globPattern - glob 文件模式（例如：`**\/*.md`, `docs/**\/*.md`）
 * @param options - 检查选项
 * @returns true 如果 ID 唯一（安全使用），false 如果 ID 已存在
 *
 * @example
 * ```typescript
 * const isUnique = await isUniqueId('my-doc-123', '**\/*.md');
 * if (isUnique) {
 *   console.log('ID is safe to use');
 * }
 * ```
 *
 * @example
 * 使用区分大小写模式
 * ```typescript
 * const isUnique = await isUniqueId('myId', '**\/*.md', { caseSensitive: true });
 * // 'myId' 和 'MyId' 被视为不同的 ID
 * ```
 */
export async function isUniqueId(
    newId: string,
    globPattern: string,
    options: IsUniqueIdOptions = {},
): Promise<boolean> {
    const { caseSensitive = false } = options;

    // 规范化新 ID 以便比较
    const normalizedNewId = caseSensitive ? newId : newId.toLowerCase();

    try {
        // 使用 glob 查找匹配模式的文件
        const files = await glob(globPattern);

        if (files.length === 0) {
            // 没有找到匹配的文件，ID 唯一
            return true;
        }

        // 创建提取器实例
        const extractor = new MarkdownMetadataExtractor();

        // 检查每个文件
        for (const filePath of files) {
            const result = await checkFileForId(
                filePath,
                normalizedNewId,
                caseSensitive,
                extractor,
            );
            if (result === false) {
                return false;
            }
        }

        // 未找到重复的 ID，ID 唯一
        return true;
    } catch (error) {
        // 在 glob 或其他操作失败时，假设 ID 唯一
        console.warn("Error checking ID uniqueness:", error);
        return true;
    }
}
