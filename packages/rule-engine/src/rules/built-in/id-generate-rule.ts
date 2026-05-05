import { upsertFrontmatterFields } from "@cmtx/core";
import { IdGenerator } from "../../metadata/id-generator.js";
import type { Rule, RuleContext, RuleResult } from "../rule-types.js";
import type { CounterService } from "../service-registry.js";

interface IdGenerateConfig {
    privatePrefix?: string;
    publicKey?: string;
    privateKey?: string;
    encryptionKey?: string;
}

const DEFAULT_PRIVATE_PREFIX = "EW-";
const DEFAULT_PUBLIC_KEY = "id";
const DEFAULT_PRIVATE_KEY = "private_id";

function formatPrivateId(prefix: string, value: number): string {
    const padded = String(value).padStart(6, "0");
    return `${prefix}${padded}`;
}

export const idGenerateRule: Rule = {
    id: "id-generate",
    name: "生成目标 ID",
    description: "生成 private_id（自增）+ public_id（FBE 加密）并注入 front matter",

    execute(context: RuleContext, config?: IdGenerateConfig): RuleResult {
        const document = context.document;
        const privatePrefix = config?.privatePrefix ?? DEFAULT_PRIVATE_PREFIX;
        const publicKey = config?.publicKey ?? DEFAULT_PUBLIC_KEY;
        const privateKey = config?.privateKey ?? DEFAULT_PRIVATE_KEY;
        const encryptionKey = config?.encryptionKey;

        let privateIdStr: string;
        const counterService = context.services?.get<CounterService>("counter");

        if (counterService) {
            const nextVal = counterService.next();
            privateIdStr = formatPrivateId(privatePrefix, nextVal);
        } else {
            privateIdStr = `${privatePrefix}TEMP`;
        }

        let fields: Record<string, string> = {
            [privateKey]: privateIdStr,
        };
        if (encryptionKey && encryptionKey !== "${env.CMTX_FBE_KEY}") {
            const generator = new IdGenerator();
            const numericPart = privateIdStr.replace(privatePrefix, "");
            const encrypted = generator.encryptFF1(numericPart, encryptionKey, {
                radix: 36,
                withChecksum: true,
            });
            fields[publicKey] = encrypted;
        } else {
            fields[publicKey] = privateIdStr;
        }

        const result = upsertFrontmatterFields(document, fields);

        return {
            content: result.markdown,
            modified: result.success && result.markdown !== document,
            messages: [
                `id-generate: generated ${privateKey}=${fields[privateKey]}, ${publicKey}=${fields[publicKey]}`,
            ],
        };
    },
};
