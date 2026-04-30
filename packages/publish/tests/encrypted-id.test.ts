import { beforeEach, describe, expect, it } from "vitest";
import {
    createFF1Cipher,
    decryptString,
    encryptString,
    prepareFPEKey,
} from "../src/metadata/fpe-ff1.js";
import { IdGenerator } from "../src/metadata/id-generator.js";
import { LuhnAlgorithm } from "../src/metadata/luhn.js";

const TEST_KEY = "test-key-32-bytes-long-for-aes!!";

describe("FF1Cipher", () => {
    let cipher: ReturnType<typeof createFF1Cipher>;

    beforeEach(() => {
        cipher = createFF1Cipher(prepareFPEKey(TEST_KEY), 36);
    });

    it("should encrypt and decrypt correctly", () => {
        const plaintext = "000001";
        const encrypted = encryptString(cipher, plaintext);
        const decrypted = decryptString(cipher, encrypted);

        expect(decrypted).toBe(plaintext);
    });

    it("should preserve length (format-preserving)", () => {
        const plaintext = "ABC123";
        const encrypted = encryptString(cipher, plaintext);

        expect(encrypted.length).toBe(plaintext.length);
    });

    it("should produce different outputs for different inputs", () => {
        const encrypted1 = encryptString(cipher, "000001");
        const encrypted2 = encryptString(cipher, "000002");

        expect(encrypted1).not.toBe(encrypted2);
    });

    it("should be deterministic", () => {
        const plaintext = "XYZ789";
        const encrypted1 = encryptString(cipher, plaintext);
        const encrypted2 = encryptString(cipher, plaintext);

        expect(encrypted1).toBe(encrypted2);
    });

    it("should only use valid alphabet characters", () => {
        const plaintext = "123456";
        const encrypted = encryptString(cipher, plaintext);

        expect(encrypted).toMatch(/^[0-9A-Z]+$/);
    });

    it("should work with 4+ character inputs", () => {
        const plaintext = "ABCD";
        const encrypted = encryptString(cipher, plaintext);
        const decrypted = decryptString(cipher, encrypted);

        expect(encrypted.length).toBe(4);
        expect(decrypted).toBe(plaintext);
    });

    it("should throw for inputs shorter than 4 characters", () => {
        expect(() => encryptString(cipher, "AB")).toThrow();
        expect(() => encryptString(cipher, "abc")).toThrow();
    });

    it("should work with custom key", () => {
        const customKey = Buffer.from("custom-key-32-bytes-long-prod!!!", "utf-8");
        const customCipher = createFF1Cipher(prepareFPEKey(customKey), 36);

        const plaintext = "TEST12";
        const encrypted = encryptString(customCipher, plaintext);
        const decrypted = decryptString(customCipher, encrypted);

        expect(decrypted).toBe(plaintext);
    });

    it("should encrypt bytes correctly", () => {
        const plaintext = new Uint8Array([1, 2, 3, 4, 5, 6]);
        const encrypted = cipher.encrypt(plaintext);
        const decrypted = cipher.decrypt(encrypted);

        expect(decrypted).toEqual(plaintext);
    });
});

describe("prepareFPEKey", () => {
    it("should prepare key from string", () => {
        const key = prepareFPEKey("my-secret-key");
        expect(key.length).toBe(32);
    });

    it("should prepare key from buffer", () => {
        const key = prepareFPEKey(Buffer.from("1234567890123456", "utf-8"));
        expect(key.length).toBe(32);
    });

    it("should keep 32-byte buffer as is", () => {
        const key = prepareFPEKey(Buffer.from("12345678901234567890123456789012", "utf-8"));
        expect(key.length).toBe(32);
    });

    it("should throw for empty key", () => {
        expect(() => prepareFPEKey("")).toThrow();
        expect(() => prepareFPEKey(undefined as unknown as string)).toThrow();
    });

    it("should throw for invalid buffer length", () => {
        expect(() => prepareFPEKey(Buffer.from("short", "utf-8"))).toThrow();
    });
});

describe("LuhnAlgorithm", () => {
    describe("radix-10", () => {
        it("should calculate correct checksum for digits", () => {
            const checksum = LuhnAlgorithm.calculateChecksum("7992739871", 10);
            expect(checksum).toBe("3");
        });

        it("should validate correct number", () => {
            expect(LuhnAlgorithm.validate("79927398713", 10)).toBe(true);
        });

        it("should detect invalid number", () => {
            expect(LuhnAlgorithm.validate("79927398714", 10)).toBe(false);
        });
    });

    describe("radix-36", () => {
        it("should calculate checksum", () => {
            const checksum = LuhnAlgorithm.calculateChecksum("A3K9X7", 36);
            expect(checksum).toMatch(/^[0-9A-Z]$/);
        });

        it("should validate and append", () => {
            const original = "ABC123";
            const withChecksum = LuhnAlgorithm.appendChecksum(original, 36);

            expect(withChecksum.length).toBe(7);
            expect(LuhnAlgorithm.validate(withChecksum, 36)).toBe(true);
        });

        it("should detect single character error", () => {
            const original = "A3K9X7";
            const withChecksum = LuhnAlgorithm.appendChecksum(original, 36);

            const corrupted = `${withChecksum.slice(0, 3)}Z${withChecksum.slice(4)}`;

            expect(LuhnAlgorithm.validate(corrupted, 36)).toBe(false);
        });

        it("should be case insensitive", () => {
            const original = "ABC123";
            const withChecksum = LuhnAlgorithm.appendChecksum(original, 36);

            expect(LuhnAlgorithm.validate(withChecksum.toLowerCase(), 36)).toBe(true);
            expect(LuhnAlgorithm.validate(withChecksum.toUpperCase(), 36)).toBe(true);
        });
    });
});

describe("IdGenerator", () => {
    let generator: IdGenerator;

    beforeEach(() => {
        generator = new IdGenerator();
    });

    describe("encryptFF1", () => {
        it("should encrypt string (format-preserving)", () => {
            const plaintext = "ABC123";
            const id = generator.encryptFF1(plaintext, TEST_KEY);
            expect(id.length).toBe(plaintext.length);
            expect(id).toMatch(/^[0-9A-Z]{6}$/);
        });

        it("should preserve length for different inputs", () => {
            const cases = ["ABCD", "ABCDEF", "ABCDEFGH"];
            for (const plaintext of cases) {
                const id = generator.encryptFF1(plaintext, TEST_KEY);
                expect(id.length).toBe(plaintext.length);
            }
        });

        it("should produce deterministic output", () => {
            const id1 = generator.encryptFF1("ABC123", TEST_KEY);
            const id2 = generator.encryptFF1("ABC123", TEST_KEY);
            expect(id1).toBe(id2);
        });

        it("should produce different outputs for different inputs", () => {
            const id1 = generator.encryptFF1("ABC123", TEST_KEY);
            const id2 = generator.encryptFF1("ABC124", TEST_KEY);
            expect(id1).not.toBe(id2);
        });

        it("should add checksum when withChecksum is true", () => {
            const plaintext = "ABC123";
            const id = generator.encryptFF1(plaintext, TEST_KEY, {
                withChecksum: true,
            });
            expect(id.length).toBe(plaintext.length + 1);
        });

        it("should work with Buffer key", () => {
            const key = Buffer.from(TEST_KEY, "utf-8");
            const id = generator.encryptFF1("ABCDEF", key);
            expect(id.length).toBe(6);
        });
    });

    describe("decryptFF1", () => {
        it("should decrypt to original value", () => {
            const original = "ABC123";
            const id = generator.encryptFF1(original, TEST_KEY);
            const decrypted = generator.decryptFF1(id, TEST_KEY);

            expect(decrypted).toBe(original);
        });

        it("should decrypt with checksum", () => {
            const original = "ABCDEF";
            const id = generator.encryptFF1(original, TEST_KEY, {
                withChecksum: true,
            });
            const decrypted = generator.decryptFF1(id, TEST_KEY, {
                withChecksum: true,
            });

            expect(decrypted).toBe(original);
        });

        it("should throw for invalid ID", () => {
            expect(() => generator.decryptFF1("AB", TEST_KEY)).toThrow();
        });

        it("should throw for invalid characters", () => {
            expect(() => generator.decryptFF1("AB!@#D", TEST_KEY)).toThrow();
        });
    });

    describe("validateEncryptedId", () => {
        it("should validate encrypted ID", () => {
            const id = generator.encryptFF1("ABC123", TEST_KEY);
            const validation = generator.validateEncryptedId(id, {
                encryptionKey: TEST_KEY,
            });

            expect(validation.valid).toBe(true);
        });

        it("should validate with checksum", () => {
            const id = generator.encryptFF1("ABC123", TEST_KEY, {
                withChecksum: true,
            });
            const validation = generator.validateEncryptedId(id, {
                encryptionKey: TEST_KEY,
                withChecksum: true,
            });

            expect(validation.valid).toBe(true);
            expect(validation.checksumValid).toBe(true);
        });

        it("should reject invalid ID (too short)", () => {
            const validation = generator.validateEncryptedId("ABC", {
                encryptionKey: TEST_KEY,
            });

            expect(validation.valid).toBe(false);
        });

        it("should reject invalid characters", () => {
            const validation = generator.validateEncryptedId("AB!@#D", {
                encryptionKey: TEST_KEY,
            });

            expect(validation.valid).toBe(false);
        });

        it("should be case insensitive", () => {
            const id = generator.encryptFF1("ABC123", TEST_KEY);
            const lowerId = id.toLowerCase();

            const validation = generator.validateEncryptedId(lowerId, {
                encryptionKey: TEST_KEY,
            });

            expect(validation.valid).toBe(true);
        });

        it("should throw without encryptionKey", () => {
            expect(() => generator.validateEncryptedId("ABC123", {} as any)).toThrow();
        });
    });

    describe("generate('ff1', ...)", () => {
        it("should support ff1 strategy", () => {
            const id = generator.generate("ff1", "ABC123", {
                encryptionKey: TEST_KEY,
            });
            expect(id.length).toBe(6);
        });

        it("should throw without encryptionKey", () => {
            expect(() => generator.generate("ff1", "ABC123")).toThrow("encryptionKey is required");
        });
    });

    describe("existing strategies", () => {
        it("should support uuid", () => {
            const id = generator.generate("uuid");
            expect(id).toMatch(/^[0-9a-f-]{36}$/);
        });

        it("should support slug", () => {
            const id = generator.generate("slug", "Hello World!");
            expect(id).toBe("Hello-World");
        });

        it("should support templates", () => {
            const id = generator.generate("{date}", "test");
            expect(id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it("should support md5", () => {
            const id = generator.generate("md5", "test");
            expect(id).toMatch(/^[a-f0-9]{8}$/);
        });

        it("should support sha1", () => {
            const id = generator.generate("sha1", "test");
            expect(id).toMatch(/^[a-f0-9]{8}$/);
        });

        it("should support sha256", () => {
            const id = generator.generate("sha256", "test");
            expect(id).toMatch(/^[a-f0-9]{8}$/);
        });
    });
});
