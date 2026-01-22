/**
 * Core Layer Utilities
 */

import { normalize, sep, isAbsolute, resolve, dirname } from "node:path";

import type { ImageReferenceLocation } from "./types.js";

/**
 * Markdown 图片语法正则
 * 匹配 ![alt](src) 或 ![alt](src "title")
 */
export const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * Title 提取正则
 */
export const TITLE_PATTERN = /\s+["']([^"']*)["']\s*$/;

/**
 * 规范化文件路径用于比较（处理跨平台和大小写）
 */
export function normalizePath(filePath: string): string {
  const normalized = normalize(filePath).split(sep).join('/');
  
  // Windows 系统下转为小写（不区分大小写）
  if (process.platform === 'win32') {
    return normalized.toLowerCase();
  }
  
  return normalized;
}

/**
 * 判断是否为 Web 链接
 */
export function isWebSource(src: string): boolean {
  return /^(https?:)?\/\//i.test(src.trim());
}

/**
 * 将图片源路径解析为绝对路径
 * @param imageSrc - markdown 中的图片源路径（可能是相对路径或绝对路径）
 * @param markdownFileAbsPath - markdown 文件的绝对路径
 */
export function resolveImagePath(imageSrc: string, markdownFileAbsPath: string): string {
  // 如果是 Web 链接，直接返回
  if (isWebSource(imageSrc)) {
    return imageSrc;
  }
  
  // 如果是绝对路径，直接返回
  if (isAbsolute(imageSrc)) {
    return imageSrc;
  }
  
  // 相对路径：基于 markdown 文件所在目录解析
  const markdownDir = dirname(markdownFileAbsPath);
  return resolve(markdownDir, imageSrc);
}

/**
 * 分离 src 和 title
 */
export function splitSrcAndTitle(value: string): { src: string; title?: string } {
  const trimmed = value.trim();
  if (!trimmed) return { src: "" };

  const titleMatch = TITLE_PATTERN.exec(trimmed);
  if (!titleMatch) {
    return { src: trimmed };
  }

  const title = titleMatch[1] ?? titleMatch[2] ?? "";
  const src = trimmed.slice(0, trimmed.length - titleMatch[0].length).trim();
  return { src, title };
}

/**
 * 规范化配置中的模式数组
 */
export function normalizePatterns(
  patterns: string[] | undefined,
  toLower: boolean,
): string[] | undefined {
  if (!patterns) return undefined;
  const cleaned = patterns.map((p) => p.trim()).filter((p) => p.length > 0);
  if (cleaned.length === 0) return undefined;
  return cleaned.map((p) => (toLower ? p.toLowerCase() : p));
}

/**
 * 匹配 Web 主机名
 */
export function matchesWebHost(src: string, hosts?: string[]): boolean {
  if (!hosts || hosts.length === 0) return false;
  if (hosts.includes("*")) return true;

  const parsed = tryParseUrl(src);
  if (!parsed) return false;

  const hostname = parsed.hostname.toLowerCase();
  return hosts.includes(hostname);
}

/**
 * 匹配本地路径前缀
 */
export function matchesLocalPrefix(src: string, prefixes?: string[]): boolean {
  if (!prefixes || prefixes.length === 0) return false;
  if (prefixes.includes("*")) return true;

  return prefixes.some((prefix) => src.startsWith(prefix));
}

/**
 * 尝试解析 URL
 */
export function tryParseUrl(src: string): URL | undefined {
  try {
    if (src.startsWith("//")) {
      return new URL(`http:${src}`);
    }
    return new URL(src);
  } catch {
    return undefined;
  }
}

/**
 * 根据字符索引计算行号和列号
 *
 * @param text - 完整文本
 * @param index - 字符索引（从 0 开始）
 * @returns 位置信息对象，包含行号（1 开始）、列号（0 开始）和该行文本
 *
 * @remarks
 * 本函数遵循编辑器标准：
 * - 行号从 1 开始（符合编辑器显示习惯）
 * - 列号从 0 开始（符合字符索引习惯）
 *
 * @example
 * ```typescript
 * const text = "line1\nline2\nline3";
 * const result = getLineAndColumn(text, 6);  // 指向 'l' in "line2"
 * // 结果：{ line: 2, column: 0, lineText: "line2" }
 * ```
 */
export function getLineAndColumn(text: string, index: number): ImageReferenceLocation {
  let line = 1;
  let lastLineStart = 0;
  
  for (let i = 0; i < index; i++) {
    if (text[i] === '\n') {
      line++;
      lastLineStart = i + 1;
    }
  }
  
  const column = index - lastLineStart;
  
  // 提取该行文本
  let lineEnd = text.indexOf('\n', lastLineStart);
  if (lineEnd === -1) lineEnd = text.length;
  const lineText = text.slice(lastLineStart, lineEnd);
  
  return { line, column, lineText };
}
