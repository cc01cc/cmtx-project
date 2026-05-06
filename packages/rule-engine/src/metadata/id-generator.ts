import { createHash, randomUUID } from "node:crypto";
import { renderTemplate } from "@cmtx/template";
import type { CounterService } from "../rules/service-registry.js";
import type { EncryptedIdValidationResult, FF1EncryptOptions } from "../types.js";
import { decryptString, encryptString, FF1CipherWASM, prepareFPEKey } from "./fpe-ff1.js";
import { LuhnAlgorithm } from "./luhn.js";

export interface ParsedTemplateVar {
    name: string;
    args: string[];
    raw: string;
}

export interface CounterGenerateOptions {
    length: number;
    radix: number;
}

export interface TemplateRenderContext {
    counterService?: CounterService;
    counterConfigs?: Record<string, CounterGenerateOptions>;
    ff1?: {
        useCounter: string;
        encryptionKey: string | Buffer;
        withChecksum?: boolean;
    };
    document?: string;
}

export class IdGenerator {
    public generate(
        strategy: string = "slug",
        input: string = "",
        options?: {
            encryptionKey?: string | Buffer;
            radix?: number;
            withChecksum?: boolean;
        },
    ): string {
        switch (strategy) {
            case "ff1":
                if (!options?.encryptionKey) {
                    throw new Error("encryptionKey is required for FF1 strategy");
                }
                return this.encryptFF1(input, options.encryptionKey, {
                    radix: options.radix,
                    withChecksum: options.withChecksum,
                });

            case "uuid":
                return this.generateUUID();

            case "md5":
                return this.generateHash(input, "md5", 8);

            case "sha1":
                return this.generateHash(input, "sha1", 8);

            case "sha256":
                return this.generateHash(input, "sha256", 8);

            case "slug":
                return this.generateSlug(input);

            default:
                return this.generateFromTemplate(input, strategy);
        }
    }

    public encryptFF1(
        plaintext: string,
        encryptionKey: string | Buffer,
        options?: FF1EncryptOptions,
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

    public decryptFF1(
        ciphertext: string,
        encryptionKey: string | Buffer,
        options?: { radix?: number; withChecksum?: boolean },
    ): string {
        const { radix = 36, withChecksum = false } = options ?? {};

        let toDecrypt = ciphertext.toUpperCase();
        if (withChecksum) {
            toDecrypt = toDecrypt.slice(0, -1);
        }

        const cipher = this.createFF1Cipher(encryptionKey, radix);
        return this.decryptWithCipher(cipher, toDecrypt);
    }

    public validateEncryptedId(
        id: string,
        options: {
            prefix?: string;
            radix?: number;
            withChecksum?: boolean;
            encryptionKey: string | Buffer;
        },
    ): EncryptedIdValidationResult {
        const { prefix, radix = 36, withChecksum = false, encryptionKey } = options;

        if (!encryptionKey) {
            throw new Error("encryptionKey is required for validation");
        }

        let normalizedId = id.toUpperCase();

        if (prefix) {
            const prefixPattern = new RegExp(`^${this.escapeRegExp(prefix)}-`, "i");
            if (!prefixPattern.test(normalizedId)) {
                return { valid: false, checksumValid: false };
            }
            normalizedId = normalizedId.replace(prefixPattern, "");
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

    public generateUUID(): string {
        return randomUUID();
    }

    public generateHash(input: string, algorithm = "md5", length?: number): string {
        const hash = createHash(algorithm).update(input).digest("hex");
        return length ? hash.substring(0, length) : hash;
    }

    generateSlug(input: string, maxLength = 15): string {
        let slug = input
            .trim()
            .replaceAll(/[^\w\s\u4e00-\u9fff-]/g, "")
            .replaceAll(/[\s_-]+/g, "-")
            .replaceAll(/^-+|-+$/g, "");

        if (slug.length > maxLength) {
            slug = slug.substring(0, maxLength).replaceAll(/-+$/g, "");
        }

        return slug;
    }

    public generateFromTemplate(input: string, template: string): string {
        const md5 = this.generateHash(input, "md5", 8);
        const sha1 = this.generateHash(input, "sha1", 8);
        const sha256 = this.generateHash(input, "sha256", 8);

        const context: Record<string, string> = {
            input: input,
            slug: this.generateSlug(input),
            md5: md5,
            sha1: sha1,
            sha256: sha256,
            date: new Date().toISOString().split("T")[0],
            year: new Date().getFullYear().toString(),
            month: (new Date().getMonth() + 1).toString().padStart(2, "0"),
            day: new Date().getDate().toString().padStart(2, "0"),
            timestamp: Date.now().toString(),
        };

        return renderTemplate(template, context);
    }

    public generateCounterValue(counterValue: number, options?: CounterGenerateOptions): string {
        const { length = 6, radix = 36 } = options ?? {};
        return counterValue.toString(radix).toUpperCase().padStart(length, "0");
    }

    public generateHashFromBody(document: string, algorithm: string, length: number): string {
        const body = this.stripFrontmatter(document);
        return this.generateHash(body, algorithm, length);
    }

    public stripFrontmatter(document: string): string {
        const frontmatterRegex = /^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*(?:[\r\n]|$)/;
        return document.replace(frontmatterRegex, "");
    }

    public static parseTemplate(template: string): ParsedTemplateVar[] {
        const vars: ParsedTemplateVar[] = [];
        const regex = /\{(\w+)(?:_(\d+))?\}/g;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(template)) !== null) {
            const name = match[1];
            const args: string[] = [];
            if (match[2] !== undefined) {
                args.push(match[2]);
            }
            // Handle {counter_<id>} where args[0] is the number part
            // Handle {sha256_<len>} where the full variable is like sha256_8
            vars.push({
                name,
                args,
                raw: match[0],
            });
        }

        return vars;
    }

    public generateBatch(inputs: string[], strategy = "slug"): string[] {
        return inputs.map((input) => this.generate(strategy, input));
    }

    public renderTemplateWithContext(template: string, context: TemplateRenderContext): string {
        return template.replace(/\{(\w+(?:_\w+)?)\}/g, (match, varName) => {
            if (varName === "uuid") {
                return this.generateUUID();
            }

            const counterMatch = varName.match(/^counter_(.+)$/);
            if (counterMatch) {
                const counterId = counterMatch[1];
                if (!context.counterService) {
                    return match;
                }
                const counterConfig = context.counterConfigs?.[counterId];
                const value = context.counterService.next(counterId);
                return this.generateCounterValue(value, counterConfig);
            }

            if (varName === "ff1") {
                if (!context.ff1 || !context.counterService) {
                    return match;
                }
                const counterId = context.ff1.useCounter ?? "default";
                if (!context.counterConfigs?.[counterId]) {
                    return match;
                }
                const config = context.counterConfigs[counterId];
                const value = context.counterService.next(counterId);
                const plaintext = this.generateCounterValue(value, config);

                const padded = plaintext.length < 4 ? plaintext.padEnd(4, "0") : plaintext;
                return this.encryptFF1(padded, context.ff1.encryptionKey, {
                    radix: config.radix,
                    withChecksum: context.ff1.withChecksum,
                });
            }

            const hashMatch = varName.match(/^(sha256|sha1|md5)_(\d+)$/);
            if (hashMatch && context.document) {
                const algorithm = hashMatch[1];
                const length = parseInt(hashMatch[2], 10);
                return this.generateHashFromBody(context.document, algorithm, length);
            }

            return match;
        });
    }

    private createFF1Cipher(key: string | Buffer, radix: number = 36): FF1CipherWASM {
        return new FF1CipherWASM(prepareFPEKey(key), radix);
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
