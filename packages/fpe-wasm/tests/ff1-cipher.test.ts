import { beforeEach, describe, expect, it } from "vitest";
import { FF1Cipher } from "../src/index.js";

const TEST_KEY = new Uint8Array(32).fill(0);

describe("FF1Cipher", () => {
    describe("constructor", () => {
        it("should create cipher with 32-byte key and radix 36", () => {
            const cipher = new FF1Cipher(TEST_KEY, 36);
            expect(cipher).toBeDefined();
            expect(cipher.radix).toBe(36);
        });

        it("should create cipher with radix 10", () => {
            const cipher = new FF1Cipher(TEST_KEY, 10);
            expect(cipher.radix).toBe(10);
        });

        it("should create cipher with radix 2", () => {
            const cipher = new FF1Cipher(TEST_KEY, 2);
            expect(cipher.radix).toBe(2);
        });

        it("should throw for key length less than 32 bytes", () => {
            const shortKey = new Uint8Array(16);
            expect(() => new FF1Cipher(shortKey, 36)).toThrow();
        });

        it("should throw for key length greater than 32 bytes", () => {
            const longKey = new Uint8Array(64);
            expect(() => new FF1Cipher(longKey, 36)).toThrow();
        });

        it("should throw for radix less than 2", () => {
            expect(() => new FF1Cipher(TEST_KEY, 1)).toThrow();
        });

        it("should throw for radix greater than 36", () => {
            expect(() => new FF1Cipher(TEST_KEY, 37)).toThrow();
        });

        it("should work with different key values", () => {
            const key1 = new Uint8Array(32).fill(1);
            const key2 = new Uint8Array(32).fill(2);
            const cipher1 = new FF1Cipher(key1, 36);
            const cipher2 = new FF1Cipher(key2, 36);
            expect(cipher1.radix).toBe(36);
            expect(cipher2.radix).toBe(36);
        });
    });

    describe("radix property", () => {
        it("should return correct radix", () => {
            const cipher = new FF1Cipher(TEST_KEY, 16);
            expect(cipher.radix).toBe(16);
        });
    });

    describe("encrypt/decrypt bytes", () => {
        let cipher: FF1Cipher;

        beforeEach(() => {
            cipher = new FF1Cipher(TEST_KEY, 36);
        });

        it("should encrypt and decrypt bytes correctly", () => {
            const plaintext = new Uint8Array([1, 2, 3, 4, 5, 6]);
            const encrypted = cipher.encrypt(plaintext);
            const decrypted = cipher.decrypt(encrypted);
            expect(decrypted).toEqual(plaintext);
        });

        it("should preserve format (length unchanged)", () => {
            const plaintext = new Uint8Array([1, 5, 10, 20, 30, 35]);
            const encrypted = cipher.encrypt(plaintext);
            expect(encrypted.length).toBe(plaintext.length);
        });

        it("should produce deterministic encryption", () => {
            const plaintext = new Uint8Array([10, 20, 30, 5, 15, 25]);
            const encrypted1 = cipher.encrypt(plaintext);
            const encrypted2 = cipher.encrypt(plaintext);
            expect(encrypted1).toEqual(encrypted2);
        });

        it("should produce different outputs for different inputs", () => {
            const plaintext1 = new Uint8Array([1, 2, 3, 4, 5, 6]);
            const plaintext2 = new Uint8Array([1, 2, 3, 4, 5, 7]);
            const encrypted1 = cipher.encrypt(plaintext1);
            const encrypted2 = cipher.encrypt(plaintext2);
            expect(encrypted1).not.toEqual(encrypted2);
        });

        it("should work with 4-byte minimum length", () => {
            const plaintext = new Uint8Array([1, 2, 3, 4]);
            const encrypted = cipher.encrypt(plaintext);
            const decrypted = cipher.decrypt(encrypted);
            expect(decrypted).toEqual(plaintext);
        });

        it("should work with longer byte arrays", () => {
            const plaintext = new Uint8Array(100).fill(15);
            const encrypted = cipher.encrypt(plaintext);
            const decrypted = cipher.decrypt(encrypted);
            expect(decrypted).toEqual(plaintext);
        });
    });

    describe("free / dispose", () => {
        it("should support Symbol.dispose (using)", () => {
            using cipher = new FF1Cipher(TEST_KEY, 36);
            expect(cipher.radix).toBe(36);
        });

        it("should support manual free()", () => {
            const cipher = new FF1Cipher(TEST_KEY, 36);
            expect(cipher.radix).toBe(36);
            cipher.free();
        });
    });
});
