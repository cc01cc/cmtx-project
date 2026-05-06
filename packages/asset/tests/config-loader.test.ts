/**
 * 配置加载器测试
 */

import { describe, expect, it, vi } from "vitest";
import { ConfigLoader, createConfigLoader, loadConfigFromString } from "../src/config/loader.js";

describe("ConfigLoader", () => {
    describe("loadFromString", () => {
        it("should parse basic YAML config", () => {
            const yaml = `
version: '1.0.0'
storages:
  default:
    adapter: aliyun-oss
    config:
      accessKeyId: "\${ACCESS_KEY_ID}"
      accessKeySecret: "\${ACCESS_KEY_SECRET}"
      region: "\${REGION}"
      bucket: "\${BUCKET}"
rules:
  upload-images:
    batchLimit: 10
    imageFormat: markdown
    conflictStrategy: skip
`;
            const envVars = {
                ACCESS_KEY_ID: "test-key-id",
                ACCESS_KEY_SECRET: "test-key-secret",
                REGION: "oss-cn-hangzhou",
                BUCKET: "test-bucket",
            };

            const loader = createConfigLoader({
                envResolver: (name) => envVars[name as keyof typeof envVars],
            });
            const config = loader.loadFromString(yaml);

            expect(config.version).toBe("1.0.0");
            expect(config.storages.default.adapter).toBe("aliyun-oss");
            expect(config.storages.default.config.accessKeyId as string).toBe("test-key-id");
            const uploadRule = config.rules?.["upload-images"];
            expect(uploadRule?.batchLimit).toBe(10);
            expect(uploadRule?.imageFormat).toBe("markdown");
        });

        it("should resolve environment variables", () => {
            const envVars = {
                ACCESS_KEY_ID: "test-key-id",
                ACCESS_KEY_SECRET: "test-key-secret",
                REGION: "oss-cn-hangzhou",
                BUCKET: "test-bucket",
            };

            const yaml = `
version: '1.0.0'
storages:
  default:
    adapter: aliyun-oss
    config:
      accessKeyId: "\${ACCESS_KEY_ID}"
      accessKeySecret: "\${ACCESS_KEY_SECRET}"
      region: "\${REGION}"
      bucket: "\${BUCKET}"
`;

            const loader = createConfigLoader({
                envResolver: (name) => envVars[name as keyof typeof envVars],
            });

            const config = loader.loadFromString(yaml);

            expect(config.version).toBe("1.0.0");
            expect(config.storages.default.adapter).toBe("aliyun-oss");
            expect(config.storages.default.config.accessKeyId).toBe("test-key-id");
            expect(config.storages.default.config.accessKeySecret).toBe("test-key-secret");
        });

        it("should warn when env variable not set", () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            const yaml = `
version: v2
storages:
  default:
    adapter: aliyun-oss
    config:
      bucket: test-bucket
      accessKeyId: "\${CMTX_UNSET_VAR}"
      accessKeySecret: "\${CMTX_ANOTHER_UNSET}"
`;
            const loader = createConfigLoader();
            const config = loader.loadFromString(yaml);
            expect(config).toBeDefined();
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining("环境变量未设置：CMTX_UNSET_VAR"),
            );
            warnSpy.mockRestore();
        });

        it("should warn for plaintext sensitive credentials", () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            const yaml = `
version: v2
storages:
  default:
    adapter: aliyun-oss
    config:
      bucket: test-bucket
      accessKeyId: "AKID123"
      accessKeySecret: "sk-secret-456"
`;
            const loader = createConfigLoader();
            const config = loader.loadFromString(yaml);
            expect(config).toBeDefined();
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining("敏感字段建议使用环境变量"),
            );
            warnSpy.mockRestore();
        });

        it("should warn for plaintext sensitive credentials (v1 config)", () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            const yaml = `
version: '1.0.0'
storages:
  default:
    adapter: aliyun-oss
    config:
      accessKeyId: "plaintext-key-id"
      accessKeySecret: "test-secret"
      region: "oss-cn-hangzhou"
      bucket: "test-bucket"
`;

            const loader = createConfigLoader();
            const config = loader.loadFromString(yaml);
            expect(config).toBeDefined();
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining("敏感字段建议使用环境变量"),
            );
            warnSpy.mockRestore();
        });

        it("should allow plaintext non-sensitive credentials", () => {
            const envVars = {
                ACCESS_KEY_ID: "test-key-id",
                ACCESS_KEY_SECRET: "test-key-secret",
            };

            const yaml = `
version: '1.0.0'
storages:
  default:
    adapter: aliyun-oss
    config:
      accessKeyId: "\${ACCESS_KEY_ID}"
      accessKeySecret: "\${ACCESS_KEY_SECRET}"
      region: "oss-cn-hangzhou"
      bucket: "test-bucket"
`;

            const loader = createConfigLoader({
                envResolver: (name) => envVars[name as keyof typeof envVars],
            });

            const config = loader.loadFromString(yaml);

            expect(config.version).toBe("1.0.0");
            expect(config.storages.default.config.accessKeyId).toBe("test-key-id");
            expect(config.storages.default.config.region).toBe("oss-cn-hangzhou");
            expect(config.storages.default.config.bucket).toBe("test-bucket");
        });

        it("should handle credentials with environment variables", () => {
            const envVars = {
                ACCESS_KEY_ID: "test-key-id",
                ACCESS_KEY_SECRET: "test-key-secret",
                REGION: "oss-cn-hangzhou",
                BUCKET: "test-bucket",
            };

            const yaml = `
version: '1.0.0'
storages:
  default:
    adapter: aliyun-oss
    config:
      accessKeyId: "\${ACCESS_KEY_ID}"
      accessKeySecret: "\${ACCESS_KEY_SECRET}"
      region: "\${REGION}"
      bucket: "\${BUCKET}"
rules:
  upload-images:
    batchLimit: 5
    imageFormat: html
`;

            const loader = createConfigLoader({
                envResolver: (name) => envVars[name as keyof typeof envVars],
            });

            const config = loader.loadFromString(yaml);

            expect(config.version).toBe("1.0.0");
            expect(config.storages.default.config.accessKeyId).toBe("test-key-id");
            const uploadRule = config.rules?.["upload-images"];
            expect(uploadRule?.batchLimit).toBe(5);
            expect(uploadRule?.imageFormat).toBe("html");
        });
    });

    describe("loadConfigFromString", () => {
        it("should be a convenience function", () => {
            const yaml = `
version: '1.0.0'
storages:
  default:
    adapter: aliyun-oss
    config:
      accessKeyId: "\${ACCESS_KEY_ID}"
      accessKeySecret: "\${ACCESS_KEY_SECRET}"
      region: "oss-cn-hangzhou"
      bucket: "test-bucket"
`;
            const envVars = {
                ACCESS_KEY_ID: "test-key-id",
                ACCESS_KEY_SECRET: "test-key-secret",
            };

            const config = loadConfigFromString(yaml, {
                envResolver: (name) => envVars[name as keyof typeof envVars],
            });

            expect(config.version).toBe("1.0.0");
            expect(config.storages.default.adapter).toBe("aliyun-oss");
        });
    });

    describe("ai section parsing", () => {
        it("should parse ai.models correctly", () => {
            const yaml = `
version: v2
ai:
  models:
    deepseek-v4-flash:
      provider: deepseek
      model: deepseek-v4-flash
      apiKey: "sk-test-key"
      timeout: 30000
      maxRetries: 3
  defaultModel: deepseek-v4-flash
storages:
  default:
    adapter: aliyun-oss
    config:
      bucket: test-bucket
      accessKeyId: "\${KEY}"
      accessKeySecret: "\${SECRET}"
      region: oss-cn-hangzhou
`;
            const loader = createConfigLoader({
                envResolver: () => "test-value",
            });
            const config = loader.loadFromString(yaml);

            expect(config.ai).toBeDefined();
            const aiConfig = config.ai as Record<string, unknown> | undefined;
            expect(aiConfig).toBeDefined();
            const models = aiConfig!.models as Record<string, unknown> | undefined;
            expect(models).toBeDefined();
            expect(models!["deepseek-v4-flash"]).toBeDefined();
            const dsConfig = models!["deepseek-v4-flash"] as Record<string, unknown>;
            expect(dsConfig.provider).toBe("deepseek");
            expect(dsConfig.model).toBe("deepseek-v4-flash");
            expect(dsConfig.apiKey).toBe("sk-test-key");
            expect(dsConfig.timeout).toBe(30000);
            expect(dsConfig.maxRetries).toBe(3);
            expect(aiConfig!.defaultModel).toBe("deepseek-v4-flash");
        });

        it("should handle config without ai section", () => {
            const yaml = `
version: v2
storages:
  default:
    adapter: aliyun-oss
    config:
      bucket: test-bucket
      accessKeyId: "\${KEY}"
      accessKeySecret: "\${SECRET}"
      region: oss-cn-hangzhou
`;
            const loader = createConfigLoader({
                envResolver: () => "test-value",
            });
            const config = loader.loadFromString(yaml);

            expect(config.ai).toBeUndefined();
        });
    });

    describe("ConfigLoader class", () => {
        it("should create instance without options", () => {
            const loader = new ConfigLoader();
            expect(loader).toBeInstanceOf(ConfigLoader);
        });

        it("should create instance with options", () => {
            const loader = new ConfigLoader({
                envResolver: (name) => process.env[name],
            });
            expect(loader).toBeInstanceOf(ConfigLoader);
        });
    });
});
