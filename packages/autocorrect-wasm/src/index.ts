import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import init, {
    type InitInput,
    type InitOutput,
    format as wasmFormat,
    formatFor as wasmFormatFor,
    lintFor as wasmLintFor,
    loadConfig as wasmLoadConfig,
    Ignorer as WasmIgnorer,
} from "../pkg/cmtx_autocorrect_wasm.js";

let wasmInitPromise: Promise<InitOutput> | null = null;
let wasmOutput: InitOutput | null = null;

/** WASM 加载选项 */
export interface LoadWasmOptions {
    /** WASM 二进制数据，可选。不提供时自动从 pkg 目录加载 */
    data?: InitInput;
}

function locateWasmFile(): string | null {
    try {
        const wasmPath = join(__dirname, "../pkg/cmtx_autocorrect_wasm_bg.wasm");
        if (existsSync(wasmPath)) {
            return wasmPath;
        }
        console.warn(`[WARN] WASM file not found: ${wasmPath}`);
        return null;
    } catch {
        return null;
    }
}

export type { InitInput, InitOutput } from "../pkg/cmtx_autocorrect_wasm.js";

/**
 * 加载 AutoCorrect WASM 模块
 *
 * 首次调用时会自动加载，通常不需要手动调用。
 * 在 VS Code Extension 等特殊环境中可手动传入 WASM 数据。
 *
 * @param options - 可选的加载选项
 *
 * @example
 * ```typescript
 * await loadWASM();
 * ```
 * @public
 */
export async function loadWASM(options?: LoadWasmOptions): Promise<void> {
    if (wasmOutput) return;
    if (wasmInitPromise) {
        await wasmInitPromise;
        return;
    }

    wasmInitPromise = (async () => {
        if (options?.data) {
            wasmOutput = await init({ module_or_path: options.data });
        } else {
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
 * @returns 是否已加载
 * @public
 */
export function isWasmLoaded(): boolean {
    return wasmOutput !== null;
}

/**
 * 获取 WASM 输出对象
 * @returns WASM 输出对象，未加载时返回 null
 * @internal
 */
export function getWasmOutput(): InitOutput | null {
    return wasmOutput;
}

function guard(): void {
    if (!isWasmLoaded()) {
        throw new Error("WASM module not loaded. Call loadWASM() before using this function.");
    }
}

/**
 * 格式化文本（自动纠错）
 *
 * @param text - 要格式化的文本
 * @returns 格式化后的文本
 *
 * @example
 * ```typescript
 * format("helloworld ") // "hello world"
 * ```
 * @public
 */
export function format(text: string): string {
    guard();
    return wasmFormat(text);
}

/**
 * 按文件类型格式化文本
 *
 * @param raw - 原始文本
 * @param filename_or_ext - 文件名或扩展名（如 "test.md" 或 ".md"）
 * @returns 格式化结果
 * @public
 */
export function formatFor(raw: string, filename_or_ext: string): unknown {
    guard();
    return wasmFormatFor(raw, filename_or_ext);
}

/**
 * 按文件类型检查文本
 *
 * @param raw - 原始文本
 * @param filename_or_ext - 文件名或扩展名
 * @returns 检查结果
 * @public
 */
export function lintFor(raw: string, filename_or_ext: string): unknown {
    guard();
    return wasmLintFor(raw, filename_or_ext);
}

/**
 * 加载 AutoCorrect 配置
 *
 * @param config_str - 配置字符串（JSON 格式）
 * @returns 配置对象
 * @public
 */
export function loadConfig(config_str: string): unknown {
    guard();
    return wasmLoadConfig(config_str);
}

/**
 * 文件忽略检查器
 *
 * 基于 AutoCorrect 的 .autocorrectignore 规则判断文件是否应被忽略。
 *
 * @example
 * ```typescript
 * const ignorer = new Ignorer("/path/to/project");
 * ignorer.isIgnored("node_modules/foo.js"); // true
 * ignorer[Symbol.dispose]();
 * ```
 * @public
 */
export class Ignorer {
    private inner: InstanceType<typeof WasmIgnorer>;

    /**
     * @param work_dir - 工作目录路径（用于加载 .autocorrectignore）
     */
    constructor(work_dir: string) {
        guard();
        this.inner = new WasmIgnorer(work_dir);
    }

    /**
     * 检查路径是否应被忽略
     * @param path - 要检查的路径
     * @returns 是否被忽略
     */
    isIgnored(path: string): boolean {
        return this.inner.isIgnored(path);
    }

    /** 释放 WASM 资源 */
    free(): void {
        this.inner.free();
    }

    /** 显式资源释放 */
    [Symbol.dispose](): void {
        this.inner[Symbol.dispose]();
    }
}
