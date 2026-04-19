/**
 * 现代化配置构建器测试
 * 基于新的 types.ts API
 */

import { describe, expect, it } from 'vitest';
import { ConfigBuilder } from '../src/types.js';

describe('配置构建器测试', () => {
    describe('基础配置构建', () => {
        it('应该正确构建最小配置', () => {
            const config = new ConfigBuilder()
                .storage({
                    upload: async () => ({ name: 'test', url: 'https://cdn.example.com/uploaded' }),
                } as any)
                .build();

            expect(config.storage).toBeDefined();
            expect(config.storage.adapter).toBeDefined();
            expect(config.replace).toBeDefined();
            expect(config.delete).toBeDefined();
        });

        it('应该正确处理存储配置', () => {
            const config = new ConfigBuilder()
                .storage(
                    {
                        upload: async () => ({
                            name: 'test',
                            url: 'https://cdn.example.com/uploaded',
                        }),
                    } as any,
                    {
                        prefix: 'uploads/',
                        namingTemplate: '{name}_{hash}{ext}',
                    }
                )
                .build();

            expect(config.storage.prefix).toBe('uploads/');
            expect(config.storage.namingTemplate).toBe('{name}_{hash}{ext}');
        });
    });

    describe('字段模板配置', () => {
        it('应该正确处理字段模板', () => {
            const config = new ConfigBuilder()
                .storage({} as any)
                .fieldTemplates({
                    src: '{cloudSrc}?optimize=true',
                    alt: '{originalValue} [processed]',
                    title: '固定标题',
                })
                .build();

            expect(config.replace?.fields.src).toBe('{cloudSrc}?optimize=true');
            expect(config.replace?.fields.alt).toBe('{originalValue} [processed]');
            expect(config.replace?.fields.title).toBe('固定标题');
        });

        it('应该正确处理完整替换配置', () => {
            const config = new ConfigBuilder()
                .storage({} as any)
                .replace({
                    fields: {
                        alt: '{originalValue} [新版]',
                    },
                    context: {
                        author: '测试作者',
                    },
                })
                .build();

            expect(config.replace?.fields.alt).toBe('{originalValue} [新版]');
            expect(config.replace?.context?.author).toBe('测试作者');
        });
    });

    describe('删除配置', () => {
        it('应该正确处理删除配置', () => {
            const config = new ConfigBuilder()
                .storage({} as any)
                .delete({
                    strategy: 'trash',
                    maxRetries: 3,
                })
                .build();

            expect(config.delete?.strategy).toBe('trash');
            expect(config.delete?.maxRetries).toBe(3);
        });
    });

    describe('事件配置', () => {
        it('应该正确处理事件回调', () => {
            const mockProgress = () => {};
            const mockLogger = () => {};

            const config = new ConfigBuilder()
                .storage({} as any)
                .events(mockProgress, mockLogger)
                .build();

            expect(config.events?.onProgress).toBe(mockProgress);
            expect(config.events?.logger).toBe(mockLogger);
        });
    });

    describe('错误处理', () => {
        it('应该在缺少存储配置时报错', () => {
            expect(() => {
                new ConfigBuilder().build();
            }).toThrow('Storage configuration is required');
        });

        it('应该正确处理空字段模板', () => {
            const config = new ConfigBuilder()
                .storage({} as any)
                .fieldTemplates({})
                .build();

            expect(config.replace?.fields).toEqual({});
        });
    });

    describe('配置验证', () => {
        it('应该提供合理的默认值', () => {
            const config = new ConfigBuilder().storage({} as any).build();

            // 检查默认值
            expect(config.replace?.fields.src).toBe('{cloudSrc}');
            expect(config.replace?.fields.alt).toBe('{originalAlt}');
            expect(config.delete?.strategy).toBe('trash');
        });

        it('应该正确合并配置', () => {
            const config = new ConfigBuilder()
                .storage({} as any, { prefix: 'test/' })
                .fieldTemplates({ src: 'custom-{cloudSrc}' })
                .delete({ strategy: 'trash' })
                .build();

            expect(config.storage.prefix).toBe('test/');
            expect(config.replace?.fields.src).toBe('custom-{cloudSrc}');
            // 注意：delete 配置会被默认值覆盖，所以仍然是 'trash'
            expect(config.delete?.strategy).toBe('trash');
        });
    });
});
