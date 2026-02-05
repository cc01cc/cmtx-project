/**
 * Core Layer Utilities
 *
 * @module utils
 * @description
 * 提供工具函数，包括路径规范化、类型判断和 Web 链接检测。
 *
 * @remarks
 * ## 功能概述
 *
 * 提供核心包所需的基础工具函数，主要用于路径处理和类型判断。
 * 所有函数都经过优化，支持跨平台兼容性。
 *
 * ## 核心功能
 *
 * ### 路径处理
 * - {@link normalizePath} - 路径规范化（跨平台兼容）
 *
 * ### 类型判断
 * - {@link isWebSource} - 判断是否为 Web 链接
 * - 类型守卫：{@link isWebImage}, {@link isLocalImage}, {@link hasAbsLocalPath} 等
 *
 * ### 跨平台支持
 * - 自动处理 Windows 和 Unix 系统的路径差异
 * - 统一使用正斜杠作为路径分隔符
 * - Windows 系统下自动转换为小写（不区分大小写）
 *
 * @example
 * ```typescript
 * import { normalizePath, isWebSource, isLocalImage } from '@cmtx/core';
 *
 * // 规范化路径
 * const normalized = normalizePath('/path\\to/file.png');
 *
 * // 判断图片来源
 * const isWeb = isWebSource('https://example.com/image.png');
 *
 * // 类型守卫
 * if (isLocalImage(image)) {
 *   console.log(image.absLocalPath);
 * }
 * ```
 *
 * @see {@link ImageMatch} - 图片匹配类型
 * @see {@link LocalImageMatchWithAbsPath} - 带绝对路径的本地图片类型
 */

import { normalize, sep } from "node:path";

import type {
  ImageMatch,
  WebImageMatch,
  LocalImageMatch,
  LocalImageMatchRelative,
  LocalImageMatchWithAbsPath,
} from "./types.js";

/**
 * 规范化文件路径用于比较（处理跨平台和大小写）
 *
 * @param filePath - 要规范化的文件路径
 * @returns 规范化后的路径（使用正斜杠）
 *
 * @remarks
 * - 统一使用正斜杠 `/` 作为路径分隔符
 * - Windows 系统下转为小写（不区分大小写）
 * - 用于跨平台的路径比较
 *
 * @internal
 */
export function normalizePath(filePath: string): string {
  const normalized = normalize(filePath).split(sep).join("/");

  // Windows 系统下转为小写（不区分大小写）
  if (process.platform === "win32") {
    return normalized.toLowerCase();
  }

  return normalized;
}

/**
 * 判断是否为 Web 链接
 *
 * @param src - 图片源地址
 * @returns 如果是 Web 链接返回 true
 *
 * @remarks
 * 匹配以 `http://`、`https://` 或 `//` 开头的 URL
 *
 * @internal
 */
export function isWebSource(src: string): boolean {
  return /^(https?:)?\/\//i.test(src.trim());
}

/**
 * 判断是否为 Web 图片匹配
 *
 * @param img - 图片匹配对象
 * @returns 类型守卫，如果是 Web 图片返回 true
 *
 * @internal
 */
export function isWebImage(img: ImageMatch): img is WebImageMatch {
  return img.type === "web";
}

/**
 * 判断是否为本地图片匹配
 *
 * @param img - 图片匹配对象
 * @returns 类型守卫，如果是本地图片返回 true
 *
 * @internal
 */
export function isLocalImage(img: ImageMatch): img is LocalImageMatch {
  return img.type === "local";
}

/**
 * 判断是否为带绝对路径的本地图片匹配
 *
 * @param img - 图片匹配对象
 * @returns 类型守卫，如果是带绝对路径的本地图片返回 true
 *
 * @internal
 */
export function isLocalImageWithAbsPath(
  img: ImageMatch,
): img is LocalImageMatchWithAbsPath {
  return img.type === "local" && "absLocalPath" in img;
}

/**
 * 判断是否为相对路径的本地图片匹配
 *
 * @param img - 图片匹配对象
 * @returns 类型守卫，如果是相对路径的本地图片返回 true
 *
 * @internal
 */
export function isLocalImageRelative(
  img: ImageMatch,
): img is LocalImageMatchRelative {
  return img.type === "local" && !("absLocalPath" in img);
}

/**
 * 判断图片是否有绝对路径
 *
 * @param img - 图片匹配对象
 * @returns 类型守卫，如果图片有绝对路径返回 true
 *
 * @internal
 */
export function hasAbsLocalPath(
  img: ImageMatch,
): img is LocalImageMatchWithAbsPath {
  return isLocalImageWithAbsPath(img);
}
