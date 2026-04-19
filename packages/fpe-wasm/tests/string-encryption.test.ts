import { beforeEach, describe, expect, it } from 'vitest';
import { decrypt_string, encrypt_string, FF1Cipher } from '../src/index.js';

const TEST_KEY = new Uint8Array(32).fill(0);

describe('encrypt_string / decrypt_string', () => {
    let cipher: FF1Cipher;

    beforeEach(() => {
        cipher = new FF1Cipher(TEST_KEY, 36);
    });

    describe('basic functionality', () => {
        it('should encrypt and decrypt string correctly', () => {
            const plaintext = 'ABC123';
            const encrypted = encrypt_string(cipher, plaintext);
            const decrypted = decrypt_string(cipher, encrypted);
            expect(decrypted).toBe(plaintext);
        });

        it('should preserve format (length unchanged)', () => {
            const plaintext = 'XYZ789';
            const encrypted = encrypt_string(cipher, plaintext);
            expect(encrypted.length).toBe(plaintext.length);
        });

        it('should be deterministic', () => {
            const plaintext = 'TEST12';
            const encrypted1 = encrypt_string(cipher, plaintext);
            const encrypted2 = encrypt_string(cipher, plaintext);
            expect(encrypted1).toBe(encrypted2);
        });

        it('should produce different outputs for different inputs', () => {
            const encrypted1 = encrypt_string(cipher, 'ABC123');
            const encrypted2 = encrypt_string(cipher, 'ABC124');
            expect(encrypted1).not.toBe(encrypted2);
        });

        it('should only use valid radix-36 characters (0-9, A-Z)', () => {
            const plaintext = '123456';
            const encrypted = encrypt_string(cipher, plaintext);
            expect(encrypted).toMatch(/^[0-9A-Z]+$/);
        });
    });

    describe('case handling', () => {
        it('should treat lowercase input as uppercase', () => {
            const encryptedUpper = encrypt_string(cipher, 'ABC123');
            const encryptedLower = encrypt_string(cipher, 'abc123');
            expect(encryptedUpper).toBe(encryptedLower);
        });

        it('should output uppercase only', () => {
            const encrypted = encrypt_string(cipher, 'abc123');
            expect(encrypted).toMatch(/^[0-9A-Z]+$/);
            expect(encrypted.toLowerCase()).not.toBe(encrypted);
        });
    });

    describe('length requirements', () => {
        it('should work with minimum 4 characters', () => {
            const plaintext = 'ABCD';
            const encrypted = encrypt_string(cipher, plaintext);
            const decrypted = decrypt_string(cipher, encrypted);
            expect(encrypted.length).toBe(4);
            expect(decrypted).toBe(plaintext);
        });

        it('should throw for 3 characters (too short)', () => {
            expect(() => encrypt_string(cipher, 'ABC')).toThrow();
        });

        it('should throw for 2 characters', () => {
            expect(() => encrypt_string(cipher, 'AB')).toThrow();
        });

        it('should throw for 1 character', () => {
            expect(() => encrypt_string(cipher, 'A')).toThrow();
        });

        it('should work with longer strings', () => {
            const plaintext = 'ABCDEFGHIJKLMNO';
            const encrypted = encrypt_string(cipher, plaintext);
            const decrypted = decrypt_string(cipher, encrypted);
            expect(decrypted).toBe(plaintext);
            expect(encrypted.length).toBe(plaintext.length);
        });
    });

    describe('character validation', () => {
        it('should throw for characters outside radix-36', () => {
            expect(() => encrypt_string(cipher, 'ABC!@#')).toThrow();
        });

        it('should throw for invalid characters mixed with valid', () => {
            expect(() => encrypt_string(cipher, 'ABC123!')).toThrow();
        });

        it('should work with all valid radix-36 characters', () => {
            const plaintext = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const encrypted = encrypt_string(cipher, plaintext);
            const decrypted = decrypt_string(cipher, encrypted);
            expect(decrypted).toBe(plaintext);
        });
    });

    describe('different radix values', () => {
        it('should work with radix 10 (digits only)', () => {
            const cipher10 = new FF1Cipher(TEST_KEY, 10);
            const plaintext = '123456';
            const encrypted = encrypt_string(cipher10, plaintext);
            const decrypted = decrypt_string(cipher10, encrypted);
            expect(decrypted).toBe(plaintext);
            expect(encrypted).toMatch(/^[0-9]+$/);
        });

        it('should throw for letters with radix 10', () => {
            const cipher10 = new FF1Cipher(TEST_KEY, 10);
            expect(() => encrypt_string(cipher10, 'ABC123')).toThrow();
        });

        it('should work with radix 16 (hex)', () => {
            const cipher16 = new FF1Cipher(TEST_KEY, 16);
            const plaintext = 'ABCDEF';
            const encrypted = encrypt_string(cipher16, plaintext);
            const decrypted = decrypt_string(cipher16, encrypted);
            expect(decrypted).toBe(plaintext);
            expect(encrypted).toMatch(/^[0-9A-F]+$/);
        });

        it('should throw for G with radix 16', () => {
            const cipher16 = new FF1Cipher(TEST_KEY, 16);
            expect(() => encrypt_string(cipher16, 'GHIJKL')).toThrow();
        });

        it('should work with radix 2 (binary)', () => {
            const cipher2 = new FF1Cipher(TEST_KEY, 2);
            const plaintext = '01010101010101010101';
            const encrypted = encrypt_string(cipher2, plaintext);
            const decrypted = decrypt_string(cipher2, encrypted);
            expect(decrypted).toBe(plaintext);
            expect(encrypted).toMatch(/^[01]+$/);
        });
    });
});
