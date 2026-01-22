/**
 * Core Layer Parsing Functions
 */

import type { ParsedImage, ImageMatch, ExtractOptionsInternal } from "./types.js";
import {
  IMAGE_PATTERN,
  splitSrcAndTitle,
  normalizePatterns,
  isWebSource,
  matchesWebHost,
  matchesLocalPrefix,
} from "./utils.js";

/**
 * 解析 Markdown 中的所有图片引用
 */
export function parseMarkdownImages(markdown: string): ParsedImage[] {
  const results: ParsedImage[] = [];
  let match: RegExpExecArray | null;

  // Reset the regex state
  IMAGE_PATTERN.lastIndex = 0;

  while ((match = IMAGE_PATTERN.exec(markdown)) !== null) {
    const raw = match[0];
    const alt = match[1] ?? "";
    const inner = (match[2] ?? "").trim();

    const { src, title } = splitSrcAndTitle(inner);
    if (!src) continue;

    results.push({
      alt,
      src,
      title,
      raw,
      index: match.index,
    });
  }

  return results;
}

/**
 * 从 Markdown 文本中提取图片（内核层）
 * @param markdown - Markdown 文本
 * @param options - 提取选项
 */
export function extractImagesInternal(
  markdown: string,
  options: ExtractOptionsInternal = {},
): ImageMatch[] {
  const webHosts = normalizePatterns(options.webHosts, true);
  const localPrefixes = normalizePatterns(options.localPrefixes, false);

  const parsedImages = parseMarkdownImages(markdown);
  const results: ImageMatch[] = [];

  for (const img of parsedImages) {
    const isWeb = isWebSource(img.src);
    const sourceType = isWeb ? "web" : "local";

    let shouldInclude = false;

    if (isWeb && matchesWebHost(img.src, webHosts)) {
      shouldInclude = true;
    }

    if (!isWeb && matchesLocalPrefix(img.src, localPrefixes)) {
      shouldInclude = true;
    }

    if (shouldInclude) {
      results.push({
        ...img,
        sourceType,
      });
    }
  }

  return results;
}
