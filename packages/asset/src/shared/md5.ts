/**
 * MD5 工具函数
 *
 * @module shared/md5
 * @description
 * 提供 MD5 哈希生成函数，供 Upload 和 Download 模块共用。
 */

import { createHash } from "node:crypto";

/**
 * 生成 MD5 哈希
 *
 * @param content - 文件内容（字符串或 Buffer）
 * @param length - 哈希长度（默认 32，即完整 MD5）
 * @returns MD5 哈希值（十六进制字符串）
 *
 * @example
 * ```typescript
 * // 完整 MD5
 * const md5 = generateMD5(buffer);
 * // => 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
 *
 * // 前 8 位
 * const md5_8 = generateMD5(buffer, 8);
 * // => 'a1b2c3d4'
 *
 * // 前 16 位
 * const md5_16 = generateMD5(buffer, 16);
 * // => 'a1b2c3d4e5f6g7h8'
 * ```
 */
export function generateMD5(content: string | Buffer, length: number = 32): string {
    const hash = createHash("md5");
    hash.update(content);
    return hash.digest("hex").slice(0, length);
}
