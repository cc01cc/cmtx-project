/**
 * 加密 API 封装
 *
 * 提供更友好的 API 来使用 FF1 加密功能。
 * 采用自动 WASM 加载机制，用户无需手动调用 loadWASM()。
 */

import { decrypt_string, encrypt_string, FF1Cipher, isWasmLoaded } from "./index.js";

/**
 * 准备 FPE 加密密钥
 *
 * 将密钥转换为适合 FF1 算法的格式（32 字节）
 *
 * @param key - 原始密钥（字符串或 Buffer）
 * @returns 32 字节的 Uint8Array
 */
export function prepareFPEKey(key: string | Buffer): Uint8Array {
    if (!key) {
        throw new Error(
            "FPE encryption key is required. Please provide it via the encryptionKey parameter.",
        );
    }

    if (Buffer.isBuffer(key)) {
        if (![16, 24, 32].includes(key.length)) {
            throw new Error("Key must be 16, 24, or 32 bytes");
        }
        if (key.length < 32) {
            const padded = Buffer.alloc(32, 0);
            key.copy(padded);
            return new Uint8Array(padded);
        }
        return new Uint8Array(key);
    }

    const padded = key.padEnd(32, "0").slice(0, 32);
    return new Uint8Array(Buffer.from(padded, "utf-8"));
}

/**
 * 创建 FF1 加密器
 *
 * 首次调用时会自动加载 WASM 模块。
 *
 * @param key - 加密密钥
 * @param radix - 进制（默认 36）
 * @returns FF1Cipher 实例
 *
 * @example
 * ```typescript
 * import { createFF1Cipher, prepareFPEKey } from '@cmtx/fpe-wasm';
 *
 * // 无需手动加载 WASM，首次使用时自动加载
 * const key = prepareFPEKey('my-secret-key');
 * const cipher = createFF1Cipher(key, 36);
 * const encrypted = cipher.encrypt(data);
 * ```
 */
export function createFF1Cipher(key: Uint8Array, radix = 36): FF1Cipher {
    // 懒加载：首次创建 cipher 时自动触发 WASM 加载
    // FF1Cipher 构造函数会触发 ensureWasmLoaded()
    return new FF1Cipher(key, radix);
}

/**
 * 加密字符串
 *
 * @param cipher - FF1Cipher 实例
 * @param plaintext - 明文
 * @returns 密文
 */
export function encryptString(cipher: FF1Cipher, plaintext: string): string {
    if (!isWasmLoaded()) {
        throw new Error("WASM not loaded. Please create a FF1Cipher first.");
    }
    return encrypt_string(cipher, plaintext);
}

/**
 * 解密字符串
 *
 * @param cipher - FF1Cipher 实例
 * @param ciphertext - 密文
 * @returns 明文
 */
export function decryptString(cipher: FF1Cipher, ciphertext: string): string {
    if (!isWasmLoaded()) {
        throw new Error("WASM not loaded. Please create a FF1Cipher first.");
    }
    return decrypt_string(cipher, ciphertext);
}

// 兼容旧 API
