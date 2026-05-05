/**
 * 配置验证器测试
 */

import { describe, expect, it } from "vitest";
import type { CmtxConfig, ConfigValidationError } from "../src/config/types.js";
import {
    createConfigValidator,
    formatValidationErrors,
    validateConfig,
    validateConfigOrThrow,
} from "../src/config/validator.js";

describe("ConfigValidator", () => {
    const createValidConfig = (): CmtxConfig => ({
        version: "1.0.0",
        storages: {
            default: {
                adapter: "aliyun-oss",
                config: {
                    accessKeyId: "${TEST_ACCESS_KEY_ID}",
                    accessKeySecret: "${TEST_ACCESS_KEY_SECRET}",
                    bucket: "test-bucket",
                    region: "oss-cn-hangzhou",
                },
            },
        },
        rules: {
            "upload-images": {
                batchLimit: 10,
                imageFormat: "markdown",
                conflictStrategy: "skip",
            },
        },
    });

    describe("validateConfig", () => {
        it("should validate valid config", () => {
            const config = createValidConfig();
            const errors = validateConfig(config);
            const errorCount = errors.filter((e) => e.severity === "error").length;
            expect(errorCount).toBe(0);
        });

        it("should fail when version is missing", () => {
            const config = {
                storages: {
                    default: {
                        adapter: "aliyun-oss",
                        config: {
                            accessKeyId: "${TEST_ACCESS_KEY_ID}",
                            accessKeySecret: "${TEST_ACCESS_KEY_SECRET}",
                            bucket: "test-bucket",
                            region: "oss-cn-hangzhou",
                        },
                    },
                },
            } as CmtxConfig;

            const errors = validateConfig(config);
            const versionErrors = errors.filter((e) => e.path === "version");
            expect(versionErrors.length).toBeGreaterThan(0);
        });

        it("should fail when storages is missing", () => {
            const config = {
                version: "1.0.0",
            } as CmtxConfig;

            const errors = validateConfig(config);
            const storageErrors = errors.filter((e) => e.path === "storages");
            expect(storageErrors.length).toBeGreaterThan(0);
        });

        it("should fail when storage adapter is missing", () => {
            const config = {
                version: "1.0.0",
                storages: {
                    default: {
                        config: {
                            accessKeyId: "${TEST_ACCESS_KEY_ID}",
                            accessKeySecret: "${TEST_ACCESS_KEY_SECRET}",
                            bucket: "test-bucket",
                            region: "oss-cn-hangzhou",
                        },
                    },
                },
            } as CmtxConfig;

            const errors = validateConfig(config);
            const adapterErrors = errors.filter((e) => e.path === "storages.default.adapter");
            expect(adapterErrors.length).toBeGreaterThan(0);
        });

        it("should warn when environment variable is not set", () => {
            const config = {
                version: "1.0.0",
                storages: {
                    default: {
                        adapter: "aliyun-oss",
                        config: {
                            accessKeyId: "${NON_EXISTENT_VAR}",
                            accessKeySecret: "${TEST_ACCESS_KEY_SECRET}",
                            bucket: "test-bucket",
                            region: "oss-cn-hangzhou",
                        },
                    },
                },
            } as CmtxConfig;

            const errors = validateConfig(config);
            const warningErrors = errors.filter(
                (e) => e.path === "storages.default.config.accessKeyId" && e.severity === "warning",
            );
            expect(warningErrors.length).toBeGreaterThan(0);
        });

        it("should fail when upload.batchLimit is invalid", () => {
            const config = {
                version: "1.0.0",
                storages: {
                    default: {
                        adapter: "aliyun-oss",
                        config: {
                            accessKeyId: "${TEST_ACCESS_KEY_ID}",
                            accessKeySecret: "${TEST_ACCESS_KEY_SECRET}",
                            bucket: "test-bucket",
                            region: "oss-cn-hangzhou",
                        },
                    },
                },
                rules: {
                    "upload-images": {
                        batchLimit: 0,
                    },
                },
            } as unknown as CmtxConfig;

            const errors = validateConfig(config);
            const batchLimitErrors = errors.filter(
                (e) => e.path === "rules.upload-images.batchLimit",
            );
            expect(batchLimitErrors.length).toBeGreaterThan(0);
        });

        it("should fail when upload.imageFormat is invalid", () => {
            const config = {
                version: "1.0.0",
                storages: {
                    default: {
                        adapter: "aliyun-oss",
                        config: {
                            accessKeyId: "${TEST_ACCESS_KEY_ID}",
                            accessKeySecret: "${TEST_ACCESS_KEY_SECRET}",
                            bucket: "test-bucket",
                            region: "oss-cn-hangzhou",
                        },
                    },
                },
                rules: {
                    "upload-images": {
                        imageFormat: "invalid",
                    },
                },
            } as unknown as CmtxConfig;

            const errors = validateConfig(config);
            const formatErrors = errors.filter((e) => e.path === "rules.upload-images.imageFormat");
            expect(formatErrors.length).toBeGreaterThan(0);
        });

        it("should fail when upload.conflictStrategy is invalid", () => {
            const config = {
                version: "1.0.0",
                storages: {
                    default: {
                        adapter: "aliyun-oss",
                        config: {
                            accessKeyId: "${TEST_ACCESS_KEY_ID}",
                            accessKeySecret: "${TEST_ACCESS_KEY_SECRET}",
                            bucket: "test-bucket",
                            region: "oss-cn-hangzhou",
                        },
                    },
                },
                rules: {
                    "upload-images": {
                        conflictStrategy: "invalid",
                    },
                },
            } as unknown as CmtxConfig;

            const errors = validateConfig(config);
            const strategyErrors = errors.filter(
                (e) => e.path === "rules.upload-images.conflictStrategy",
            );
            expect(strategyErrors.length).toBeGreaterThan(0);
        });

        it("should fail when resize.widths is invalid", () => {
            const config = {
                version: "1.0.0",
                storages: {
                    default: {
                        adapter: "aliyun-oss",
                        config: {
                            accessKeyId: "${TEST_ACCESS_KEY_ID}",
                            accessKeySecret: "${TEST_ACCESS_KEY_SECRET}",
                            bucket: "test-bucket",
                            region: "oss-cn-hangzhou",
                        },
                    },
                },
                rules: {
                    "resize-image": {
                        widths: "not-an-array" as unknown as number[],
                    },
                },
            } as unknown as CmtxConfig;

            const errors = validateConfig(config);
            const widthErrors = errors.filter((e) => e.path === "rules.resize-image.widths");
            expect(widthErrors.length).toBeGreaterThan(0);
        });

        it("should fail when resize.widths contains negative numbers", () => {
            const config = {
                version: "1.0.0",
                storages: {
                    default: {
                        adapter: "aliyun-oss",
                        config: {
                            accessKeyId: "${TEST_ACCESS_KEY_ID}",
                            accessKeySecret: "${TEST_ACCESS_KEY_SECRET}",
                            bucket: "test-bucket",
                            region: "oss-cn-hangzhou",
                        },
                    },
                },
                rules: {
                    "resize-image": {
                        widths: [100, -50, 200],
                    },
                },
            } as unknown as CmtxConfig;

            const errors = validateConfig(config);
            const widthErrors = errors.filter((e) => e.path === "rules.resize-image.widths");
            expect(widthErrors.length).toBeGreaterThan(0);
        });

        it("should fail when presignedUrls.expire is too small", () => {
            const config = {
                version: "1.0.0",
                storages: {
                    default: {
                        adapter: "aliyun-oss",
                        config: {
                            accessKeyId: "${TEST_ACCESS_KEY_ID}",
                            accessKeySecret: "${TEST_ACCESS_KEY_SECRET}",
                            bucket: "test-bucket",
                            region: "oss-cn-hangzhou",
                        },
                    },
                },
                presignedUrls: {
                    expire: 30,
                },
            } as CmtxConfig;

            const errors = validateConfig(config);
            const expireErrors = errors.filter((e) => e.path === "presignedUrls.expire");
            expect(expireErrors.length).toBeGreaterThan(0);
        });

        it("should fail when presignedUrls.maxRetryCount is negative", () => {
            const config = {
                version: "1.0.0",
                storages: {
                    default: {
                        adapter: "aliyun-oss",
                        config: {
                            accessKeyId: "${TEST_ACCESS_KEY_ID}",
                            accessKeySecret: "${TEST_ACCESS_KEY_SECRET}",
                            bucket: "test-bucket",
                            region: "oss-cn-hangzhou",
                        },
                    },
                },
                presignedUrls: {
                    maxRetryCount: -1,
                },
            } as CmtxConfig;

            const errors = validateConfig(config);
            const retryErrors = errors.filter((e) => e.path === "presignedUrls.maxRetryCount");
            expect(retryErrors.length).toBeGreaterThan(0);
        });

        it("should fail when presignedUrls.imageFormat is invalid", () => {
            const config = {
                version: "1.0.0",
                storages: {
                    default: {
                        adapter: "aliyun-oss",
                        config: {
                            accessKeyId: "${TEST_ACCESS_KEY_ID}",
                            accessKeySecret: "${TEST_ACCESS_KEY_SECRET}",
                            bucket: "test-bucket",
                            region: "oss-cn-hangzhou",
                        },
                    },
                },
                presignedUrls: {
                    imageFormat: "invalid",
                },
            } as CmtxConfig;

            const errors = validateConfig(config);
            const formatErrors = errors.filter((e) => e.path === "presignedUrls.imageFormat");
            expect(formatErrors.length).toBeGreaterThan(0);
        });
    });

    describe("validateConfigOrThrow", () => {
        it("should throw Error for invalid config", () => {
            const config = {
                version: "1.0.0",
            } as CmtxConfig;

            expect(() => validateConfigOrThrow(config)).toThrow(Error);
        });

        it("should not throw for valid config", () => {
            const config = createValidConfig();
            expect(() => validateConfigOrThrow(config)).not.toThrow();
        });
    });

    describe("ConfigValidator class", () => {
        it("should validate config", () => {
            const validator = createConfigValidator();
            const config = createValidConfig();
            const errors = validator.validate(config);
            const errorCount = errors.filter((e) => e.severity === "error").length;
            expect(errorCount).toBe(0);
        });

        it("should validate or throw", () => {
            const validator = createConfigValidator();
            const config = createValidConfig();
            expect(() => validator.validateOrThrow(config)).not.toThrow();
        });

        it("should check if config is valid", () => {
            const validator = createConfigValidator();
            const config = createValidConfig();
            expect(validator.isValid(config)).toBe(true);
        });

        it("should return false for invalid config", () => {
            const validator = createConfigValidator();
            const config = { version: "1.0.0" } as CmtxConfig;
            expect(validator.isValid(config)).toBe(false);
        });
    });

    describe("formatValidationErrors", () => {
        it("should return success message for empty errors", () => {
            const result = formatValidationErrors([]);
            expect(result).toBe("Configuration is valid");
        });

        it("should format errors correctly", () => {
            const errors: ConfigValidationError[] = [
                { path: "version", message: "Version is required", severity: "error" },
                {
                    path: "storages",
                    message: "At least one storage is required",
                    severity: "error",
                },
            ];
            const result = formatValidationErrors(errors);
            expect(result).toContain("2 errors");
            expect(result).toContain("[ERROR] version: Version is required");
            expect(result).toContain("[ERROR] storages: At least one storage is required");
        });
    });
});
