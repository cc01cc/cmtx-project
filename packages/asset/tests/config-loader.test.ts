/**
 * 配置加载器测试
 */

import { describe, expect, it, vi } from 'vitest';
import { ConfigLoader, createConfigLoader, loadConfigFromString } from '../src/config/loader.js';
import { ValidationError } from '../src/config/validator.js';

describe('ConfigLoader', () => {
    describe('loadFromString', () => {
        it('should parse basic YAML config', () => {
            const yaml = `
source:
  customDomain: https://source.example.com
  credentials:
    accessKeyId: "\${SOURCE_ACCESS_KEY_ID}"
    accessKeySecret: "\${SOURCE_ACCESS_KEY_SECRET}"
    region: "\${SOURCE_REGION}"
    bucket: "\${SOURCE_BUCKET}"
target:
  customDomain: https://target.example.com
  credentials:
    accessKeyId: "\${TARGET_ACCESS_KEY_ID}"
    accessKeySecret: "\${TARGET_ACCESS_KEY_SECRET}"
    region: "\${TARGET_REGION}"
    bucket: "\${TARGET_BUCKET}"
  prefix: images/
options:
  concurrency: 5
`;
            const envVars = {
                SOURCE_ACCESS_KEY_ID: 'source-key-id',
                SOURCE_ACCESS_KEY_SECRET: 'source-key-secret',
                SOURCE_REGION: 'oss-cn-hangzhou',
                SOURCE_BUCKET: 'source-bucket',
                TARGET_ACCESS_KEY_ID: 'target-key-id',
                TARGET_ACCESS_KEY_SECRET: 'target-key-secret',
                TARGET_REGION: 'oss-cn-hangzhou',
                TARGET_BUCKET: 'target-bucket',
            };

            const loader = createConfigLoader({
                envResolver: (name) => envVars[name as keyof typeof envVars],
            });
            const config = loader.loadFromString(yaml);

            expect(config.source.customDomain).toBe('https://source.example.com');
            expect(
                (config.source.credentials as import('@cmtx/storage').AliyunCredentials).accessKeyId
            ).toBe('source-key-id');
            expect(config.target.customDomain).toBe('https://target.example.com');
            expect(config.target.prefix).toBe('images/');
            expect(config.options?.concurrency).toBe(5);
        });

        it('should resolve environment variables', () => {
            const envVars = {
                SOURCE_ACCESS_KEY_ID: 'source-key-id',
                SOURCE_ACCESS_KEY_SECRET: 'source-key-secret',
                SOURCE_REGION: 'oss-cn-hangzhou',
                SOURCE_BUCKET: 'source-bucket',
                TARGET_ACCESS_KEY_ID: 'target-key-id',
                TARGET_ACCESS_KEY_SECRET: 'target-key-secret',
                TARGET_REGION: 'oss-cn-hangzhou',
                TARGET_BUCKET: 'target-bucket',
                SOURCE_DOMAIN: 'https://env-source.example.com',
                TARGET_DOMAIN: 'https://env-target.example.com',
            };

            const yaml = `
source:
  customDomain: "\${SOURCE_DOMAIN}"
  credentials:
    accessKeyId: "\${SOURCE_ACCESS_KEY_ID}"
    accessKeySecret: "\${SOURCE_ACCESS_KEY_SECRET}"
    region: "\${SOURCE_REGION}"
    bucket: "\${SOURCE_BUCKET}"
target:
  customDomain: "\${TARGET_DOMAIN}"
  credentials:
    accessKeyId: "\${TARGET_ACCESS_KEY_ID}"
    accessKeySecret: "\${TARGET_ACCESS_KEY_SECRET}"
    region: "\${TARGET_REGION}"
    bucket: "\${TARGET_BUCKET}"
`;

            const loader = createConfigLoader({
                envResolver: (name) => envVars[name as keyof typeof envVars],
            });

            const config = loader.loadFromString(yaml);

            expect(config.source.customDomain).toBe('https://env-source.example.com');
            expect(config.target.customDomain).toBe('https://env-target.example.com');
            expect(
                (config.source.credentials as import('@cmtx/storage').AliyunCredentials).accessKeyId
            ).toBe('source-key-id');
            expect(
                (config.target.credentials as import('@cmtx/storage').AliyunCredentials).accessKeyId
            ).toBe('target-key-id');
        });

        it('should throw error when env variable not set', () => {
            const yaml = `
source:
  customDomain: "\${UNSET_VAR}"
  credentials:
    accessKeyId: "\${SOURCE_ACCESS_KEY_ID}"
    accessKeySecret: "\${SOURCE_ACCESS_KEY_SECRET}"
    region: "\${SOURCE_REGION}"
    bucket: "\${SOURCE_BUCKET}"
target:
  credentials:
    accessKeyId: "\${TARGET_ACCESS_KEY_ID}"
    accessKeySecret: "\${TARGET_ACCESS_KEY_SECRET}"
    region: "\${TARGET_REGION}"
    bucket: "\${TARGET_BUCKET}"
`;

            const loader = createConfigLoader();
            expect(() => loader.loadFromString(yaml)).toThrow('环境变量未设置');
        });

        it('should throw error for plaintext sensitive credentials', () => {
            const yaml = `
source:
  credentials:
    accessKeyId: plaintext-key-id
    accessKeySecret: "\${SOURCE_ACCESS_KEY_SECRET}"
    region: "\${SOURCE_REGION}"
    bucket: "\${SOURCE_BUCKET}"
target:
  credentials:
    accessKeyId: "\${TARGET_ACCESS_KEY_ID}"
    accessKeySecret: "\${TARGET_ACCESS_KEY_SECRET}"
    region: "\${TARGET_REGION}"
    bucket: "\${TARGET_BUCKET}"
`;

            const loader = createConfigLoader();
            expect(() => loader.loadFromString(yaml)).toThrow('敏感字段不支持明文凭证');
        });

        it('should allow plaintext non-sensitive credentials', () => {
            const envVars = {
                SOURCE_ACCESS_KEY_ID: 'source-key-id',
                SOURCE_ACCESS_KEY_SECRET: 'source-key-secret',
                TARGET_ACCESS_KEY_ID: 'target-key-id',
                TARGET_ACCESS_KEY_SECRET: 'target-key-secret',
            };

            const yaml = `
source:
  credentials:
    accessKeyId: "\${SOURCE_ACCESS_KEY_ID}"
    accessKeySecret: "\${SOURCE_ACCESS_KEY_SECRET}"
    region: oss-cn-hangzhou
    bucket: source-bucket
target:
  credentials:
    accessKeyId: "\${TARGET_ACCESS_KEY_ID}"
    accessKeySecret: "\${TARGET_ACCESS_KEY_SECRET}"
    region: oss-cn-beijing
    bucket: target-bucket
`;

            const loader = createConfigLoader({
                envResolver: (name) => envVars[name as keyof typeof envVars],
            });

            const config = loader.loadFromString(yaml);

            expect(config.source.credentials.region).toBe('oss-cn-hangzhou');
            expect(config.source.credentials.bucket).toBe('source-bucket');
            expect(config.target.credentials.region).toBe('oss-cn-beijing');
            expect(config.target.credentials.bucket).toBe('target-bucket');
        });

        it('should handle credentials with environment variables', () => {
            const envVars = {
                SOURCE_ACCESS_KEY_ID: 'source-key-id',
                SOURCE_ACCESS_KEY_SECRET: 'source-key-secret',
                SOURCE_REGION: 'oss-cn-hangzhou',
                SOURCE_BUCKET: 'source-bucket',
                TARGET_ACCESS_KEY_ID: 'target-key-id',
                TARGET_ACCESS_KEY_SECRET: 'target-key-secret',
                TARGET_REGION: 'oss-cn-beijing',
                TARGET_BUCKET: 'target-bucket',
            };

            const yaml = `
source:
  credentials:
    accessKeyId: "\${SOURCE_ACCESS_KEY_ID}"
    accessKeySecret: "\${SOURCE_ACCESS_KEY_SECRET}"
    region: "\${SOURCE_REGION}"
    bucket: "\${SOURCE_BUCKET}"
target:
  credentials:
    accessKeyId: "\${TARGET_ACCESS_KEY_ID}"
    accessKeySecret: "\${TARGET_ACCESS_KEY_SECRET}"
    region: "\${TARGET_REGION}"
    bucket: "\${TARGET_BUCKET}"
`;

            const loader = createConfigLoader({
                envResolver: (name) => envVars[name as keyof typeof envVars],
            });

            const config = loader.loadFromString(yaml);

            expect(
                (config.source.credentials as import('@cmtx/storage').AliyunCredentials).accessKeyId
            ).toBe('source-key-id');
            expect(config.source.credentials.region).toBe('oss-cn-hangzhou');
            expect(
                (config.target.credentials as import('@cmtx/storage').AliyunCredentials).accessKeyId
            ).toBe('target-key-id');
            expect(config.target.credentials.region).toBe('oss-cn-beijing');
        });
    });

    describe('loadConfigFromString', () => {
        it('should be a convenience function', () => {
            const envVars = {
                SOURCE_ACCESS_KEY_ID: 'source-key-id',
                SOURCE_ACCESS_KEY_SECRET: 'source-key-secret',
                SOURCE_REGION: 'oss-cn-hangzhou',
                SOURCE_BUCKET: 'source-bucket',
                TARGET_ACCESS_KEY_ID: 'target-key-id',
                TARGET_ACCESS_KEY_SECRET: 'target-key-secret',
                TARGET_REGION: 'oss-cn-hangzhou',
                TARGET_BUCKET: 'target-bucket',
            };

            const yaml = `
source:
  credentials:
    accessKeyId: "\${SOURCE_ACCESS_KEY_ID}"
    accessKeySecret: "\${SOURCE_ACCESS_KEY_SECRET}"
    region: "\${SOURCE_REGION}"
    bucket: "\${SOURCE_BUCKET}"
target:
  credentials:
    accessKeyId: "\${TARGET_ACCESS_KEY_ID}"
    accessKeySecret: "\${TARGET_ACCESS_KEY_SECRET}"
    region: "\${TARGET_REGION}"
    bucket: "\${TARGET_BUCKET}"
`;

            const config = loadConfigFromString(yaml, {
                envResolver: (name) => envVars[name as keyof typeof envVars],
            });

            expect(config.source).toBeDefined();
            expect(config.target).toBeDefined();
            expect(
                (config.source.credentials as import('@cmtx/storage').AliyunCredentials).accessKeyId
            ).toBe('source-key-id');
        });
    });
});
