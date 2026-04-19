/**
 * 删除功能测试
 *
 * 测试 validatePathWithinRoot、deleteLocalImage 和 deleteLocalImageSafely 函数：
 * - 路径安全验证（防止目录遍历攻击）
 * - 文件删除功能（支持多种策略）
 * - 安全删除（带使用检查）
 * - 错误处理
 */

import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteLocalImage, deleteLocalImageSafely, validatePathWithinRoot } from '../src/delete.js';
import type { DeleteFileOptions } from '../src/types.js';

const TEST_DIR = resolve(process.cwd(), '.test-delete');

describe('validatePathWithinRoot', () => {
    describe('有效路径', () => {
        it('应该接受根目录本身', () => {
            const root = '/home/user/project';
            expect(() => validatePathWithinRoot(root, root)).not.toThrow();
        });

        it('应该接受根目录下的文件', () => {
            const root = '/home/user/project';
            const file = '/home/user/project/file.txt';
            expect(() => validatePathWithinRoot(file, root)).not.toThrow();
        });

        it('应该接受根目录下的子目录文件', () => {
            const root = '/home/user/project';
            const file = '/home/user/project/docs/guide.md';
            expect(() => validatePathWithinRoot(file, root)).not.toThrow();
        });

        it('应该处理带点的路径', () => {
            const root = '/home/user/project';
            const file = '/home/user/project/./docs/../file.txt';
            expect(() => validatePathWithinRoot(file, root)).not.toThrow();
        });
    });

    describe('路径遍历攻击防护', () => {
        it('应该拒绝父目录路径', () => {
            const root = '/home/user/project';
            const file = '/home/user/other/file.txt';
            expect(() => validatePathWithinRoot(file, root)).toThrow('Security violation');
        });

        it('应该拒绝使用 .. 的路径遍历', () => {
            const root = '/home/user/project';
            const file = '/home/user/project/../other/file.txt';
            expect(() => validatePathWithinRoot(file, root)).toThrow('Security violation');
        });

        it('应该拒绝绝对路径遍历', () => {
            const root = '/home/user/project';
            const file = '/etc/passwd';
            expect(() => validatePathWithinRoot(file, root)).toThrow('Security violation');
        });

        it('应该拒绝相似的目录名', () => {
            const root = '/home/user/project';
            const file = '/home/user/project-backup/file.txt';
            expect(() => validatePathWithinRoot(file, root)).toThrow('Security violation');
        });

        it('应该拒绝根目录前缀匹配但不同的路径', () => {
            const root = '/home/user/proj';
            const file = '/home/user/project/file.txt';
            expect(() => validatePathWithinRoot(file, root)).toThrow('Security violation');
        });
    });

    describe('Windows 路径', () => {
        it('应该处理 Windows 风格路径', () => {
            const root = 'C:/Users/project';
            const file = 'C:/Users/project/file.txt';
            expect(() => validatePathWithinRoot(file, root)).not.toThrow();
        });

        it('应该拒绝 Windows 风格的父目录遍历', () => {
            const root = 'C:/Users/project';
            const file = 'C:/Users/other/file.txt';
            expect(() => validatePathWithinRoot(file, root)).toThrow('Security violation');
        });
    });

    describe('边界情况', () => {
        it('应该处理空字符串', () => {
            const root = '/home/user/project';
            expect(() => validatePathWithinRoot('', root)).toThrow('Security violation');
        });

        it('应该处理只有分隔符的路径', () => {
            const root = '/home/user/project';
            expect(() => validatePathWithinRoot('/', root)).toThrow('Security violation');
        });

        it('应该处理相对路径', () => {
            const root = '/home/user/project';
            const file = 'docs/file.txt';
            expect(() => validatePathWithinRoot(file, root)).toThrow('Security violation');
        });
    });
});

describe('deleteLocalImage', () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    describe('hard-delete 策略', () => {
        it('应该永久删除文件', async () => {
            const filePath = join(TEST_DIR, 'test-image.png');
            await writeFile(filePath, 'fake-image-data', 'utf-8');

            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
            };

            const result = await deleteLocalImage(filePath, options);

            expect(result.status).toBe('success');
            expect(result.actualStrategy).toBe('hard-delete');
            await expect(access(filePath)).rejects.toThrow();
        });

        it('应该删除不同扩展名的文件', async () => {
            const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

            for (const ext of extensions) {
                const filePath = join(TEST_DIR, `test-image${ext}`);
                await writeFile(filePath, 'fake-data', 'utf-8');

                const options: DeleteFileOptions = {
                    strategy: 'hard-delete',
                };

                await deleteLocalImage(filePath, options);
                await expect(access(filePath)).rejects.toThrow();
            }
        });

        it('应该删除子目录中的文件', async () => {
            const subDir = join(TEST_DIR, 'images', 'docs');
            await mkdir(subDir, { recursive: true });
            const filePath = join(subDir, 'nested.png');
            await writeFile(filePath, 'fake-data', 'utf-8');

            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
            };

            await deleteLocalImage(filePath, options);

            await expect(access(filePath)).rejects.toThrow();
        });

        it('应该在文件不存在时返回失败', async () => {
            const filePath = join(TEST_DIR, 'non-existent.png');
            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
            };

            const result = await deleteLocalImage(filePath, options);

            expect(result.status).toBe('failed');
            expect(result.error).toBeDefined();
        });
    });

    describe('move 策略', () => {
        it('应该移动文件到回收目录', async () => {
            const filePath = join(TEST_DIR, 'test.png');
            const trashDir = join(TEST_DIR, '.trash');
            await writeFile(filePath, 'data', 'utf-8');

            const options: DeleteFileOptions = {
                strategy: 'move',
                trashDir,
            };

            const result = await deleteLocalImage(filePath, options);

            expect(result.status).toBe('success');
            expect(result.actualStrategy).toBe('move');

            await expect(access(filePath)).rejects.toThrow();
            await expect(access(join(trashDir, 'test.png'))).resolves.not.toThrow();
        });

        it('应该在缺少 trashDir 时返回 skipped', async () => {
            const filePath = join(TEST_DIR, 'test.png');
            await writeFile(filePath, 'data', 'utf-8');

            const options: DeleteFileOptions = {
                strategy: 'move',
            };

            const result = await deleteLocalImage(filePath, options);

            expect(result.status).toBe('skipped');
            expect(result.error).toContain('trashDir is required');
            await expect(access(filePath)).resolves.not.toThrow();
        });
    });

    describe('trash 策略', () => {
        it('应该使用系统回收站删除文件', async () => {
            const filePath = join(TEST_DIR, 'test.png');
            const trashDir = join(TEST_DIR, '.trash');
            await writeFile(filePath, 'data', 'utf-8');

            const options: DeleteFileOptions = {
                strategy: 'trash',
                trashDir,
            };

            const result = await deleteLocalImage(filePath, options);

            expect(result.status).toBe('success');
            expect(result.actualStrategy).toBe('trash');
            await expect(access(filePath)).rejects.toThrow();
        });

        it('应该在缺少 trashDir 时仍使用系统回收站', async () => {
            const filePath = join(TEST_DIR, 'test.png');
            await writeFile(filePath, 'data', 'utf-8');

            const options: DeleteFileOptions = {
                strategy: 'trash',
            };

            const result = await deleteLocalImage(filePath, options);

            expect(result.status).toBe('success');
            expect(result.actualStrategy).toBe('trash');
            await expect(access(filePath)).rejects.toThrow();
        });
    });

    describe('错误处理', () => {
        it('应该在错误消息中包含文件路径', async () => {
            const filePath = join(TEST_DIR, 'non-existent.png');
            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
            };

            const result = await deleteLocalImage(filePath, options);

            expect(result.status).toBe('failed');
            expect(result.error).toBeDefined();
        });

        it('应该抛出错误当路径是目录', async () => {
            const dirPath = join(TEST_DIR, 'a-directory');
            await mkdir(dirPath, { recursive: true });

            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
            };

            const result = await deleteLocalImage(dirPath, options);

            expect(result.status).toBe('failed');
        });

        it('应该处理空字符串路径', async () => {
            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
            };

            const result = await deleteLocalImage('', options);

            expect(result.status).toBe('failed');
        });
    });

    describe('重试机制', () => {
        it('应该在失败时重试', async () => {
            const filePath = join(TEST_DIR, 'test.png');
            await writeFile(filePath, 'data', 'utf-8');

            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
                maxRetries: 2,
            };

            const result = await deleteLocalImage(filePath, options);

            expect(result.status).toBe('success');
            expect(result.retries).toBe(0);
        });
    });

    describe('路径安全集成', () => {
        it('应该在删除前验证路径安全性', async () => {
            const root = TEST_DIR;
            const safeFile = join(root, 'safe.png');
            const unsafeFile = join(root, '..', 'unsafe.png');

            await writeFile(safeFile, 'data', 'utf-8');

            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
            };

            await deleteLocalImage(safeFile, options);
            await expect(access(safeFile)).rejects.toThrow();

            expect(() => validatePathWithinRoot(unsafeFile, root)).toThrow('Security violation');
        });
    });
});

describe('deleteLocalImageSafely', () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    describe('路径验证', () => {
        it('应该拒绝项目外的路径', async () => {
            const projectRoot = join(TEST_DIR, 'project');
            const imagePath = join(TEST_DIR, 'outside', 'test.png');
            await mkdir(projectRoot, { recursive: true });
            await mkdir(join(TEST_DIR, 'outside'), { recursive: true });
            await writeFile(imagePath, 'data', 'utf-8');

            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
            };

            const result = await deleteLocalImageSafely(imagePath, projectRoot, options);

            expect(result.status).toBe('failed');
            expect(result.error).toContain('Security violation');
            await expect(access(imagePath)).resolves.not.toThrow();
        });

        it('应该接受项目内的路径', async () => {
            const projectRoot = TEST_DIR;
            const imagePath = join(projectRoot, 'test.png');
            await writeFile(imagePath, 'data', 'utf-8');

            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
            };

            const result = await deleteLocalImageSafely(imagePath, projectRoot, options);

            expect(result.status).toBe('success');
            await expect(access(imagePath)).rejects.toThrow();
        });
    });

    describe('使用检查', () => {
        it('应该删除未被引用的图片', async () => {
            const projectRoot = TEST_DIR;
            const imagePath = join(projectRoot, 'unused.png');
            await writeFile(imagePath, 'data', 'utf-8');

            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
            };

            const result = await deleteLocalImageSafely(imagePath, projectRoot, options);

            expect(result.status).toBe('success');
            await expect(access(imagePath)).rejects.toThrow();
        });

        it('应该拒绝删除仍在使用的图片', async () => {
            const projectRoot = TEST_DIR;
            const imagePath = join(projectRoot, 'used.png');
            const mdPath = join(projectRoot, 'test.md');

            await mkdir(join(projectRoot, 'images'), { recursive: true });
            await writeFile(imagePath, 'data', 'utf-8');
            await writeFile(mdPath, '![alt](./used.png)', 'utf-8');

            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
            };

            const result = await deleteLocalImageSafely(imagePath, projectRoot, options);

            expect(result.status).toBe('failed');
            expect(result.error).toContain('image is still in use');
            await expect(access(imagePath)).resolves.not.toThrow();

            await rm(mdPath);
        });
    });

    describe('日志回调', () => {
        it('应该在路径验证失败时记录错误', async () => {
            const projectRoot = join(TEST_DIR, 'project');
            const imagePath = join(TEST_DIR, 'outside', 'test.png');
            await mkdir(projectRoot, { recursive: true });
            await mkdir(join(TEST_DIR, 'outside'), { recursive: true });
            await writeFile(imagePath, 'data', 'utf-8');

            const logger = vi.fn();
            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
            };

            await deleteLocalImageSafely(imagePath, projectRoot, options, logger);

            expect(logger).toHaveBeenCalledWith(
                'error',
                expect.stringContaining('Path validation failed'),
                expect.any(Object)
            );
        });

        it('应该在图片仍在使用时记录警告', async () => {
            const projectRoot = TEST_DIR;
            const imagePath = join(projectRoot, 'used.png');
            const mdPath = join(projectRoot, 'test.md');

            await mkdir(join(projectRoot, 'images'), { recursive: true });
            await writeFile(imagePath, 'data', 'utf-8');
            await writeFile(mdPath, '![alt](./used.png)', 'utf-8');

            const logger = vi.fn();
            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
            };

            await deleteLocalImageSafely(imagePath, projectRoot, options, logger);

            expect(logger).toHaveBeenCalledWith(
                'warn',
                expect.stringContaining('Cannot delete image')
            );

            await rm(mdPath);
        });
    });

    describe('集成测试', () => {
        it('应该完整执行安全删除流程', async () => {
            const projectRoot = TEST_DIR;
            const imagePath = join(projectRoot, 'safe-to-delete.png');

            await writeFile(imagePath, 'data', 'utf-8');

            const options: DeleteFileOptions = {
                strategy: 'hard-delete',
                maxRetries: 2,
            };

            const result = await deleteLocalImageSafely(imagePath, projectRoot, options);

            expect(result.status).toBe('success');
            expect(result.retries).toBe(0);
            await expect(access(imagePath)).rejects.toThrow();
        });
    });
});

describe('集成测试', () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('应该安全地删除项目内的图片', async () => {
        const projectRoot = TEST_DIR;
        const imageDir = join(projectRoot, 'images');
        await mkdir(imageDir, { recursive: true });

        const imagePath = join(imageDir, 'logo.png');
        await writeFile(imagePath, 'fake-image-data', 'utf-8');

        validatePathWithinRoot(imagePath, projectRoot);

        const options: DeleteFileOptions = {
            strategy: 'hard-delete',
        };

        await deleteLocalImage(imagePath, options);

        await expect(access(imagePath)).rejects.toThrow();
    });

    it('应该拒绝删除项目外的图片', async () => {
        const projectRoot = join(TEST_DIR, 'project-a');
        const otherProject = join(TEST_DIR, 'project-b');
        await mkdir(projectRoot, { recursive: true });
        await mkdir(otherProject, { recursive: true });

        const externalImage = join(otherProject, 'external.png');
        await writeFile(externalImage, 'fake-data', 'utf-8');

        expect(() => validatePathWithinRoot(externalImage, projectRoot)).toThrow(
            'Security violation'
        );

        await access(externalImage);

        await rm(externalImage);
    });
});
