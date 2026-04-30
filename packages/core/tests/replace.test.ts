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

import { describe, expect, it } from "vitest";
import { replaceImagesInText, updateImageAttribute } from "../src/replace.js";

describe("replaceImagesInText - 基础替换", () => {
    const markdown = `# 测试文档

这是一个本地图片：![Old Logo](./old-logo.png)

Web 图片：![Example](https://example.com/image.jpg)

带标题的图片：![Local](../images/test.png "Test Image")`;

    it("应该替换 src", () => {
        const result = replaceImagesInText(markdown, [
            { field: "src", pattern: "./old-logo.png", newSrc: "./new-logo.png" },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain("./new-logo.png");
    });

    it("应该使用正则表达式替换 src", () => {
        const result = replaceImagesInText(markdown, [
            { field: "src", pattern: /\.png$/g, newSrc: ".webp" },
        ]);

        expect(result.replacements.length).toBeGreaterThan(0);
        expect(result.newText).toContain(".webp");
    });

    it("应该同时替换多个字段", () => {
        const result = replaceImagesInText(markdown, [
            {
                field: "src",
                pattern: "./old-logo.png",
                newSrc: "./new-path/image.png",
                newAlt: "新的图片",
            },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain("./new-path/image.png");
        expect(result.newText).toContain("![新的图片]");
    });

    it("空的 options 数组应该返回无变化", () => {
        const result = replaceImagesInText(markdown, []);

        expect(result.replacements).toHaveLength(0);
        expect(result.newText).toBe(markdown);
    });

    it("应该处理没有匹配的规则", () => {
        const result = replaceImagesInText(markdown, [
            { field: "src", pattern: "./non-existent.png", newSrc: "./new.png" },
        ]);

        expect(result.replacements).toHaveLength(0);
        expect(result.newText).toBe(markdown);
    });
});

describe("replaceImagesInText - 空值插入场景", () => {
    it("指定 src 时，为空的 alt 插入新值", () => {
        const markdown = "![](./image.png)";
        const result = replaceImagesInText(markdown, [
            { field: "src", pattern: "./image.png", newAlt: "新描述" },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain("![新描述]");
    });

    it("指定 src 时，为空的 title 插入新值", () => {
        const markdown = "![Alt](./image.png)";
        const result = replaceImagesInText(markdown, [
            { field: "src", pattern: "./image.png", newTitle: "新标题" },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('"新标题"');
    });

    it("指定 src 时，同时为空的 alt 和 title 插入新值", () => {
        const markdown = "![](./image.png)";
        const result = replaceImagesInText(markdown, [
            {
                field: "src",
                pattern: "./image.png",
                newAlt: "新描述",
                newTitle: "新标题",
            },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain("![新描述]");
        expect(result.newText).toContain('"新标题"');
    });

    it("指定 raw 时，为空的字段插入新值", () => {
        const markdown = "![](./image.png)";
        const result = replaceImagesInText(markdown, [
            {
                field: "raw",
                pattern: /!\[\]\(.*\.png\)/,
                newAlt: "描述",
                newTitle: "标题",
            },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain("![描述]");
        expect(result.newText).toContain('"标题"');
    });

    it("HTML 标签中，为空的 alt 插入新值", () => {
        const html = `<img src="./image.png">`;
        const result = replaceImagesInText(html, [
            { field: "src", pattern: "./image.png", newAlt: "新描述" },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('alt="新描述"');
    });

    it("HTML 标签中，为空的 title 插入新值", () => {
        const html = `<img src="./image.png" alt="描述">`;
        const result = replaceImagesInText(html, [
            { field: "src", pattern: "./image.png", newTitle: "新标题" },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain('title="新标题"');
    });
});

describe("replaceImagesInText - 字段保留", () => {
    it("只替换 src，保留 alt 和 title", () => {
        const markdown = `![原描述](./old.png "原标题")`;
        const result = replaceImagesInText(markdown, [
            { field: "src", pattern: "./old.png", newSrc: "./new.png" },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain("./new.png");
        expect(result.newText).toContain("![原描述]");
        expect(result.newText).toContain('"原标题"');
    });

    it("替换 src 和 alt，保留 title", () => {
        const markdown = `![原描述](./old.png "原标题")`;
        const result = replaceImagesInText(markdown, [
            {
                field: "src",
                pattern: "./old.png",
                newSrc: "./new.png",
                newAlt: "新描述",
            },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain("./new.png");
        expect(result.newText).toContain("![新描述]");
        expect(result.newText).toContain('"原标题"');
    });

    it("只替换 alt 和 title，保留 src", () => {
        const markdown = `![原描述](./image.png "原标题")`;
        const result = replaceImagesInText(markdown, [
            {
                field: "src",
                pattern: "./image.png",
                newAlt: "新描述",
                newTitle: "新标题",
            },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain("./image.png");
        expect(result.newText).toContain("![新描述]");
        expect(result.newText).toContain('"新标题"');
    });
});

describe("replaceImagesInText - raw 模式", () => {
    it("raw 模式可以匹配整个图片标签", () => {
        const markdown = "![Old](./old.png) and ![New](./new.png)";
        const result = replaceImagesInText(markdown, [
            {
                field: "raw",
                pattern: /!\[Old\]\(.*\.png\)/,
                newSrc: "./updated.png",
                newAlt: "Updated",
            },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain("./updated.png");
        expect(result.newText).toContain("![Updated]");
    });

    it("raw 模式可以匹配 HTML 标签", () => {
        const html = `<img src="./old.png">`;
        const result = replaceImagesInText(html, [
            {
                field: "raw",
                pattern: /<img src=".*\.png">/,
                newSrc: "./new.png",
                newAlt: "描述",
            },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain("./new.png");
    });
});

describe("replaceImagesInText - 正则和全局替换", () => {
    it("应该处理多个相同 src 的图片", () => {
        const markdown = `![Image1](./same.png)
![Image2](./same.png)
![Image3](./same.png)`;

        const result = replaceImagesInText(markdown, [
            { field: "src", pattern: "./same.png", newSrc: "./updated.png" },
        ]);

        expect(result.replacements).toHaveLength(3);
        expect((result.newText.match(/updated\.png/g) || []).length).toBe(3);
    });

    it("应该支持多个替换规则", () => {
        const markdown = `# Test

![Image1](./old1.png)
![Image2](./old2.png)`;

        const result = replaceImagesInText(markdown, [
            { field: "src", pattern: "./old1.png", newSrc: "./new1.png" },
            { field: "src", pattern: "./old2.png", newSrc: "./new2.png" },
        ]);

        expect(result.replacements).toHaveLength(2);
        expect(result.newText).toContain("./new1.png");
        expect(result.newText).toContain("./new2.png");
    });
});

describe("replaceImagesInText - HTML 标签", () => {
    it("应该处理 HTML img 标签的替换", () => {
        const html = `<img src="./image.png" alt="HTML Image" title="Original Title">`;
        const result = replaceImagesInText(html, [
            {
                field: "src",
                pattern: "./image.png",
                newSrc: "./new.png",
                newAlt: "New Image",
            },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain("./new.png");
        expect(result.newText).toContain('alt="New Image"');
        expect(result.newText).toContain('title="Original Title"');
    });
});

describe("replaceImagesInText - 其他场景", () => {
    it("应该返回替换的详细信息", () => {
        const markdown = "![Image](./image.png)";
        const result = replaceImagesInText(markdown, [
            {
                field: "src",
                pattern: "./image.png",
                newSrc: "./new.png",
                newAlt: "新描述",
            },
        ]);

        expect(result.replacements.length).toBeGreaterThan(0);
        result.replacements.forEach((replacement) => {
            expect(replacement).toHaveProperty("before");
            expect(replacement).toHaveProperty("after");
        });
    });

    it("应该保留 Markdown 中的其他内容", () => {
        const markdown = `# 标题

这是一些文本。

![Image](./image.png)

更多文本。

\`\`\`
代码块中的 ![Not Image](./code.png)
\`\`\`

结束。`;

        const result = replaceImagesInText(markdown, [
            { field: "src", pattern: "./image.png", newSrc: "./new.png" },
        ]);

        expect(result.newText).toContain("# 标题");
        expect(result.newText).toContain("这是一些文本");
        expect(result.newText).toContain("结束。");
    });
});

describe("replaceImagesInText - 边界情况", () => {
    it("应该处理空的 Markdown 文本", () => {
        const result = replaceImagesInText("", [
            { field: "src", pattern: "./old.png", newSrc: "./new.png" },
        ]);

        expect(result.replacements).toHaveLength(0);
        expect(result.newText).toBe("");
    });

    it("应该处理只有空白字符的文本", () => {
        const result = replaceImagesInText("   \n\t  ", [
            { field: "src", pattern: "./old.png", newSrc: "./new.png" },
        ]);

        expect(result.replacements).toHaveLength(0);
        expect(result.newText).toBe("   \n\t  ");
    });

    it("应该处理特殊字符的 alt 文本", () => {
        const markdown = '![Alt with "quotes"](./image.png)';
        const result = replaceImagesInText(markdown, [
            { field: "src", pattern: "./image.png", newSrc: "./new.png" },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain("./new.png");
    });

    it("应该处理包含 URL 编码字符的 src", () => {
        const markdown = "![Alt](./image%20with%20spaces.png)";
        const result = replaceImagesInText(markdown, [
            {
                field: "src",
                pattern: "./image%20with%20spaces.png",
                newSrc: "./new.png",
            },
        ]);

        expect(result.replacements).toHaveLength(1);
    });

    it("应该处理多行图片标记", () => {
        const markdown = `![Alt
Text](./image.png)`;
        // 多行 alt 的匹配行为取决于正则实现
        const result = replaceImagesInText(markdown, [
            { field: "src", pattern: "./image.png", newSrc: "./new.png" },
        ]);

        // 验证函数不会抛出错误即可
        expect(result).toHaveProperty("newText");
        expect(result).toHaveProperty("replacements");
    });

    it("应该处理 HTML 标签中的自闭合语法", () => {
        const html = `<img src="./image.png" alt="Description" />`;
        const result = replaceImagesInText(html, [
            { field: "src", pattern: "./image.png", newSrc: "./new.png" },
        ]);

        expect(result.replacements).toHaveLength(1);
        expect(result.newText).toContain("./new.png");
    });

    it("应该处理 HTML 标签中的无引号属性", () => {
        const html = `<img src=./image.png alt=Description>`;
        const result = replaceImagesInText(html, [
            { field: "src", pattern: "./image.png", newSrc: "./new.png" },
        ]);

        expect(result.replacements).toHaveLength(1);
    });

    it("应该处理多个连续的替换规则", () => {
        const markdown = "![A](./a.png) ![B](./b.png) ![C](./c.png)";
        const result = replaceImagesInText(markdown, [
            { field: "src", pattern: "./a.png", newSrc: "./x.png" },
            { field: "src", pattern: "./b.png", newSrc: "./y.png" },
            { field: "src", pattern: "./c.png", newSrc: "./z.png" },
        ]);

        expect(result.replacements).toHaveLength(3);
        expect(result.newText).toContain("./x.png");
        expect(result.newText).toContain("./y.png");
        expect(result.newText).toContain("./z.png");
    });

    it("应该处理替换规则之间的相互影响", () => {
        // 先替换 a.png 为 b.png，再替换 b.png 为 c.png
        // 注意：由于替换是顺序执行的，第一个替换后的结果会被第二个规则再次处理
        const markdown = "![A](./a.png)";
        const result = replaceImagesInText(markdown, [
            { field: "src", pattern: "./a.png", newSrc: "./b.png" },
            { field: "src", pattern: "./b.png", newSrc: "./c.png" },
        ]);

        // 由于顺序执行，a.png 先变成 b.png，然后 b.png 再变成 c.png
        expect(result.replacements).toHaveLength(2);
        expect(result.newText).toContain("./c.png");
    });
});

describe("updateImageAttribute", () => {
    it("应该更新已存在的 src 属性", () => {
        const html = `<img src="./old.png" alt="Description">`;
        const result = updateImageAttribute(html, "src", "./new.png");

        expect(result).toBe(`<img src="./new.png" alt="Description">`);
    });

    it("应该更新已存在的 alt 属性", () => {
        const html = `<img src="./image.png" alt="Old Description">`;
        const result = updateImageAttribute(html, "alt", "New Description");

        expect(result).toBe(`<img src="./image.png" alt="New Description">`);
    });

    it("应该更新已存在的 title 属性", () => {
        const html = `<img src="./image.png" alt="Description" title="Old Title">`;
        const result = updateImageAttribute(html, "title", "New Title");

        expect(result).toBe(`<img src="./image.png" alt="Description" title="New Title">`);
    });

    it("应该更新已存在的 width 属性", () => {
        const html = `<img src="./image.png" alt="Description" width="100">`;
        const result = updateImageAttribute(html, "width", "200");

        expect(result).toBe(`<img src="./image.png" alt="Description" width="200">`);
    });

    it("应该更新已存在的 height 属性", () => {
        const html = `<img src="./image.png" alt="Description" height="100">`;
        const result = updateImageAttribute(html, "height", "200");

        expect(result).toBe(`<img src="./image.png" alt="Description" height="200">`);
    });

    it("应该添加不存在的 width 属性", () => {
        const html = `<img src="./image.png" alt="Description">`;
        const result = updateImageAttribute(html, "width", "100");

        expect(result).toBe(`<img width="100" src="./image.png" alt="Description">`);
    });

    it("应该添加不存在的 height 属性", () => {
        const html = `<img src="./image.png" alt="Description">`;
        const result = updateImageAttribute(html, "height", "200");

        expect(result).toBe(`<img height="200" src="./image.png" alt="Description">`);
    });

    it("应该处理单引号属性并转换为双引号", () => {
        const html = `<img src='./image.png' alt='Description' width='100'>`;
        const result = updateImageAttribute(html, "width", "200");

        expect(result).toBe(`<img src='./image.png' alt='Description' width="200">`);
    });

    it("应该处理无引号属性并转换为双引号", () => {
        const html = `<img src="./image.png" alt="Description" width=100>`;
        const result = updateImageAttribute(html, "width", "200");

        expect(result).toBe(`<img src="./image.png" alt="Description" width="200">`);
    });

    it("应该处理自闭合标签", () => {
        const html = `<img src="./image.png" alt="Description" width="100" />`;
        const result = updateImageAttribute(html, "width", "200");

        expect(result).toBe(`<img src="./image.png" alt="Description" width="200" />`);
    });

    it("对于不支持的属性应返回原字符串", () => {
        const html = `<img src="./image.png" alt="Description">`;
        const result = updateImageAttribute(html, "class", "new-class");

        expect(result).toBe(html);
    });

    it("应该同时更新多个属性（多次调用）", () => {
        const html = `<img src="./image.png" alt="Description">`;
        let result = updateImageAttribute(html, "src", "./new.png");
        result = updateImageAttribute(result, "width", "100");
        result = updateImageAttribute(result, "height", "200");

        // 验证所有属性都被正确更新
        expect(result).toContain('src="./new.png"');
        expect(result).toContain('alt="Description"');
        expect(result).toContain('width="100"');
        expect(result).toContain('height="200"');
    });
});
