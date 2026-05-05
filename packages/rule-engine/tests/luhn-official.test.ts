/**
 * Luhn 算法官方测试用例
 *
 * 来源：https://en.wikipedia.org/wiki/Luhn_mod_N_algorithm
 */

import { describe, expect, it } from "vitest";
import { LuhnAlgorithm } from "../src/metadata/luhn.js";

describe("LuhnAlgorithm - Wikipedia Official Test Cases", () => {
    describe("radix-6 (character set a-f)", () => {
        it('should generate check character for "abcdef" -> "e"', () => {
            // Wikipedia example:
            // Input "abcdef" with code-points 0,1,2,3,4,5
            // From right to left, factor alternates starting with 2 at rightmost:
            //   f(5)*2=10 -> 10/6=1 rem 4, 1+4=5
            //   e(4)*1=4
            //   d(3)*2=6 -> 6/6=1 rem 0, 1+0=1
            //   c(2)*1=2
            //   b(1)*2=2
            //   a(0)*1=0
            // Sum = 5+4+1+2+2+0 = 14
            // Check = (6 - 14%6) % 6 = (6 - 2) % 6 = 4 -> 'e'
            const alphabet = "abcdef";
            const input = "abcdef";

            const checksum = LuhnAlgorithm.calculateChecksum(input, 6, alphabet);
            expect(checksum).toBe("e");

            const withChecksum = LuhnAlgorithm.appendChecksum(input, 6, alphabet);
            expect(withChecksum).toBe("ABCDEFe"); // appendChecksum converts to uppercase
            expect(LuhnAlgorithm.validate(withChecksum, 6, alphabet)).toBe(true);
        });

        it('should validate "abcde" + "e" as valid', () => {
            const alphabet = "abcdef";
            // "abcdef" with check 'e' = "abcdefe"
            expect(LuhnAlgorithm.validate("abcdefe", 6, alphabet)).toBe(true);
            expect(LuhnAlgorithm.validate("ABCDEFe", 6, alphabet)).toBe(true);
        });

        it("should detect single character error", () => {
            const alphabet = "abcdef";
            // Change one character: abcdefe -> abcdffe
            expect(LuhnAlgorithm.validate("abcdffe", 6, alphabet)).toBe(false);
        });
    });

    describe("radix-10 (standard Luhn algorithm)", () => {
        it('should validate "79927398713" as valid', () => {
            // Standard credit card test case
            expect(LuhnAlgorithm.validate("79927398713", 10)).toBe(true);
        });

        it('should generate correct checksum for "7992739871" -> "3"', () => {
            const checksum = LuhnAlgorithm.calculateChecksum("7992739871", 10);
            expect(checksum).toBe("3");
        });

        it("should detect invalid checksum", () => {
            // 79927398714 should be invalid
            expect(LuhnAlgorithm.validate("79927398714", 10)).toBe(false);
        });
    });

    describe("radix-36 (current implementation)", () => {
        it('should generate valid checksum for "A3K9X7"', () => {
            const input = "A3K9X7";
            const checksum = LuhnAlgorithm.calculateChecksum(input, 36);

            // Verify it's a single character in 0-9A-Z
            expect(checksum).toMatch(/^[0-9A-Z]$/);

            // Verify validation works
            const withChecksum = LuhnAlgorithm.appendChecksum(input, 36);
            expect(LuhnAlgorithm.validate(withChecksum, 36)).toBe(true);
        });

        it("should handle lowercase input", () => {
            const input = "a3k9x7";
            const checksum = LuhnAlgorithm.calculateChecksum(input, 36);
            expect(checksum).toMatch(/^[0-9A-Z]$/);

            // Validation should be case-insensitive
            const withChecksum = LuhnAlgorithm.appendChecksum(input, 36);
            expect(LuhnAlgorithm.validate(withChecksum.toLowerCase(), 36)).toBe(true);
            expect(LuhnAlgorithm.validate(withChecksum.toUpperCase(), 36)).toBe(true);
        });

        it("should detect single character error", () => {
            const input = "A3K9X7";
            const withChecksum = LuhnAlgorithm.appendChecksum(input, 36);

            // Change one character
            const corrupted = `${withChecksum.slice(0, 3)}Z${withChecksum.slice(4)}`;
            expect(LuhnAlgorithm.validate(corrupted, 36)).toBe(false);
        });
    });

    describe("edge cases", () => {
        it("should handle empty string", () => {
            expect(() => LuhnAlgorithm.calculateChecksum("", 10)).toThrow();
        });

        it("should handle single character", () => {
            const checksum = LuhnAlgorithm.calculateChecksum("5", 10);
            expect(checksum).toMatch(/^[0-9]$/);
            expect(LuhnAlgorithm.validate(`5${checksum}`, 10)).toBe(true);
        });

        it("should handle minimum radix-2", () => {
            const alphabet = "01";
            const checksum = LuhnAlgorithm.calculateChecksum("1010", 2, alphabet);
            expect(checksum).toMatch(/^[01]$/);
        });

        it("should throw for invalid characters", () => {
            expect(() => LuhnAlgorithm.calculateChecksum("ABC", 10)).toThrow();
        });
    });
});

// Additional test to verify algorithm direction
describe("LuhnAlgorithm - Direction Verification", () => {
    it("should match Wikipedia direction (right-to-left)", () => {
        // For "abcdef" in radix-6:
        // From right to left, starting with factor=2:
        //   f(5)*2=10 -> 10/6=1 rem 4, 1+4=5
        //   e(4)*1=4
        //   d(3)*2=6 -> 6/6=1 rem 0, 1+0=1
        //   c(2)*1=2
        //   b(1)*2=2
        //   a(0)*1=0
        // Sum = 5+4+1+2+2+0 = 14
        // Check = (6 - 14%6) % 6 = 4 = 'e'

        const alphabet = "abcdef";
        const result = LuhnAlgorithm.calculateChecksum("abcdef", 6, alphabet);
        expect(result).toBe("e");
    });
});
