import { readFileSync } from "node:fs";
import { join } from "node:path";
import init, { type InitInput, type InitOutput } from "../pkg/cmtx_autocorrect_wasm.js";

let wasmInitPromise: Promise<InitOutput> | null = null;
let wasmOutput: InitOutput | null = null;

export interface ILoadWASMOptions {
    /** WASM binary data as Buffer or Uint8Array */
    data?: InitInput;
}

/**
 * Load the AutoCorrect WASM module.
 *
 * This function ensures the WASM module is only loaded once,
 * even if called multiple times concurrently.
 *
 * @param options - Optional configuration for loading WASM
 * @returns Promise that resolves when WASM is loaded
 *
 * @example
 * ```typescript
 * import { loadWASM, format } from "@cmtx/autocorrect-wasm";
 *
 * await loadWASM();
 * const result = format("学习如何用Rust构建Application");
 * console.log(result); // "学习如何用 Rust 构建 Application"
 * ```
 */
export async function loadWASM(options?: ILoadWASMOptions): Promise<void> {
    if (wasmOutput) return;
    if (wasmInitPromise) {
        await wasmInitPromise;
        return;
    }

    wasmInitPromise = (async () => {
        if (options?.data) {
            wasmOutput = await init({ module_or_path: options.data });
        } else {
            const wasmPath = join(__dirname, "../pkg/cmtx_autocorrect_wasm_bg.wasm");
            const wasmBuffer = readFileSync(wasmPath);
            wasmOutput = await init({ module_or_path: wasmBuffer });
        }
        return wasmOutput;
    })();

    await wasmInitPromise;
}

/**
 * Check if the WASM module has been loaded.
 *
 * @returns true if WASM is loaded, false otherwise
 */
export function isWasmLoaded(): boolean {
    return wasmOutput !== null;
}

// Re-export all functions from the wasm-bindgen generated module
export { format, formatFor, lintFor, loadConfig, Ignorer } from "../pkg/cmtx_autocorrect_wasm.js";
