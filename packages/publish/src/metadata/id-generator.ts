import { createHash, randomUUID } from 'node:crypto';
import { renderTemplate } from '@cmtx/template';
import type { EncryptedIdValidationResult, FF1EncryptOptions } from '../types.js';
import type { FF1CipherWASM } from './fpe-ff1.js';
import { decryptString, encryptString, FF1Cipher, prepareFPEKey } from './fpe-ff1.js';
import { LuhnAlgorithm } from './luhn.js';

/**
 * ID 生成器
 * 提供多种文档 ID 生成策略
 *
 * @public
 */
export class IdGenerator {
    /**
     * 生成通用 ID
     * @param strategy - ID 生成策略 ('slug', 'uuid', 'md5', 'sha1', 'sha256', 'ff1' 或 自定义模板)
     * @param input - 输入内容
     * @param options - 可选参数（ff1 时需要 encryptionKey）
     * @returns 生成的 ID
     */
    public generate(
        strategy: string = 'slug',
        input: string = '',
        options?: { encryptionKey?: string | Buffer; radix?: number; withChecksum?: boolean }
    ): string {
        switch (strategy) {
            case 'ff1':
                if (!options?.encryptionKey) {
                    throw new Error('encryptionKey is required for FF1 strategy');
                }
                return this.encryptFF1(input, options.encryptionKey, {
                    radix: options.radix,
                    withChecksum: options.withChecksum,
                });

            case 'uuid':
                return this.generateUUID();

            case 'md5':
                return this.generateHash(input, 'md5', 8);

            case 'sha1':
                return this.generateHash(input, 'sha1', 8);

            case 'sha256':
                return this.generateHash(input, 'sha256', 8);

            case 'slug':
                return this.generateSlug(input);

            default:
                return this.generateFromTemplate(input, strategy);
        }
    }

    /**
     * FF1 格式保留加密（同步，纯函数）
     *
     * FF1 特性：输入几位，输出几位（格式保留）
     *
     * @param plaintext - 要加密的明文字符串（radix-36: 0-9, A-Z）
     * @param encryptionKey - 加密密钥
     * @param options - 可选参数
     * @returns 加密后的字符串
     *
     * @example
     * ```typescript
     * const generator = new IdGenerator();
     *
     * // 格式保留：输入 6 位，输出 6 位
     * generator.encryptFF1('ABC123', 'my-key');
     *
     * // 带校验码：输入 6 位，输出 7 位
     * generator.encryptFF1('ABC123', 'my-key', { withChecksum: true });
     * ```
     */
    public encryptFF1(
        plaintext: string,
        encryptionKey: string | Buffer,
        options?: FF1EncryptOptions
    ): string {
        const { radix = 36, withChecksum = false } = options ?? {};

        const cipher = this.createFF1Cipher(encryptionKey, radix);
        const encrypted = this.encryptWithCipher(cipher, plaintext);

        let result = encrypted;
        if (withChecksum) {
            result += LuhnAlgorithm.calculateChecksum(encrypted, radix);
        }

        return result;
    }

    /**
     * FF1 解密
     *
     * @param ciphertext - 加密的字符串
     * @param encryptionKey - 加密密钥
     * @param options - 可选参数
     * @returns 解密后的明文字符串
     */
    public decryptFF1(
        ciphertext: string,
        encryptionKey: string | Buffer,
        options?: { radix?: number; withChecksum?: boolean }
    ): string {
        const { radix = 36, withChecksum = false } = options ?? {};

        let toDecrypt = ciphertext.toUpperCase();
        if (withChecksum) {
            toDecrypt = toDecrypt.slice(0, -1);
        }

        const cipher = this.createFF1Cipher(encryptionKey, radix);
        return this.decryptWithCipher(cipher, toDecrypt);
    }

    /**
     * 验证加密 ID
     *
     * @param id - 要验证的 ID
     * @param options - 选项
     * @returns 验证结果
     */
    public validateEncryptedId(
        id: string,
        options: {
            prefix?: string;
            radix?: number;
            withChecksum?: boolean;
            encryptionKey: string | Buffer;
        }
    ): EncryptedIdValidationResult {
        const { prefix, radix = 36, withChecksum = false, encryptionKey } = options;

        if (!encryptionKey) {
            throw new Error('encryptionKey is required for validation');
        }

        let normalizedId = id.toUpperCase();

        if (prefix) {
            const prefixPattern = new RegExp(`^${this.escapeRegExp(prefix)}-`, 'i');
            if (!prefixPattern.test(normalizedId)) {
                return { valid: false, checksumValid: false };
            }
            normalizedId = normalizedId.replace(prefixPattern, '');
        }

        if (withChecksum) {
            if (normalizedId.length < 2) {
                return { valid: false, checksumValid: false };
            }

            const encrypted = normalizedId.slice(0, -1);
            const checksum = normalizedId.slice(-1);
            const luhnValid = checksum === LuhnAlgorithm.calculateChecksum(encrypted, radix);

            if (!luhnValid) {
                return { valid: false, checksumValid: false };
            }

            normalizedId = encrypted;
        }

        try {
            const cipher = this.createFF1Cipher(encryptionKey, radix);
            const _decrypted = this.decryptWithCipher(cipher, normalizedId);

            return {
                valid: true,
                checksumValid: withChecksum,
                decrypted: undefined,
            };
        } catch {
            return {
                valid: false,
                checksumValid: false,
            };
        }
    }

    /**
     * 生成 UUID 格式的 ID
     */
    public generateUUID(): string {
        return randomUUID();
    }

    /**
     * 生成哈希格式的 ID
     */
    public generateHash(input: string, algorithm = 'md5', length?: number): string {
        const hash = createHash(algorithm).update(input).digest('hex');
        return length ? hash.substring(0, length) : hash;
    }

    /**
     * 生成 slug 格式的 ID
     */
    generateSlug(input: string, maxLength = 15): string {
        let slug = input
            .trim()
            .replaceAll(/[^\w\s\u4e00-\u9fff-]/g, '')
            .replaceAll(/[\s_-]+/g, '-')
            .replaceAll(/^-+|-+$/g, '');

        if (slug.length > maxLength) {
            slug = slug.substring(0, maxLength).replaceAll(/-+$/g, '');
        }

        return slug;
    }

    /**
     * 使用模板生成 ID
     */
    public generateFromTemplate(input: string, template: string): string {
        const md5 = this.generateHash(input, 'md5', 8);
        const sha1 = this.generateHash(input, 'sha1', 8);
        const sha256 = this.generateHash(input, 'sha256', 8);

        const context = {
            input: input,
            slug: this.generateSlug(input),
            md5: md5,
            sha1: sha1,
            sha256: sha256,
            date: new Date().toISOString().split('T')[0],
            year: new Date().getFullYear().toString(),
            month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
            day: new Date().getDate().toString().padStart(2, '0'),
            timestamp: Date.now().toString(),
        };

        return renderTemplate(template, context);
    }

    /**
     * 批量生成 IDs
     */
    public generateBatch(inputs: string[], strategy = 'slug'): string[] {
        return inputs.map((input) => this.generate(strategy, input));
    }

    private createFF1Cipher(key: string | Buffer, radix: number = 36): FF1CipherWASM {
        return new FF1Cipher(prepareFPEKey(key), radix);
    }

    private encryptWithCipher(cipher: FF1CipherWASM, plaintext: string): string {
        return encryptString(cipher, plaintext);
    }

    private decryptWithCipher(cipher: FF1CipherWASM, ciphertext: string): string {
        return decryptString(cipher, ciphertext);
    }

    private escapeRegExp(value: string): string {
        return value.replaceAll(/[.*+?^${}()|[\]\\]/g, (match) => `\\${match}`);
    }
}
