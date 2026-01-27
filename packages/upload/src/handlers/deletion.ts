/**
 * 文件删除和回收处理
 *
 * 支持三种策略：
 * - trash: 移到系统回收站（推荐）
 * - move: 移到项目内回收目录
 * - hard-delete: 永久删除
 */

import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join, basename } from "node:path";
import type { DeletionStrategy } from "../types.js";
import { withRetry } from "../utils/retry.js";
import trash from "trash";

export interface DeletionResult {
  status: "success" | "failed" | "skipped";
  retries: number;
  error?: string;
}

/**
 * 删除/回收本地文件
 *
 * @param localPath - 本地文件的绝对路径
 * @param deletionStrategy - 删除策略
 * @param trashDirAbs - 回收站的绝对路径（已提前计算）
 * @param maxRetries - 最大重试次数
 * @returns 删除结果
 */
export async function deleteLocalFile(
  localPath: string,
  deletionStrategy: DeletionStrategy,
  trashDirAbs: string,
  maxRetries: number,
): Promise<DeletionResult> {
  if (deletionStrategy === "trash") {
    return deleteWithTrash(localPath, maxRetries, trashDirAbs);
  } else if (deletionStrategy === "move") {
    return deleteByMove(localPath, trashDirAbs, maxRetries);
  } else if (deletionStrategy === "hard-delete") {
    return deleteHardDelete(localPath, maxRetries);
  }

  return { status: "skipped", retries: 0 };
}

/**
 * 使用系统回收站删除（失败时退化为 move）
 */
async function deleteWithTrash(
  localPath: string,
  maxRetries: number,
  trashDirAbs: string,
): Promise<DeletionResult> {
  const result = await withRetry(
    async () => {
      await trash(localPath);
    },
    async () => {
      // 降级方案：移到回收目录
      await deleteByMove(localPath, trashDirAbs, 0);
    },
    { maxRetries },
  );

  if (result.success) {
    return { status: "success", retries: result.retries };
  }

  return {
    status: "failed",
    retries: result.retries,
    error: result.error?.message,
  };
}

/**
 * 移动文件到回收目录
 */
async function deleteByMove(
  localPath: string,
  trashDirAbs: string,
  maxRetries: number,
): Promise<DeletionResult> {
  const result = await withRetry(
    async () => {
      await mkdir(trashDirAbs, { recursive: true });
      const filename = basename(localPath);
      const targetPath = join(trashDirAbs, filename);
      const content = await readFile(localPath);
      await writeFile(targetPath, content);
      await unlink(localPath);
    },
    undefined,
    { maxRetries },
  );

  if (result.success) {
    return { status: "success", retries: result.retries };
  }

  return {
    status: "failed",
    retries: result.retries,
    error: result.error?.message,
  };
}

/**
 * 永久删除文件
 */
async function deleteHardDelete(
  localPath: string,
  maxRetries: number,
): Promise<DeletionResult> {
  const result = await withRetry(
    async () => {
      await unlink(localPath);
    },
    undefined,
    { maxRetries },
  );

  if (result.success) {
    return { status: "success", retries: result.retries };
  }

  return {
    status: "failed",
    retries: result.retries,
    error: result.error?.message,
  };
}
