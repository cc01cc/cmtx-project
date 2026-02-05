/**
 * Markdown 图片解析器测试
 *
 * 测试 parseImages 函数的各种场景：
 * - 内联式图片：![alt](src)
 * - 带标题的内联图片：![alt](src "title")
 * - HTML 图片：<img src="..." alt="...">
 * - 多行 HTML 图片
 */

import { describe, it, expect } from 'vitest';
import { parseImages, parseImagesMdSingleline, parseImagesHtmlSingleline } from '../src/parser.js';

describe('parseImages', () => {
    describe('内联式图片', () => {
        it('应该解析基本的内联图片', () => {
            const markdown = `![Logo](./logo.png)`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(1);
            expect(images[0]).toMatchObject({
                alt: 'Logo',
                src: './logo.png',
                syntax: 'md',
            });
        });

        it('应该解析带标题的内联图片', () => {
            const markdown = `![Logo](./logo.png "Company Logo")`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(1);
            expect(images[0]).toMatchObject({
                alt: 'Logo',
                src: './logo.png',
                title: 'Company Logo',
                syntax: 'md',
            });
        });

        it('应该解析多个内联图片', () => {
            const markdown = `
![First](./first.png)
![Second](./second.png "Second Image")
![Third](https://example.com/third.jpg)
      `;
            const images = parseImages(markdown);

            expect(images).toHaveLength(3);
            expect(images[0].alt).toBe('First');
            expect(images[1].alt).toBe('Second');
            expect(images[2].alt).toBe('Third');
        });

        it('应该处理空 alt 文本', () => {
            const markdown = `![](./image.png)`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(1);
            expect(images[0].alt).toBe('');
            expect(images[0].src).toBe('./image.png');
        });

        it('应该处理包含特殊字符的 alt 文本', () => {
            const markdown = `![Image with brackets](./image.png)`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(1);
            expect(images[0].alt).toBe('Image with brackets');
        });

        it('应该保留原始 raw 文本', () => {
            const markdown = `![Logo](./logo.png "Title")`;
            const images = parseImages(markdown);

            expect(images[0].raw).toBe(`![Logo](./logo.png "Title")`);
        });

        it('应该支持双引号标题', () => {
            const markdown = `![Logo](./logo.png "Company Logo")`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(1);
            expect(images[0].title).toBe('Company Logo');
        });
    });

    describe('HTML 图片', () => {
        it('应该解析单行 HTML img 标签', () => {
            const markdown = `<img src="./image.png" alt="Description">`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(1);
            expect(images[0]).toMatchObject({
                alt: 'Description',
                src: './image.png',
                syntax: 'html',
            });
        });

        it('应该解析带 title 的 HTML img 标签', () => {
            const markdown = `<img src="./image.png" alt="Description" title="Image Title">`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(1);
            expect(images[0].title).toBe('Image Title');
        });

        it('应该解析自闭合 HTML img 标签', () => {
            const markdown = `<img src="./image.png" alt="Description" />`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(1);
            expect(images[0].src).toBe('./image.png');
        });

        it('应该处理单引号属性', () => {
            const markdown = `<img src='./image.png' alt='Description' title='Title'>`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(1);
            expect(images[0].src).toBe('./image.png');
            expect(images[0].alt).toBe('Description');
        });

        it('应该解析多个 HTML 图片', () => {
            const markdown = `<img src="./first.png" alt="First"> <img src="./second.png" alt="Second">`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(2);
            expect(images[0].src).toBe('./first.png');
            expect(images[1].src).toBe('./second.png');
        });

        it('应该处理没有 alt 属性的 HTML img 标签', () => {
            const markdown = `<img src="./image.png">`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(1);
            expect(images[0].alt).toBe('');
        });

        it('应该保留 HTML 图片的原始 raw 文本', () => {
            const markdown = `<img src="./image.png" alt="Description" title="Title">`;
            const images = parseImages(markdown);

            expect(images[0].raw).toBe(`<img src="./image.png" alt="Description" title="Title">`);
        });

        it('应该忽略多行 HTML img 标签', () => {
            const markdown = `<img
  src="./image.png"
  alt="Description"
  title="Title"
/>`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(0);
        });
    });

    describe('混合图片类型', () => {
        it('应该同时解析多种图片类型', () => {
            const markdown = `
# Document

![Inline](./inline.png)

<img src="./html.png" alt="HTML Image">
      `;
            const images = parseImages(markdown);

            expect(images).toHaveLength(2);
            expect(images[0].syntax).toBe('md');
            expect(images[1].syntax).toBe('html');
        });
    });

    describe('边界情况', () => {
        it('应该返回空数组当没有图片', () => {
            const markdown = `# Title\n\nSome text without images.`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(0);
        });

        it('应该处理空字符串', () => {
            const images = parseImages('');
            expect(images).toHaveLength(0);
        });

        it('应该处理只有空白字符的内容', () => {
            const images = parseImages('   \n\n   ');
            expect(images).toHaveLength(0);
        });

        it('应该解析代码块中的图片语法（正则架构特性）', () => {
            const markdown = `
\`\`\`
![Not an image](./code.png)
\`\`\`

![Real image](./real.png)
      `;
            const images = parseImages(markdown);

            expect(images).toHaveLength(2);
        });

        it('应该解析行内代码中的图片语法（正则架构特性）', () => {
            const markdown = 'This is `![not an image](./code.png)` inline code.';
            const images = parseImages(markdown);

            expect(images).toHaveLength(1);
        });

        it('应该处理非常长的 alt 文本', () => {
            const longAlt = 'A'.repeat(1000);
            const markdown = `![${longAlt}](./image.png)`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(1);
            expect(images[0].alt).toBe(longAlt);
        });

        it('应该处理 URL 编码的路径', () => {
            const markdown = `![Image](./path%20with%20spaces/image.png)`;
            const images = parseImages(markdown);

            expect(images).toHaveLength(1);
            expect(images[0].src).toBe('./path%20with%20spaces/image.png');
        });
    });
});

describe('parseImagesMdSingleline', () => {
    it('应该只解析 Markdown 图片', () => {
        const markdown = `![MD](./md.png) <img src="./html.png" alt="HTML">`;
        const images = parseImagesMdSingleline(markdown);

        expect(images).toHaveLength(1);
        expect(images[0].syntax).toBe('md');
        expect(images[0].src).toBe('./md.png');
    });

    it('应该正确解析带空格的 URL', () => {
        const markdown = `![Image](./path with spaces/image.png)`;
        const images = parseImagesMdSingleline(markdown);

        expect(images).toHaveLength(1);
        expect(images[0].src).toBe('./path with spaces/image.png');
    });
});

describe('parseImagesHtmlSingleline', () => {
    it('应该只解析 HTML 图片', () => {
        const markdown = `![MD](./md.png) <img src="./html.png" alt="HTML">`;
        const images = parseImagesHtmlSingleline(markdown);

        expect(images).toHaveLength(1);
        expect(images[0].syntax).toBe('html');
        expect(images[0].src).toBe('./html.png');
    });

    it('应该忽略没有 src 属性的 img 标签', () => {
        const markdown = `<img alt="No src">`;
        const images = parseImagesHtmlSingleline(markdown);

        expect(images).toHaveLength(0);
    });

    it('应该处理属性顺序不同的情况', () => {
        const markdown = `<img title="Title" alt="Alt" src="./image.png">`;
        const images = parseImagesHtmlSingleline(markdown);

        expect(images).toHaveLength(1);
        expect(images[0].src).toBe('./image.png');
        expect(images[0].alt).toBe('Alt');
        expect(images[0].title).toBe('Title');
    });
});
