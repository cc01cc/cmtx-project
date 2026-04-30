import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isWasmLoaded, loadWASM } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("loadWASM", () => {
    describe("auto loading", () => {
        it("should load WASM automatically in Node.js environment", async () => {
            expect(isWasmLoaded()).toBe(true);
        });

        it("should be idempotent - calling multiple times should not throw", async () => {
            await loadWASM();
            await loadWASM();
            expect(isWasmLoaded()).toBe(true);
        });

        it("should handle concurrent calls gracefully", async () => {
            const promises = [loadWASM(), loadWASM(), loadWASM()];
            await Promise.all(promises);
            expect(isWasmLoaded()).toBe(true);
        });
    });

    describe("manual loading with buffer", () => {
        it("should load WASM with provided buffer", async () => {
            const wasmPath = join(__dirname, "../pkg/cmtx_autocorrect_wasm_bg.wasm");
            const wasmBuffer = readFileSync(wasmPath);

            await loadWASM({ data: wasmBuffer });
            expect(isWasmLoaded()).toBe(true);
        });

        it("should load WASM with ArrayBuffer", async () => {
            const wasmPath = join(__dirname, "../pkg/cmtx_autocorrect_wasm_bg.wasm");
            const wasmBuffer = readFileSync(wasmPath);
            const arrayBuffer = wasmBuffer.buffer.slice(
                wasmBuffer.byteOffset,
                wasmBuffer.byteOffset + wasmBuffer.byteLength,
            );

            await loadWASM({ data: arrayBuffer });
            expect(isWasmLoaded()).toBe(true);
        });
    });
});
