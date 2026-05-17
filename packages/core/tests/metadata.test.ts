/**
 * Metadata 模块测试
 *
 * 测试元数据提取、转换和 Frontmatter 管理功能：
 * - 从文件提取元数据（Frontmatter/Heading/Filename 优先级）
 * - 标题转换为 Frontmatter
 * - 章节标题提取（指定范围）
 * - Frontmatter 字段更新和删除
 */

import { describe, expect, it } from "vitest";
import {
    convertHeadingToFrontmatter,
    deleteFrontmatterFields,
    extractFrontmatterField,
    extractFrontmatter,
    extractSectionHeadings,
    splitFrontmatter,
    parseYamlFrontmatter,
    removeFrontmatter,
    sortByOrder,
    upsertFrontmatterFields,
} from "../src/metadata.js";

// ==================== extractSectionHeadings 测试 ====================

describe("extractSectionHeadings", () => {
    describe("默认提取范围（2-6 级）", () => {
        it("应该提取所有 ## 到 ###### 的标题", () => {
            const md = `# Main
## Section 1
### Subsection 1.1
#### Sub-subsection
## Section 2
##### Deep heading
###### Deepest`;

            const headings = extractSectionHeadings(md);
            expect(headings).toHaveLength(6);
            expect(headings[0]).toEqual({
                level: 2,
                text: "Section 1",
                lineIndex: 1,
            });
            expect(headings[1]).toEqual({
                level: 3,
                text: "Subsection 1.1",
                lineIndex: 2,
            });
            expect(headings[5]).toEqual({ level: 6, text: "Deepest", lineIndex: 6 });
        });

        it("应该不提取一级标题", () => {
            const md = `# Main Title
## Section`;

            const headings = extractSectionHeadings(md);
            expect(headings).toHaveLength(1);
            expect(headings[0].level).toBe(2);
        });
    });

    describe("自定义范围", () => {
        it("应该支持 minLevel 参数", () => {
            const md = `## Section
### Subsection
#### SubSubsection`;

            const headings = extractSectionHeadings(md, { minLevel: 3 });
            expect(headings).toHaveLength(2);
            expect(headings[0].level).toBe(3);
        });

        it("应该支持 maxLevel 参数", () => {
            const md = `## Section
### Subsection
#### SubSubsection`;

            const headings = extractSectionHeadings(md, { maxLevel: 3 });
            expect(headings).toHaveLength(2);
            expect(headings[0].level).toBe(2);
            expect(headings[1].level).toBe(3);
        });

        it("应该支持 minLevel 和 maxLevel 同时指定", () => {
            const md = `## A
### B
#### C
##### D`;

            const headings = extractSectionHeadings(md, { minLevel: 3, maxLevel: 4 });
            expect(headings).toHaveLength(2);
            expect(headings[0].level).toBe(3);
            expect(headings[1].level).toBe(4);
        });
    });

    describe("错误处理", () => {
        it("应该在 minLevel < 1 时抛出错误", () => {
            const md = "## Test";
            expect(() => extractSectionHeadings(md, { minLevel: 0 })).toThrow();
        });

        it("应该在 maxLevel > 6 时抛出错误", () => {
            const md = "## Test";
            expect(() => extractSectionHeadings(md, { maxLevel: 7 })).toThrow();
        });

        it("应该在 minLevel > maxLevel 时抛出错误", () => {
            const md = "## Test";
            expect(() => extractSectionHeadings(md, { minLevel: 5, maxLevel: 3 })).toThrow();
        });
    });

    describe("空结果", () => {
        it("无标题时返回空数组", () => {
            const md = "Just content, no headings";
            const headings = extractSectionHeadings(md);
            expect(headings).toEqual([]);
        });

        it("仅有一级标题时返回空数组", () => {
            const md = "# Title\n# Another";
            const headings = extractSectionHeadings(md);
            expect(headings).toEqual([]);
        });
    });

    describe("代码块排除", () => {
        it("应该排除代码块内的 # 注释", () => {
            const md = `## Section 1

\`\`\`bash
# This is a comment, not a heading
npm install
\`\`\`

## Section 2`;

            const headings = extractSectionHeadings(md);
            expect(headings).toHaveLength(2);
            expect(headings[0]).toEqual({
                level: 2,
                text: "Section 1",
                lineIndex: 0,
            });
            expect(headings[1]).toEqual({
                level: 2,
                text: "Section 2",
                lineIndex: 7,
            });
        });

        it("应该排除 ~~~ 风格的代码块", () => {
            const md = `## Section 1

~~~javascript
// # This is a comment
console.log('test');
~~~

### Subsection`;

            const headings = extractSectionHeadings(md);
            expect(headings).toHaveLength(2);
            expect(headings[0].text).toBe("Section 1");
            expect(headings[1].text).toBe("Subsection");
        });

        it("应该正确处理多个代码块", () => {
            const md = `## Section 1

\`\`\`bash
# Comment 1
\`\`\`

### Subsection

\`\`\`python
# Comment 2
\`\`\`

## Section 2`;

            const headings = extractSectionHeadings(md);
            expect(headings).toHaveLength(3);
            expect(headings[0].text).toBe("Section 1");
            expect(headings[1].text).toBe("Subsection");
            expect(headings[2].text).toBe("Section 2");
        });

        it("应该返回正确的 lineIndex", () => {
            const md = `## Section 1
Content
### Subsection

\`\`\`bash
# Comment
\`\`\`

## Section 2`;

            const headings = extractSectionHeadings(md);
            expect(headings[0].lineIndex).toBe(0);
            expect(headings[1].lineIndex).toBe(2);
            expect(headings[2].lineIndex).toBe(8);
        });

        it("代码块内的多级标题应该被排除", () => {
            const md = `## Section 1

\`\`\`markdown
# Not a heading
## Also not a heading
### Still not a heading
\`\`\`

## Section 2`;

            const headings = extractSectionHeadings(md);
            expect(headings).toHaveLength(2);
            expect(headings[0].text).toBe("Section 1");
            expect(headings[1].text).toBe("Section 2");
        });
    });
});

// ==================== convertHeadingToFrontmatter 测试 ====================

describe("convertHeadingToFrontmatter", () => {
    describe("基本转换", () => {
        it("应该将一级标题转换为 Frontmatter", () => {
            const md = "# My Title\n\nContent";
            const result = convertHeadingToFrontmatter(md);

            expect(result).toContain("---\ntitle: My Title\n---");
            expect(result).toContain("Content");
        });

        it("应该支持指定标题等级", () => {
            const md = "## Section Title\n\nContent";
            const result = convertHeadingToFrontmatter(md, { headingLevel: 2 });

            expect(result).toContain("title: Section Title");
        });
    });

    describe("保留现有 Frontmatter", () => {
        it("应该保留现有字段并仅更新 title", () => {
            const md = '---\nauthor: "Alice"\ndate: "2026-01-01"\n---\n\n# New Title\n\nContent';
            const result = convertHeadingToFrontmatter(md);

            expect(result).toContain("author: Alice"); // Re-emitted without redundant quotes
            expect(result).toContain('date: "2026-01-01"');
            expect(result).toContain("title: New Title");
        });
    });

    describe("边界情况", () => {
        it("标题不存在时返回原文档", () => {
            const md = "Content without heading";
            const result = convertHeadingToFrontmatter(md);

            expect(result).toBe(md);
        });

        it("指定的等级标题不存在时返回原文档", () => {
            const md = "# Title\n\nContent";
            const result = convertHeadingToFrontmatter(md, { headingLevel: 2 });

            expect(result).toBe(md);
        });
    });

    describe("特殊字符处理", () => {
        it("应该处理标题中的特殊字符", () => {
            const md = '# "Quoted" & Special: Characters\n\nContent';
            const result = convertHeadingToFrontmatter(md);

            expect(result).toContain('title: "\\"Quoted\\" & Special: Characters"');
        });
    });
});

// ==================== upsertFrontmatterFields 测试 ====================

describe("upsertFrontmatterFields", () => {
    describe("新增字段", () => {
        it("应该向文档添加新的 Frontmatter 字段", () => {
            const md = "Just content";
            const result = upsertFrontmatterFields(md, {
                title: "My Doc",
                author: "Alice",
            });

            expect(result.success).toBe(true);
            expect(result.added).toEqual(["title", "author"]);
            expect(result.updated).toEqual([]);
            expect(result.markdown).toContain("title: My Doc");
            expect(result.markdown).toContain("author: Alice");
        });
    });

    describe("更新字段", () => {
        it("应该更新现有 Frontmatter 字段", () => {
            const md = '---\nauthor: "Alice"\ndate: "2026-01-01"\n---\n\nContent';
            const result = upsertFrontmatterFields(md, {
                author: "Bob",
                date: "2026-01-01", // unchanged
            });

            expect(result.updated).toEqual(["author"]);
            expect(result.unchanged).toEqual(["date"]);
            expect(result.added).toEqual([]);
            expect(result.markdown).toContain("author: Bob");
        });
    });

    describe("混合操作", () => {
        it("应该同时新增和更新字段", () => {
            const md = '---\nauthor: "Alice"\n---\n\nContent';
            const result = upsertFrontmatterFields(md, {
                author: "Bob",
                date: "2026-02-07",
                tags: ["a", "b"],
            });

            expect(result.added).toContain("date");
            expect(result.added).toContain("tags");
            expect(result.updated).toEqual(["author"]);
            expect(result.markdown).toContain("author: Bob");
            expect(result.markdown).toContain('date: "2026-02-07"');
            expect(result.markdown).toContain("- a");
        });
    });

    describe("createIfMissing 选项", () => {
        it("默认（createIfMissing=true）应该为无 FM 文档创建", () => {
            const md = "Just content";
            const result = upsertFrontmatterFields(md, { title: "New" });

            expect(result.markdown).toContain("---\ntitle: New\n---");
        });

        it("createIfMissing=false 时无 FM 文档不应创建", () => {
            const md = "Just content";
            const result = upsertFrontmatterFields(
                md,
                { title: "New" },
                { createIfMissing: false },
            );

            expect(result.markdown).toBe(md);
        });
    });

    describe("特殊值处理", () => {
        it("应该正确序列化数组", () => {
            const md = "Content";
            const result = upsertFrontmatterFields(md, {
                tags: ["tag1", "tag2", "tag3"],
            });

            expect(result.markdown).toContain("- tag1");
            expect(result.markdown).toContain("- tag2");
        });

        it("应该处理特殊字符转义", () => {
            const md = "Content";
            const result = upsertFrontmatterFields(md, {
                title: 'Title with "quotes"',
            });

            expect(result.markdown).toContain('title: Title with "quotes"');
        });
    });
});

// ==================== removeFrontmatter 测试 ====================

describe("removeFrontmatter", () => {
    describe("基本移除", () => {
        it("应该移除 Frontmatter 部分", () => {
            const md = "---\nauthor: Alice\n---\n\nContent here";
            const result = removeFrontmatter(md);

            expect(result).toBe("Content here");
        });

        it("应该保留多行内容", () => {
            const md = "---\ntitle: Doc\n---\n\nLine 1\nLine 2\nLine 3";
            const result = removeFrontmatter(md);

            expect(result).toBe("Line 1\nLine 2\nLine 3");
        });
    });

    describe("边界情况", () => {
        it("无 Frontmatter 的文档返回原样", () => {
            const md = "Just content";
            const result = removeFrontmatter(md);

            expect(result).toBe(md);
        });

        it("仅有标题没有内容", () => {
            const md = "---\ntitle: Doc\n---";
            const result = removeFrontmatter(md);

            expect(result.trim()).toBe("");
        });
    });
});

// ==================== parseYamlFrontmatter 测试 ====================

describe("parseYamlFrontmatter", () => {
    it("应该解析简单键值对", () => {
        const yaml = "title: My Title\nauthor: John";
        const result = parseYamlFrontmatter(yaml);

        expect(result.title).toBe("My Title");
        expect(result.author).toBe("John");
    });

    it("应该解析带引号的字符串", () => {
        const yaml = "title: \"Quoted Title\"\nauthor: 'Single Quote'";
        const result = parseYamlFrontmatter(yaml);

        expect(result.title).toBe("Quoted Title");
        expect(result.author).toBe("Single Quote");
    });

    it("应该解析多行数组", () => {
        const yaml = "tags:\n  - tag1\n  - tag2\n  - tag3";
        const result = parseYamlFrontmatter(yaml);

        expect(Array.isArray(result.tags)).toBe(true);
        expect(result.tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("应该解析单行数组", () => {
        const yaml = 'tags: ["a", "b", "c"]';
        const result = parseYamlFrontmatter(yaml);

        expect(Array.isArray(result.tags)).toBe(true);
        expect(result.tags).toEqual(["a", "b", "c"]);
    });

    it("应该解析 null 值", () => {
        const yaml = "draft: null\nempty:";
        const result = parseYamlFrontmatter(yaml);

        expect(result.draft).toBeNull();
        expect(result.empty).toBeNull();
    });

    it("应该跳过空行和注释", () => {
        const yaml = "title: Title\n\n# This is a comment\nauthor: John";
        const result = parseYamlFrontmatter(yaml);

        expect(result.title).toBe("Title");
        expect(result.author).toBe("John");
    });

    it("应该处理带引号的数组项", () => {
        const yaml = "tags:\n  - \"tag with spaces\"\n  - 'another tag'";
        const result = parseYamlFrontmatter(yaml);

        expect(result.tags).toEqual(["tag with spaces", "another tag"]);
    });
});

// ==================== deleteFrontmatterFields 测试 ====================

describe("deleteFrontmatterFields", () => {
    it("应该删除指定的字段", () => {
        const md = "---\nauthor: Alice\ndraft: true\ndate: 2026-02-07\n---\n\nContent";
        const result = deleteFrontmatterFields(md, ["draft", "date"]);

        expect(result).toContain("author: Alice");
        expect(result).not.toContain("draft:");
        expect(result).not.toContain("date:");
        expect(result).toContain("Content");
    });

    it("删除所有字段后应该保留空的 frontmatter 块", () => {
        const md = "---\nauthor: Alice\n---\n\nContent";
        const result = deleteFrontmatterFields(md, ["author"]);

        expect(result).toBe("---\n---\n\nContent");
        expect(result).toContain("---");
    });

    it("无 Frontmatter 时返回原文档", () => {
        const md = "Just content";
        const result = deleteFrontmatterFields(md, ["title"]);

        expect(result).toBe(md);
    });

    it("删除不存在的字段应该无变化", () => {
        const md = "---\nauthor: Alice\n---\n\nContent";
        const result = deleteFrontmatterFields(md, ["nonexistent"]);

        expect(result).toContain("author: Alice");
        expect(result).toContain("Content");
    });
});

// ==================== upsertFrontmatterFields 扩展测试 ====================

describe("upsertFrontmatterFields - 扩展测试", () => {
    it("应该处理 null 值", () => {
        const md = "Content";
        const result = upsertFrontmatterFields(md, {
            title: null,
        });

        expect(result.success).toBe(true);
        expect(result.added).toContain("title");
        // null 值应该在 YAML 中显示为 null
        expect(result.markdown).toContain("title: null");
    });

    it("应该处理解析失败的 Frontmatter", () => {
        const md = "---\ninvalid: yaml: [broken\n---\n\nContent";
        const result = upsertFrontmatterFields(md, {
            title: "New Title",
        });

        expect(result.success).toBe(true);
        expect(result.markdown).toContain("title: New Title");
    });

    it("应该处理相同值的更新（无变化）", () => {
        const md = "---\ntitle: Same Title\n---\n\nContent";
        const result = upsertFrontmatterFields(md, {
            title: "Same Title",
        });

        expect(result.unchanged).toContain("title");
        expect(result.updated).toHaveLength(0);
    });
});

// ==================== convertHeadingToFrontmatter 扩展测试 ====================

describe("convertHeadingToFrontmatter - 扩展测试", () => {
    it("应该抛出错误当格式不支持", () => {
        const md = "# Title\n\nContent";
        expect(() => convertHeadingToFrontmatter(md, { format: "toml" as any })).toThrow(
            "Unsupported frontmatter format",
        );
    });

    it("应该处理带有 Frontmatter 的文档", () => {
        const md = "---\nauthor: Alice\n---\n\n# New Title\n\nContent";
        const result = convertHeadingToFrontmatter(md);

        expect(result).toContain("author: Alice");
        expect(result).toContain("title: New Title");
    });
});

// ==================== 集成测试 ====================

describe("元数据操作集成", () => {
    it("应该能够转换、更新和移除 Frontmatter", () => {
        // 1. 从纯标题开始
        let md = "# Document Title\n\nContent";

        // 2. 转换为 Frontmatter
        md = convertHeadingToFrontmatter(md);
        expect(md).toContain("---\ntitle: Document Title\n---");

        // 3. 添加更多字段
        const updated = upsertFrontmatterFields(md, {
            author: "John",
            date: "2026-02-07",
        });
        expect(updated.added).toContain("author");
        expect(updated.added).toContain("date");

        // 4. 移除 Frontmatter
        const cleaned = removeFrontmatter(updated.markdown);
        expect(cleaned).toContain("Content");
        expect(cleaned).not.toContain("---");
    });
});

// ==================== splitFrontmatter 测试 ====================

describe("splitFrontmatter", () => {
    describe("基本功能", () => {
        it("应该正确解析标准 frontmatter", () => {
            const input = "---\ntitle: Test\nauthor: John\n---\n\nContent";
            const result = splitFrontmatter(input);

            expect(result.hasFrontmatter).toBe(true);
            expect(result.data).toBe("title: Test\nauthor: John");
            expect(result.content).toBe("\nContent");
        });

        it("应该正确解析空 frontmatter", () => {
            const input = "---\n---\n\nContent";
            const result = splitFrontmatter(input);

            expect(result.hasFrontmatter).toBe(true);
            expect(result.data).toBe("");
            expect(result.content).toBe("\nContent");
        });

        it("应该处理无 frontmatter 的文档", () => {
            const input = "# Title\n\nContent";
            const result = splitFrontmatter(input);

            expect(result.hasFrontmatter).toBe(false);
            expect(result.data).toBe("");
            expect(result.content).toBe("# Title\n\nContent");
        });

        it("应该处理只有开始分隔符的情况", () => {
            const input = "---\ntitle: Test\n\nContent";
            const result = splitFrontmatter(input);

            expect(result.hasFrontmatter).toBe(false);
            // 没有结束分隔符时，整个输入作为内容返回
            expect(result.content).toContain("title: Test");
            expect(result.content).toContain("Content");
        });
    });

    describe("边缘情况", () => {
        it("应该正确处理内容中包含 --- 的情况", () => {
            const input =
                '---\ndescription: "Use --- to indicate"\n---\n\nContent with --- separator';
            const result = splitFrontmatter(input);

            expect(result.hasFrontmatter).toBe(true);
            expect(result.data).toBe('description: "Use --- to indicate"');
            expect(result.content).toBe("\nContent with --- separator");
        });

        it("不应该将 ---- 识别为分隔符", () => {
            const input = "----\ntitle: Test\n----\n\nContent";
            const result = splitFrontmatter(input);

            expect(result.hasFrontmatter).toBe(false);
            expect(result.content).toBe("----\ntitle: Test\n----\n\nContent");
        });

        it("应该正确处理 Windows 换行符", () => {
            const input = "---\r\ntitle: Test\r\nauthor: John\r\n---\r\n\r\nContent";
            const result = splitFrontmatter(input);

            expect(result.hasFrontmatter).toBe(true);
            // 换行符会被规范化为 \n
            expect(result.data).toBe("title: Test\nauthor: John");
            // \r\n\r\n becomes \n after split/join
            expect(result.content).toBe("\nContent");
        });

        it("应该正确处理混合换行符", () => {
            const input = "---\ntitle: Test\r\n---\nContent";
            const result = splitFrontmatter(input);

            expect(result.hasFrontmatter).toBe(true);
            expect(result.data).toBe("title: Test");
            expect(result.content).toBe("Content");
        });

        it("应该处理 frontmatter 后无空行的情况", () => {
            const input = "---\ntitle: Test\n---\nContent";
            const result = splitFrontmatter(input);

            expect(result.hasFrontmatter).toBe(true);
            expect(result.data).toBe("title: Test");
            expect(result.content).toBe("Content");
        });

        it("应该处理带尾随空白的分隔符", () => {
            const input = "---\ntitle: Test\n--- \n\nContent";
            const result = splitFrontmatter(input);

            expect(result.hasFrontmatter).toBe(true);
            expect(result.data).toBe("title: Test");
        });

        it("应该处理多行 YAML 块文字", () => {
            const input = "---\ncontent: |\n  line1\n  line2\n---\n\nContent";
            const result = splitFrontmatter(input);

            expect(result.hasFrontmatter).toBe(true);
            expect(result.data).toContain("content: |");
            expect(result.data).toContain("line1");
        });

        it("应该处理带引号的字符串", () => {
            const input = "---\ntitle: \"Hello World\"\nauthor: 'Test User'\n---\n\nContent";
            const result = splitFrontmatter(input);

            expect(result.hasFrontmatter).toBe(true);
            expect(result.data).toBe("title: \"Hello World\"\nauthor: 'Test User'");
        });
    });

    describe("多个分隔符", () => {
        it("应该只识别第一个 frontmatter", () => {
            const input = "---\ntitle: First\n---\n\nMiddle\n\n---\ntitle: Second\n---";
            const result = splitFrontmatter(input);

            expect(result.hasFrontmatter).toBe(true);
            expect(result.data).toBe("title: First");
            // 第一个 frontmatter 之后的所有内容都作为 content 返回
            expect(result.content).toContain("Middle");
            expect(result.content).toContain("Second");
        });
    });

    describe("空输入", () => {
        it("应该处理空字符串", () => {
            const result = splitFrontmatter("");

            expect(result.hasFrontmatter).toBe(false);
            expect(result.data).toBe("");
            expect(result.content).toBe("");
        });

        it("应该处理只有分隔符", () => {
            const result = splitFrontmatter("---");

            expect(result.hasFrontmatter).toBe(false);
        });
    });
});

// ==================== extractFrontmatterField 测试 ====================

describe("extractFrontmatterField", () => {
    it("无 frontmatter 时应返回 undefined", () => {
        const result = extractFrontmatterField("# Title\n\nContent", "title");
        expect(result).toBeUndefined();
    });

    it("字段不存在时应返回 undefined", () => {
        const md = "---\ntitle: Hello\n---\n\nContent";
        const result = extractFrontmatterField(md, "nonexistent");
        expect(result).toBeUndefined();
    });

    it("应该提取字符串字段", () => {
        const md = "---\ntitle: Hello World\n---\n\nContent";
        const result = extractFrontmatterField(md, "title");
        expect(result).toBe("Hello World");
    });

    it("应该将数组字段 join 为字符串", () => {
        const md = "---\ntags:\n  - tag1\n  - tag2\n---\n\nContent";
        const result = extractFrontmatterField(md, "tags");
        expect(result).toBe("tag1, tag2");
    });

    it("其他类型应转为字符串", () => {
        const md = "---\ncount: 42\n---\n\nContent";
        const result = extractFrontmatterField(md, "count");
        expect(result).toBe("42");
    });
});

// ==================== sortByOrder 测试 ====================

describe("sortByOrder", () => {
    const baseEntries = [
        { title: "Charlie", frontmatter: {} },
        { title: "Alpha", frontmatter: {} },
        { title: "Bravo", frontmatter: {} },
    ];

    it("都有 order 时应按数字升序排列", () => {
        const entries = [
            { title: "Second", frontmatter: { sidebar_order: 2 } },
            { title: "First", frontmatter: { sidebar_order: 1 } },
            { title: "Third", frontmatter: { sidebar_order: 3 } },
        ];
        const result = sortByOrder(entries);
        expect(result.map((e) => e.title)).toEqual(["First", "Second", "Third"]);
    });

    it("仅 A 有 order 时 A 应排在前面", () => {
        const entries = [
            { title: "Zulu", frontmatter: { sidebar_order: 1 } },
            { title: "Alpha", frontmatter: {} },
        ];
        const result = sortByOrder(entries);
        expect(result[0].title).toBe("Zulu");
    });

    it("仅 B 有 order 时 B 应排在前面", () => {
        const entries = [
            { title: "Alpha", frontmatter: {} },
            { title: "Zulu", frontmatter: { sidebar_order: 1 } },
        ];
        const result = sortByOrder(entries);
        expect(result[0].title).toBe("Zulu");
    });

    it("都没有 order 时应按 title 字母序排列", () => {
        const result = sortByOrder(baseEntries);
        expect(result.map((e) => e.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("应该不修改原数组", () => {
        const entries = [...baseEntries];
        const original = [...entries];
        sortByOrder(entries);
        expect(entries).toEqual(original);
    });
});
