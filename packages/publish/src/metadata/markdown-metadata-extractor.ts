import { readFile, stat } from 'node:fs/promises';
import {
    extractMetadata as extractMetadataFromCore,
    extractSectionHeadings,
    extractTitleFromMarkdown,
    parseFrontmatter,
    parseYamlFrontmatter,
} from '@cmtx/core';
import glob from 'fast-glob';
import type { ExtractOptions, MarkdownMetadata } from '../types.js';

/**
 * 文档管理器
 * 负责文档元数据的提取和管理
 *
 * @public
 */
export class MarkdownMetadataExtractor {
    /**
     * 从文本中提取文档元数据
     *
     * 纯提取操作，不包含副作用（如 ID 生成）。
     * 提取优先级：
     * 1. Frontmatter 中的数据
     * 2. 文档顶部的一级标题（如果 Frontmatter 中没有 title）
     * 3. 章节标题（如果 extractAllHeadings 选项启用）
     *
     * @param content - Markdown 文本内容
     * @param options - 提取选项
     * @returns 提取到的元数据（key-value 对）
     */
    async extractFromText(
        content: string,
        options: ExtractOptions = {}
    ): Promise<Record<string, string | string[]>> {
        const { extractAllHeadings = false, headingLevel = 1 } = options;

        const metadata: Record<string, string | string[]> = {};

        // 提取 Frontmatter
        const { hasFrontmatter, data } = parseFrontmatter(content);
        if (hasFrontmatter) {
            try {
                const frontmatter = parseYamlFrontmatter(data);
                // 将 frontmatter 中的字段合并到 metadata，过滤掉 null 值和非字符串/数组值
                for (const [key, value] of Object.entries(frontmatter)) {
                    if (value !== null && (typeof value === 'string' || Array.isArray(value))) {
                        metadata[key] = value;
                    }
                }
            } catch (error) {
                console.warn('Failed to parse frontmatter:', error);
            }
        }

        // 如果 Frontmatter 中没有 title，尝试从文档顶部提取一级标题
        if (!metadata.title) {
            const title = extractTitleFromMarkdown(content);
            if (title) {
                metadata.title = title;
            }
        }
        // 如果需要，提取所有标题
        if (extractAllHeadings) {
            const headings = extractSectionHeadings(content, {
                minLevel: 1,
                maxLevel: headingLevel,
            });
            if (headings.length > 0) {
                metadata.headings = headings.map((h) => h.text);
            }
        }

        return metadata;
    }

    /**
     * 从文件中提取文档元数据
     *
     * 复用 @cmtx/core 的 extractMetadata 获取基础元数据，
     * 然后添加文件系统属性和额外的 headings 信息。
     *
     * @param filePath - 文件路径
     * @param options - 提取选项
     * @returns 文档元数据（包含内容和文件系统属性）
     */
    async extractFromFile(
        filePath: string,
        options: ExtractOptions = {}
    ): Promise<MarkdownMetadata> {
        const { extractAllHeadings = false, headingLevel = 1 } = options;

        // 复用 @cmtx/core 的 extractMetadata 获取基础元数据
        const coreMetadata = extractMetadataFromCore(filePath, {
            headingLevel,
        });

        // 读取文件以获取 headings 和文件系统信息
        const [content, fileStats] = await Promise.all([
            readFile(filePath, 'utf-8'),
            stat(filePath),
        ]);

        // 构建完整的 metadata
        const metadata: MarkdownMetadata = {
            ...coreMetadata,
            abspath: filePath,
            filename: filePath.split(/[/\\]/).pop() || filePath,
            size: fileStats.size,
            ctime: fileStats.birthtime,
            mtime: fileStats.mtime,
            atime: fileStats.atime,
        };

        // 如果需要，提取所有标题
        if (extractAllHeadings) {
            const headings = extractSectionHeadings(content, {
                minLevel: 1,
                maxLevel: headingLevel,
            });
            if (headings.length > 0) {
                metadata.headings = headings.map((h) => h.text);
            }
        }

        return metadata;
    }

    /**
     * 从目录中批量提取文档元数据
     *
     * 递归扫描目录中的所有 .md 文件，并提取元数据。
     *
     * @param dirPath - 目录路径
     * @param options - 提取选项
     * @returns 文档元数据数组（包含内容和文件系统属性）
     */
    async extractFromDirectory(
        dirPath: string,
        options: ExtractOptions = {}
    ): Promise<MarkdownMetadata[]> {
        const files = await glob('**/*.md', { cwd: dirPath, absolute: true });

        const results = [];
        for (const file of files) {
            try {
                const metadata = await this.extractFromFile(file, options);
                results.push(metadata);
            } catch (error) {
                console.warn(`Failed to extract metadata from ${file}:`, error);
            }
        }

        return results;
    }
}
