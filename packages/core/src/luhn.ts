const DEFAULT_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Luhn 算法（校验和）
 *
 * Luhn 模 N 算法扩展版，支持自定义字母表和进制。
 * 用于生成和验证 ID 中的校验位。
 *
 * @public
 */
export class LuhnAlgorithm {
    private static getAlphabet(radix: number, customAlphabet?: string): string {
        const alphabet = customAlphabet || DEFAULT_ALPHABET;
        if (!Number.isInteger(radix) || radix < 2 || radix > alphabet.length) {
            throw new Error(`Radix must be an integer between 2 and ${alphabet.length}`);
        }
        return alphabet.slice(0, radix);
    }

    private static toDigits(str: string, radix: number, alphabet: string): number[] {
        if (str.length === 0) {
            throw new Error("Input must contain at least one character");
        }
        const upperAlphabet = alphabet.toUpperCase();
        return str
            .toUpperCase()
            .split("")
            .map((char) => {
                const digit = upperAlphabet.indexOf(char);
                if (digit === -1) {
                    throw new Error(`Character '${char}' not in alphabet for radix ${radix}`);
                }
                return digit;
            });
    }

    /**
     * 计算校验位
     *
     * @param str - 输入字符串（不含校验位）
     * @param radix - 进制（默认 36）
     * @param customAlphabet - 自定义字母表
     * @returns 校验位字符
     *
     * @example
     * ```typescript
     * LuhnAlgorithm.calculateChecksum("TEST") // "K"
     * ```
     */
    static calculateChecksum(str: string, radix: number = 36, customAlphabet?: string): string {
        const alphabet = LuhnAlgorithm.getAlphabet(radix, customAlphabet);
        const digits = LuhnAlgorithm.toDigits(str, radix, alphabet);
        let sum = 0;
        let factor = 2;
        for (let i = digits.length - 1; i >= 0; i--) {
            let addend = digits[i] * factor;
            factor = factor === 2 ? 1 : 2;
            if (addend >= radix) {
                addend = Math.floor(addend / radix) + (addend % radix);
            }
            sum += addend;
        }
        const checkDigit = (radix - (sum % radix)) % radix;
        return alphabet[checkDigit];
    }

    /**
     * 验证带校验位的字符串
     *
     * @param strWithChecksum - 带校验位的字符串
     * @param radix - 进制（默认 36）
     * @param customAlphabet - 自定义字母表
     * @returns 校验是否通过
     */
    static validate(strWithChecksum: string, radix: number = 36, customAlphabet?: string): boolean {
        if (strWithChecksum.length < 2) {
            return false;
        }
        let str: string;
        try {
            const alphabet = LuhnAlgorithm.getAlphabet(radix, customAlphabet);
            const upperAlphabet = alphabet.toUpperCase();
            str = strWithChecksum.toUpperCase();
            for (const char of str) {
                if (!upperAlphabet.includes(char)) {
                    return false;
                }
            }
        } catch {
            return false;
        }
        const expectedCheck = LuhnAlgorithm.calculateChecksum(
            str.slice(0, -1),
            radix,
            customAlphabet,
        );
        return expectedCheck.toUpperCase() === str.slice(-1);
    }

    /**
     * 追加校验位
     *
     * @param str - 输入字符串
     * @param radix - 进制（默认 36）
     * @param customAlphabet - 自定义字母表
     * @returns 带校验位的字符串
     *
     * @example
     * ```typescript
     * LuhnAlgorithm.appendChecksum("TEST") // "TESTK"
     * ```
     */
    static appendChecksum(str: string, radix: number = 36, customAlphabet?: string): string {
        const checksum = LuhnAlgorithm.calculateChecksum(str, radix, customAlphabet);
        return str.toUpperCase() + checksum;
    }

    /**
     * 移除校验位
     *
     * @param strWithChecksum - 带校验位的字符串
     * @returns 不含校验位的字符串
     */
    static stripChecksum(strWithChecksum: string): string {
        if (strWithChecksum.length < 2) {
            return strWithChecksum;
        }
        return strWithChecksum.slice(0, -1);
    }

    /**
     * 验证并提取原始字符串
     *
     * @param strWithChecksum - 带校验位的字符串
     * @param radix - 进制（默认 36）
     * @param customAlphabet - 自定义字母表
     * @returns 验证结果和原始字符串
     *
     * @example
     * ```typescript
     * const result = LuhnAlgorithm.validateAndExtract("TESTK");
     * // { valid: true, original: "TEST" }
     * ```
     */
    static validateAndExtract(
        strWithChecksum: string,
        radix: number = 36,
        customAlphabet?: string,
    ): { valid: boolean; original?: string } {
        if (!LuhnAlgorithm.validate(strWithChecksum, radix, customAlphabet)) {
            return { valid: false };
        }
        return {
            valid: true,
            original: LuhnAlgorithm.stripChecksum(strWithChecksum),
        };
    }
}
