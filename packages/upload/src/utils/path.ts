/**
 * 路径处理工具函数
 */

import { resolve, isAbsolute, relative, dirname } from "node:path";

/**
 * 验证并规范化路径
 */
export function resolvePath(basePath: string, targetPath: string): string {
  const absolutePath = isAbsolute(targetPath)
    ? targetPath
    : resolve(basePath, targetPath);

  // 安全检查：确保路径在 basePath 内
  const relPath = relative(basePath, absolutePath);
  if (relPath.startsWith("..") || isAbsolute(relPath)) {
    throw new Error(`Path must be within project root: ${targetPath}`);
  }

  return absolutePath;
}

/**
 * 解析图片的绝对路径（基于 Markdown 文件位置）
 */
export function resolveImagePath(
  imageSrc: string,
  markdownFilePath: string,
  _projectRoot: string,
): string {
  // 如果已经是绝对路径
  if (isAbsolute(imageSrc)) {
    return imageSrc;
  }

  // 相对于 Markdown 文件解析
  const markdownDir = dirname(markdownFilePath);
  return resolve(markdownDir, imageSrc);
}
