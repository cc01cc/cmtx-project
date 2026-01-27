/**
 * Core Layer Modification Functions (Delete & Replace)
 */

import { readFile, writeFile, unlink } from "node:fs/promises";
import { relative, sep } from "node:path";

import { parseMarkdownImages } from "./parser.js";
import { getImageReferenceDetailsInternal, findFilesReferencingImageInternal } from "./query.js";
import type { ImageReferenceDetail, CoreReplacementDetail, CoreReplaceResult } from "./types.js";
import { normalizePath, isWebSource, resolveImagePath, getLineAndColumn } from "./utils.js";

/**
 * 验证文件路径在安全根目录内
 * 
 * @param fileAbsPath - 文件绝对路径
 * @param rootAbsPath - 根目录绝对路径
 * @throws 如果路径不在根目录内或试图逃逸
 */
export function validatePathWithinRoot(
  fileAbsPath: string,
  rootAbsPath: string
): void {
  const normalizedFile = normalizePath(fileAbsPath);
  const normalizedRoot = normalizePath(rootAbsPath);
  
  // 检查文件路径是否以根目录开始
  // 需要确保是目录边界（避免 /root 匹配 /root-other）
  // 注意：normalizePath 已经将路径分隔符统一为 /
  const isWithinRoot = 
    normalizedFile === normalizedRoot || 
    normalizedFile.startsWith(normalizedRoot + '/');
  
  if (!isWithinRoot) {
    throw new Error(
      `Security violation: Path "${fileAbsPath}" is outside root directory "${rootAbsPath}"`
    );
  }
}

/**
 * 删除文件（内核层）
 * 
 * @param fileAbsPath - 文件绝对路径
 * @throws 如果文件删除失败
 */
export async function deleteFileInternal(
  fileAbsPath: string
): Promise<void> {
  try {
    await unlink(fileAbsPath);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete file "${fileAbsPath}": ${error.message}`);
    }
    throw error;
  }
}

/**
 * 安全删除文件（检查引用后删除）
 * 
 * @param fileAbsPath - 文件绝对路径
 * @param searchDirAbsPath - 搜索目录绝对路径
 * @param depth - 搜索深度
 * @returns 删除结果
 */
export async function safeDeleteFileInternal(
  fileAbsPath: string,
  searchDirAbsPath: string,
  depth: "all" | number = "all"
): Promise<{
  deleted: boolean;
  firstReference?: ImageReferenceDetail;
}> {
  // 检查是否有引用
  const details = await getImageReferenceDetailsInternal(
    fileAbsPath,
    searchDirAbsPath,
    depth
  );
  
  if (details.length > 0) {
    // 有引用，返回第一个引用
    return {
      deleted: false,
      firstReference: details[0]
    };
  }
  
  // 无引用，执行删除
  await deleteFileInternal(fileAbsPath);
  
  return {
    deleted: true
  };
}

/**
 * 构建 Markdown 图片语法
 * @param alt - alt 文本
 * @param src - 图片源
 * @param title - title 文本（可选）
 * @returns Markdown 语法字符串
 */
function buildImageMarkdown(alt: string, src: string, title?: string): string {
  if (title) {
    return `![${alt}](${src} "${title}")`;
  }
  return `![${alt}](${src})`;
}

/**
 * 确定替换类型
 */
function determineReplaceType(
  oldAlt: string,
  oldSrc: string,
  newAlt?: string,
  newSrc?: string,
): "src" | "alt" | "both" {
  const altChanged = newAlt !== undefined && newAlt !== oldAlt;
  const srcChanged = newSrc !== undefined && newSrc !== oldSrc;
  
  if (altChanged && srcChanged) return "both";
  if (altChanged) return "alt";
  return "src";
}

/**
 * 在单个文件中替换图片引用
 * @param markdownAbsPath - Markdown 文件的绝对路径
 * @param imageAbsPath - 目标图片的绝对路径
 * @param searchDirAbsPath - 搜索目录的绝对路径（用于计算相对路径）
 * @param options - 替换选项 { newSrc?, newAlt? }
 * @returns 替换结果
 */
export async function replaceImageInFileInternal(
  markdownAbsPath: string,
  imageAbsPath: string,
  searchDirAbsPath: string,
  options: { newSrc?: string; newAlt?: string } = {},
): Promise<CoreReplaceResult> {
  const markdown = await readFile(markdownAbsPath, "utf-8");
  const normalizedImagePath = normalizePath(imageAbsPath);
  
  const parsedImages = parseMarkdownImages(markdown);
  const replacements: CoreReplacementDetail[] = [];
  
  let newMarkdown = markdown;
  let offset = 0;  // 累积偏移量，用于调整后续图片位置
  
  for (const img of parsedImages) {
    // 跳过 Web 链接
    if (isWebSource(img.src)) {
      continue;
    }
    
    // 解析图片路径为绝对路径并比较
    const resolvedPath = resolveImagePath(img.src, markdownAbsPath);
    const normalizedResolvedPath = normalizePath(resolvedPath);
    
    if (normalizedResolvedPath !== normalizedImagePath) {
      continue;
    }
    
    // 构建新的 Markdown 语法
    const newAlt = options.newAlt ?? img.alt;
    const newSrc = options.newSrc ?? img.src;
    const newRaw = buildImageMarkdown(newAlt, newSrc, img.title);
    
    // 计算实际替换位置（考虑累积偏移）
    const actualIndex = img.index + offset;
    
    // 执行替换
    newMarkdown = (
      newMarkdown.slice(0, actualIndex) +
      newRaw +
      newMarkdown.slice(actualIndex + img.raw.length)
    );
    
    // 更新累积偏移量
    offset += (newRaw.length - img.raw.length);
    
    // 记录替换详情（使用原始 markdown 计算位置）
    const location = getLineAndColumn(markdown, img.index);
    replacements.push({
      line: location.line,
      column: location.column,
      oldText: img.raw,
      newText: newRaw,
      type: determineReplaceType(img.alt, img.src, options.newAlt, options.newSrc),
    });
  }
  
  // 如果有替换，写回文件
  if (replacements.length > 0) {
    await writeFile(markdownAbsPath, newMarkdown, "utf-8");
  }
  
  const relPath = relative(searchDirAbsPath, markdownAbsPath).split(sep).join('/');
  
  return {
    relativePath: relPath,
    absolutePath: markdownAbsPath,
    replacements,
    newMarkdown,
  };
}

/**
 * 在目录中替换所有引用某图片的文件
 */
export async function replaceImageInDirectoryInternal(
  imageAbsPath: string,
  searchDirAbsPath: string,
  depth: "all" | number = "all",
  options: { newSrc?: string; newAlt?: string } = {},
): Promise<CoreReplaceResult[]> {
  const results: CoreReplaceResult[] = [];
  
  // 先找到所有引用该图片的文件
  const referencingFiles = await findFilesReferencingImageInternal(
    imageAbsPath,
    searchDirAbsPath,
    depth
  );
  
  // 对每个文件执行替换
  for (const file of referencingFiles) {
    try {
      const result = await replaceImageInFileInternal(
        file.absolutePath,
        imageAbsPath,
        searchDirAbsPath,
        options
      );
      results.push(result);
    } catch {
      // 记录错误但继续处理其他文件
      results.push({
        relativePath: file.relativePath,
        absolutePath: file.absolutePath,
        replacements: [],
        newMarkdown: "",
      });
    }
  }
  
  return results;
}
