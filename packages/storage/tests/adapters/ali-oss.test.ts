/**
 * AliOSSAdapter 单元测试
 *
 * @module @cmtx/storage/tests/adapters/ali-oss
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AliOSSClient } from "../../src/adapters/ali-oss.js";
import { AliOSSAdapter } from "../../src/adapters/ali-oss.js";

describe("AliOSSAdapter", () => {
    let mockClient: AliOSSClient;
    let adapter: AliOSSAdapter;
    let tempDir: string;

    beforeEach(() => {
        mockClient = {
            put: vi.fn(),
            signatureUrl: vi.fn(),
            get: vi.fn(),
            head: vi.fn(),
        } as unknown as AliOSSClient;
        adapter = new AliOSSAdapter(mockClient);
        tempDir = mkdtempSync(join(tmpdir(), "ali-oss-test-"));
    });

    afterEach(() => {
        try {
            rmSync(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe("upload", () => {
        it("should upload file successfully", async () => {
            const mockResult: Awaited<ReturnType<AliOSSClient["put"]>> = {
                name: "test.png",
                url: "https://bucket.oss-cn-hangzhou.aliyuncs.com/test.png",
                res: { status: 200 } as any,
                data: {} as any,
            };
            vi.mocked(mockClient.put).mockResolvedValue(mockResult);

            const result = await adapter.upload("/local/path.png", "test.png");

            expect(result).toEqual({
                name: "test.png",
                url: "https://bucket.oss-cn-hangzhou.aliyuncs.com/test.png",
            });
            expect(mockClient.put).toHaveBeenCalledWith("test.png", "/local/path.png");
        });

        it("should throw error when upload fails", async () => {
            vi.mocked(mockClient.put).mockRejectedValue(new Error("Network error"));

            await expect(adapter.upload("/local/path.png", "test.png")).rejects.toThrow(
                "Failed to upload to OSS: Network error",
            );
        });
    });

    describe("getSignedUrl", () => {
        it("should generate signed URL successfully", async () => {
            const mockUrl =
                "https://bucket.oss-cn-hangzhou.aliyuncs.com/test.png?OSSAccessKeyId=xxx&Expires=xxx&Signature=xxx";
            vi.mocked(mockClient.signatureUrl).mockReturnValue(mockUrl);

            const result = await adapter.getSignedUrl("test.png", 3600);

            expect(result).toBe(mockUrl);
            expect(mockClient.signatureUrl).toHaveBeenCalledWith("test.png", {
                expires: 3600,
            });
        });

        it("should throw error when generating signed URL fails", async () => {
            vi.mocked(mockClient.signatureUrl).mockImplementation(() => {
                throw new Error("Invalid credentials");
            });

            await expect(adapter.getSignedUrl("test.png", 3600)).rejects.toThrow(
                "Failed to generate signed URL: Invalid credentials",
            );
        });
    });

    describe("uploadBuffer", () => {
        it("should upload buffer successfully", async () => {
            const mockResult: Awaited<ReturnType<AliOSSClient["put"]>> = {
                name: "test.png",
                url: "https://bucket.oss-cn-hangzhou.aliyuncs.com/test.png",
                res: { status: 200 } as any,
                data: {} as any,
            };
            vi.mocked(mockClient.put).mockResolvedValue(mockResult);

            const buffer = Buffer.from("test data");
            const result = await adapter.uploadBuffer("test.png", buffer);

            expect(result).toEqual({
                name: "test.png",
                url: "https://bucket.oss-cn-hangzhou.aliyuncs.com/test.png",
            });
        });

        it("should upload buffer with options", async () => {
            const mockResult: Awaited<ReturnType<AliOSSClient["put"]>> = {
                name: "test.png",
                url: "https://bucket.oss-cn-hangzhou.aliyuncs.com/test.png",
                res: { status: 200 } as any,
                data: {} as any,
            };
            vi.mocked(mockClient.put).mockResolvedValue(mockResult);

            const buffer = Buffer.from("test data");
            await adapter.uploadBuffer("test.png", buffer, {
                contentType: "image/png",
                forbidOverwrite: true,
                metadata: { custom: "value" },
            });

            expect(mockClient.put).toHaveBeenCalledWith(
                "test.png",
                buffer,
                expect.objectContaining({
                    headers: expect.objectContaining({
                        "Content-Type": "image/png",
                        "x-oss-forbid-overwrite": "true",
                    }),
                    meta: { custom: "value" },
                }),
            );
        });

        it("should throw error when buffer upload fails", async () => {
            vi.mocked(mockClient.put).mockRejectedValue(new Error("Upload failed"));

            const buffer = Buffer.from("test data");
            await expect(adapter.uploadBuffer("test.png", buffer)).rejects.toThrow(
                "Failed to upload buffer to OSS: Upload failed",
            );
        });
    });

    describe("downloadToFile", () => {
        it("should download file with Buffer content successfully", async () => {
            const testContent = "test file content";
            const mockBuffer = Buffer.from(testContent);
            const mockResult: Awaited<ReturnType<AliOSSClient["get"]>> = {
                content: mockBuffer,
                res: { status: 200 } as any,
            } as any;
            vi.mocked(mockClient.get).mockResolvedValue(mockResult);

            const localPath = join(tempDir, "buffer-download.png");
            await adapter.downloadToFile("remote/path.png", localPath);

            expect(mockClient.get).toHaveBeenCalledWith("remote/path.png");
            const savedContent = readFileSync(localPath, "utf-8");
            expect(savedContent).toBe(testContent);
        });

        it("should download file with Stream content successfully", async () => {
            const testContent = "test file content from stream";
            const { Readable } = await import("node:stream");
            const mockStream = Readable.from([testContent]);
            const mockResult: Awaited<ReturnType<AliOSSClient["get"]>> = {
                content: mockStream as unknown as Buffer,
                res: { status: 200 } as any,
            } as any;
            vi.mocked(mockClient.get).mockResolvedValue(mockResult);

            const localPath = join(tempDir, "stream-download.png");
            await adapter.downloadToFile("remote/path.png", localPath);

            expect(mockClient.get).toHaveBeenCalledWith("remote/path.png");
            const savedContent = readFileSync(localPath, "utf-8");
            expect(savedContent).toBe(testContent);
        });

        it("should throw error when download fails", async () => {
            vi.mocked(mockClient.get).mockRejectedValue(new Error("Download failed"));

            const localPath = join(tempDir, "fail-download.png");
            await expect(adapter.downloadToFile("remote/path.png", localPath)).rejects.toThrow(
                "Failed to download from OSS: Download failed",
            );
        });

        it("should throw error for unexpected content type", async () => {
            const mockResult: Awaited<ReturnType<AliOSSClient["get"]>> = {
                content: "invalid content" as unknown as Buffer,
                res: { status: 200 } as any,
            } as any;
            vi.mocked(mockClient.get).mockResolvedValue(mockResult);

            const localPath = join(tempDir, "invalid-download.png");
            await expect(adapter.downloadToFile("remote/path.png", localPath)).rejects.toThrow(
                "Failed to download from OSS: Unexpected content type from OSS get response",
            );
        });
    });

    describe("getObjectMeta", () => {
        it("should get object metadata successfully", async () => {
            const mockResponse: Awaited<ReturnType<AliOSSClient["head"]>> = {
                res: {
                    headers: {
                        "content-length": "1024",
                        "last-modified": "Mon, 01 Jan 2024 00:00:00 GMT",
                        "content-type": "image/png",
                        etag: '"abc123"',
                    },
                },
                status: 200,
                meta: {},
            } as any;
            vi.mocked(mockClient.head).mockResolvedValue(mockResponse);

            const meta = await adapter.getObjectMeta("test.png");

            expect(meta).toEqual({
                size: 1024,
                lastModified: new Date("Mon, 01 Jan 2024 00:00:00 GMT"),
                contentType: "image/png",
                etag: '"abc123"',
            });
            expect(mockClient.head).toHaveBeenCalledWith("test.png");
        });

        it("should handle missing optional headers", async () => {
            const mockResponse: Awaited<ReturnType<AliOSSClient["head"]>> = {
                res: {
                    headers: {
                        "content-length": "0",
                        "last-modified": "Mon, 01 Jan 2024 00:00:00 GMT",
                    },
                },
                status: 200,
                meta: {},
            } as any;
            vi.mocked(mockClient.head).mockResolvedValue(mockResponse);

            const meta = await adapter.getObjectMeta("test.png");

            expect(meta).toEqual({
                size: 0,
                lastModified: new Date("Mon, 01 Jan 2024 00:00:00 GMT"),
                contentType: undefined,
                etag: undefined,
            });
        });

        it("should throw error when getting metadata fails", async () => {
            vi.mocked(mockClient.head).mockRejectedValue(new Error("Object not found"));

            await expect(adapter.getObjectMeta("test.png")).rejects.toThrow(
                "Failed to get object meta from OSS: Object not found",
            );
        });
    });

    describe("exists", () => {
        it("should return true when object exists", async () => {
            const mockResult: Awaited<ReturnType<AliOSSClient["head"]>> = {
                res: { headers: {} },
                status: 200,
                meta: {},
            } as any;
            vi.mocked(mockClient.head).mockResolvedValue(mockResult);

            const result = await adapter.exists("test.png");

            expect(result).toBe(true);
            expect(mockClient.head).toHaveBeenCalledWith("test.png");
        });

        it("should return false when object does not exist (404)", async () => {
            const error = new Error("Not found") as Error & { status: number };
            error.status = 404;
            vi.mocked(mockClient.head).mockRejectedValue(error);

            const result = await adapter.exists("test.png");

            expect(result).toBe(false);
        });

        it("should throw error for non-404 errors", async () => {
            const error = new Error("Network error") as Error & { status: number };
            error.status = 500;
            vi.mocked(mockClient.head).mockRejectedValue(error);

            await expect(adapter.exists("test.png")).rejects.toThrow(
                "Failed to check object existence in OSS: Network error",
            );
        });

        it("should throw error when status is undefined", async () => {
            vi.mocked(mockClient.head).mockRejectedValue(new Error("Unknown error"));

            await expect(adapter.exists("test.png")).rejects.toThrow(
                "Failed to check object existence in OSS: Unknown error",
            );
        });
    });

    describe("delete", () => {
        it("should delete object successfully", async () => {
            mockClient.delete = vi.fn().mockResolvedValue({});

            await adapter.delete("test.png");

            expect(mockClient.delete).toHaveBeenCalledWith("test.png");
        });

        it("should throw error when delete fails", async () => {
            mockClient.delete = vi.fn().mockRejectedValue(new Error("Delete failed"));

            await expect(adapter.delete("test.png")).rejects.toThrow(
                "Failed to delete object from OSS: Delete failed",
            );
        });
    });

    describe("buildUrl", () => {
        it("should build URL with client configuration", () => {
            const mockClientWithOptions = Object.assign({}, mockClient, {
                options: {
                    bucket: "my-bucket",
                    region: "oss-cn-beijing",
                },
            }) as unknown as AliOSSClient;
            const adapterWithOptions = new AliOSSAdapter(mockClientWithOptions);

            const url = adapterWithOptions.buildUrl("images/test.png");

            expect(url).toBe("https://my-bucket.oss-cn-beijing.aliyuncs.com/images/test.png");
        });

        it("should use default values when client options are missing", () => {
            const mockClientWithoutOptions = Object.assign(
                {},
                mockClient,
            ) as unknown as AliOSSClient;
            const adapterWithoutOptions = new AliOSSAdapter(mockClientWithoutOptions);

            const url = adapterWithoutOptions.buildUrl("images/test.png");

            expect(url).toBe("https://<bucket>.<region>.aliyuncs.com/images/test.png");
        });

        it("should handle client with empty options", () => {
            const mockClientWithEmptyOptions = Object.assign({}, mockClient, {
                options: {},
            }) as unknown as AliOSSClient;
            const adapterWithEmptyOptions = new AliOSSAdapter(mockClientWithEmptyOptions);

            const url = adapterWithEmptyOptions.buildUrl("images/test.png");

            expect(url).toBe("https://<bucket>.<region>.aliyuncs.com/images/test.png");
        });
    });
});
