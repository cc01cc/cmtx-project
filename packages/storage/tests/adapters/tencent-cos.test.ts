/**
 * TencentCOSAdapter 单元测试
 *
 * @module @cmtx/storage/tests/adapters/tencent-cos
 */

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CosClient } from '../../src/adapters/tencent-cos.js';
import { TencentCOSAdapter } from '../../src/adapters/tencent-cos.js';

describe('TencentCOSAdapter', () => {
    let mockClient: CosClient;
    let adapter: TencentCOSAdapter;
    let tempDir: string;
    const mockConfig = {
        Bucket: 'test-bucket-1250000000',
        Region: 'ap-guangzhou',
    };

    beforeEach(() => {
        mockClient = {
            uploadFile: vi.fn(),
            getObjectUrl: vi.fn(),
            putObject: vi.fn(),
            getObject: vi.fn(),
            headObject: vi.fn(),
            deleteObject: vi.fn(),
        } as unknown as CosClient;
        adapter = new TencentCOSAdapter(mockClient, mockConfig);
        tempDir = mkdtempSync(join(tmpdir(), 'tencent-cos-test-'));
    });

    afterEach(() => {
        try {
            rmSync(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('upload', () => {
        it('should upload file successfully', async () => {
            vi.mocked(mockClient.uploadFile).mockImplementation(
                (_params: unknown, callback: (err: null) => void) => {
                    callback(null);
                }
            );

            const result = await adapter.upload('/local/path.png', 'test.png');

            expect(result).toEqual({
                name: 'test.png',
                url: 'https://test-bucket-1250000000.cos.ap-guangzhou.myqcloud.com/test.png',
            });
            expect(mockClient.uploadFile).toHaveBeenCalledWith(
                expect.objectContaining({
                    Bucket: mockConfig.Bucket,
                    Region: mockConfig.Region,
                    Key: 'test.png',
                    FilePath: '/local/path.png',
                }),
                expect.any(Function)
            );
        });

        it('should throw error when upload fails', async () => {
            vi.mocked(mockClient.uploadFile).mockImplementation(
                (_params: unknown, callback: (err: Error) => void) => {
                    callback(new Error('Network error'));
                }
            );

            await expect(adapter.upload('/local/path.png', 'test.png')).rejects.toThrow(
                'Failed to upload to COS: Network error'
            );
        });
    });

    describe('getSignedUrl', () => {
        it('should generate signed URL successfully', async () => {
            const mockUrl = 'https://test-bucket.cos.ap-guangzhou.myqcloud.com/test.png?sign=xxx';
            vi.mocked(mockClient.getObjectUrl).mockImplementation(
                (_params: unknown, callback: (err: null, data: { Url: string }) => void) => {
                    callback(null, { Url: mockUrl });
                }
            );

            const result = await adapter.getSignedUrl('test.png', 3600);

            expect(result).toBe(mockUrl);
            expect(mockClient.getObjectUrl).toHaveBeenCalledWith(
                expect.objectContaining({
                    Bucket: mockConfig.Bucket,
                    Region: mockConfig.Region,
                    Key: 'test.png',
                    Sign: true,
                    Expires: 3600,
                    Protocol: 'https:',
                }),
                expect.any(Function)
            );
        });

        it('should throw error when generating signed URL fails', async () => {
            vi.mocked(mockClient.getObjectUrl).mockImplementation(
                (_params: unknown, callback: (err: Error) => void) => {
                    callback(new Error('Invalid credentials'));
                }
            );

            await expect(adapter.getSignedUrl('test.png', 3600)).rejects.toThrow(
                'Failed to generate signed URL: Invalid credentials'
            );
        });
    });

    describe('uploadBuffer', () => {
        it('should upload buffer successfully', async () => {
            vi.mocked(mockClient.putObject).mockImplementation(
                (_params: unknown, callback: (err: null) => void) => {
                    callback(null);
                }
            );

            const buffer = Buffer.from('test data');
            const result = await adapter.uploadBuffer('test.png', buffer);

            expect(result).toEqual({
                name: 'test.png',
                url: 'https://test-bucket-1250000000.cos.ap-guangzhou.myqcloud.com/test.png',
            });
        });

        it('should upload buffer with options', async () => {
            vi.mocked(mockClient.putObject).mockImplementation(
                (_params: unknown, callback: (err: null) => void) => {
                    callback(null);
                }
            );

            const buffer = Buffer.from('test data');
            await adapter.uploadBuffer('test.png', buffer, {
                contentType: 'image/png',
            });

            expect(mockClient.putObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    Bucket: mockConfig.Bucket,
                    Region: mockConfig.Region,
                    Key: 'test.png',
                    Body: buffer,
                    Headers: { 'Content-Type': 'image/png' },
                }),
                expect.any(Function)
            );
        });

        it('should throw error when buffer upload fails', async () => {
            vi.mocked(mockClient.putObject).mockImplementation(
                (_params: unknown, callback: (err: Error) => void) => {
                    callback(new Error('Upload failed'));
                }
            );

            const buffer = Buffer.from('test data');
            await expect(adapter.uploadBuffer('test.png', buffer)).rejects.toThrow(
                'Failed to upload buffer to COS: Upload failed'
            );
        });
    });

    describe('downloadToFile', () => {
        it('should call getObject with correct parameters', async () => {
            vi.mocked(mockClient.getObject).mockImplementation(
                (_params: unknown, callback: (err: null) => void) => {
                    callback(null);
                }
            );

            await adapter.downloadToFile('remote/path.png', '/tmp/test-download.png');

            expect(mockClient.getObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    Bucket: mockConfig.Bucket,
                    Region: mockConfig.Region,
                    Key: 'remote/path.png',
                }),
                expect.any(Function)
            );
        });

        it('should throw error when download fails', async () => {
            vi.mocked(mockClient.getObject).mockImplementation(
                (_params: unknown, callback: (err: Error) => void) => {
                    callback(new Error('Download failed'));
                }
            );

            await expect(
                adapter.downloadToFile('remote/path.png', '/tmp/test-fail-download.png')
            ).rejects.toThrow('Failed to download from COS: Download failed');
        });
    });

    describe('getObjectMeta', () => {
        it('should get object metadata successfully', async () => {
            const mockResponse = {
                Headers: {
                    'content-length': '1024',
                    'last-modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
                    'content-type': 'image/png',
                    etag: '"abc123"',
                },
            };
            vi.mocked(mockClient.headObject).mockImplementation((_params, callback) => {
                callback(null, mockResponse);
            });

            const meta = await adapter.getObjectMeta('test.png');

            // Use more flexible matching for date fields
            expect(meta).toEqual({
                size: 1024,
                lastModified: expect.any(Date),
                contentType: 'image/png',
                etag: '"abc123"',
            });

            // Verify the specific date is parsed correctly
            expect(meta.lastModified.toISOString()).toBe('2024-01-01T00:00:00.000Z');
            expect(mockClient.headObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    Bucket: mockConfig.Bucket,
                    Region: mockConfig.Region,
                    Key: 'test.png',
                }),
                expect.any(Function)
            );
        });

        it('should handle missing optional headers', async () => {
            const mockResponse = {
                Headers: {
                    'content-length': '0',
                    'last-modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
                },
            };
            vi.mocked(mockClient.headObject).mockImplementation((_params, callback) => {
                callback(null, mockResponse);
            });

            const meta = await adapter.getObjectMeta('test.png');

            // Use more flexible matching for date fields
            expect(meta).toEqual({
                size: 0,
                lastModified: expect.any(Date),
                contentType: undefined,
                etag: undefined,
            });

            // Verify the specific date is parsed correctly
            expect(meta.lastModified.toISOString()).toBe('2024-01-01T00:00:00.000Z');
        });

        it('should throw error when getting metadata fails', async () => {
            vi.mocked(mockClient.headObject).mockImplementation(
                (_params: unknown, callback: (err: Error) => void) => {
                    callback(new Error('Object not found'));
                }
            );

            await expect(adapter.getObjectMeta('test.png')).rejects.toThrow(
                'Failed to get object meta from COS: Object not found'
            );
        });
    });

    describe('exists', () => {
        it('should return true when object exists', async () => {
            vi.mocked(mockClient.headObject).mockImplementation(
                (_params: unknown, callback: (err: null) => void) => {
                    callback(null);
                }
            );

            const result = await adapter.exists('test.png');

            expect(result).toBe(true);
            expect(mockClient.headObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    Bucket: mockConfig.Bucket,
                    Region: mockConfig.Region,
                    Key: 'test.png',
                }),
                expect.any(Function)
            );
        });

        it('should return false when object does not exist', async () => {
            vi.mocked(mockClient.headObject).mockImplementation(
                (_params: unknown, callback: (err: Error) => void) => {
                    callback(new Error('Not found'));
                }
            );

            const result = await adapter.exists('test.png');

            expect(result).toBe(false);
        });

        it('should return false when headObject returns error with statusCode 404', async () => {
            const error = new Error('Not found') as Error & { statusCode: number };
            error.statusCode = 404;
            vi.mocked(mockClient.headObject).mockImplementation(
                (_params: unknown, callback: (err: Error) => void) => {
                    callback(error);
                }
            );

            const result = await adapter.exists('test.png');

            expect(result).toBe(false);
        });

        it('should return false when headObject returns error without statusCode', async () => {
            vi.mocked(mockClient.headObject).mockImplementation(
                (_params: unknown, callback: (err: Error) => void) => {
                    callback(new Error('Some error'));
                }
            );

            const result = await adapter.exists('test.png');

            expect(result).toBe(false);
        });
    });

    describe('delete', () => {
        it('should delete object successfully', async () => {
            vi.mocked(mockClient.deleteObject).mockImplementation(
                (_params: unknown, callback: (err: null) => void) => {
                    callback(null);
                }
            );

            await adapter.delete('test.png');

            expect(mockClient.deleteObject).toHaveBeenCalledWith(
                expect.objectContaining({
                    Bucket: mockConfig.Bucket,
                    Region: mockConfig.Region,
                    Key: 'test.png',
                }),
                expect.any(Function)
            );
        });

        it('should throw error when delete fails', async () => {
            vi.mocked(mockClient.deleteObject).mockImplementation(
                (_params: unknown, callback: (err: Error) => void) => {
                    callback(new Error('Delete failed'));
                }
            );

            await expect(adapter.delete('test.png')).rejects.toThrow(
                'Failed to delete object from COS: Delete failed'
            );
        });
    });

    describe('buildUrl', () => {
        it('should generate correct URL format', async () => {
            vi.mocked(mockClient.uploadFile).mockImplementation(
                (_params: unknown, callback: (err: null) => void) => {
                    callback(null);
                }
            );

            const result = await adapter.upload('/local/path.png', 'folder/test.png');

            expect(result.url).toBe(
                'https://test-bucket-1250000000.cos.ap-guangzhou.myqcloud.com/folder/test.png'
            );
        });
    });
});
