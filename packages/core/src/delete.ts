/**
 * Core Layer Delete Functions
 *
 * @module delete
 * @description
 * 提供图片文件的安全删除功能，支持多种删除策略和重试机制。
 *
 * @remarks
 * ## 功能概述
 *
 * 提供安全可靠的文件删除功能，内置路径验证、重试机制和降级策略。
 * 支持系统回收站、目录移动和永久删除三种策略，确保操作的安全性。
 *
 * ## 核心功能
 *
 * ### 安全机制
 * - {@link validatePathWithinRoot} - 验证路径安全性，防止路径遍历攻击
 * - {@link deleteLocalImageSafely} - 安全删除图片，带使用检查
 *
 * ### 删除策略
 * - {@link deleteLocalImage} - 删除文件，支持 trash/move/hard-delete 三种策略
 * - **trash**: 使用系统回收站（跨平台，推荐，不需要 trashDir）
 * - **move**: 移动到指定目录（需要 trashDir）
 * - **hard-delete**: 永久删除（谨慎使用，不需要 trashDir）
 *
 * ### 重试机制
 * - {@link withRetry} - 通用重试机制，支持指数退避和降级策略
 * - 默认最大重试次数：3 次
 * - 默认基础延迟：100ms
 * - 支持自动降级策略（trash 失败时降级为 move）
 *
 * ## 安全特性
 *
 * - 路径遍历防护：防止删除根目录外的文件
 * - 使用检查：确保图片未被其他文件引用
 * - 重试机制：提高操作成功率
 * - 降级策略：主策略失败时自动切换备用方案
 *
 * @see {@link DeleteFileOptions} - 删除选项配置
 * @see {@link DeleteFileResult} - 删除结果类型
 * @see {@link DeletionStrategy} - 删除策略枚举
 */

import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join, basename } from "node:path";
import trash from "trash";

import { normalizePath } from "./utils.js";
import { filterImagesFromDirectory } from "./filter.js";
import type {
  DeleteFileOptions,
  DeleteFileResult,
  LoggerCallback,
} from "./types.js";

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 100;

/**
 * @internal
 * 重试选项（内部使用）
 */
interface RetryOptions {
    /** 最大重试次数，默认 3 */
    maxRetries?: number;

    /** 基础重试延迟（毫秒），默认 100 */
    baseDelayMs?: number;
}

/**
 * @internal
 * 重试结果（内部使用）
 */
interface RetryResult<T> {
    /** 操作结果（成功时） */
    result?: T;

    /** 重试次数 */
    retries: number;

    /** 错误（失败时） */
    error?: Error;

    /** 是否成功 */
    success: boolean;
}

/**
 * 验证文件路径在安全根目录内
 *
 * @param fileAbsPath - 文件绝对路径
 * @param rootAbsPath - 根目录绝对路径
 * @throws {Error} 如果路径不在根目录内或试图逃逸
 *
 * @remarks
 * 防止路径遍历攻击（Directory Traversal），确保操作不会影响到根目录之外的文件。
 *
 * @example
 * ```typescript
 * validatePathWithinRoot('/project/docs/image.png', '/project');
 * // 正常执行
 *
 * validatePathWithinRoot('/etc/passwd', '/project');
 * // 抛出错误：Security violation: Path "/etc/passwd" is outside root directory "/project"
 * ```
 */
export function validatePathWithinRoot(
  fileAbsPath: string,
  rootAbsPath: string,
): void {
  const normalizedFile = normalizePath(fileAbsPath);
  const normalizedRoot = normalizePath(rootAbsPath);

  const isWithinRoot =
    normalizedFile === normalizedRoot ||
    normalizedFile.startsWith(normalizedRoot + "/");

  if (!isWithinRoot) {
    throw new Error(
      `Security violation: Path "${fileAbsPath}" is outside root directory "${rootAbsPath}"`,
    );
  }
}

/**
 * 通用重试机制
 *
 * @typeParam T - 操作返回值的类型
 * @param operation - 要执行的操作
 * @param fallback - 降级操作（可选）
 * @param options - 重试选项
 * @returns 重试结果
 *
 * @remarks
 * 提供指数退避重试和降级策略：
 * - 默认最大重试次数：3 次
 * - 默认基础延迟：100ms
 * - 指数退避：每次重试延迟时间翻倍
 * - 降级策略：主操作失败时执行 fallback 操作
 *
 * @internal
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  fallback?: () => Promise<T>,
  options?: RetryOptions,
): Promise<RetryResult<T>> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
  } = options || {};
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return { result, retries: attempt, success: true };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else if (fallback) {
        try {
          const result = await fallback();
          return { result, retries: attempt, success: true };
        } catch (fallbackError) {
          lastError =
            fallbackError instanceof Error
              ? fallbackError
              : new Error(String(fallbackError));
        }
      }
    }
  }

  return {
    retries: maxRetries,
    error: lastError || new Error("Unknown error"),
    success: false,
  };
}

/**
 * 使用系统回收站删除（失败时降级为 move 策略）
 *
 * @param filePath - 文件路径
 * @param trashDirAbs - 降级策略的目标目录（可选）
 * @param maxRetries - 最大重试次数
 * @param baseDelayMs - 基础重试延迟
 * @returns 删除结果
 *
 * @remarks
 * trash 策略优先使用系统回收站，如果失败且提供了 trashDirAbs，则降级为 move 策略。
 *
 * 降级逻辑：
 * 1. 尝试使用系统回收站（trash）
 * 2. 如果失败且提供了 trashDirAbs，降级为 move 策略
 * 3. 如果没有提供降级目录，则直接失败
 *
 * @internal
 */
async function deleteWithTrash(
  filePath: string,
  trashDirAbs: string | undefined,
  maxRetries: number,
  baseDelayMs: number,
): Promise<DeleteFileResult> {
  const result = await withRetry(
    async () => {
      await trash([filePath]);
    },
    // 降级策略：如果 trash 失败且有 trashDir，则移动到该目录
    trashDirAbs
      ? async () => {
          await deleteByMove(filePath, trashDirAbs, 0, baseDelayMs);
        }
      : undefined,
    { maxRetries, baseDelayMs },
  );

  if (result.success) {
    return {
      status: "success",
      retries: result.retries,
      actualStrategy: "trash",
    };
  }

  return {
    status: "failed",
    retries: result.retries,
    error:
      result.error?.message || "Failed to delete file using trash strategy",
    actualStrategy: "trash",
  };
}

/**
 * 移动文件到回收目录
 *
 * @param filePath - 文件路径
 * @param trashDirAbs - 回收站绝对路径
 * @param maxRetries - 最大重试次数
 * @param baseDelayMs - 基础重试延迟
 * @returns 删除结果
 *
 * @remarks
 * 将文件移动到指定的回收目录，实现软删除功能。
 * 如果目标目录不存在，会自动创建。
 *
 * 操作步骤：
 * 1. 创建目标目录（如果不存在）
 * 2. 读取源文件内容
 * 3. 将内容写入目标文件
 * 4. 删除源文件
 *
 * @internal
 */
async function deleteByMove(
  filePath: string,
  trashDirAbs: string,
  maxRetries: number,
  baseDelayMs: number,
): Promise<DeleteFileResult> {
  const result = await withRetry(
    async () => {
      await mkdir(trashDirAbs, { recursive: true });
      const filename = basename(filePath);
      const targetPath = join(trashDirAbs, filename);
      const content = await readFile(filePath);
      await writeFile(targetPath, content);
      await unlink(filePath);
    },
    undefined,
    { maxRetries, baseDelayMs },
  );

  if (result.success) {
    return {
      status: "success",
      retries: result.retries,
      actualStrategy: "move",
    };
  }

  return {
    status: "failed",
    retries: result.retries,
    error: result.error?.message,
    actualStrategy: "move",
  };
}

/**
 * 永久删除文件
 *
 * @param filePath - 文件路径
 * @param maxRetries - 最大重试次数
 * @param baseDelayMs - 基础重试延迟
 * @returns 删除结果
 *
 * @remarks
 * 直接从文件系统中删除文件，不可恢复。
 * 请谨慎使用此策略，确保文件不再需要。
 *
 * @warning 此操作不可逆，请确保文件不再需要后再使用。
 *
 * @internal
 */
async function deleteHardDelete(
  filePath: string,
  maxRetries: number,
  baseDelayMs: number,
): Promise<DeleteFileResult> {
  const result = await withRetry(
    async () => {
      await unlink(filePath);
    },
    undefined,
    { maxRetries, baseDelayMs },
  );

  if (result.success) {
    return {
      status: "success",
      retries: result.retries,
      actualStrategy: "hard-delete",
    };
  }

  return {
    status: "failed",
    retries: result.retries,
    error: result.error?.message,
    actualStrategy: "hard-delete",
  };
}

/**
 * 删除/回收本地文件（支持多种策略）
 *
 * @param filePath - 文件绝对路径
 * @param options - 删除选项
 * @returns 删除结果
 *
 * @remarks
 * 支持三种删除策略：
 * - "trash": 使用系统回收站（跨平台，推荐，不需要 trashDir）
 * - "move": 移动到指定目录（需要 trashDir，可选）
 * - "hard-delete": 永久删除（需要谨慎，不需要 trashDir）
 *
 * 内置重试机制：
 * - trash 失败时自动降级为 move（如果提供了 trashDir）
 * - 如果没有提供降级目录，则直接失败
 *
 * @example
 * ```typescript
 * // 使用系统回收站（推荐）
 * const result = await deleteLocalImage("/path/to/image.png", {
 *   strategy: "trash",
 *   maxRetries: 3
 * });
 *
 * // 使用系统回收站，提供降级目录
 * const result = await deleteLocalImage("/path/to/image.png", {
 *   strategy: "trash",
 *   trashDir: "/project/.cmtx-trash",  // 可选降级目录
 *   maxRetries: 3
 * });
 *
 * // 移动到项目回收目录
 * const result = await deleteLocalImage("/path/to/image.png", {
 *   strategy: "move",
 *   trashDir: "/project/.cmtx-trash"  // 必需
 * });
 *
 * // 永久删除
 * const result = await deleteLocalImage("/path/to/image.png", {
 *   strategy: "hard-delete"
 * });
 * ```
 */
export async function deleteLocalImage(
  filePath: string,
  options: DeleteFileOptions,
): Promise<DeleteFileResult> {
  const { strategy, trashDir, maxRetries, baseDelayMs } = options;

  if (strategy === "trash") {
    // trash 策略不需要强制 trashDir，trashDir 仅用作降级策略
    return deleteWithTrash(
      filePath,
      trashDir,
      maxRetries || DEFAULT_MAX_RETRIES,
      baseDelayMs || DEFAULT_BASE_DELAY_MS,
    );
  } else if (strategy === "move") {
    // move 策略需要 trashDir
    if (!trashDir) {
      return {
        status: "skipped",
        retries: 0,
        error: "trashDir is required for move strategy",
      };
    }
    return deleteByMove(
      filePath,
      trashDir,
      maxRetries || DEFAULT_MAX_RETRIES,
      baseDelayMs || DEFAULT_BASE_DELAY_MS,
    );
  } else if (strategy === "hard-delete") {
    return deleteHardDelete(
      filePath,
      maxRetries || DEFAULT_MAX_RETRIES,
      baseDelayMs || DEFAULT_BASE_DELAY_MS,
    );
  }

  return { status: "skipped", retries: 0 };
}

/**
 * 安全删除本地图片文件（带使用检查）
 *
 * @param imgAbsPath - 图片文件绝对路径
 * @param rootAbsPath - 根目录绝对路径
 * @param options - 删除选项
 * @returns 删除结果
 *
 * @remarks
 * 此函数会先验证路径安全性，然后检查图片是否仍在使用中。
 * 只有在图片未被引用时才会执行删除操作。
 *
 * @example
 * ```typescript
 * const result = await deleteLocalImageSafely(
 *   "/project/docs/images/logo.png",
 *   "/project",
 *   { strategy: "trash" }
 * );
 * ```
 */
export async function deleteLocalImageSafely(
  imgAbsPath: string,
  rootAbsPath: string,
  options: DeleteFileOptions,
  logger?: LoggerCallback,
): Promise<DeleteFileResult> {
  try {
    validatePathWithinRoot(imgAbsPath, rootAbsPath);
  } catch (error) {
    logger?.("error", `Path validation failed: ${imgAbsPath}`, { error });
    return {
      status: "failed",
      retries: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const imgs = await filterImagesFromDirectory(rootAbsPath, {
    mode: "absolutePath",
    value: imgAbsPath,
  });

  if (imgs && imgs.length > 0) {
    logger?.(
      "warn",
      `Cannot delete image "${imgAbsPath}": image is still in use`,
    );
    return {
      status: "failed",
      retries: 0,
      error: `Cannot delete image "${imgAbsPath}": image is still in use`,
    };
  }

  return deleteLocalImage(imgAbsPath, options);
}
