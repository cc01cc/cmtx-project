/**
 * 存储适配器工厂测试
 *
 * @module @cmtx/storage/tests/adapters/factory
 */

import { describe, expect, it, vi } from 'vitest';
import { createAdapter } from '../../src/adapters/factory.js';
import type { CloudCredentials } from '../../src/types.js';

describe('createAdapter', () => {
    describe('阿里云 OSS', () => {
        it('should create AliOSSAdapter with valid credentials', async () => {
            const credentials: CloudCredentials = {
                provider: 'aliyun-oss',
                accessKeyId: 'test-access-key',
                accessKeySecret: 'test-secret-key',
                region: 'oss-cn-hangzhou',
                bucket: 'test-bucket',
            };

            const adapter = await createAdapter(credentials);

            expect(adapter).toBeDefined();
            expect(typeof adapter.upload).toBe('function');
            expect(typeof adapter.getSignedUrl).toBe('function');
            expect(typeof adapter.delete).toBe('function');
            expect(typeof adapter.exists).toBe('function');
            expect(typeof adapter.getObjectMeta).toBe('function');
            expect(typeof adapter.downloadToFile).toBe('function');
            expect(typeof adapter.uploadBuffer).toBe('function');
            expect(typeof adapter.buildUrl).toBe('function');
        });

        it('should create AliOSSAdapter with STS token', async () => {
            const credentials: CloudCredentials = {
                provider: 'aliyun-oss',
                accessKeyId: 'test-access-key',
                accessKeySecret: 'test-secret-key',
                stsToken: 'test-sts-token',
                region: 'oss-cn-beijing',
                bucket: 'test-bucket',
            };

            const adapter = await createAdapter(credentials);

            expect(adapter).toBeDefined();
        });
    });

    describe('腾讯云 COS', () => {
        it('should create TencentCOSAdapter with valid credentials', async () => {
            const credentials: CloudCredentials = {
                provider: 'tencent-cos',
                secretId: 'test-secret-id',
                secretKey: 'test-secret-key',
                region: 'ap-guangzhou',
                bucket: 'test-bucket-1250000000',
            };

            const adapter = await createAdapter(credentials);

            expect(adapter).toBeDefined();
            expect(typeof adapter.upload).toBe('function');
            expect(typeof adapter.getSignedUrl).toBe('function');
            expect(typeof adapter.delete).toBe('function');
            expect(typeof adapter.exists).toBe('function');
            expect(typeof adapter.getObjectMeta).toBe('function');
            expect(typeof adapter.downloadToFile).toBe('function');
            expect(typeof adapter.uploadBuffer).toBe('function');
            expect(typeof adapter.buildUrl).toBe('function');
        });

        it('should create TencentCOSAdapter with session token', async () => {
            const credentials: CloudCredentials = {
                provider: 'tencent-cos',
                secretId: 'test-secret-id',
                secretKey: 'test-secret-key',
                sessionToken: 'test-session-token',
                region: 'ap-beijing',
                bucket: 'test-bucket-1250000000',
            };

            const adapter = await createAdapter(credentials);

            expect(adapter).toBeDefined();
        });
    });

    describe('错误处理', () => {
        it('should throw error for unsupported provider', async () => {
            const credentials = {
                provider: 'unsupported-provider',
            } as unknown as CloudCredentials;

            await expect(createAdapter(credentials)).rejects.toThrow(
                'Unsupported storage provider: unsupported-provider'
            );
        });

        it('should throw error for empty provider', async () => {
            const credentials = {
                provider: '',
            } as unknown as CloudCredentials;

            await expect(createAdapter(credentials)).rejects.toThrow(
                'Unsupported storage provider:'
            );
        });
    });
});
