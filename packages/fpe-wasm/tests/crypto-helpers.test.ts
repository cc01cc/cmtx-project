import { beforeEach, describe, expect, it } from "vitest";
import {
    createFF1Cipher,
    decryptString,
    encryptString,
    isWasmLoaded,
    loadWASM,
    prepareFPEKey,
} from "../src/index.js";

describe("prepareFPEKey", () => {
    describe("string input", () => {
        it("should pad short string to 32 bytes", () => {
            const key = prepareFPEKey("short");
            expect(key.length).toBe(32);
        });

        it("should pad string exactly to 32 bytes", () => {
            const key = prepareFPEKey("my-secret-key");
            expect(key.length).toBe(32);
        });

        it("should truncate string longer than 32 bytes", () => {
            const longKey = "this-is-a-very-long-key-that-exceeds-32-bytes";
            const key = prepareFPEKey(longKey);
            expect(key.length).toBe(32);
        });

        it("should keep 32-byte string unchanged", () => {
            const exactKey = "12345678901234567890123456789012";
            const key = prepareFPEKey(exactKey);
            expect(key.length).toBe(32);
            expect(new TextDecoder().decode(key)).toBe(exactKey);
        });

        it("should throw for empty string", () => {
            expect(() => prepareFPEKey("")).toThrow();
        });

        it("should throw for undefined", () => {
            expect(() => prepareFPEKey(undefined as unknown as string)).toThrow();
        });

        it("should throw for null", () => {
            expect(() => prepareFPEKey(null as unknown as string)).toThrow();
        });
    });

    describe("Buffer input", () => {
        it("should pad 16-byte buffer to 32 bytes", () => {
            const buf = Buffer.from("1234567890123456", "utf-8");
            const key = prepareFPEKey(buf);
            expect(key.length).toBe(32);
        });

        it("should pad 24-byte buffer to 32 bytes", () => {
            const buf = Buffer.from("123456789012345678901234", "utf-8");
            const key = prepareFPEKey(buf);
            expect(key.length).toBe(32);
        });

        it("should keep 32-byte buffer unchanged", () => {
            const buf = Buffer.from("12345678901234567890123456789012", "utf-8");
            const key = prepareFPEKey(buf);
            expect(key.length).toBe(32);
        });

        it("should throw for buffer shorter than 16 bytes", () => {
            const buf = Buffer.from("short", "utf-8");
            expect(() => prepareFPEKey(buf)).toThrow();
        });

        it("should throw for buffer between 16 and 24 bytes", () => {
            const buf = Buffer.from("12345678901234567", "utf-8");
            expect(() => prepareFPEKey(buf)).toThrow();
        });

        it("should throw for buffer between 24 and 32 bytes", () => {
            const buf = Buffer.from("123456789012345678901234567", "utf-8");
            expect(() => prepareFPEKey(buf)).toThrow();
        });

        it("should throw for empty buffer", () => {
            const buf = Buffer.from("", "utf-8");
            expect(() => prepareFPEKey(buf)).toThrow();
        });
    });
});

describe("createFF1Cipher", () => {
    beforeEach(async () => {
        if (!isWasmLoaded()) {
            await loadWASM();
        }
    });

    it("should create cipher with prepared key", () => {
        const key = prepareFPEKey("test-key");
        const cipher = createFF1Cipher(key, 36);
        expect(cipher).toBeDefined();
        expect(cipher.radix).toBe(36);
    });

    it("should create cipher with default radix 36", () => {
        const key = prepareFPEKey("test-key");
        const cipher = createFF1Cipher(key);
        expect(cipher.radix).toBe(36);
    });

    it("should create cipher with custom radix", () => {
        const key = prepareFPEKey("test-key");
        const cipher = createFF1Cipher(key, 10);
        expect(cipher.radix).toBe(10);
    });

    it("should throw when WASM not loaded", async () => {
        const origWasmLoaded = isWasmLoaded();
        if (!origWasmLoaded) {
            const key = prepareFPEKey("test-key");
            expect(() => createFF1Cipher(key, 36)).toThrow();
        }
    });
});

describe("encryptString / decryptString", () => {
    let cipher: ReturnType<typeof createFF1Cipher>;

    beforeEach(async () => {
        if (!isWasmLoaded()) {
            await loadWASM();
        }
        const key = prepareFPEKey("test-key-32-bytes");
        cipher = createFF1Cipher(key, 36);
    });

    it("should encrypt and decrypt correctly", () => {
        const plaintext = "ABC123";
        const encrypted = encryptString(cipher, plaintext);
        const decrypted = decryptString(cipher, encrypted);
        expect(decrypted).toBe(plaintext);
    });

    it("should preserve length", () => {
        const plaintext = "XYZ789";
        const encrypted = encryptString(cipher, plaintext);
        expect(encrypted.length).toBe(plaintext.length);
    });

    it("should throw when WASM not loaded", async () => {
        const origWasmLoaded = isWasmLoaded();
        if (!origWasmLoaded) {
            expect(() => encryptString(cipher, "ABC123")).toThrow();
            expect(() => decryptString(cipher, "ABC123")).toThrow();
        }
    });
});
