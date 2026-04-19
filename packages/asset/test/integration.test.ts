/**
 * 综合集成测试套件
 * 结合配置验证和端到端上传流程测试
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createContext, renderTemplateImage } from '../src/template-renderer.js';
import { ConfigBuilder } from '../src/types.js';
import { uploadLocalImageInMarkdown } from '../src/uploader.js';

describe('综合集成测试', () => {
    const TEST_DIR = resolve(process.cwd(), '.test-integration');
    const DOCS_DIR = join(TEST_DIR, 'docs');
    const IMAGES_DIR = join(TEST_DIR, 'images');

    // Mock 存储适配器
    class MockStorageAdapter {
        public uploadedFiles: Array<{ localPath: string; remotePath: string; result: any }> = [];

        async upload(localPath: string, remotePath: string) {
            const result = { name: remotePath, url: `https://cdn.example.com/${remotePath}` };
            this.uploadedFiles.push({ localPath, remotePath, result });
            return result;
        }

        reset() {
            this.uploadedFiles = [];
        }
    }

    let mockAdapter: MockStorageAdapter;

    beforeEach(async () => {
        mockAdapter = new MockStorageAdapter();

        // 清理并创建测试环境
        if (existsSync(TEST_DIR)) {
            await rm(TEST_DIR, { recursive: true, force: true });
        }

        await mkdir(DOCS_DIR, { recursive: true });
        await mkdir(IMAGES_DIR, { recursive: true });

        // 创建测试图片
        await writeFile(join(IMAGES_DIR, 'logo.png'), 'fake-image-data');
        await writeFile(join(IMAGES_DIR, 'banner.jpg'), 'fake-banner-data');

        // 创建测试 Markdown 文件
        await writeFile(
            join(DOCS_DIR, 'README.md'),
            '# Test\n\n![Logo](../images/logo.png)\n\n![Banner](../images/banner.jpg)'
        );

        await writeFile(join(DOCS_DIR, 'guide.md'), '# Guide\n\n![Logo](../images/logo.png)');
    });

    afterEach(async () => {
        if (existsSync(TEST_DIR)) {
            await rm(TEST_DIR, { recursive: true, force: true });
        }
    });

    describe('配置构建验证', () => {
        it('应该正确构建和验证配置', () => {
            // 测试配置构建
            const config = new ConfigBuilder()
                .storage(
                    {
                        upload: async () => ({
                            name: 'test',
                            url: 'https://mock.cdn.com/uploaded',
                        }),
                    } as any,
                    {
                        prefix: 'blog/assets/',
                        namingTemplate: '{date}_{md5_8}{ext}',
                    }
                )
                .fieldTemplates({
                    src: '{cloudSrc}?quality=80',
                    alt: '{originalValue} [已处理]',
                })
                .delete({
                    strategy: 'trash',
                    maxRetries: 3,
                })
                .build();

            expect(config.storage.prefix).toBe('blog/assets/');
            expect(config.replace?.fields.src).toBe('{cloudSrc}?quality=80');
            expect(config.delete?.strategy).toBe('trash');
        });

        it('应该正确处理模板渲染', () => {
            // 模拟图片引用数据
            const logoImage = {
                absPath: '/path/to/logo.png',
                cloudUrl: 'https://cdn.example.com/logo.png',
                references: [
                    {
                        filePath: '/docs/article1.md',
                        imageMatch: { src: './images/logo.png', alt: '公司Logo' },
                    },
                    {
                        filePath: '/docs/article2.md',
                        imageMatch: { src: '../images/logo.png', alt: 'Brand Logo' },
                    },
                ],
            };

            // 测试配置
            const config = new ConfigBuilder()
                .storage({} as any)
                .fieldTemplates({
                    src: '{cloudSrc}?quality=80',
                    alt: '{originalValue} [已处理]',
                })
                .build();

            // 验证引用数量
            expect(logoImage.references.length).toBe(2);

            // 验证模板渲染
            logoImage.references.forEach((ref) => {
                const ctx = createContext(logoImage.absPath, {
                    cloudUrl: logoImage.cloudUrl!,
                    originalValue: ref.imageMatch.alt,
                });

                const newSrc = renderTemplateImage(config.replace?.fields.src, ctx);
                const newAlt = renderTemplateImage(config.replace?.fields.alt, ctx);

                expect(newSrc).toContain('https://cdn.example.com/logo.png');
                expect(newAlt).toContain('[已处理]');
            });
        });
    });

    describe('端到端上传流程', () => {
        it('应该成功上传单个 Markdown 文件中的图片', async () => {
            const readmePath = join(DOCS_DIR, 'README.md');
            const logs: string[] = [];

            const config = new ConfigBuilder()
                .storage(mockAdapter)
                .events(undefined, (level, msg) => {
                    logs.push(`[${level}] ${msg}`);
                })
                .build();

            const result = await uploadLocalImageInMarkdown(readmePath, config);

            // 输出日志用于调试
            if (logs.length > 0) {
                console.log('\n=== Upload Logs ===');
                logs.forEach((log) => console.log(log));
                console.log('=== End Logs ===\n');
            }

            expect(result.success).toBe(true);
            expect(result.uploaded).toBe(2);
            expect(result.replaced).toBe(2);
            expect(result.deleted).toBe(2);
            expect(mockAdapter.uploadedFiles).toHaveLength(2);
        });

        it('应该支持自定义命名模板', async () => {
            const readmePath = join(DOCS_DIR, 'README.md');

            const config = new ConfigBuilder()
                .storage(mockAdapter, {
                    namingTemplate: '{md5_8}_{fileName}',
                })
                .build();

            await uploadLocalImageInMarkdown(readmePath, config);

            expect(mockAdapter.uploadedFiles).toHaveLength(2);

            const logoUpload = mockAdapter.uploadedFiles.find((f) =>
                f.localPath.includes('logo.png')
            );
            expect(logoUpload?.remotePath).toMatch(/^[a-f0-9]{8}_logo\.png$/);
        });

        it('应该支持字段模板替换', async () => {
            const readmePath = join(DOCS_DIR, 'README.md');

            const config = new ConfigBuilder()
                .storage(mockAdapter)
                .fieldTemplates({
                    src: '{cloudSrc}?x-oss-process=image/resize,w_640',
                    alt: '{originalAlt} - Processed',
                })
                .build();

            const result = await uploadLocalImageInMarkdown(readmePath, config);

            expect(result.success).toBe(true);
            expect(result.uploaded).toBe(2);

            const content = await readFile(readmePath, 'utf-8');
            expect(content).toContain('?x-oss-process=image/resize,w_640');
            expect(content).toContain(' - Processed');
        });
    });

    describe('错误处理和边界情况', () => {
        it('单个图片上传失败不应中断整个流程', async () => {
            const readmePath = join(DOCS_DIR, 'README.md');

            // 创建会失败的适配器
            const failingAdapter = {
                async upload(localPath: string, remotePath: string) {
                    if (localPath.includes('logo.png')) {
                        throw new Error('Mock upload failure');
                    }
                    return { name: remotePath, url: `https://cdn.example.com/${remotePath}` };
                },
            };

            const config = new ConfigBuilder().storage(failingAdapter as any).build();

            const result = await uploadLocalImageInMarkdown(readmePath, config);

            expect(result.success).toBe(true);
            expect(result.uploaded).toBe(1); // 只有一个成功
            expect(result.replaced).toBe(1);
        });

        it('应该处理没有本地图片的情况', async () => {
            // 创建不包含本地图片的 Markdown
            await writeFile(
                join(DOCS_DIR, 'no-images.md'),
                '# No Images\n\nThis document has no local images.'
            );

            const config = new ConfigBuilder().storage(mockAdapter).build();

            const result = await uploadLocalImageInMarkdown(join(DOCS_DIR, 'no-images.md'), config);

            expect(result.success).toBe(true);
            expect(result.uploaded).toBe(0);
            expect(result.replaced).toBe(0);
            expect(result.deleted).toBe(0);
        });
    });

    describe('配置行为验证', () => {
        it('应该提供合理的默认行为', async () => {
            const readmePath = join(DOCS_DIR, 'README.md');

            const config = new ConfigBuilder().storage(mockAdapter).build();

            const result = await uploadLocalImageInMarkdown(readmePath, config);

            expect(result.success).toBe(true);
            // 默认应该使用基本的替换规则
            const content = await readFile(readmePath, 'utf-8');
            expect(content).toContain('https://cdn.example.com/');
        });

        it('应该正确处理删除配置', async () => {
            const readmePath = join(DOCS_DIR, 'README.md');

            const config = new ConfigBuilder()
                .storage(mockAdapter)
                .delete({
                    strategy: 'trash',
                    maxRetries: 3,
                })
                .build();

            const result = await uploadLocalImageInMarkdown(readmePath, config);

            expect(result.success).toBe(true);
            expect(result.deleted).toBe(2);
        });
    });
});
