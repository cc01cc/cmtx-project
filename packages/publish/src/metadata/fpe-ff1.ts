/* eslint-disable no-console */

/**
 * NIST SP 800-38G FF1 Format-Preserving Encryption
 *
 * 该模块封装 @cmtx/fpe-wasm，提供符合 NIST 标准的 FF1 加密实现。
 *
 * 重要：在使用任何加密功能之前，必须先加载 WASM：
 *
 * @example
 * ```typescript
 * import { ensureWasmLoaded, createFF1Cipher, prepareFPEKey } from '@cmtx/publish';
 *
 * // 自动加载 WASM
 * await ensureWasmLoaded();
 *
 * // 然后可以正常使用加密功能
 * const key = prepareFPEKey('my-secret-key');
 * const cipher = createFF1Cipher(key, 36);
 * ```
 */

import {
    decrypt_string,
    encrypt_string,
    FF1Cipher as FF1CipherWASM,
    isWasmLoaded,
    loadWASM,
} from "@cmtx/fpe-wasm";

/**
 * FF1 加密器类 (从 @cmtx/fpe-wasm 重新导出)
 *
 * @public
 */
export { FF1CipherWASM };

let wasmInitialized = false;

/**
 * 确保 WASM 已加载
 *
 * 自动从相对路径加载 WASM 文件（使用 import.meta.url 定位）。
 */
export async function ensureWasmLoaded(): Promise<void> {
    if (isWasmLoaded() || wasmInitialized) {
        return;
    }

    console.log("[DEBUG] ensureWasmLoaded: loading WASM...");
    await loadWASM();
    wasmInitialized = true;
    console.log("[DEBUG] ensureWasmLoaded: WASM loaded successfully");
}

/**
 * 检查 WASM 是否已加载
 */
export function isEncryptionAvailable(): boolean {
    return isWasmLoaded() || wasmInitialized;
}

/**
 * 准备 FPE 加密密钥
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
 * @throws 如果 WASM 未加载
 *
 * @public
 */
export function createFF1Cipher(key: Uint8Array, radix = 36): FF1CipherWASM {
    if (!isEncryptionAvailable()) {
        throw new Error("WASM not loaded. Call ensureWasmLoaded() first.");
    }
    return new FF1CipherWASM(key, radix);
}

/**
 * 加密字符串 (radix-36)
 *
 * @throws 如果 WASM 未加载
 *
 * @public
 */
export function encryptString(cipher: FF1CipherWASM, plaintext: string): string {
    if (!isEncryptionAvailable()) {
        throw new Error("WASM not loaded. Call ensureWasmLoaded() first.");
    }
    return encrypt_string(cipher, plaintext);
}

/**
 * 解密字符串 (radix-36)
 *
 * @throws 如果 WASM 未加载
 *
 * @public
 */
export function decryptString(cipher: FF1CipherWASM, ciphertext: string): string {
    if (!isEncryptionAvailable()) {
        throw new Error("WASM not loaded. Call ensureWasmLoaded() first.");
    }
    return decrypt_string(cipher, ciphertext);
}

// 重新导出 loadWASM 供手动加载场景使用
export { loadWASM } from "@cmtx/fpe-wasm";
