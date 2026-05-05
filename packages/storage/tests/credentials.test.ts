/**
 * 云存储凭证工厂测试
 *
 * @module @cmtx/storage/tests/credentials
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCredentials } from "../src/credentials.js";
import type { AliyunCredentials, CloudProvider, TencentCredentials } from "../src/types.js";

describe("createCredentials", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.CMTX_ALIYUN_ACCESS_KEY_ID;
        delete process.env.CMTX_ALIYUN_ACCESS_KEY_SECRET;
        delete process.env.CMTX_ALIYUN_BUCKET;
        delete process.env.CMTX_ALIYUN_REGION;
        delete process.env.CMTX_TENCENT_SECRET_ID;
        delete process.env.CMTX_TENCENT_SECRET_KEY;
        delete process.env.CMTX_TENCENT_BUCKET;
        delete process.env.CMTX_TENCENT_REGION;
    });

    afterEach(() => {
        // Restore original env
        Object.keys(process.env).forEach((key) => {
            if (!(key in originalEnv)) {
                delete process.env[key];
            }
        });
        Object.assign(process.env, originalEnv);
    });

    describe("阿里云 OSS - 从配置创建", () => {
        it("should create AliyunCredentials with all config fields", () => {
            const creds = createCredentials("aliyun-oss", {
                accessKeyId: "test-key-id",
                accessKeySecret: "test-secret",
                bucket: "test-bucket",
                region: "oss-cn-beijing",
            });

            expect(creds.provider).toBe("aliyun-oss");
            expect((creds as AliyunCredentials).accessKeyId).toBe("test-key-id");
            expect((creds as AliyunCredentials).accessKeySecret).toBe("test-secret");
            expect(creds.bucket).toBe("test-bucket");
            expect(creds.region).toBe("oss-cn-beijing");
        });

        it("should use default region when not provided", () => {
            const creds = createCredentials("aliyun-oss", {
                accessKeyId: "test-key-id",
                accessKeySecret: "test-secret",
                bucket: "test-bucket",
            });

            expect(creds.region).toBe("oss-cn-hangzhou");
        });

        it("should throw error when accessKeyId is missing", () => {
            expect(() =>
                createCredentials("aliyun-oss", {
                    accessKeySecret: "test-secret",
                    bucket: "test-bucket",
                }),
            ).toThrow("缺少阿里云 OSS 凭证");
        });

        it("should throw error when accessKeySecret is missing", () => {
            expect(() =>
                createCredentials("aliyun-oss", {
                    accessKeyId: "test-key-id",
                    bucket: "test-bucket",
                }),
            ).toThrow("缺少阿里云 OSS 凭证");
        });

        it("should throw error when bucket is missing", () => {
            expect(() =>
                createCredentials("aliyun-oss", {
                    accessKeyId: "test-key-id",
                    accessKeySecret: "test-secret",
                }),
            ).toThrow("缺少阿里云 OSS 凭证");
        });
    });

    describe("阿里云 OSS - 从环境变量创建", () => {
        it("should read from CMTX_ALIYUN_* environment variables when config is empty", () => {
            process.env.CMTX_ALIYUN_ACCESS_KEY_ID = "cmtx-key-id";
            process.env.CMTX_ALIYUN_ACCESS_KEY_SECRET = "cmtx-secret";
            process.env.CMTX_ALIYUN_BUCKET = "cmtx-bucket";

            const creds = createCredentials("aliyun-oss", {});

            expect((creds as AliyunCredentials).accessKeyId).toBe("cmtx-key-id");
            expect((creds as AliyunCredentials).accessKeySecret).toBe("cmtx-secret");
            expect(creds.bucket).toBe("cmtx-bucket");
            expect(creds.region).toBe("oss-cn-hangzhou");
        });

        it("should read region from environment variable", () => {
            process.env.CMTX_ALIYUN_ACCESS_KEY_ID = "env-key-id";
            process.env.CMTX_ALIYUN_ACCESS_KEY_SECRET = "env-secret";
            process.env.CMTX_ALIYUN_BUCKET = "env-bucket";
            process.env.CMTX_ALIYUN_REGION = "oss-cn-shanghai";

            const creds = createCredentials("aliyun-oss", {});

            expect(creds.region).toBe("oss-cn-shanghai");
        });

        it("should prefer config over environment variables", () => {
            process.env.CMTX_ALIYUN_ACCESS_KEY_ID = "env-key-id";
            process.env.CMTX_ALIYUN_ACCESS_KEY_SECRET = "env-secret";
            process.env.CMTX_ALIYUN_BUCKET = "env-bucket";

            const creds = createCredentials("aliyun-oss", {
                accessKeyId: "config-key-id",
                accessKeySecret: "config-secret",
                bucket: "config-bucket",
            });

            expect((creds as AliyunCredentials).accessKeyId).toBe("config-key-id");
            expect((creds as AliyunCredentials).accessKeySecret).toBe("config-secret");
            expect(creds.bucket).toBe("config-bucket");
        });

        it("should merge config and environment variables", () => {
            process.env.CMTX_ALIYUN_ACCESS_KEY_ID = "env-key-id";
            process.env.CMTX_ALIYUN_ACCESS_KEY_SECRET = "env-secret";
            process.env.CMTX_ALIYUN_BUCKET = "env-bucket";

            const creds = createCredentials("aliyun-oss", {
                region: "oss-cn-shenzhen",
            });

            expect((creds as AliyunCredentials).accessKeyId).toBe("env-key-id");
            expect((creds as AliyunCredentials).accessKeySecret).toBe("env-secret");
            expect(creds.bucket).toBe("env-bucket");
            expect(creds.region).toBe("oss-cn-shenzhen");
        });
    });

    describe("腾讯云 COS - 从配置创建", () => {
        it("should create TencentCredentials with all config fields", () => {
            const creds = createCredentials("tencent-cos", {
                secretId: "test-secret-id",
                secretKey: "test-secret-key",
                bucket: "test-bucket-1250000000",
                region: "ap-beijing",
            });

            expect(creds.provider).toBe("tencent-cos");
            expect((creds as TencentCredentials).secretId).toBe("test-secret-id");
            expect((creds as TencentCredentials).secretKey).toBe("test-secret-key");
            expect(creds.bucket).toBe("test-bucket-1250000000");
            expect(creds.region).toBe("ap-beijing");
        });

        it("should use default region when not provided", () => {
            const creds = createCredentials("tencent-cos", {
                secretId: "test-secret-id",
                secretKey: "test-secret-key",
                bucket: "test-bucket-1250000000",
            });

            expect(creds.region).toBe("ap-guangzhou");
        });

        it("should throw error when secretId is missing", () => {
            expect(() =>
                createCredentials("tencent-cos", {
                    secretKey: "test-secret-key",
                    bucket: "test-bucket-1250000000",
                }),
            ).toThrow("缺少腾讯云 COS 凭证");
        });

        it("should throw error when secretKey is missing", () => {
            expect(() =>
                createCredentials("tencent-cos", {
                    secretId: "test-secret-id",
                    bucket: "test-bucket-1250000000",
                }),
            ).toThrow("缺少腾讯云 COS 凭证");
        });

        it("should throw error when bucket is missing", () => {
            expect(() =>
                createCredentials("tencent-cos", {
                    secretId: "test-secret-id",
                    secretKey: "test-secret-key",
                }),
            ).toThrow("缺少腾讯云 COS 凭证");
        });
    });

    describe("腾讯云 COS - 从环境变量创建", () => {
        it("should read from environment variables when config is empty", () => {
            process.env.CMTX_TENCENT_SECRET_ID = "env-secret-id";
            process.env.CMTX_TENCENT_SECRET_KEY = "env-secret-key";
            process.env.CMTX_TENCENT_BUCKET = "env-bucket-1250000000";

            const creds = createCredentials("tencent-cos", {});

            expect((creds as TencentCredentials).secretId).toBe("env-secret-id");
            expect((creds as TencentCredentials).secretKey).toBe("env-secret-key");
            expect(creds.bucket).toBe("env-bucket-1250000000");
            expect(creds.region).toBe("ap-guangzhou");
        });

        it("should read region from environment variable", () => {
            process.env.CMTX_TENCENT_SECRET_ID = "env-secret-id";
            process.env.CMTX_TENCENT_SECRET_KEY = "env-secret-key";
            process.env.CMTX_TENCENT_BUCKET = "env-bucket-1250000000";
            process.env.CMTX_TENCENT_REGION = "ap-shanghai";

            const creds = createCredentials("tencent-cos", {});

            expect(creds.region).toBe("ap-shanghai");
        });

        it("should prefer config over environment variables", () => {
            process.env.CMTX_TENCENT_SECRET_ID = "env-secret-id";
            process.env.CMTX_TENCENT_SECRET_KEY = "env-secret-key";
            process.env.CMTX_TENCENT_BUCKET = "env-bucket-1250000000";

            const creds = createCredentials("tencent-cos", {
                secretId: "config-secret-id",
                secretKey: "config-secret-key",
                bucket: "config-bucket-1250000000",
            });

            expect((creds as TencentCredentials).secretId).toBe("config-secret-id");
            expect((creds as TencentCredentials).secretKey).toBe("config-secret-key");
            expect(creds.bucket).toBe("config-bucket-1250000000");
        });
    });

    describe("错误处理", () => {
        it("should throw error for unsupported provider", () => {
            expect(() => createCredentials("aws-s3" as CloudProvider, {})).toThrow(
                "不支持的云存储提供商：aws-s3",
            );
        });

        it("should throw error for empty provider", () => {
            expect(() => createCredentials("" as CloudProvider, {})).toThrow(
                "不支持的云存储提供商：",
            );
        });
    });

    describe("空配置", () => {
        it("should throw error when config is empty and env vars not set (aliyun)", () => {
            expect(() => createCredentials("aliyun-oss", {})).toThrow("缺少阿里云 OSS 凭证");
        });

        it("should throw error when config is empty and env vars not set (tencent)", () => {
            expect(() => createCredentials("tencent-cos", {})).toThrow("缺少腾讯云 COS 凭证");
        });
    });
});
