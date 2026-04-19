/**
 * 卢恩算法（Luhn Algorithm）- radix-N 适配版本
 *
 * 符合 Wikipedia Luhn mod N 标准实现
 * https://en.wikipedia.org/wiki/Luhn_mod_N_algorithm
 *
 * 特点：
 * - 支持自定义字符集（alphabet）
 * - 从右到左处理（符合标准）
 * - 支持 radix 2-36
 */

const DEFAULT_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * 卢恩算法工具类
 */
// biome-ignore lint/complexity/noStaticOnlyClass: exported as a static utility class to preserve the public API.
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
            throw new Error('Input must contain at least one character');
        }

        // Convert both str and alphabet to uppercase for case-insensitive matching
        const upperAlphabet = alphabet.toUpperCase();

        return str
            .toUpperCase()
            .split('')
            .map((char) => {
                const digit = upperAlphabet.indexOf(char);
                if (digit === -1) {
                    throw new Error(`Character '${char}' not in alphabet for radix ${radix}`);
                }

                return digit;
            });
    }

    /**
     * 计算校验码
     *
     * 算法（从右到左，符合 Wikipedia 标准）：
     * 1. 从字符串右侧开始
     * 2. 每隔一位加倍（从右数第2位开始）
     * 3. 如果加倍后 >= radix，则减去 radix 后加 1
     * 4. 求和后计算校验码：(radix - sum % radix) % radix
     *
     * @param str - 输入字符串（不含校验码）
     * @param radix - 进制基数（默认 36）
     * @param customAlphabet - 自定义字符集（可选）
     * @returns 校验码字符
     */
    static calculateChecksum(str: string, radix: number = 36, customAlphabet?: string): string {
        const alphabet = LuhnAlgorithm.getAlphabet(radix, customAlphabet);
        const digits = LuhnAlgorithm.toDigits(str, radix, alphabet);

        let sum = 0;
        let factor = 2; // 从右数第2位开始加倍

        // 从右到左处理（符合 Wikipedia 标准）
        for (let i = digits.length - 1; i >= 0; i--) {
            let addend = digits[i] * factor;

            // 交替 factor
            factor = factor === 2 ? 1 : 2;

            // Reduce：如果加倍后 >= radix，则处理为各位数字之和
            // 对于 radix N：addend = floor(addend / N) + (addend % N)
            if (addend >= radix) {
                addend = Math.floor(addend / radix) + (addend % radix);
            }

            sum += addend;
        }

        const checkDigit = (radix - (sum % radix)) % radix;
        return alphabet[checkDigit];
    }

    /**
     * 验证带校验码的字符串
     *
     * @param strWithChecksum - 包含校验码的字符串
     * @param radix - 进制基数（默认 36）
     * @param customAlphabet - 自定义字符集（可选）
     * @returns 是否有效
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
            customAlphabet
        );
        return expectedCheck.toUpperCase() === str.slice(-1);
    }

    /**
     * 添加校验码
     *
     * @param str - 输入字符串（不含校验码）
     * @param radix - 进制基数（默认 36）
     * @param customAlphabet - 自定义字符集（可选）
     * @returns 带校验码的字符串
     */
    static appendChecksum(str: string, radix: number = 36, customAlphabet?: string): string {
        const checksum = LuhnAlgorithm.calculateChecksum(str, radix, customAlphabet);
        return str.toUpperCase() + checksum;
    }

    /**
     * 移除校验码
     *
     * @param strWithChecksum - 包含校验码的字符串
     * @returns 不含校验码的字符串
     */
    static stripChecksum(strWithChecksum: string): string {
        if (strWithChecksum.length < 2) {
            return strWithChecksum;
        }
        return strWithChecksum.slice(0, -1);
    }

    /**
     * 验证并提取（如果有效）
     *
     * @param strWithChecksum - 包含校验码的字符串
     * @param radix - 进制基数
     * @param customAlphabet - 自定义字符集（可选）
     * @returns 验证结果，包含原始字符串（如果有效）
     */
    static validateAndExtract(
        strWithChecksum: string,
        radix: number = 36,
        customAlphabet?: string
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
