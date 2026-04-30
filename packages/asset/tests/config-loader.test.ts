/**
 * 配置加载器测试
 */

import { describe, expect, it } from "vitest";
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
upload:
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
            expect(config.upload?.batchLimit).toBe(10);
            expect(config.upload?.imageFormat).toBe("markdown");
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

        it("should throw error when env variable not set", () => {
            const yaml = `
version: '1.0.0'
storages:
  default:
    adapter: aliyun-oss
    config:
      accessKeyId: "\${NON_EXISTENT_VAR}"
      accessKeySecret: "test-secret"
      region: "oss-cn-hangzhou"
      bucket: "test-bucket"
`;

            const loader = createConfigLoader();
            expect(() => loader.loadFromString(yaml)).toThrow("环境变量未设置");
        });

        it("should throw error for plaintext sensitive credentials", () => {
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
            expect(() => loader.loadFromString(yaml)).toThrow("敏感字段不支持明文凭证");
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
upload:
  batchLimit: 5
  imageFormat: html
`;

            const loader = createConfigLoader({
                envResolver: (name) => envVars[name as keyof typeof envVars],
            });

            const config = loader.loadFromString(yaml);

            expect(config.version).toBe("1.0.0");
            expect(config.storages.default.config.accessKeyId).toBe("test-key-id");
            expect(config.upload?.batchLimit).toBe(5);
            expect(config.upload?.imageFormat).toBe("html");
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
