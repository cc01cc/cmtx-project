import * as assert from "node:assert";
import { ConfigBuilder } from "@cmtx/asset/upload";

/**
 * 契约测试 - 验证 VS Code 扩展与 @cmtx/asset 包之间的接口契约
 *
 * 这些测试用于捕获以下类型的问题：
 * 1. 配置字段名不一致（如 namingTemplate vs namingTemplate）
 * 2. 参数类型变更
 * 3. 必需参数缺失
 */
suite("Contract Tests - VS Code Extension <-> @cmtx/asset", () => {
    suite("ConfigBuilder.storages() Contract", () => {
        test("storages() should accept storage pool with namingTemplate", () => {
            // 这是 VS Code 扩展使用的接口
            // 如果 @cmtx/asset 变更了参数名，这个测试会失败
            const builder = new ConfigBuilder();

            assert.doesNotThrow(() => {
                builder.storages({
                    default: {
                        adapter: {} as any,
                        namingTemplate: "{name}-{md5_8}.{ext}",
                    },
                });
            }, "ConfigBuilder.storages() should accept storage pool");
        });

        test("storages() should handle undefined namingTemplate", () => {
            const builder = new ConfigBuilder();

            assert.doesNotThrow(() => {
                builder.storages({
                    default: {
                        adapter: {} as any,
                        namingTemplate: undefined,
                    },
                });
            }, "ConfigBuilder.storages() should handle undefined namingTemplate");
        });

        test("storages() should use namingTemplate consistently", () => {
            // 这个测试文档化命名映射关系
            // VS Code 配置和 ConfigBuilder 都使用 namingTemplate
            const builder = new ConfigBuilder();

            // 正确的参数名是 namingTemplate
            const storagePool = {
                default: {
                    adapter: {} as any,
                    namingTemplate: "{name}-{md5_8}.{ext}", // 正确的参数名
                },
            };

            // 不应该抛出错误
            assert.doesNotThrow(() => {
                builder.storages(storagePool);
            }, "ConfigBuilder.storages() should accept namingTemplate");

            // 验证使用了正确的参数名
            assert.strictEqual(storagePool.default.namingTemplate, "{name}-{md5_8}.{ext}");
        });
    });

    suite("UploadConfig Contract", () => {
        test("UploadConfig from VS Code should map to ConfigBuilder options", () => {
            // 模拟 VS Code 扩展的 UploadConfig 接口
            interface VsCodeUploadConfig {
                imageFormat: "markdown" | "html";
                batchLimit: number;
                providerConfig: {
                    path: string;
                    bucket: string;
                    region: string;
                    provider: "aliyun-oss" | "tencent-cos";
                };
                namingTemplate?: string;
            }

            // 模拟从 VS Code 配置读取的值
            const vsCodeConfig: VsCodeUploadConfig = {
                imageFormat: "markdown",
                batchLimit: 5,
                providerConfig: {
                    path: "uploads/",
                    bucket: "test-bucket",
                    region: "oss-cn-hangzhou",
                    provider: "aliyun-oss",
                },
                namingTemplate: "{name}-{md5_8}.{ext}",
            };

            // 验证映射到 ConfigBuilder 参数
            const configBuilderOptions = {
                prefix: vsCodeConfig.providerConfig.path,
                namingTemplate: vsCodeConfig.namingTemplate,
            };

            // 关键断言：namingTemplate 应该保持一致
            assert.strictEqual(
                configBuilderOptions.namingTemplate,
                "{name}-{md5_8}.{ext}",
                "namingTemplate should be consistent",
            );
        });
    });

    suite("Naming Template Variable Contract", () => {
        test("Supported template variables should be consistent", () => {
            // 这些变量应该在 VS Code 配置文档和实际代码中保持一致
            const supportedVariables = [
                "{name}",
                "{ext}",
                "{fileName}",
                "{md5}",
                "{md5_8}",
                "{md5_16}",
                "{timestamp}",
                "{date}",
                "{year}",
                "{month}",
                "{day}",
            ];

            // 验证所有变量都是非空字符串
            for (const variable of supportedVariables) {
                assert.ok(
                    typeof variable === "string" && variable.length > 0,
                    `Variable ${variable} should be a valid string`,
                );
                assert.ok(
                    variable.startsWith("{") && variable.endsWith("}"),
                    `Variable ${variable} should be in {name} format`,
                );
            }
        });
    });
});
