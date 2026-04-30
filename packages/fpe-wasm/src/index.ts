/* eslint-disable no-console */

/**
 * FPE WASM 模块 - 自动加载实现
 *
 * 采用懒加载 + Promise 缓存机制，用户无需手动调用 loadWASM()。
 * 首次使用加密功能时会自动加载 WASM 模块。
 *
 * @example 基本使用（推荐）
 * ```typescript
 * import { FF1Cipher, prepareFPEKey } from '@cmtx/fpe-wasm';
 *
 * const key = prepareFPEKey('my-secret-key');
 * const cipher = new FF1Cipher(key, 36);
 * const encrypted = cipher.encrypt(data);
 * ```
 *
 * @example 手动加载（可选）
 * ```typescript
 * import { loadWASM } from '@cmtx/fpe-wasm';
 *
 * await loadWASM(); // 预加载 WASM
 * ```
 *
 * @example VS Code Extension（手动加载）
 * ```typescript
 * import { readFileSync } from 'node:fs';
 * import { join, dirname } from 'node:path';
 * import { loadWASM } from '@cmtx/fpe-wasm';
 *
 * const wasmPath = join(__dirname, 'cmtx_fpe_wasm_bg.wasm');
 * const wasmBuffer = readFileSync(wasmPath);
 * await loadWASM({ data: wasmBuffer });
 * ```
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import init, { type InitInput, type InitOutput } from "../pkg/cmtx_fpe_wasm.js";

// WASM 加载状态（懒加载 + 单例）
let wasmInitPromise: Promise<InitOutput> | null = null;
let wasmOutput: InitOutput | null = null;

export interface ILoadWASMOptions {
    /** WASM 数据，可选。不提供时自动从 pkg 目录加载 */
    data?: InitInput;
}

/**
 * 在 Node.js 环境中自动定位 WASM 文件
 *
 * 使用 __dirname（tsdown shims 会为 ESM 注入）：
 * - CJS: 原生 __dirname
 * - ESM: tsdown 自动注入 shim
 */
function locateWasmFile(): string | null {
    try {
        const wasmPath = join(__dirname, "../pkg/cmtx_fpe_wasm_bg.wasm");
        if (existsSync(wasmPath)) {
            return wasmPath;
        }
        console.warn(`[WARN] WASM file not found: ${wasmPath}`);
        return null;
    } catch {
        return null;
    }
}

// ==================== WASM 加载 ====================

/**
 * @category WASM 加载
 */
export type { InitInput, InitOutput } from "../pkg/cmtx_fpe_wasm.js";

/**
 * 手动加载 WASM 模块（可选）
 *
 * 通常不需要手动调用，首次使用加密功能时会自动加载。
 * 仅在以下场景需要手动调用：
 * 1. 需要预加载 WASM（避免首次调用延迟）
 * 2. VS Code Extension 等特殊环境需要手动处理 WASM 文件
 * 3. 自定义 WASM 加载逻辑
 *
 * @param options - 加载选项（可选）
 * @param options.data - WASM 数据，可以是 ArrayBuffer、Response、URL 等
 *
 * @example
 * ```typescript
 * // 预加载（可选）
 * await loadWASM();
 *
 * // 手动传入 buffer（VS Code Extension）
 * const wasmBuffer = readFileSync('./path/to/cmtx_fpe_wasm_bg.wasm');
 * await loadWASM({ data: wasmBuffer });
 * ```
 *
 * @category WASM 加载
 */
export async function loadWASM(options?: ILoadWASMOptions): Promise<void> {
    if (wasmOutput) {
        return;
    }

    if (wasmInitPromise) {
        await wasmInitPromise;
        return;
    }

    wasmInitPromise = (async () => {
        if (options?.data) {
            wasmOutput = await init({ module_or_path: options.data });
        } else {
            // 默认自动加载：Node.js 环境读取文件，浏览器环境使用 fetch
            const wasmPath = locateWasmFile();
            if (wasmPath) {
                const wasmBuffer = readFileSync(wasmPath);
                wasmOutput = await init({ module_or_path: wasmBuffer });
            } else {
                wasmOutput = await init();
            }
        }
        return wasmOutput;
    })();

    await wasmInitPromise;
}

/**
 * 检查 WASM 是否已加载
 */
export function isWasmLoaded(): boolean {
    return wasmOutput !== null;
}

/**
 * 获取 WASM 输出（内部使用）
 */
export function getWasmOutput(): InitOutput | null {
    return wasmOutput;
}

// ==================== FF1 加密器 ====================

export {
    /** @category FF1 加密器 */
    decrypt_string,
    /** @category FF1 加密器 */
    encrypt_string,
    /** @category FF1 加密器 */
    FF1Cipher,
} from "../pkg/cmtx_fpe_wasm.js";

// ==================== 辅助函数 ====================

export {
    /** @category 辅助函数 */
    createFF1Cipher,
    /** @category 辅助函数 */
    decryptString,
    /** @category 辅助函数 */
    encryptString,
    /** @category 辅助函数 */
    /** @category 辅助函数 */
    prepareFPEKey,
} from "./crypto.js";
