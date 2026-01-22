/**
 * Core Layer File Operations
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import { extractImagesInternal } from "./parser.js";
import type { ImageMatch, ExtractOptionsInternal } from "./types.js";

/**
 * 从单个文件提取图片（内核层）
 * @param fileAbsPath - 文件绝对路径
 * @param options - 提取选项
 */
export async function extractImagesFromFileInternal(
  fileAbsPath: string,
  options: ExtractOptionsInternal = {},
): Promise<ImageMatch[]> {
  const content = await readFile(fileAbsPath, "utf-8");
  return extractImagesInternal(content, options);
}

/**
 * 从目录递归扫描并提取图片（内核层）
 * @param rootDirAbsPath - 根目录绝对路径
 * @param options - 扫描选项
 * @param currentDepth - 当前深度
 * @returns 扫描结果（包含相对路径和绝对路径）
 */
export async function extractImagesFromDirectoryInternal(
  rootDirAbsPath: string,
  options: ExtractOptionsInternal & { depth?: "all" | number } = {},
): Promise<Array<{ relativePath: string; absolutePath: string; images: ImageMatch[] }>> {
  const { depth = "all", ...extractOptions } = options;
  const results: Array<{ relativePath: string; absolutePath: string; images: ImageMatch[] }> = [];

  async function scanDir(dirAbsPath: string, currentDepth: number): Promise<void> {
    // 检查深度限制
    if (depth !== "all" && currentDepth > depth) {
      return;
    }

    let entries;
    try {
      entries = await readdir(dirAbsPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dirAbsPath, entry.name);

      if (entry.isDirectory()) {
        await scanDir(fullPath, currentDepth + 1);
      } else if (entry.isFile()) {
        const lowerName = entry.name.toLowerCase();
        if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) {
          try {
            const images = await extractImagesFromFileInternal(fullPath, extractOptions);
            const relativePath = relative(rootDirAbsPath, fullPath).split(sep).join('/');
            
            results.push({
              relativePath,
              absolutePath: fullPath,
              images,
            });
          } catch {
            continue;
          }
        }
      }
    }
  }

  // 验证根目录存在
  try {
    const dirStat = await stat(rootDirAbsPath);
    if (!dirStat.isDirectory()) {
      throw new Error(`Path is not a directory: ${rootDirAbsPath}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Path is not a directory')) {
      throw error;
    }
    throw new Error(`Cannot access directory: ${rootDirAbsPath}: ${error}`);
  }

  await scanDir(rootDirAbsPath, 0);
  return results;
}
