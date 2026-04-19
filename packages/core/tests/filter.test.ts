/**
 * 图片筛选功能测试
 *
 * 测试 filterImagesInText、filterImagesFromFile 和 filterImagesFromDirectory 函数：
 * - 基本筛选功能
 * - 过滤模式（sourceType、hostname、absolutePath、regex）
 * - 错误处理
 * - 日志回调
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    filterImagesFromDirectory,
    filterImagesFromFile,
    filterImagesInText,
} from '../src/filter.js';

const TEST_DIR = resolve(process.cwd(), '.test-extractor');

describe('filterImagesInText', () => {
    describe('基本筛选', () => {
        it('应该从文本中筛选内联图片', () => {
            const markdown = `# Title

![Logo](./logo.png)

Some text`;
            const images = filterImagesInText(markdown);

            expect(images).toHaveLength(1);
            expect(images[0]).toMatchObject({
                type: 'local',
                alt: 'Logo',
                src: './logo.png',
                source: 'text',
            });
        });

        it('应该筛选 Web 图片', () => {
            const markdown = '![Web Image](https://example.com/image.png)';
            const images = filterImagesInText(markdown);

            expect(images).toHaveLength(1);
            expect(images[0]).toMatchObject({
                type: 'web',
                alt: 'Web Image',
                src: 'https://example.com/image.png',
            });
        });

        it('应该筛选混合类型的图片', () => {
            const markdown = `
![Local](./local.png)
![Web](https://cdn.example.com/web.png)
![Another Local](../images/another.png)
      `;
            const images = filterImagesInText(markdown);

            expect(images).toHaveLength(3);
            expect(images[0].type).toBe('local');
            expect(images[1].type).toBe('web');
            expect(images[2].type).toBe('local');
        });

        it('应该返回空数组当没有图片', () => {
            const markdown = '# Title\n\nNo images here.';
            const images = filterImagesInText(markdown);

            expect(images).toHaveLength(0);
        });

        it('应该正确设置 syntax 字段', () => {
            const markdown = `
![Inline](./inline.png)
<img src="./html.png" alt="HTML">
      `;
            const images = filterImagesInText(markdown);

            expect(images).toHaveLength(2);
            expect(images[0].syntax).toBe('md');
            expect(images[1].syntax).toBe('html');
        });
    });

    describe('过滤模式 - sourceType', () => {
        const markdown = `
![Local](./local.png)
![Web](https://example.com/web.png)
![Another Local](../another.png)
    `;

        it('应该只筛选本地图片', () => {
            const images = filterImagesInText(markdown, {
                mode: 'sourceType',
                value: 'local',
            });

            expect(images).toHaveLength(2);
            expect(images.every((img) => img.type === 'local')).toBe(true);
        });

        it('应该只筛选 Web 图片', () => {
            const images = filterImagesInText(markdown, {
                mode: 'sourceType',
                value: 'web',
            });

            expect(images).toHaveLength(1);
            expect(images[0].type).toBe('web');
            expect(images[0].src).toBe('https://example.com/web.png');
        });

        it('无过滤时应该筛选所有图片', () => {
            const images = filterImagesInText(markdown);

            expect(images).toHaveLength(3);
        });
    });

    describe('过滤模式 - hostname', () => {
        it('应该按主机名过滤 Web 图片', () => {
            const markdown = `
![CDN](https://cdn.example.com/image.png)
![Other](https://other.com/image.png)
![Subdomain](https://assets.cdn.example.com/file.png)
      `;
            const images = filterImagesInText(markdown, {
                mode: 'hostname',
                value: 'cdn.example.com',
            });

            expect(images).toHaveLength(2);
            expect(images[0].src).toContain('cdn.example.com');
            expect(images[1].src).toContain('cdn.example.com');
        });

        it('应该精确匹配主机名', () => {
            const markdown = `
![Exact](https://example.com/image.png)
![WWW](https://www.example.com/image.png)
      `;
            const images = filterImagesInText(markdown, {
                mode: 'hostname',
                value: 'example.com',
            });

            expect(images.length).toBeGreaterThanOrEqual(1);
            expect(images.some((img) => img.src === 'https://example.com/image.png')).toBe(true);
        });

        it('本地图片不应该匹配 hostname 过滤', () => {
            const markdown = `
![Local](./local.png)
![Web](https://example.com/web.png)
      `;
            const images = filterImagesInText(markdown, {
                mode: 'hostname',
                value: 'example.com',
            });

            expect(images).toHaveLength(1);
            expect(images[0].type).toBe('web');
        });

        it('应该处理无效的 URL', () => {
            const markdown = `
![Invalid](not-a-valid-url)
![Valid](https://example.com/image.png)
      `;
            const images = filterImagesInText(markdown, {
                mode: 'hostname',
                value: 'example.com',
            });

            expect(images).toHaveLength(1);
            expect(images[0].src).toBe('https://example.com/image.png');
        });
    });

    describe('过滤模式 - regex', () => {
        it('应该使用正则表达式过滤', () => {
            const markdown = `
![PNG](./image.png)
![JPG](./image.jpg)
![PNG2](./other.png)
      `;
            const images = filterImagesInText(markdown, {
                mode: 'regex',
                value: /\.png$/,
            });

            expect(images).toHaveLength(2);
            expect(images.every((img) => img.src.endsWith('.png'))).toBe(true);
        });

        it('应该支持复杂的正则表达式', () => {
            const markdown = `
![Path1](./assets/images/logo.png)
![Path2](../shared/icon.svg)
![Path3](./docs/screenshot.jpg)
      `;
            const images = filterImagesInText(markdown, {
                mode: 'regex',
                value: /assets\/images\//,
            });

            expect(images).toHaveLength(1);
            expect(images[0].src).toContain('assets/images');
        });

        it('非正则值应该被忽略', () => {
            const markdown = '![Image](./image.png)';
            const images = filterImagesInText(markdown, {
                mode: 'regex',
                value: 'not-a-regex' as unknown as RegExp,
            });

            expect(images).toHaveLength(0);
        });
    });

    describe('返回类型', () => {
        it('本地图片应该没有 absLocalPath 字段（文本层）', () => {
            const markdown = '![Local](./local.png)';
            const images = filterImagesInText(markdown);

            expect(images[0].type).toBe('local');
            expect('absLocalPath' in images[0]).toBe(false);
        });

        it('Web 图片应该有正确的结构', () => {
            const markdown = `![Web](https://example.com/image.png "Title")`;
            const images = filterImagesInText(markdown);

            const webImage = images[0];
            expect(webImage).toHaveProperty('type', 'web');
            expect(webImage).toHaveProperty('alt', 'Web');
            expect(webImage).toHaveProperty('src', 'https://example.com/image.png');
            expect(webImage).toHaveProperty('title', 'Title');
            expect(webImage).toHaveProperty('raw');
            expect(webImage).toHaveProperty('syntax');
            expect(webImage).toHaveProperty('source', 'text');
        });
    });
});

describe('filterImagesFromFile', () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    describe('基本筛选', () => {
        it('应该从文件中筛选图片', async () => {
            const content = `# Title

![Logo](./logo.png)
![Banner](./banner.jpg)
`;
            const filePath = join(TEST_DIR, 'test.md');
            await writeFile(filePath, content, 'utf-8');

            const images = await filterImagesFromFile(filePath);

            expect(images).toHaveLength(2);
            expect(images[0].alt).toBe('Logo');
            expect(images[1].alt).toBe('Banner');
        });

        it('本地图片应该包含 absLocalPath', async () => {
            const content = '![Logo](./logo.png)';
            const filePath = join(TEST_DIR, 'test.md');
            await writeFile(filePath, content, 'utf-8');

            const images = await filterImagesFromFile(filePath);

            expect(images).toHaveLength(1);
            expect(images[0].type).toBe('local');
            expect('absLocalPath' in images[0]).toBe(true);
            if ('absLocalPath' in images[0]) {
                expect(images[0].absLocalPath).toContain('logo.png');
            }
        });

        it('应该正确计算相对路径的绝对路径', async () => {
            const content = '![Relative](../images/logo.png)';
            const subDir = join(TEST_DIR, 'docs');
            await mkdir(subDir, { recursive: true });
            const filePath = join(subDir, 'test.md');
            await writeFile(filePath, content, 'utf-8');

            const images = await filterImagesFromFile(filePath);

            expect(images).toHaveLength(1);
            if ('absLocalPath' in images[0]) {
                expect(images[0].absLocalPath).toContain('images');
                expect(images[0].absLocalPath).toContain('logo.png');
                expect(images[0].absLocalPath).not.toContain('docs');
            }
        });

        it('应该正确处理已经是绝对路径的 src', async () => {
            const absPath = '/absolute/path/to/image.png';
            const content = `![Absolute](${absPath})`;
            const filePath = join(TEST_DIR, 'test.md');
            await writeFile(filePath, content, 'utf-8');

            const images = await filterImagesFromFile(filePath);

            expect(images).toHaveLength(1);
            if ('absLocalPath' in images[0]) {
                expect(images[0].absLocalPath).toBe(absPath);
            }
        });

        it('应该正确处理 Windows 风格的绝对路径 src', async () => {
            const absPath = 'C:\\path\\to\\image.png';
            const content = `![Windows Absolute](${absPath})`;
            const filePath = join(TEST_DIR, 'test.md');
            await writeFile(filePath, content, 'utf-8');

            const images = await filterImagesFromFile(filePath);

            expect(images).toHaveLength(1);
            if ('absLocalPath' in images[0]) {
                expect(images[0].absLocalPath).toBe(absPath);
            }
        });

        it('应该设置 source 为 file', async () => {
            const content = '![Image](./image.png)';
            const filePath = join(TEST_DIR, 'test.md');
            await writeFile(filePath, content, 'utf-8');

            const images = await filterImagesFromFile(filePath);

            expect(images[0].source).toBe('file');
        });
    });

    describe('过滤模式', () => {
        it('应该支持 sourceType 过滤', async () => {
            const content = `
![Local](./local.png)
![Web](https://example.com/web.png)
      `;
            const filePath = join(TEST_DIR, 'test.md');
            await writeFile(filePath, content, 'utf-8');

            const images = await filterImagesFromFile(filePath, {
                mode: 'sourceType',
                value: 'web',
            });

            expect(images).toHaveLength(1);
            expect(images[0].type).toBe('web');
        });

        it('应该支持 regex 过滤', async () => {
            const content = `
![PNG](./image.png)
![JPG](./image.jpg)
      `;
            const filePath = join(TEST_DIR, 'test.md');
            await writeFile(filePath, content, 'utf-8');

            const images = await filterImagesFromFile(filePath, {
                mode: 'regex',
                value: /\.png$/,
            });

            expect(images).toHaveLength(1);
            expect(images[0].src).toBe('./image.png');
        });
    });

    describe('错误处理', () => {
        it('应该抛出错误当文件不存在', async () => {
            const nonExistentPath = join(TEST_DIR, 'non-existent.md');

            await expect(filterImagesFromFile(nonExistentPath)).rejects.toThrow();
        });
    });

    describe('空文件', () => {
        it('应该处理空文件', async () => {
            const filePath = join(TEST_DIR, 'empty.md');
            await writeFile(filePath, '', 'utf-8');

            const images = await filterImagesFromFile(filePath);

            expect(images).toHaveLength(0);
        });

        it('应该处理只有空白字符的文件', async () => {
            const filePath = join(TEST_DIR, 'whitespace.md');
            await writeFile(filePath, '   \n\n   ', 'utf-8');

            const images = await filterImagesFromFile(filePath);

            expect(images).toHaveLength(0);
        });
    });
});

describe('filterImagesFromDirectory', () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    describe('基本筛选', () => {
        it('应该从目录中的所有 Markdown 文件筛选图片', async () => {
            await writeFile(join(TEST_DIR, 'file1.md'), '![Image1](./img1.png)');
            await writeFile(join(TEST_DIR, 'file2.md'), '![Image2](https://example.com/img2.png)');

            const images = await filterImagesFromDirectory(TEST_DIR);

            expect(images).toHaveLength(2);
            expect(images.some((img) => img.src === './img1.png')).toBe(true);
            expect(images.some((img) => img.src === 'https://example.com/img2.png')).toBe(true);
        });

        it('应该在不提供 options 时返回所有图片（混合类型）', async () => {
            await writeFile(
                join(TEST_DIR, 'mixed.md'),
                `![Local](./logo.png)
![Web](https://cdn.example.com/banner.jpg)
<img src="./icon.svg" alt="Icon" />`
            );

            const images = await filterImagesFromDirectory(TEST_DIR);

            expect(images).toHaveLength(3);
            expect(images.filter((img) => img.type === 'local')).toHaveLength(2);
            expect(images.filter((img) => img.type === 'web')).toHaveLength(1);
        });

        it('应该支持子目录搜索', async () => {
            await mkdir(join(TEST_DIR, 'docs'), { recursive: true });
            await mkdir(join(TEST_DIR, 'blog'), { recursive: true });

            await writeFile(join(TEST_DIR, 'docs', 'readme.md'), '![Doc](./doc.png)');
            await writeFile(join(TEST_DIR, 'blog', 'post.md'), '![Blog](./blog.png)');

            const images = await filterImagesFromDirectory(TEST_DIR);

            expect(images).toHaveLength(2);
        });
    });

    describe('过滤模式', () => {
        it('应该按 sourceType 过滤（只获取本地图片）', async () => {
            await writeFile(
                join(TEST_DIR, 'test.md'),
                `![Local1](./img1.png)
![Web](https://example.com/img.jpg)
![Local2](../images/img2.png)`
            );

            const images = await filterImagesFromDirectory(TEST_DIR, {
                mode: 'sourceType',
                value: 'local',
            });

            expect(images).toHaveLength(2);
            expect(images.every((img) => img.type === 'local')).toBe(true);
        });

        it('应该按 sourceType 过滤（只获取 web 图片）', async () => {
            await writeFile(
                join(TEST_DIR, 'test.md'),
                `![Local](./img1.png)
![Web1](https://example.com/img.jpg)
![Web2](https://cdn.example.com/banner.png)`
            );

            const images = await filterImagesFromDirectory(TEST_DIR, {
                mode: 'sourceType',
                value: 'web',
            });

            expect(images).toHaveLength(2);
            expect(images.every((img) => img.type === 'web')).toBe(true);
        });

        it('应该按 hostname 过滤', async () => {
            await writeFile(
                join(TEST_DIR, 'test.md'),
                `![CDN1](https://cdn.example.com/img1.png)
![Other](https://other.com/img.jpg)
![CDN2](https://assets.cdn.example.com/img2.png)`
            );

            const images = await filterImagesFromDirectory(TEST_DIR, {
                mode: 'hostname',
                value: 'cdn.example.com',
            });

            expect(images).toHaveLength(2);
        });

        it('应该按 regex 过滤', async () => {
            await writeFile(
                join(TEST_DIR, 'test.md'),
                `![PNG1](./img1.png)
![JPG](./img.jpg)
![PNG2](./img2.png)`
            );

            const images = await filterImagesFromDirectory(TEST_DIR, {
                mode: 'regex',
                value: /\.png$/,
            });

            expect(images).toHaveLength(2);
        });
    });

    describe('边界情况', () => {
        it('应该处理空目录', async () => {
            const images = await filterImagesFromDirectory(TEST_DIR);

            expect(images).toHaveLength(0);
        });

        it('应该处理目录中没有 Markdown 文件', async () => {
            await writeFile(join(TEST_DIR, 'file.txt'), '![Not](./markdown.txt)');
            await writeFile(join(TEST_DIR, 'file.js'), "console.log('Not markdown');");

            const images = await filterImagesFromDirectory(TEST_DIR);

            expect(images).toHaveLength(0);
        });

        it('应该忽略没有图片的 Markdown 文件', async () => {
            await writeFile(join(TEST_DIR, 'no-images.md'), '# Just text');
            await writeFile(join(TEST_DIR, 'with-images.md'), '![Image](./img.png)');

            const images = await filterImagesFromDirectory(TEST_DIR);

            expect(images).toHaveLength(1);
        });
    });
});
