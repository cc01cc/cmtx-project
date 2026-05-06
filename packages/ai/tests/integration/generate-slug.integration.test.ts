import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateSlug } from "../../src/slug/generator.js";

interface ProviderTestConfig {
    enabled: boolean;
    apiKey: string;
    model: string;
    baseURL: string;
}

interface TestConfig {
    deepseek: ProviderTestConfig;
    alibaba: ProviderTestConfig;
}

const CONFIG_FILE_PATH = join(__dirname, "test-config.jsonc");

function stripJsoncComments(raw: string): string {
    return raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function loadTestConfig(): TestConfig | null {
    if (!existsSync(CONFIG_FILE_PATH)) {
        return null;
    }
    const content = readFileSync(CONFIG_FILE_PATH, "utf-8");
    return JSON.parse(stripJsoncComments(content)) as TestConfig;
}

const testConfig = loadTestConfig();

const deepseekEnabled = testConfig?.deepseek?.enabled === true && !!testConfig.deepseek.apiKey;
const alibabaEnabled = testConfig?.alibaba?.enabled === true && !!testConfig.alibaba.apiKey;

describe.skipIf(!deepseekEnabled)("generateSlug with DeepSeek", () => {
    it("generates a slug from a Chinese title", async () => {
        const slug = await generateSlug(
            {
                provider: "deepseek",
                model: testConfig!.deepseek.model,
                apiKey: testConfig!.deepseek.apiKey,
                baseURL: testConfig!.deepseek.baseURL,
            },
            "OpenClaw 安装避坑不完全指南",
            undefined,
            { temperature: 0.3, maxTokens: 300 },
        );

        expect(slug).toBeTruthy();
        expect(slug).toMatch(/^[a-z0-9-]+$/);
        expect(slug.length).toBeGreaterThanOrEqual(5);
    }, 30000);

    it("generates a slug from an English title", async () => {
        const slug = await generateSlug(
            {
                provider: "deepseek",
                model: testConfig!.deepseek.model,
                apiKey: testConfig!.deepseek.apiKey,
                baseURL: testConfig!.deepseek.baseURL,
            },
            "Getting Started with TypeScript 5.0",
            undefined,
            { temperature: 0.3, maxTokens: 200 },
        );

        expect(slug).toBeTruthy();
        expect(slug).toMatch(/^[a-z0-9-]+$/);
    }, 30000);
});

describe.skipIf(!alibabaEnabled)("generateSlug with Alibaba/Qwen", () => {
    it("generates a slug from a Chinese title", async () => {
        try {
            const slug = await generateSlug(
                {
                    provider: "alibaba",
                    model: testConfig!.alibaba.model,
                    apiKey: testConfig!.alibaba.apiKey,
                    baseURL: testConfig!.alibaba.baseURL,
                },
                "OpenClaw 安装避坑不完全指南",
                undefined,
                { temperature: 0.3, maxTokens: 300 },
            );

            expect(slug).toBeTruthy();
            expect(slug).toMatch(/^[a-z0-9-]+$/);
        } catch (error: unknown) {
            const err = error as {
                statusCode?: number;
                responseBody?: string;
                data?: unknown;
                message?: string;
                url?: string;
            };
            console.error("[ERROR] Alibaba API call failed:");
            console.error(`  message:   ${err.message ?? "unknown"}`);
            console.error(`  url:       ${err.url ?? "N/A"}`);
            console.error(`  statusCode: ${err.statusCode ?? "N/A"}`);
            console.error(`  responseBody: ${err.responseBody ?? "N/A"}`);
            console.error(`  data:      ${JSON.stringify(err.data)}`);
            throw error;
        }
    }, 30000);
});
