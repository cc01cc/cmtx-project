/* eslint-disable no-console */

import { readFile, stat } from "node:fs/promises";
import { extractFrontmatter, extractSectionHeadings, type FrontmatterValue } from "@cmtx/core";
import { glob } from "tinyglobby";
import type { ExtractOptions, MarkdownMetadata } from "../types.js";

/**
 * 文档管理器
 * 负责文档元数据的提取和管理
 *
 * @public
 */
export class MarkdownMetadataExtractor {
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
        options: ExtractOptions = {},
    ): Promise<MarkdownMetadata> {
        const { extractAllHeadings = false, headingLevel = 1 } = options;

        // 读取文件内容
        const [content, fileStats] = await Promise.all([
            readFile(filePath, "utf-8"),
            stat(filePath),
        ]);

        // 从 frontmatter 提取元数据
        const frontmatter = extractFrontmatter(content) ?? {};
        const metadata: MarkdownMetadata = {
            ...frontmatter,
            title:
                (frontmatter.title as string | undefined) ??
                extractTitle(content, headingLevel, filePath),
            abspath: filePath,
            filename: filePath.split(/[/\\]/).pop() || filePath,
            size: fileStats.size,
            ctime: fileStats.birthtime,
            mtime: fileStats.mtime,
            atime: fileStats.atime,
        };

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
        options: ExtractOptions = {},
    ): Promise<MarkdownMetadata[]> {
        const files = await glob("**/*.md", { cwd: dirPath, absolute: true });

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

/**
 * 从 Markdown 内容中提取标题（frontmatter → heading → filename fallback）
 */
function extractTitle(content: string, headingLevel: number, filePath: string): string {
    const fm = extractFrontmatter(content);
    if (fm?.title) return String(fm.title);

    const headingRegex = new RegExp(String.raw`^${"#".repeat(headingLevel)}\s+(.+)$`, "m");
    const headingMatch = headingRegex.exec(content);
    if (headingMatch) return headingMatch[1].trim();

    const filename = filePath.split(/[/\\]/).pop() || filePath;
    return filename.replace(/\.[^.]+$/, "");
}
