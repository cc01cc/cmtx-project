import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FF1Cipher, isWasmLoaded, loadWASM, prepareFPEKey } from '@cmtx/fpe-wasm';
import { beforeEach, describe, expect, it } from 'vitest';

const TEST_KEY = 'test-key-32-bytes-long-for-aes!!';

describe('WASM Integration for VS Code Extension', () => {
    beforeEach(() => {
        // Reset WASM state between tests is not possible,
        // but we can verify the loaded state
    });

    // Note: WASM file existence tests removed - build process no longer requires
    // separate .d.ts and .js files in dist directory. WASM is bundled in extension.js

    describe('WASM loading with buffer (VS Code scenario)', () => {
        it('should load WASM from buffer', async () => {
            const wasmPath = join(
                process.cwd(),
                'dist/node_modules/@cmtx/fpe-wasm/cmtx_fpe_wasm_bg.wasm'
            );
            const wasmBuffer = readFileSync(wasmPath);

            await loadWASM({ data: wasmBuffer });
            expect(isWasmLoaded()).toBe(true);
        });

        it('should create cipher after WASM loaded', () => {
            if (!isWasmLoaded()) {
                throw new Error('WASM not loaded');
            }

            const key = prepareFPEKey(TEST_KEY);
            const cipher = new FF1Cipher(key, 36);
            expect(cipher).toBeDefined();
        });

        it('should encrypt and decrypt correctly', () => {
            if (!isWasmLoaded()) {
                throw new Error('WASM not loaded');
            }

            const key = prepareFPEKey(TEST_KEY);
            const cipher = new FF1Cipher(key, 36);

            const plaintext = 'ABC123';
            const encrypted = cipher.encrypt(new Uint8Array([1, 2, 3, 4, 5, 6]));
            const decrypted = cipher.decrypt(encrypted);

            expect(decrypted).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
        });
    });

    describe('Error handling', () => {
        it('should throw when cipher created with invalid key', () => {
            if (!isWasmLoaded()) {
                throw new Error('WASM not loaded');
            }

            const shortKey = new Uint8Array(16);
            expect(() => new FF1Cipher(shortKey, 36)).toThrow();
        });

        it('should throw when cipher created with invalid radix', () => {
            if (!isWasmLoaded()) {
                throw new Error('WASM not loaded');
            }

            const key = prepareFPEKey(TEST_KEY);
            expect(() => new FF1Cipher(key, 1)).toThrow();
            expect(() => new FF1Cipher(key, 37)).toThrow();
        });
    });
});
