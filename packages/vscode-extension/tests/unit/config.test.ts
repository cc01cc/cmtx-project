import { describe, expect, it } from "vitest";
import {
    getPresignedUrlSettings,
    getResizeWidths,
    getUploadConfigFromCmtx,
} from "../../src/infra/cmtx-config";
import { validateConfig } from "../../src/infra/config-validator";
import {
    createDefaultCloudStorageConfig,
    generateDefaultDomain,
    parseCloudStorageConfig,
} from "../../src/utils/config-parser";

describe("parseCloudStorageConfig", () => {
    describe("string input handling", () => {
        it("should parse valid JSON string", () => {
            const input =
                '{"provider":"aliyun-oss","bucket":"test-bucket","region":"oss-cn-hangzhou"}';
            const result = parseCloudStorageConfig(input);

            expect(result.provider).toBe("aliyun-oss");
            expect(result.bucket).toBe("test-bucket");
            expect(result.region).toBe("oss-cn-hangzhou");
            expect(result.domain).toBe("test-bucket.oss-cn-hangzhou.aliyuncs.com");
        });

        it("should return default config for empty string", () => {
            const result = parseCloudStorageConfig("");
            const expected = createDefaultCloudStorageConfig();

            expect(result).toEqual(expected);
        });

        it("should return default config for whitespace-only string", () => {
            const result = parseCloudStorageConfig("   ");
            const expected = createDefaultCloudStorageConfig();

            expect(result).toEqual(expected);
        });

        it("should return default config for invalid JSON string", () => {
            const result = parseCloudStorageConfig("{invalid json}");
            const expected = createDefaultCloudStorageConfig();

            expect(result).toEqual(expected);
        });

        it("should parse JSON string with all optional fields", () => {
            const input =
                '{"provider":"aliyun-oss","bucket":"test","region":"oss-cn-hangzhou","path":"images","forceHttps":false,"accessKeyId":"key","accessKeySecret":"secret"}';
            const result = parseCloudStorageConfig(input);

            expect(result.provider).toBe("aliyun-oss");
            expect(result.bucket).toBe("test");
            expect(result.region).toBe("oss-cn-hangzhou");
            expect(result.path).toBe("images");
            expect(result.forceHttps).toBe(false);
            expect(result.accessKeyId).toBe("key");
            expect(result.accessKeySecret).toBe("secret");
        });
    });

    describe("object input handling", () => {
        it("should parse valid object with required fields", () => {
            const input = {
                provider: "tencent-cos",
                bucket: "test-bucket",
                region: "ap-guangzhou",
            };
            const result = parseCloudStorageConfig(input);

            expect(result.provider).toBe("tencent-cos");
            expect(result.bucket).toBe("test-bucket");
            expect(result.region).toBe("ap-guangzhou");
            expect(result.domain).toBe("test-bucket.cos.ap-guangzhou.myqcloud.com");
        });

        it("should parse valid object with custom domain", () => {
            const input = {
                provider: "aliyun-oss",
                bucket: "test-bucket",
                region: "oss-cn-hangzhou",
                domain: "cdn.example.com",
            };
            const result = parseCloudStorageConfig(input);

            expect(result.domain).toBe("cdn.example.com");
        });

        it("should return default config for object missing bucket", () => {
            const input = {
                provider: "aliyun-oss",
                region: "oss-cn-hangzhou",
            };
            const result = parseCloudStorageConfig(input);
            const expected = createDefaultCloudStorageConfig();

            expect(result).toEqual(expected);
        });

        it("should return default config for object missing region", () => {
            const input = {
                provider: "aliyun-oss",
                bucket: "test-bucket",
            };
            const result = parseCloudStorageConfig(input);
            const expected = createDefaultCloudStorageConfig();

            expect(result).toEqual(expected);
        });

        it("should use default provider when provider is invalid", () => {
            const input = {
                provider: "unknown",
                bucket: "test-bucket",
                region: "oss-cn-hangzhou",
            };
            const result = parseCloudStorageConfig(input);

            expect(result.provider).toBe("aliyun-oss");
        });

        it("should use default provider when provider is not a string", () => {
            const input = {
                provider: 123,
                bucket: "test-bucket",
                region: "oss-cn-hangzhou",
            };
            const result = parseCloudStorageConfig(input);

            expect(result.provider).toBe("aliyun-oss");
        });

        it("should handle optional path field correctly", () => {
            const input1 = {
                provider: "aliyun-oss",
                bucket: "test",
                region: "oss-cn-hangzhou",
                path: "",
            };
            const result1 = parseCloudStorageConfig(input1);
            expect(result1.path).toBeUndefined();

            const input2 = {
                provider: "aliyun-oss",
                bucket: "test",
                region: "oss-cn-hangzhou",
                path: "images/",
            };
            const result2 = parseCloudStorageConfig(input2);
            expect(result2.path).toBe("images/");
        });

        it("should use default forceHttps when not specified", () => {
            const input = {
                provider: "aliyun-oss",
                bucket: "test",
                region: "oss-cn-hangzhou",
            };
            const result = parseCloudStorageConfig(input);

            expect(result.forceHttps).toBe(true);
        });
    });

    describe("invalid input handling", () => {
        it("should return default config for null input", () => {
            const result = parseCloudStorageConfig(null);
            const expected = createDefaultCloudStorageConfig();

            expect(result).toEqual(expected);
        });

        it("should return default config for undefined input", () => {
            const result = parseCloudStorageConfig(undefined);
            const expected = createDefaultCloudStorageConfig();

            expect(result).toEqual(expected);
        });

        it("should return default config for number input", () => {
            const result = parseCloudStorageConfig(123);
            const expected = createDefaultCloudStorageConfig();

            expect(result).toEqual(expected);
        });

        it("should return default config for boolean input", () => {
            const result = parseCloudStorageConfig(true);
            const expected = createDefaultCloudStorageConfig();

            expect(result).toEqual(expected);
        });

        it("should return default config for array input", () => {
            const result = parseCloudStorageConfig([]);
            const expected = createDefaultCloudStorageConfig();

            expect(result).toEqual(expected);
        });
    });
});

describe("createDefaultCloudStorageConfig", () => {
    it("should return default config with empty values", () => {
        const result = createDefaultCloudStorageConfig();

        expect(result.provider).toBe("aliyun-oss");
        expect(result.domain).toBe("");
        expect(result.bucket).toBe("");
        expect(result.region).toBe("");
        expect(result.forceHttps).toBe(true);
    });

    it("should not include optional fields in default config", () => {
        const result = createDefaultCloudStorageConfig();

        expect(result.path).toBeUndefined();
        expect(result.accessKeyId).toBeUndefined();
        expect(result.accessKeySecret).toBeUndefined();
    });
});

describe("generateDefaultDomain", () => {
    it("should generate correct domain for aliyun-oss", () => {
        const result = generateDefaultDomain("aliyun-oss", "my-bucket", "oss-cn-hangzhou");

        expect(result).toBe("my-bucket.oss-cn-hangzhou.aliyuncs.com");
    });

    it("should generate correct domain for tencent-cos", () => {
        const result = generateDefaultDomain("tencent-cos", "my-bucket", "ap-guangzhou");

        expect(result).toBe("my-bucket.cos.ap-guangzhou.myqcloud.com");
    });

    it("should return empty string for unknown provider", () => {
        const result = generateDefaultDomain("unknown" as any, "my-bucket", "region");

        expect(result).toBe("");
    });

    it("should handle empty bucket or region", () => {
        const result1 = generateDefaultDomain("aliyun-oss", "", "oss-cn-hangzhou");
        expect(result1).toBe(".oss-cn-hangzhou.aliyuncs.com");

        const result2 = generateDefaultDomain("aliyun-oss", "bucket", "");
        expect(result2).toBe("bucket..aliyuncs.com");
    });
});

// Tests for new CMTX config functions
describe("CMTX Config from .cmtx", () => {
    describe("getUploadConfigFromCmtx", () => {
        it("should return default upload config when not specified", () => {
            const config = { version: "v2" };
            const upload = getUploadConfigFromCmtx(config);

            expect(upload.imageFormat).toBe("markdown");
            expect(upload.batchLimit).toBe(5);
            expect(upload.auto).toBe(false);
            expect(upload.imageAltTemplate).toBe("");
            expect(upload.namingTemplate).toBe("{name}.{ext}");
        });

        it("should return custom upload config when specified", () => {
            const config = {
                version: "v2",
                upload: {
                    imageFormat: "html" as const,
                    batchLimit: 10,
                    auto: true,

                    imageAltTemplate: "Image",
                    namingTemplate: "{md5}.{ext}",
                },
            };
            const upload = getUploadConfigFromCmtx(config);

            expect(upload.imageFormat).toBe("html");
            expect(upload.batchLimit).toBe(10);
            expect(upload.auto).toBe(true);
            expect(upload.imageAltTemplate).toBe("Image");
            expect(upload.namingTemplate).toBe("{md5}.{ext}");
        });
    });

    describe("getResizeWidths", () => {
        it("should return default resize widths", () => {
            const config = { version: "v2" };
            const widths = getResizeWidths(config);

            expect(widths).toEqual([360, 480, 640, 800, 960, 1200]);
        });

        it("should return custom widths when specified", () => {
            const config = {
                version: "v2",
                resize: {
                    widths: [100, 200, 300],
                },
            };
            const widths = getResizeWidths(config);

            expect(widths).toEqual([100, 200, 300]);
        });
    });

    describe("getPresignedUrlSettings", () => {
        it("should return default presigned URL settings", () => {
            const config = { version: "v2" };
            const settings = getPresignedUrlSettings(config);

            expect(settings.expire).toBe(600);
            expect(settings.maxRetryCount).toBe(3);
            expect(settings.imageFormat).toBe("all");
        });

        it("should return custom settings when specified", () => {
            const config = {
                version: "v2",
                presignedUrls: {
                    expire: 1200,
                    maxRetryCount: 5,
                    imageFormat: "markdown" as const,
                },
            };
            const settings = getPresignedUrlSettings(config);

            expect(settings.expire).toBe(1200);
            expect(settings.maxRetryCount).toBe(5);
            expect(settings.imageFormat).toBe("markdown");
        });
    });
});

describe("Config Validation", () => {
    describe("validateConfig", () => {
        it("should report error when version is missing", () => {
            const config = {};
            const errors = validateConfig(config as any);

            expect(errors).toContainEqual({
                path: "version",
                message: "Version is required",
                severity: "error",
            });
        });

        it("should pass when config is valid", () => {
            const config = {
                version: "v2",
                storages: {
                    default: {
                        adapter: "aliyun-oss",
                        config: { bucket: "test" },
                    },
                },
            };
            const errors = validateConfig(config);

            expect(errors).toHaveLength(0);
        });

        it("should report error for invalid batchLimit", () => {
            const config = {
                version: "v2",
                upload: { batchLimit: 0 },
            };
            const errors = validateConfig(config);

            expect(errors).toContainEqual({
                path: "upload.batchLimit",
                message: "Batch limit must be at least 1",
                severity: "error",
            });
        });

        it("should report error for invalid imageFormat", () => {
            const config = {
                version: "v2",
                upload: { imageFormat: "invalid" as any },
            };
            const errors = validateConfig(config);

            expect(errors).toContainEqual({
                path: "upload.imageFormat",
                message: 'Image format must be "markdown" or "html"',
                severity: "error",
            });
        });

        it("should report error for invalid resize widths type", () => {
            const config = {
                version: "v2",
                resize: { widths: "invalid" as any },
            };
            const errors = validateConfig(config);

            expect(errors).toContainEqual({
                path: "resize.widths",
                message: "Widths must be an array",
                severity: "error",
            });
        });

        it("should report error for non-positive width values", () => {
            const config = {
                version: "v2",
                resize: { widths: [100, -50, 200] },
            };
            const errors = validateConfig(config);

            expect(errors).toContainEqual({
                path: "resize.widths",
                message: "All widths must be positive numbers",
                severity: "error",
            });
        });

        it("should report warning for short presigned URL expiration", () => {
            const config = {
                version: "v2",
                presignedUrls: { expire: 30 },
            };
            const errors = validateConfig(config);

            expect(errors).toContainEqual({
                path: "presignedUrls.expire",
                message: "Expiration time should be at least 60 seconds",
                severity: "warning",
            });
        });

        it("should report error for negative maxRetryCount", () => {
            const config = {
                version: "v2",
                presignedUrls: { maxRetryCount: -1 },
            };
            const errors = validateConfig(config);

            expect(errors).toContainEqual({
                path: "presignedUrls.maxRetryCount",
                message: "Max retry count must be non-negative",
                severity: "error",
            });
        });

        it("should report error for invalid presignedUrls imageFormat", () => {
            const config = {
                version: "v2",
                presignedUrls: { imageFormat: "invalid" as any },
            };
            const errors = validateConfig(config);

            expect(errors).toContainEqual({
                path: "presignedUrls.imageFormat",
                message: 'Image format must be "markdown", "html", or "all"',
                severity: "error",
            });
        });

        it("should report error for missing storage adapter", () => {
            const config = {
                version: "v2",
                storages: {
                    default: { config: {} },
                },
            };
            const errors = validateConfig(config as any);

            expect(errors).toContainEqual({
                path: "storages.default.adapter",
                message: "Storage adapter is required",
                severity: "error",
            });
        });

        it("should report error for missing storage config", () => {
            const config = {
                version: "v2",
                storages: {
                    default: { adapter: "aliyun-oss" },
                },
            };
            const errors = validateConfig(config as any);

            expect(errors).toContainEqual({
                path: "storages.default.config",
                message: "Storage config is required",
                severity: "error",
            });
        });
    });
});
