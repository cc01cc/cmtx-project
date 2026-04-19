/**
 * 集成测试共享工具函数
 *
 * @module @cmtx/storage/tests/integration/shared-test-utils
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import OSS from 'ali-oss';
import COS from 'cos-nodejs-sdk-v5';
import { AliOSSAdapter } from '../../src/adapters/ali-oss.js';
import type { CosClient } from '../../src/adapters/cos-types.js';
import { TencentCOSAdapter } from '../../src/adapters/tencent-cos.js';
import type { IStorageAdapter } from '../../src/types.js';

export interface AliyunTestConfig {
    enabled: boolean;
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    testPrefix: string;
}

export interface TencentTestConfig {
    enabled: boolean;
    secretId: string;
    secretKey: string;
    region: string;
    bucket: string;
    testPrefix: string;
}

export interface TestConfig {
    aliyun: AliyunTestConfig;
    tencent: TencentTestConfig;
}

const CONFIG_FILE_PATH = join(__dirname, 'test-config.json');

export function loadTestConfig(): TestConfig {
    if (!existsSync(CONFIG_FILE_PATH)) {
        throw new Error(
            `Test config file not found: ${CONFIG_FILE_PATH}\n` +
                `Please copy test-config.example.json to test-config.json and fill in your credentials.`
        );
    }

    const configContent = readFileSync(CONFIG_FILE_PATH, 'utf-8');
    const config = JSON.parse(configContent) as TestConfig;

    validateConfig(config);

    return config;
}

/**
 * 验证阿里云配置
 */
function validateAliyunConfig(config: AliyunTestConfig): void {
    if (!config.accessKeyId || !config.accessKeySecret) {
        throw new Error('Aliyun OSS config missing accessKeyId or accessKeySecret');
    }
    if (!config.bucket) {
        throw new Error('Aliyun OSS config missing bucket');
    }
    if (!config.region) {
        throw new Error('Aliyun OSS config missing region');
    }
}

/**
 * 验证腾讯云配置
 */
function validateTencentConfig(config: TencentTestConfig): void {
    if (!config.secretId || !config.secretKey) {
        throw new Error('Tencent COS config missing secretId or secretKey');
    }
    if (!config.bucket) {
        throw new Error('Tencent COS config missing bucket');
    }
    if (!config.region) {
        throw new Error('Tencent COS config missing region');
    }
}

/**
 * 验证测试配置
 */
function validateConfig(config: TestConfig): void {
    if (config.aliyun.enabled) {
        validateAliyunConfig(config.aliyun);
    }

    if (config.tencent.enabled) {
        validateTencentConfig(config.tencent);
    }
}

export function createOSSAdapter(config: AliyunTestConfig): AliOSSAdapter {
    const client = new OSS({
        region: config.region,
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        bucket: config.bucket,
    });

    return new AliOSSAdapter(client);
}

export function createCOSAdapter(config: TencentTestConfig): TencentCOSAdapter {
    const client = new COS({
        SecretId: config.secretId,
        SecretKey: config.secretKey,
    });

    return new TencentCOSAdapter(client as unknown as CosClient, {
        Bucket: config.bucket,
        Region: config.region,
    });
}

export function generateTestPath(basePrefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `${basePrefix}${timestamp}-${random}/`;
}

export function createTempDir(): string {
    const tempDir = join(
        tmpdir(),
        `storage-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    mkdirSync(tempDir, { recursive: true });
    return tempDir;
}

export function cleanupTempDir(tempDir: string): void {
    try {
        if (existsSync(tempDir)) {
            rmSync(tempDir, { recursive: true, force: true });
        }
    } catch {
        // Ignore cleanup errors
    }
}

export async function cleanupTestFiles(adapter: IStorageAdapter, testPath: string): Promise<void> {
    if (!adapter.delete) {
        return;
    }

    try {
        // 删除所有测试上传的文件
        const testFiles = [
            // upload 测试
            'sample-text.txt',
            'sample-image.png',
            'sample-binary.bin',
            // uploadBuffer 测试
            'uploaded-buffer.txt',
            'buffer-with-type.txt',
            'buffer-with-meta.txt',
            // getSignedUrl 测试
            'presigned-test.txt',
            'presigned-expiry.txt',
            'presigned-inline.txt',
            'presigned-attachment.txt',
            // downloadToFile 测试
            'download-test.txt',
            'download-binary.bin',
            // getObjectMeta 测试
            'meta-test.txt',
            'meta-image.png',
            // exists 测试
            'exists-test.txt',
            'non-existing-file.txt',
            // delete 测试
            'delete-test.txt',
            // full workflow 测试
            'workflow-test.txt',
        ];

        for (const file of testFiles) {
            const fullPath = `${testPath}${file}`;
            try {
                if (adapter.exists && (await adapter.exists(fullPath))) {
                    await adapter.delete(fullPath);
                    console.log(`[OK] Cleaned up: ${fullPath}`);
                }
            } catch {
                // Ignore individual file deletion errors
            }
        }
    } catch {
        // Ignore cleanup errors
    }
}

export function getFixturePath(filename: string): string {
    return join(__dirname, 'fixtures', filename);
}

export function readFixture(filename: string): Buffer {
    const path = getFixturePath(filename);
    return readFileSync(path);
}

export async function fetchUrl(url: string): Promise<{ status: number; data: Buffer }> {
    const response = await fetch(url);
    const data = Buffer.from(await response.arrayBuffer());
    return {
        status: response.status,
        data,
    };
}

export async function downloadAndCompare(
    adapter: IStorageAdapter,
    remotePath: string,
    expectedContent: Buffer
): Promise<boolean> {
    if (!adapter.downloadToFile) {
        throw new Error('Adapter does not support downloadToFile');
    }

    const tempDir = createTempDir();
    const localPath = join(tempDir, 'downloaded-file');

    try {
        await adapter.downloadToFile(remotePath, localPath);
        const downloadedContent = readFileSync(localPath);
        return downloadedContent.equals(expectedContent);
    } finally {
        cleanupTempDir(tempDir);
    }
}

export function createTestBuffer(content: string): Buffer {
    return Buffer.from(content);
}

export function writeTestFile(content: Buffer, filename: string): string {
    const tempDir = createTempDir();
    const filePath = join(tempDir, filename);
    writeFileSync(filePath, content);
    return filePath;
}
