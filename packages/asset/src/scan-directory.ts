import {
    type DocEntry,
    extractFrontmatter,
    splitFrontmatter,
    parseYamlFrontmatter,
} from "@cmtx/core";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { glob } from "tinyglobby";

export interface ScanDirectoryOptions {
    /** 是否递归扫描子目录（默认 true） */
    recursive?: boolean;
    /** 排除模式列表 */
    exclude?: string[];
    /** 包含模式列表，默认仅匹配 Markdown 文件 */
    include?: string[];
    /** 是否要求至少有 frontmatter（默认 false） */
    minFrontmatter?: boolean;
}

/**
 * 批量扫描目录下的 Markdown 文件，提取 frontmatter 和元数据
 *
 * @param dirPath - 要扫描的目录路径
 * @param options - 扫描选项
 * @returns 文档条目数组
 * @public
 */
export async function scanDirectory(
    dirPath: string,
    options: ScanDirectoryOptions = {},
): Promise<DocEntry[]> {
    const {
        recursive = true,
        exclude = [],
        include = ["**/*.md"],
        minFrontmatter = false,
    } = options;

    const patterns = include.map((p) => (recursive ? p : p.replace("**/", "")));

    const files = await glob(patterns, {
        cwd: dirPath,
        onlyFiles: true,
        expandDirectories: false,
        ignore: exclude,
    });

    const entries: DocEntry[] = [];

    for (const file of files) {
        try {
            const content = await readFile(join(dirPath, file), "utf-8");
            const { hasFrontmatter, data } = splitFrontmatter(content);

            if (minFrontmatter && !hasFrontmatter) {
                continue;
            }

            const frontmatter = hasFrontmatter ? parseYamlFrontmatter(data) : {};
            const title =
                (extractFrontmatter(content)?.title as string) ??
                content.match(/^#\s+(.+)$/m)?.[1]?.trim() ??
                file.replace(/\.md$/, "");

            entries.push({ filePath: file, frontmatter, title });
        } catch {
            continue;
        }
    }

    return entries;
}
