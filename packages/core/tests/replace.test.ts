/**
 * 图片替换功能测试套件
 * 使用多字段替换 API：field: 'src'|'raw'，支持 newSrc/newAlt/newTitle
 * 
 * 测试场景：
 * 1. 基础替换：src/alt/title 字段替换
 * 2. 多字段替换：单个操作同时更新多个字段
 * 3. 空值插入：当原字段为空时，插入新值
 * 4. 字段保留：未指定的字段保持原值
 * 5. 正则匹配：使用正则表达式匹配
 * 6. 批量处理：多个替换规则和多个文件
 */

import { describe, it, expect } from 'vitest';
import { replaceImagesInText, replaceImagesInFile, replaceImagesInDirectory } from '../src/replace.js';

describe('replaceImagesInText - 基础替换', () => {
    const markdown = `# 测试文档

这是一个本地图片：![Old Logo](./old-logo.png)

Web 图片：![Example](https://example.com/image.jpg)

带标题的图片：![Local](../images/test.png "Test Image")`;

    it('应该替换 src', () => {
        const result = replaceImagesInText(markdown, [
            { field: 'src', pattern: './old-logo.png', newSrc: './new-logo.png' }
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('./new-logo.png');
    });

    it('应该使用正则表达式替换 src', () => {
        const result = replaceImagesInText(markdown, [
            { field: 'src', pattern: /\.png$/g, newSrc: '.webp' }
        ]);

        expect(result.replacements.length).toBeGreaterThan(0);
        expect(result.newText).toContain('.webp');
    });

    it('应该同时替换多个字段', () => {
        const result = replaceImagesInText(markdown, [
            { field: 'src', pattern: './old-logo.png', newSrc: './new-path/image.png', newAlt: '新的图片' }
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('./new-path/image.png');
        expect(result.newText).toContain('![新的图片]');
    });

    it('空的 options 数组应该返回无变化', () => {
        const result = replaceImagesInText(markdown, []);

        expect(result.replacements).toHaveLength(0);
        expect(result.newText).toBe(markdown);
    });

    it('应该处理没有匹配的规则', () => {
        const result = replaceImagesInText(markdown, [
            { field: 'src', pattern: './non-existent.png', newSrc: './new.png' }
        ]);

        expect(result.replacements).toHaveLength(0);
        expect(result.newText).toBe(markdown);
    });
});

describe('replaceImagesInText - 空值插入场景', () => {
    it('指定 src 时，为空的 alt 插入新值', () => {
        const markdown = `![](./image.png)`;
        const result = replaceImagesInText(markdown, [
            { field: 'src', pattern: './image.png', newAlt: '新描述' }
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('![新描述]');
    });

    it('指定 src 时，为空的 title 插入新值', () => {
        const markdown = `![Alt](./image.png)`;
        const result = replaceImagesInText(markdown, [
            { field: 'src', pattern: './image.png', newTitle: '新标题' }
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('"新标题"');
    });

    it('指定 src 时，同时为空的 alt 和 title 插入新值', () => {
        const markdown = `![](./image.png)`;
        const result = replaceImagesInText(markdown, [
            { field: 'src', pattern: './image.png', newAlt: '新描述', newTitle: '新标题' }
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('![新描述]');
        expect(result.newText).toContain('"新标题"');
    });

    it('指定 raw 时，为空的字段插入新值', () => {
        const markdown = `![](./image.png)`;
        const result = replaceImagesInText(markdown, [
            { field: 'raw', pattern: /!\[\]\(.*\.png\)/, newAlt: '描述', newTitle: '标题' }
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('![描述]');
        expect(result.newText).toContain('"标题"');
    });

    it('HTML 标签中，为空的 alt 插入新值', () => {
        const html = `<img src="./image.png">`;
        const result = replaceImagesInText(html, [
            { field: 'src', pattern: './image.png', newAlt: '新描述' }
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('alt="新描述"');
    });

    it('HTML 标签中，为空的 title 插入新值', () => {
        const html = `<img src="./image.png" alt="描述">`;
        const result = replaceImagesInText(html, [
            { field: 'src', pattern: './image.png', newTitle: '新标题' }
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('title="新标题"');
    });
});

describe('replaceImagesInText - 字段保留', () => {
    it('只替换 src，保留 alt 和 title', () => {
        const markdown = `![原描述](./old.png "原标题")`;
        const result = replaceImagesInText(markdown, [
            { field: 'src', pattern: './old.png', newSrc: './new.png' }
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('./new.png');
        expect(result.newText).toContain('![原描述]');
        expect(result.newText).toContain('"原标题"');
    });

    it('替换 src 和 alt，保留 title', () => {
        const markdown = `![原描述](./old.png "原标题")`;
        const result = replaceImagesInText(markdown, [
            { field: 'src', pattern: './old.png', newSrc: './new.png', newAlt: '新描述' }
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('./new.png');
        expect(result.newText).toContain('![新描述]');
        expect(result.newText).toContain('"原标题"');
    });

    it('只替换 alt 和 title，保留 src', () => {
        const markdown = `![原描述](./image.png "原标题")`;
        const result = replaceImagesInText(markdown, [
            { field: 'src', pattern: './image.png', newAlt: '新描述', newTitle: '新标题' }
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('./image.png');
        expect(result.newText).toContain('![新描述]');
        expect(result.newText).toContain('"新标题"');
    });
});

describe('replaceImagesInText - raw 模式', () => {
    it('raw 模式可以匹配整个图片标签', () => {
        const markdown = `![Old](./old.png) and ![New](./new.png)`;
        const result = replaceImagesInText(markdown, [
            { field: 'raw', pattern: /!\[Old\]\(.*\.png\)/, newSrc: './updated.png', newAlt: 'Updated' }
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('./updated.png');
        expect(result.newText).toContain('![Updated]');
    });

    it('raw 模式可以匹配 HTML 标签', () => {
        const html = `<img src="./old.png">`;
        const result = replaceImagesInText(html, [
            { field: 'raw', pattern: /<img src=".*\.png">/, newSrc: './new.png', newAlt: '描述' }
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('./new.png');
    });
});

describe('replaceImagesInText - 正则和全局替换', () => {
    it('应该处理多个相同 src 的图片', () => {
        const markdown = `![Image1](./same.png)
![Image2](./same.png)
![Image3](./same.png)`;

        const result = replaceImagesInText(markdown, [
            { field: 'src', pattern: './same.png', newSrc: './updated.png' }
        ]);

        expect(result.replacements).toHaveLength(3);
        expect((result.newText.match(/updated\.png/g) || []).length).toBe(3);
    });

    it('应该支持多个替换规则', () => {
        const markdown = `# Test

![Image1](./old1.png)
![Image2](./old2.png)`;

        const result = replaceImagesInText(markdown, [
            { field: 'src', pattern: './old1.png', newSrc: './new1.png' },
            { field: 'src', pattern: './old2.png', newSrc: './new2.png' }
        ]);

        expect(result.replacements).toHaveLength(2);
        expect(result.newText).toContain('./new1.png');
        expect(result.newText).toContain('./new2.png');
    });
});

describe('replaceImagesInText - HTML 标签', () => {
    it('应该处理 HTML img 标签的替换', () => {
        const html = `<img src="./image.png" alt="HTML Image" title="Original Title">`;
        const result = replaceImagesInText(html, [
            { field: 'src', pattern: './image.png', newSrc: './new.png', newAlt: 'New Image' }
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('./new.png');
        expect(result.newText).toContain('alt="New Image"');
        expect(result.newText).toContain('title="Original Title"');
    });
});

describe('replaceImagesInText - 其他场景', () => {
    it('应该返回替换的详细信息', () => {
        const markdown = `![Image](./image.png)`;
        const result = replaceImagesInText(markdown, [
            { field: 'src', pattern: './image.png', newSrc: './new.png', newAlt: '新描述' }
        ]);

        expect(result.replacements.length).toBeGreaterThan(0);
        result.replacements.forEach((replacement) => {
            expect(replacement).toHaveProperty('before');
            expect(replacement).toHaveProperty('after');
        });
    });

    it('应该保留 Markdown 中的其他内容', () => {
        const markdown = `# 标题

这是一些文本。

![Image](./image.png)

更多文本。

\`\`\`
代码块中的 ![Not Image](./code.png)
\`\`\`

结束。`;

        const result = replaceImagesInText(markdown, [
            { field: 'src', pattern: './image.png', newSrc: './new.png' }
        ]);

        expect(result.newText).toContain('# 标题');
        expect(result.newText).toContain('这是一些文本');
        expect(result.newText).toContain('结束。');
    });
});

describe('replaceImagesInFile', () => {
    it('应该处理文件不存在的错误', async () => {
        const result = await replaceImagesInFile('/non/existent/file.md', [
            { field: 'src', pattern: './old.png', newSrc: './new.png' }
        ]);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});

describe('replaceImagesInDirectory - 基础功能', () => {
    it('应该处理目录不存在的情况', async () => {
        const result = await replaceImagesInDirectory('/non/existent/path', [
            { field: 'src', pattern: './test.png', newSrc: './new.png' }
        ]);

        expect(result.totalFiles).toBe(0);
    });
});
