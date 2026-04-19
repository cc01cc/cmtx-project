/**
 * 配置验证器测试
 */

import { describe, expect, it } from 'vitest';
import {
    ConfigValidator,
    createConfigValidator,
    ValidationError,
    validateConfig,
    validateConfigOrThrow,
} from '../src/config/validator.js';

describe('ConfigValidator', () => {
    describe('validate', () => {
        it('should validate valid config with env var templates', () => {
            const config = {
                source: {
                    credentials: {
                        accessKeyId: '${SOURCE_ACCESS_KEY_ID}',
                        accessKeySecret: '${SOURCE_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'source-bucket',
                    },
                    customDomain: 'https://source.example.com',
                },
                target: {
                    credentials: {
                        accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                        accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'target-bucket',
                    },
                    customDomain: 'https://target.example.com',
                    prefix: 'images/',
                    namingStrategy: 'preserve',
                    overwrite: false,
                },
                options: {
                    concurrency: 5,
                    tempDir: '/tmp/cmtx',
                },
            };

            const validator = createConfigValidator();
            const result = validator.validate(config);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should fail when sensitive fields use plaintext', () => {
            const config = {
                source: {
                    credentials: {
                        accessKeyId: 'plaintext-key-id',
                        accessKeySecret: '${SOURCE_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'source-bucket',
                    },
                },
                target: {
                    credentials: {
                        accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                        accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'target-bucket',
                    },
                },
            };

            const result = validateConfig(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.path === 'source.credentials.accessKeyId')).toBe(
                true
            );
            expect(result.errors.some((e) => e.message.includes('敏感字段'))).toBe(true);
        });

        it('should fail when accessKeySecret uses plaintext', () => {
            const config = {
                source: {
                    credentials: {
                        accessKeyId: '${SOURCE_ACCESS_KEY_ID}',
                        accessKeySecret: 'plaintext-secret',
                        region: 'oss-cn-hangzhou',
                        bucket: 'source-bucket',
                    },
                },
                target: {
                    credentials: {
                        accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                        accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'target-bucket',
                    },
                },
            };

            const result = validateConfig(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.path === 'source.credentials.accessKeySecret')).toBe(
                true
            );
            expect(result.errors.some((e) => e.message.includes('敏感字段'))).toBe(true);
        });

        it('should allow plaintext for non-sensitive fields', () => {
            const config = {
                source: {
                    credentials: {
                        accessKeyId: '${SOURCE_ACCESS_KEY_ID}',
                        accessKeySecret: '${SOURCE_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'source-bucket',
                    },
                },
                target: {
                    credentials: {
                        accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                        accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-beijing',
                        bucket: 'target-bucket',
                    },
                },
            };

            const result = validateConfig(config);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should fail when source is missing', () => {
            const config = {
                target: {
                    credentials: {
                        accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                        accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'target-bucket',
                    },
                },
            };

            const result = validateConfig(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.path === 'source')).toBe(true);
        });

        it('should fail when target is missing', () => {
            const config = {
                source: {
                    credentials: {
                        accessKeyId: '${SOURCE_ACCESS_KEY_ID}',
                        accessKeySecret: '${SOURCE_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'source-bucket',
                    },
                },
            };

            const result = validateConfig(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.path === 'target')).toBe(true);
        });

        it('should fail when source credentials is missing', () => {
            const config = {
                source: {
                    customDomain: 'https://source.example.com',
                },
                target: {
                    credentials: {
                        accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                        accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'target-bucket',
                    },
                },
            };

            const result = validateConfig(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.path === 'source.credentials')).toBe(true);
        });

        it('should fail with invalid URL format', () => {
            const config = {
                source: {
                    credentials: {
                        accessKeyId: '${SOURCE_ACCESS_KEY_ID}',
                        accessKeySecret: '${SOURCE_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'source-bucket',
                    },
                    customDomain: 'not-a-valid-url',
                },
                target: {
                    credentials: {
                        accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                        accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'target-bucket',
                    },
                },
            };

            const result = validateConfig(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.path === 'source.customDomain')).toBe(true);
        });

        it('should fail with invalid naming strategy', () => {
            const config = {
                source: {
                    credentials: {
                        accessKeyId: '${SOURCE_ACCESS_KEY_ID}',
                        accessKeySecret: '${SOURCE_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'source-bucket',
                    },
                },
                target: {
                    credentials: {
                        accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                        accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'target-bucket',
                    },
                    namingStrategy: 'invalid-strategy',
                },
            };

            const result = validateConfig(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.path === 'target.namingStrategy')).toBe(true);
        });

        it('should accept valid naming strategies', () => {
            const validStrategies = ['preserve', 'timestamp', 'hash', 'uuid'];

            for (const strategy of validStrategies) {
                const config = {
                    source: {
                        credentials: {
                            accessKeyId: '${SOURCE_ACCESS_KEY_ID}',
                            accessKeySecret: '${SOURCE_ACCESS_KEY_SECRET}',
                            region: 'oss-cn-hangzhou',
                            bucket: 'source-bucket',
                        },
                    },
                    target: {
                        credentials: {
                            accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                            accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                            region: 'oss-cn-hangzhou',
                            bucket: 'target-bucket',
                        },
                        namingStrategy: strategy,
                    },
                };

                const result = validateConfig(config);
                expect(result.errors.some((e) => e.path === 'target.namingStrategy')).toBe(false);
            }
        });

        it('should fail with invalid concurrency', () => {
            const config = {
                source: {
                    credentials: {
                        accessKeyId: '${SOURCE_ACCESS_KEY_ID}',
                        accessKeySecret: '${SOURCE_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'source-bucket',
                    },
                },
                target: {
                    credentials: {
                        accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                        accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'target-bucket',
                    },
                },
                options: {
                    concurrency: -1,
                },
            };

            const result = validateConfig(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.path === 'options.concurrency')).toBe(true);
        });

        it('should fail with non-integer concurrency', () => {
            const config = {
                source: {
                    credentials: {
                        accessKeyId: '${SOURCE_ACCESS_KEY_ID}',
                        accessKeySecret: '${SOURCE_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'source-bucket',
                    },
                },
                target: {
                    credentials: {
                        accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                        accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'target-bucket',
                    },
                },
                options: {
                    concurrency: 3.5,
                },
            };

            const result = validateConfig(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.path === 'options.concurrency')).toBe(true);
        });

        it('should validate filter extensions', () => {
            const config = {
                source: {
                    credentials: {
                        accessKeyId: '${SOURCE_ACCESS_KEY_ID}',
                        accessKeySecret: '${SOURCE_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'source-bucket',
                    },
                },
                target: {
                    credentials: {
                        accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                        accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'target-bucket',
                    },
                },
                options: {
                    filter: {
                        extensions: ['.jpg', '.png', '.gif'],
                        maxSize: 10485760,
                        minSize: 1024,
                    },
                },
            };

            const result = validateConfig(config);

            expect(result.valid).toBe(true);
        });

        it('should fail with invalid filter extensions', () => {
            const config = {
                source: {
                    credentials: {
                        accessKeyId: '${SOURCE_ACCESS_KEY_ID}',
                        accessKeySecret: '${SOURCE_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'source-bucket',
                    },
                },
                target: {
                    credentials: {
                        accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                        accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'target-bucket',
                    },
                },
                options: {
                    filter: {
                        extensions: 'not-an-array',
                    },
                },
            };

            const result = validateConfig(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.path === 'options.filter.extensions')).toBe(true);
        });

        it('should fail with negative maxSize', () => {
            const config = {
                source: {
                    credentials: {
                        accessKeyId: '${SOURCE_ACCESS_KEY_ID}',
                        accessKeySecret: '${SOURCE_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'source-bucket',
                    },
                },
                target: {
                    credentials: {
                        accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                        accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'target-bucket',
                    },
                },
                options: {
                    filter: {
                        maxSize: -100,
                    },
                },
            };

            const result = validateConfig(config);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.path === 'options.filter.maxSize')).toBe(true);
        });
    });

    describe('validateConfigOrThrow', () => {
        it('should throw ValidationError for invalid config', () => {
            const config = {
                source: {
                    credentials: {
                        accessKeyId: '${SOURCE_ACCESS_KEY_ID}',
                        accessKeySecret: '${SOURCE_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'source-bucket',
                    },
                },
                // missing target
            };

            expect(() => validateConfigOrThrow(config)).toThrow(ValidationError);
        });

        it('should not throw for valid config', () => {
            const config = {
                source: {
                    credentials: {
                        accessKeyId: '${SOURCE_ACCESS_KEY_ID}',
                        accessKeySecret: '${SOURCE_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'source-bucket',
                    },
                },
                target: {
                    credentials: {
                        accessKeyId: '${TARGET_ACCESS_KEY_ID}',
                        accessKeySecret: '${TARGET_ACCESS_KEY_SECRET}',
                        region: 'oss-cn-hangzhou',
                        bucket: 'target-bucket',
                    },
                },
            };

            expect(() => validateConfigOrThrow(config)).not.toThrow();
        });
    });

    describe('ValidationError', () => {
        it('should have correct name and message', () => {
            const error = new ValidationError('Test message', 'test.path');

            expect(error.name).toBe('ValidationError');
            expect(error.message).toBe('Test message');
            expect(error.path).toBe('test.path');
        });
    });
});
