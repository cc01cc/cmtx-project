import * as assert from "node:assert";
import { ConfigBuilder, executeUploadPipeline, FileDocumentAccessor } from "@cmtx/asset/upload";
import * as sinon from "sinon";

suite("Pipeline Conflict Integration Tests", () => {
    let sandbox: sinon.SinonSandbox;
    let mockAdapter: any;

    setup(() => {
        sandbox = sinon.createSandbox();

        // 创建 mock storage adapter
        mockAdapter = {
            upload: sandbox.stub().resolves({ url: "https://example.com/uploaded.png" }),
            exists: sandbox.stub().resolves(false), // 默认文件不存在
        };
    });

    teardown(() => {
        sandbox.restore();
    });

    test("should handle conflict with skip strategy", async () => {
        // Arrange
        // Create config with new storages API
        const config = new ConfigBuilder()
            .storages({
                default: {
                    adapter: mockAdapter,
                    namingTemplate: "{name}.{ext}",
                },
            })
            .useStorage("default")
            .prefix("test/")
            .replace({
                fields: { src: "{cloudSrc}", alt: "{originalAlt}" },
            })
            .build();

        // 设置文件存在
        (mockAdapter.exists as sinon.SinonStub).resolves(true);

        const documentAccessor = new FileDocumentAccessor("/test/doc.md");
        // Mock document content with local image
        sandbox.stub(documentAccessor, "readText").resolves("![alt](local-image.png)");

        // Act
        const result = await executeUploadPipeline({
            documentAccessor,
            config,
            baseDirectory: "/test",
            conflictStrategy: { type: "skip-all" },
        });

        // Assert
        // 使用 API 兼容的检查方式
        assert.strictEqual(result.failedItems.length, 0, "Should not have failed items");
        assert.strictEqual(result.content.length > 0, true, "Should return processed content");
    });

    test("should handle conflict with replace strategy", async () => {
        // Arrange
        (mockAdapter.exists as sinon.SinonStub).resolves(true);

        const config = new ConfigBuilder()
            .storages({
                default: {
                    adapter: mockAdapter,
                    namingTemplate: "{name}.{ext}",
                },
            })
            .useStorage("default")
            .prefix("test/")
            .replace({
                fields: {
                    src: "{cloudSrc}",
                    alt: "{originalAlt}",
                },
            })
            .build();

        const documentAccessor = new FileDocumentAccessor("/test/doc.md");
        sandbox.stub(documentAccessor, "readText").resolves("![alt](local-image.png)");

        // Act
        const result = await executeUploadPipeline({
            documentAccessor,
            config,
            baseDirectory: "/test",
            conflictStrategy: { type: "replace-all" },
        });

        // Assert
        assert.strictEqual(result.failedItems.length, 0, "Should not have failed items");
        assert.ok(result.content, "Should return processed content");
    });

    test("should handle download strategy", async () => {
        // Arrange
        (mockAdapter.exists as sinon.SinonStub).resolves(true);

        const config = new ConfigBuilder()
            .storages({
                default: {
                    adapter: mockAdapter,
                    namingTemplate: "{name}.{ext}",
                },
            })
            .useStorage("default")
            .prefix("test/")
            .replace({
                fields: {
                    src: "{cloudSrc}",
                    alt: "{originalAlt}",
                },
            })
            .build();

        const documentAccessor = new FileDocumentAccessor("/test/doc.md");
        sandbox.stub(documentAccessor, "readText").resolves("![alt](local-image.png)");

        // Act
        const result = await executeUploadPipeline({
            documentAccessor,
            config,
            baseDirectory: "/test",
            conflictStrategy: {
                type: "download-all",
                downloadDir: "/test/downloads",
                onFileExists: "skip",
            },
        });

        // Assert
        assert.ok(result, "Should return a result");
        assert.ok(Array.isArray(result.failedItems), "Should have failedItems array");
    });
});
