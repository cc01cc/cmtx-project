/**
 * AliOSSAdapter 集成测试
 *
 * @module @cmtx/storage/tests/integration/ali-oss.integration
 *
 * @description
 * 使用真实阿里云 OSS 服务进行集成测试。
 * 需要在 tests/integration/test-config.json 中配置凭证。
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

// 配置：测试完成后等待时间（毫秒），方便手动检查 OSS 控制台
const MANUAL_CHECK_DELAY = 10000; // 10 秒，设为 0 可禁用

import type { AliOSSAdapter } from "../../src/adapters/ali-oss.js";
import type { AliyunTestConfig } from "./shared-test-utils.js";
import {
    cleanupTestFiles,
    createOSSAdapter,
    downloadAndCompare,
    fetchUrl,
    generateTestPath,
    getFixturePath,
    loadTestConfig,
    readFixture,
} from "./shared-test-utils.js";

// 在模块加载时检查配置，决定是否需要跳过所有测试
let shouldRun = false;
let config: AliyunTestConfig | undefined;

try {
    const fullConfig = loadTestConfig();
    config = fullConfig.aliyun;
    shouldRun = config.enabled;
} catch (error) {
    console.log("[INFO] OSS integration tests will be skipped:", error);
    shouldRun = false;
}

describe.skipIf(!shouldRun)("AliOSSAdapter Integration Tests", () => {
    let adapter: AliOSSAdapter;
    let testPath: string;

    beforeAll(async () => {
        if (!config) {
            throw new Error("Config not loaded");
        }
        adapter = createOSSAdapter(config);
        testPath = generateTestPath(config.testPrefix);
        console.log(`[OK] OSS adapter created for bucket: ${config.bucket}`);
        console.log(`[OK] Test path: ${testPath}`);
    });

    afterAll(async () => {
        try {
            await cleanupTestFiles(adapter, testPath);
            console.log("[OK] Test files cleaned up");
        } catch (error) {
            console.log("[WARN] Cleanup error:", error);
        }
    });

    describe("upload", () => {
        it("should upload local text file", async () => {
            const localPath = getFixturePath("sample-text.txt");
            const remotePath = `${testPath}sample-text.txt`;

            const result = await adapter.upload(localPath, remotePath);

            expect(result.name).toBe(remotePath);
            expect(result.url).toContain(config!.bucket);
            expect(result.url).toContain("https://");
        });

        it("should upload local image file", async () => {
            const localPath = getFixturePath("sample-image.png");
            const remotePath = `${testPath}sample-image.png`;

            const result = await adapter.upload(localPath, remotePath);

            expect(result.name).toBe(remotePath);
            expect(result.url).toContain(".png");
        });

        it("should upload local binary file", async () => {
            const localPath = getFixturePath("sample-binary.bin");
            const remotePath = `${testPath}sample-binary.bin`;

            const result = await adapter.upload(localPath, remotePath);

            expect(result.name).toBe(remotePath);
        });
    });

    describe("uploadBuffer", () => {
        it("should upload Buffer content", async () => {
            const content = Buffer.from("Test buffer upload content");
            const remotePath = `${testPath}uploaded-buffer.txt`;

            const result = await adapter.uploadBuffer!(remotePath, content);

            expect(result.name).toBe(remotePath);
            expect(result.url).toContain(remotePath);
        });

        it("should upload Buffer with contentType", async () => {
            const content = Buffer.from("Text content with type");
            const remotePath = `${testPath}buffer-with-type.txt`;

            const result = await adapter.uploadBuffer!(remotePath, content, {
                contentType: "text/plain",
            });

            expect(result.name).toBe(remotePath);
        });

        it("should upload Buffer with metadata", async () => {
            const content = Buffer.from("Content with metadata");
            const remotePath = `${testPath}buffer-with-meta.txt`;

            const result = await adapter.uploadBuffer!(remotePath, content, {
                contentType: "text/plain",
                metadata: { "custom-key": "custom-value" },
            });

            expect(result.name).toBe(remotePath);
        });
    });

    describe("getSignedUrl", () => {
        it("should generate valid presigned URL for uploaded file", async () => {
            const localPath = getFixturePath("sample-text.txt");
            const remotePath = `${testPath}presigned-test.txt`;
            const expectedContent = readFixture("sample-text.txt");

            await adapter.upload(localPath, remotePath);

            const signedUrl = await adapter.getSignedUrl!(remotePath, 3600);

            expect(signedUrl).toContain("https://");
            expect(signedUrl).toContain("OSSAccessKeyId");
            expect(signedUrl).toContain("Signature");

            // 输出 presigned URL 方便手动校验
            if (MANUAL_CHECK_DELAY > 0) {
                console.log(`[INFO] Presigned URL (expires in 3600s):`);
                console.log(signedUrl);
                console.log(`[INFO] Waiting ${MANUAL_CHECK_DELAY}ms for manual verification...`);
                await new Promise((resolve) => setTimeout(resolve, MANUAL_CHECK_DELAY));
            }

            const response = await fetchUrl(signedUrl);
            expect(response.status).toBe(200);
            expect(response.data.equals(expectedContent)).toBe(true);
        });

        it("should generate presigned URL with custom expiry", async () => {
            const localPath = getFixturePath("sample-text.txt");
            const remotePath = `${testPath}presigned-expiry.txt`;

            await adapter.upload(localPath, remotePath);

            const shortExpiryUrl = await adapter.getSignedUrl!(remotePath, 60);
            const longExpiryUrl = await adapter.getSignedUrl!(remotePath, 7200);

            // Expires 是绝对时间戳，验证 URL 包含 Expires 参数即可
            expect(shortExpiryUrl).toContain("Expires=");
            expect(longExpiryUrl).toContain("Expires=");
            // 验证两个 URL 的过期时间不同（短过期时间应该小于长过期时间）
            const shortExpiryMatch = shortExpiryUrl.match(/Expires=(\d+)/);
            const longExpiryMatch = longExpiryUrl.match(/Expires=(\d+)/);
            expect(shortExpiryMatch).toBeTruthy();
            expect(longExpiryMatch).toBeTruthy();
            expect(Number(shortExpiryMatch![1])).toBeLessThan(Number(longExpiryMatch![1]));

            // 输出 presigned URL 方便手动校验
            if (MANUAL_CHECK_DELAY > 0) {
                console.log(`[INFO] Short expiry URL (60s): ${shortExpiryUrl}`);
                console.log(`[INFO] Long expiry URL (7200s): ${longExpiryUrl}`);
                console.log(`[INFO] Waiting ${MANUAL_CHECK_DELAY}ms for manual verification...`);
                await new Promise((resolve) => setTimeout(resolve, MANUAL_CHECK_DELAY));
            }
        });
    });

    describe("getSignedUrl with disposition", () => {
        it("should generate presigned URL with inline disposition", async () => {
            const localPath = getFixturePath("sample-text.txt");
            const remotePath = `${testPath}presigned-inline.txt`;

            await adapter.upload(localPath, remotePath);

            const signedUrl = await adapter.getSignedUrl!(remotePath, 3600, {
                disposition: "inline",
            });

            expect(signedUrl).toContain("https://");

            // 输出 presigned URL 方便手动校验
            if (MANUAL_CHECK_DELAY > 0) {
                console.log(`[INFO] Presigned URL with inline disposition:`);
                console.log(signedUrl);
                console.log(`[INFO] Waiting ${MANUAL_CHECK_DELAY}ms for manual verification...`);
                await new Promise((resolve) => setTimeout(resolve, MANUAL_CHECK_DELAY));
            }
        });

        it("should generate presigned URL with attachment disposition", async () => {
            const localPath = getFixturePath("sample-text.txt");
            const remotePath = `${testPath}presigned-attachment.txt`;

            await adapter.upload(localPath, remotePath);

            const signedUrl = await adapter.getSignedUrl!(remotePath, 3600, {
                disposition: "attachment",
            });

            expect(signedUrl).toContain("https://");

            // 输出 presigned URL 方便手动校验
            if (MANUAL_CHECK_DELAY > 0) {
                console.log(`[INFO] Presigned URL with attachment disposition:`);
                console.log(signedUrl);
                console.log(`[INFO] Waiting ${MANUAL_CHECK_DELAY}ms for manual verification...`);
                await new Promise((resolve) => setTimeout(resolve, MANUAL_CHECK_DELAY));
            }
        });
    });

    describe("downloadToFile", () => {
        it("should download file and match original content", async () => {
            const localPath = getFixturePath("sample-text.txt");
            const remotePath = `${testPath}download-test.txt`;
            const expectedContent = readFixture("sample-text.txt");

            await adapter.upload(localPath, remotePath);

            const matches = await downloadAndCompare(adapter, remotePath, expectedContent);
            expect(matches).toBe(true);
        });

        it("should download binary file correctly", async () => {
            const localPath = getFixturePath("sample-binary.bin");
            const remotePath = `${testPath}download-binary.bin`;
            const expectedContent = readFixture("sample-binary.bin");

            await adapter.upload(localPath, remotePath);

            const matches = await downloadAndCompare(adapter, remotePath, expectedContent);
            expect(matches).toBe(true);
        });
    });

    describe("getObjectMeta", () => {
        it("should get metadata for uploaded file", async () => {
            const localPath = getFixturePath("sample-text.txt");
            const remotePath = `${testPath}meta-test.txt`;

            await adapter.upload(localPath, remotePath);

            const meta = await adapter.getObjectMeta!(remotePath);

            expect(meta.size).toBeGreaterThan(0);
            expect(meta.lastModified).toBeInstanceOf(Date);
            expect(meta.etag).toBeDefined();
        });

        it("should return correct content type", async () => {
            const localPath = getFixturePath("sample-image.png");
            const remotePath = `${testPath}meta-image.png`;

            await adapter.upload(localPath, remotePath);

            const meta = await adapter.getObjectMeta!(remotePath);

            expect(meta.contentType).toContain("image");
        });
    });

    describe("exists", () => {
        it("should return true for existing file", async () => {
            const localPath = getFixturePath("sample-text.txt");
            const remotePath = `${testPath}exists-test.txt`;

            await adapter.upload(localPath, remotePath);

            const exists = await adapter.exists!(remotePath);
            expect(exists).toBe(true);
        });

        it("should return false for non-existing file", async () => {
            const remotePath = `${testPath}non-existing-file.txt`;

            const exists = await adapter.exists!(remotePath);
            expect(exists).toBe(false);
        });
    });

    describe("delete", () => {
        it("should delete uploaded file", async () => {
            const localPath = getFixturePath("sample-text.txt");
            const remotePath = `${testPath}delete-test.txt`;

            await adapter.upload(localPath, remotePath);
            expect(await adapter.exists!(remotePath)).toBe(true);

            // 延迟以便手动检查
            if (MANUAL_CHECK_DELAY > 0) {
                console.log(`[INFO] File uploaded: ${remotePath}`);
                console.log(
                    `[INFO] Waiting ${MANUAL_CHECK_DELAY}ms before delete for manual verification...`,
                );
                await new Promise((resolve) => setTimeout(resolve, MANUAL_CHECK_DELAY));
            }

            await adapter.delete!(remotePath);

            expect(await adapter.exists!(remotePath)).toBe(false);
        });
    });

    describe("full workflow", () => {
        it("should complete upload-download-delete workflow", async () => {
            const localPath = getFixturePath("sample-text.txt");
            const remotePath = `${testPath}workflow-test.txt`;
            const expectedContent = readFixture("sample-text.txt");

            const uploadResult = await adapter.upload(localPath, remotePath);
            expect(uploadResult.url).toBeDefined();

            const existsAfterUpload = await adapter.exists!(remotePath);
            expect(existsAfterUpload).toBe(true);

            const downloadMatches = await downloadAndCompare(adapter, remotePath, expectedContent);
            expect(downloadMatches).toBe(true);

            // 延迟以便手动检查
            if (MANUAL_CHECK_DELAY > 0) {
                console.log(`[INFO] File ready: ${remotePath}`);
                console.log(
                    `[INFO] Waiting ${MANUAL_CHECK_DELAY}ms before delete for manual verification...`,
                );
                await new Promise((resolve) => setTimeout(resolve, MANUAL_CHECK_DELAY));
            }

            await adapter.delete!(remotePath);

            const existsAfterDelete = await adapter.exists!(remotePath);
            expect(existsAfterDelete).toBe(false);
        });
    });
});
