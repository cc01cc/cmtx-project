/**
 * Core Layer Query Functions
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import { parseMarkdownImages } from "./parser.js";
import type { ImageReferenceLocation, ImageReferenceDetail } from "./types.js";
import { normalizePath, isWebSource, resolveImagePath, getLineAndColumn } from "./utils.js";

/**
 * 从 Markdown 提取特定图片的所有引用位置
 * @param markdown - Markdown 文本内容
 * @param targetImageAbsPath - 目标图片的绝对路径（已规范化）
 * @param markdownFileAbsPath - Markdown 文件的绝对路径
 * @returns 引用位置数组
 */
export function extractSingleImageLocations(
  markdown: string,
  targetImageAbsPath: string,
  markdownFileAbsPath: string,
): ImageReferenceLocation[] {
  const locations: ImageReferenceLocation[] = [];
  const parsedImages = parseMarkdownImages(markdown);
  
  for (const img of parsedImages) {
    // 跳过 Web 链接
    if (isWebSource(img.src)) {
      continue;
    }
    
    // 解析图片路径为绝对路径
    const resolvedPath = resolveImagePath(img.src, markdownFileAbsPath);
    const normalizedResolvedPath = normalizePath(resolvedPath);
    
    // 比较规范化后的路径
    if (normalizedResolvedPath === targetImageAbsPath) {
      const location = getLineAndColumn(markdown, img.index);
      locations.push(location);
    }
  }
  
  return locations;
}

/**
 * 检查单个文件是否引用了特定图片（内核层）
 * @param imageAbsPath - 图片绝对路径
 * @param markdownFileAbsPath - Markdown 文件绝对路径
 */
export async function isImageReferencedInFileInternal(
  imageAbsPath: string,
  markdownFileAbsPath: string,
): Promise<boolean> {
  const normalizedImagePath = normalizePath(imageAbsPath);
  
  let markdown: string;
  try {
    markdown = await readFile(markdownFileAbsPath, "utf-8");
  } catch (error) {
    throw new Error(`Cannot read markdown file: ${markdownFileAbsPath}: ${error}`);
  }
  
  const parsedImages = parseMarkdownImages(markdown);
  
  for (const img of parsedImages) {
    if (isWebSource(img.src)) {
      continue;
    }
    
    const resolvedPath = resolveImagePath(img.src, markdownFileAbsPath);
    const normalizedResolvedPath = normalizePath(resolvedPath);
    
    if (normalizedResolvedPath === normalizedImagePath) {
      return true;
    }
  }
  
  return false;
}

/**
 * 查找所有引用特定图片的文件（内核层）
 * @param imageAbsPath - 图片绝对路径
 * @param searchDirAbsPath - 搜索目录绝对路径
 * @param depth - 扫描深度
 */
export async function findFilesReferencingImageInternal(
  imageAbsPath: string,
  searchDirAbsPath: string,
  depth: "all" | number = "all",
): Promise<Array<{ relativePath: string; absolutePath: string }>> {
  const results: Array<{ relativePath: string; absolutePath: string }> = [];
  const normalizedImagePath = normalizePath(imageAbsPath);

  async function scanDir(dirAbsPath: string, currentDepth: number): Promise<void> {
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
            const markdown = await readFile(fullPath, "utf-8");
            const parsedImages = parseMarkdownImages(markdown);
            
            let referenced = false;
            for (const img of parsedImages) {
              if (isWebSource(img.src)) {
                continue;
              }
              
              const resolvedPath = resolveImagePath(img.src, fullPath);
              const normalizedResolvedPath = normalizePath(resolvedPath);
              
              if (normalizedResolvedPath === normalizedImagePath) {
                referenced = true;
                break;
              }
            }
            
            if (referenced) {
              const relativePath = relative(searchDirAbsPath, fullPath).split(sep).join('/');
              results.push({
                relativePath,
                absolutePath: fullPath,
              });
            }
          } catch {
            continue;
          }
        }
      }
    }
  }

  // 验证搜索目录存在
  try {
    const dirStat = await stat(searchDirAbsPath);
    if (!dirStat.isDirectory()) {
      throw new Error(`Path is not a directory: ${searchDirAbsPath}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Path is not a directory')) {
      throw error;
    }
    throw new Error(`Cannot access directory: ${searchDirAbsPath}: ${error}`);
  }

  await scanDir(searchDirAbsPath, 0);
  return results;
}

/**
 * 获取图片引用详情（内核层）
 * @param imageAbsPath - 图片绝对路径
 * @param searchDirAbsPath - 搜索目录绝对路径
 * @param depth - 扫描深度
 */
export async function getImageReferenceDetailsInternal(
  imageAbsPath: string,
  searchDirAbsPath: string,
  depth: "all" | number = "all",
): Promise<ImageReferenceDetail[]> {
  const normalizedImagePath = normalizePath(imageAbsPath);
  const results: ImageReferenceDetail[] = [];

  // 先找到所有引用该图片的文件
  const referencingFiles = await findFilesReferencingImageInternal(
    imageAbsPath,
    searchDirAbsPath,
    depth
  );

  // 遍历每个文件，提取详细的引用位置
  for (const file of referencingFiles) {
    try {
      const markdown = await readFile(file.absolutePath, "utf-8");
      const locations = extractSingleImageLocations(
        markdown,
        normalizedImagePath,
        file.absolutePath
      );

      if (locations.length > 0) {
        results.push({
          relativePath: file.relativePath,
          absolutePath: file.absolutePath,
          locations,
        });
      }
    } catch {
      // 跳过无法读取的文件
      continue;
    }
  }

  return results;
}
