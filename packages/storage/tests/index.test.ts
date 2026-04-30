/**
 * 模块导出测试
 *
 * @module @cmtx/storage/tests/index
 */

import { describe, expect, it } from "vitest";

// 测试类型导出
import type {
    AdapterUploadResult,
    AliyunCredentials,
    CloudCredentials,
    CloudProvider,
    IStorageAdapter,
    ObjectMeta,
    TencentCredentials,
    UploadBufferOptions,
} from "../src/index.js";

describe("模块导出测试", () => {
    describe("类型导出", () => {
        it("应该导出 IStorageAdapter 类型", () => {
            // 类型测试在编译时验证，这里只验证类型存在
            const adapter: IStorageAdapter = {
                upload: async () => ({ name: "test", url: "https://example.com/test" }),
                getSignedUrl: async () => "https://example.com/signed",
                delete: async () => {},
                exists: async () => true,
                getObjectMeta: async () => ({
                    size: 0,
                    lastModified: new Date(),
                }),
                downloadToFile: async () => {},
                uploadBuffer: async () => ({
                    name: "test",
                    url: "https://example.com/test",
                }),
                buildUrl: () => "https://example.com/test",
            };
            expect(adapter).toBeDefined();
        });

        it("应该导出 AdapterUploadResult 类型", () => {
            const result: AdapterUploadResult = {
                name: "test.png",
                url: "https://example.com/test.png",
            };
            expect(result.name).toBe("test.png");
            expect(result.url).toBe("https://example.com/test.png");
        });

        it("应该导出 ObjectMeta 类型", () => {
            const meta: ObjectMeta = {
                size: 1024,
                lastModified: new Date("2024-01-01"),
                contentType: "image/png",
                etag: '"abc123"',
            };
            expect(meta.size).toBe(1024);
            expect(meta.contentType).toBe("image/png");
        });

        it("应该导出 CloudProvider 类型", () => {
            const provider1: CloudProvider = "aliyun-oss";
            const provider2: CloudProvider = "tencent-cos";
            expect(provider1).toBe("aliyun-oss");
            expect(provider2).toBe("tencent-cos");
        });

        it("应该导出 AliyunCredentials 类型", () => {
            const credentials: AliyunCredentials = {
                provider: "aliyun-oss",
                accessKeyId: "test-key",
                accessKeySecret: "test-secret",
                region: "oss-cn-hangzhou",
                bucket: "test-bucket",
            };
            expect(credentials.provider).toBe("aliyun-oss");
        });

        it("应该导出 TencentCredentials 类型", () => {
            const credentials: TencentCredentials = {
                provider: "tencent-cos",
                secretId: "test-id",
                secretKey: "test-key",
                region: "ap-guangzhou",
                bucket: "test-bucket-1250000000",
            };
            expect(credentials.provider).toBe("tencent-cos");
        });

        it("应该导出 CloudCredentials 联合类型", () => {
            const aliCredentials: CloudCredentials = {
                provider: "aliyun-oss",
                accessKeyId: "test-key",
                accessKeySecret: "test-secret",
                region: "oss-cn-hangzhou",
                bucket: "test-bucket",
            };
            const tencentCredentials: CloudCredentials = {
                provider: "tencent-cos",
                secretId: "test-id",
                secretKey: "test-key",
                region: "ap-guangzhou",
                bucket: "test-bucket-1250000000",
            };
            expect(aliCredentials.provider).toBe("aliyun-oss");
            expect(tencentCredentials.provider).toBe("tencent-cos");
        });

        it("应该导出 UploadBufferOptions 类型", () => {
            const options: UploadBufferOptions = {
                contentType: "image/png",
                forbidOverwrite: true,
                metadata: { custom: "value" },
            };
            expect(options.contentType).toBe("image/png");
            expect(options.forbidOverwrite).toBe(true);
        });
    });
});
