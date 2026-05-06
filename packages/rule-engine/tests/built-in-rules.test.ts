/**
 * 内置 Rules 测试
 *
 * @module built-in-rules.test
 * @description
 * 测试内置 Rules 的功能。
 */

import { describe, expect, it, vi } from "vitest";
import {
    convertImagesRule,
    frontmatterDateRule,
    frontmatterIdRule,
    frontmatterTitleRule,
    frontmatterUpdatedRule,
    promoteHeadingsRule,
    stripFrontmatterRule,
    textReplaceRule,
} from "../src/rules/built-in/index.js";
import type { RuleContext } from "../src/rules/rule-types.js";
import type { CounterService } from "../src/rules/service-registry.js";

const createContext = (document: string): RuleContext => ({
    document,
    filePath: "/test.md",
});

describe("strip-frontmatter rule", () => {
    it("should remove frontmatter from document", () => {
        const document = "---\ntitle: Test\n---\n\nContent";
        const result = stripFrontmatterRule.execute(createContext(document));

        expect(result.modified).toBe(true);
        expect(result.content).toBe("Content");
    });

    it("should not modify document without frontmatter", () => {
        const document = "# Title\n\nContent";
        const result = stripFrontmatterRule.execute(createContext(document));

        expect(result.modified).toBeFalsy();
        expect(result.content).toBe(document);
    });

    it("should handle frontmatter with multiple fields", () => {
        const document =
            "---\ntitle: Test\ndate: 2024-01-01\ntags:\n  - tag1\n  - tag2\n---\n\nContent";
        const result = stripFrontmatterRule.execute(createContext(document));

        expect(result.modified).toBe(true);
        expect(result.content).toBe("Content");
    });

    it("should handle frontmatter without trailing newline", () => {
        const document = "---\ntitle: Test\n---";
        const result = stripFrontmatterRule.execute(createContext(document));

        expect(result.modified).toBe(true);
        expect(result.content).toBe("");
    });

    it("should handle frontmatter with Windows line endings (\\r\\n)", () => {
        const document = "---\r\ntitle: Test\r\n---\r\n\r\nContent";
        const result = stripFrontmatterRule.execute(createContext(document));

        expect(result.modified).toBe(true);
        expect(result.content).toBe("Content");
    });

    it("should handle frontmatter at end of file", () => {
        const document = "---\ntitle: Test\n---";
        const result = stripFrontmatterRule.execute(createContext(document));

        expect(result.modified).toBe(true);
        expect(result.content).toBe("");
    });
});

describe("promote-headings rule", () => {
    it("should promote headings by 1 level by default", () => {
        const document = "## Section 1\n### Subsection\n#### Deep";
        const result = promoteHeadingsRule.execute(createContext(document));

        expect(result.modified).toBe(true);
        // levels=1: H2→H1, H3→H2, H4→H3
        expect(result.content).toBe("# Section 1\n## Subsection\n### Deep");
    });

    it("should promote headings by specified levels", () => {
        const document = "### Section\n#### Subsection";
        const result = promoteHeadingsRule.execute(createContext(document), {
            levels: 2,
        });

        expect(result.modified).toBe(true);
        // levels=2: H3→H1, H4→H2
        expect(result.content).toBe("# Section\n## Subsection");
    });

    it("should not promote h1", () => {
        const document = "# Title\n## Section";
        const result = promoteHeadingsRule.execute(createContext(document));

        expect(result.modified).toBe(true); // Note: may vary based on implementation
        expect(result.content).toBe("# Title\n# Section");
    });

    it("should not modify document without headings", () => {
        const document = "Plain text without headings";
        const result = promoteHeadingsRule.execute(createContext(document));

        expect(result.modified).toBeFalsy();
    });

    it("should cap at h1", () => {
        const document = "## Section";
        const result = promoteHeadingsRule.execute(createContext(document), {
            levels: 2,
        });

        expect(result.modified).toBe(true);
        expect(result.content).toBe("# Section");
    });

    it("should not promote h1 when levels=1", () => {
        const document = "# Title\n## Section\n### Subsection";
        const result = promoteHeadingsRule.execute(createContext(document));

        expect(result.modified).toBe(true);
        // H1 stays H1, H2→H1, H3→H2
        expect(result.content).toBe("# Title\n# Section\n## Subsection");
    });

    it("should promote all to h1 when levels >= 5", () => {
        const document = "## H2\n### H3\n#### H4\n##### H5\n###### H6";
        const result = promoteHeadingsRule.execute(createContext(document), {
            levels: 5,
        });

        expect(result.modified).toBe(true);
        // All should be H1
        expect(result.content).toBe("# H2\n# H3\n# H4\n# H5\n# H6");
    });
});

describe("text-replace rule", () => {
    it("should replace text using regex", () => {
        const document = "Hello World\nHello Universe";
        const result = textReplaceRule.execute(createContext(document), {
            match: "Hello",
            replace: "Hi",
            flags: "g",
        });

        expect(result.modified).toBe(true); // Note: may vary based on implementation
        expect(result.content).toBe("Hi World\nHi Universe");
    });

    it("should use capture groups", () => {
        const document = "foo bar baz";
        const result = textReplaceRule.execute(createContext(document), {
            match: "(foo) (bar)",
            replace: "$2 $1",
            flags: "g",
        });

        expect(result.modified).toBe(true); // Note: may vary based on implementation
        expect(result.content).toBe("bar foo baz");
    });

    it("should not modify if no match", () => {
        const document = "Hello World";
        const result = textReplaceRule.execute(createContext(document), {
            match: "Goodbye",
            replace: "Hi",
        });

        expect(result.modified).toBeFalsy();
        expect(result.content).toBe(document);
    });

    it("should handle invalid regex gracefully", () => {
        const document = "Hello World";
        const result = textReplaceRule.execute(createContext(document), {
            match: "[invalid",
            replace: "test",
        });

        expect(result.modified).toBeFalsy();
        expect(result.messages?.[0]).toContain("正则表达式错误");
    });

    it("should return error if match is missing", () => {
        const document = "Hello World";
        const result = textReplaceRule.execute(createContext(document), {});

        expect(result.modified).toBeFalsy();
        expect(result.messages?.[0]).toContain("缺少 match");
    });
});

describe("convert-images rule", () => {
    it("should convert markdown images to HTML", () => {
        const document = "![alt text](./image.png)";
        const result = convertImagesRule.execute(createContext(document), {
            convertToHtml: true,
        });

        expect(result.modified).toBe(true); // Note: may vary based on implementation
        expect(result.content).toBe('<img src="./image.png" alt="alt text" />');
    });

    it("should handle images with title", () => {
        const document = '![alt text](./image.png "Title")';
        const result = convertImagesRule.execute(createContext(document), {
            convertToHtml: true,
        });

        expect(result.modified).toBe(true); // Note: may vary based on implementation
        expect(result.content).toBe('<img src="./image.png" alt="alt text" title="Title" />');
    });

    it("should not modify if convertToHtml is false", () => {
        const document = "![alt text](./image.png)";
        const result = convertImagesRule.execute(createContext(document), {
            convertToHtml: false,
        });

        expect(result.modified).toBeFalsy();
        expect(result.content).toBe(document);
    });

    it("should handle multiple images", () => {
        const document = "![img1](./a.png) and ![img2](./b.png)";
        const result = convertImagesRule.execute(createContext(document), {
            convertToHtml: true,
        });

        expect(result.modified).toBe(true); // Note: may vary based on implementation
        expect(result.content).toContain('<img src="./a.png" alt="img1" />');
        expect(result.content).toContain('<img src="./b.png" alt="img2" />');
    });

    it("should not modify document without images", () => {
        const document = "Plain text without images";
        const result = convertImagesRule.execute(createContext(document), {
            convertToHtml: true,
        });

        expect(result.modified).toBeFalsy();
    });
});

describe("frontmatter-title rule", () => {
    it("should convert h1 to frontmatter title", () => {
        const document = "# My Title\n\nContent";
        const result = frontmatterTitleRule.execute(createContext(document));

        expect(result.modified).toBe(true); // Note: may vary based on implementation
        expect(result.content).toContain("---");
        expect(result.content).toContain("title: My Title");
        expect(result.content).toContain("Content");
    });

    it("should update existing frontmatter", () => {
        const document = "---\nauthor: Test\n---\n\n# My Title\n\nContent";
        const result = frontmatterTitleRule.execute(createContext(document));

        expect(result.modified).toBe(true); // Note: may vary based on implementation
        expect(result.content).toContain("author: Test");
        expect(result.content).toContain("title: My Title");
    });

    it("should not modify if no h1 found", () => {
        const document = "## Section\n\nContent";
        const result = frontmatterTitleRule.execute(createContext(document));

        expect(result.modified).toBeFalsy();
    });

    it("should use specified heading level", () => {
        const document = "## My Title\n\nContent";
        const result = frontmatterTitleRule.execute(createContext(document), {
            headingLevel: 2,
        });

        expect(result.modified).toBe(true); // Note: may vary based on implementation
        expect(result.content).toContain("title: My Title");
    });
});

describe("frontmatter-date rule", () => {
    it("should add date field when missing", () => {
        const document = "Content";
        const today = new Date().toISOString().split("T")[0];
        const result = frontmatterDateRule.execute(createContext(document));

        expect(result.content).toContain(today);
        expect(result.modified).toBe(true);
        expect(result.messages?.[0]).toContain("添加 date");
    });

    it("should use custom field name", () => {
        const document = "Content";
        const today = new Date().toISOString().split("T")[0];
        const result = frontmatterDateRule.execute(createContext(document), {
            fieldName: "created",
        });

        expect(result.content).toContain("created:");
        expect(result.content).toContain(today);
        expect(result.messages?.[0]).toContain("添加 created");
    });

    it("should skip if date field already exists", () => {
        const document = "---\ndate: 2024-01-01\n---\n\nContent";
        const result = frontmatterDateRule.execute(createContext(document));

        // date exists, should skip (only initialize once)
        expect(result.modified).toBe(false);
        expect(result.messages?.[0]).toContain("字段已存在");
        expect(result.messages?.[0]).toContain("跳过");
        expect(result.content).toContain("date: 2024-01-01");
    });

    it("should skip even if date value is different", () => {
        const document = "---\ndate: 2020-01-01\n---\n\nContent";
        const result = frontmatterDateRule.execute(createContext(document));

        // date exists with different value, should still skip
        expect(result.modified).toBe(false);
        expect(result.messages?.[0]).toContain("字段已存在");
        expect(result.content).toContain("date: 2020-01-01");
    });
});

describe("frontmatter-updated rule", () => {
    it("should add updated field when missing", () => {
        const document = "Content";
        const today = new Date().toISOString().split("T")[0];
        const result = frontmatterUpdatedRule.execute(createContext(document));

        expect(result.content).toContain(today);
        expect(result.modified).toBe(true);
        expect(result.messages?.[0]).toContain("添加 updated");
    });

    it("should use custom field name", () => {
        const document = "Content";
        const today = new Date().toISOString().split("T")[0];
        const result = frontmatterUpdatedRule.execute(createContext(document), {
            fieldName: "lastModified",
        });

        expect(result.content).toContain("lastModified:");
        expect(result.content).toContain(today);
        expect(result.messages?.[0]).toContain("添加 lastModified");
    });

    it("should update updated field even if it exists", () => {
        const document = "---\nupdated: 2024-01-01\n---\n\nContent";
        const today = new Date().toISOString().split("T")[0];
        const result = frontmatterUpdatedRule.execute(createContext(document));

        // updated exists, should always update
        expect(result.modified).toBe(true);
        expect(result.messages?.[0]).toContain("更新 updated");
        expect(result.messages?.[0]).toContain("原值：2024-01-01");
        expect(result.content).toContain(`updated: ${today}`);
    });

    it("should report no change if value is already today", () => {
        const today = new Date().toISOString().split("T")[0];
        const document = `---\nupdated: ${today}\n---\n\nContent`;
        const result = frontmatterUpdatedRule.execute(createContext(document));

        // updated already has today's value
        expect(result.modified).toBe(false);
        expect(result.messages?.[0]).toContain("字段已存在且值相同");
    });
});

describe("frontmatter-id rule", () => {
    function makeContext(document: string): RuleContext {
        let counter = 0;
        const counterService: CounterService = {
            id: "counter",
            next: () => counter++,
            current: () => counter,
            reset: (v) => {
                counter = v ?? 0;
            },
            initialize: () => {},
        };
        const services = {
            get: vi.fn((id: string) => (id === "counter" ? counterService : undefined)),
            register: vi.fn(),
            has: vi.fn(() => true),
            getAllIds: vi.fn(() => ["counter"]),
        };
        return { document, filePath: "/test.md", services: services as never };
    }

    it("should render counter with radix from counter", async () => {
        const doc = "# Hello\n\nContent";
        const result = await frontmatterIdRule.execute(makeContext(doc), {
            template: "{counter_global}",
            counter: { global: { length: 4, radix: 10 } },
        });
        expect(result.modified).toBe(true);
        expect(result.content).toContain('id: "0000"');
    });

    it("should render ff1 with radix from counter", async () => {
        const doc = "# Hello\n\nContent";
        const result = await frontmatterIdRule.execute(makeContext(doc), {
            template: "{ff1}",
            ff1: { useCounter: "global", encryptionKey: "test-secret-key-32-bytes!" },
            counter: { global: { length: 4, radix: 36 } },
        });
        expect(result.modified).toBe(true);
        const idMatch = result.content.match(/id: (.+)/);
        expect(idMatch).not.toBeNull();
        expect(idMatch![1].length).toBe(4);
    });

    it("should use ff1.length/radix when explicitly set", async () => {
        const doc = "# Hello\n\nContent";
        const result = await frontmatterIdRule.execute(makeContext(doc), {
            template: "{ff1}",
            ff1: {
                useCounter: "global",
                encryptionKey: "test-secret-key-32-bytes!",
                length: 8,
                radix: 10,
            },
            counter: { global: { length: 4, radix: 36 } },
        });
        expect(result.modified).toBe(true);
        const idMatch = result.content.match(/id: "?([^"\s]+)"?/);
        expect(idMatch).not.toBeNull();
        // length 8 should override counter's length 4
        expect(idMatch![1].length).toBe(8);
    });

    it("should fall back to counter config when ff1.length/radix not set", async () => {
        const doc = "# Hello\n\nContent";
        const result = await frontmatterIdRule.execute(makeContext(doc), {
            template: "{ff1}",
            ff1: { useCounter: "global", encryptionKey: "test-secret-key-32-bytes!" },
            counter: { global: { length: 6, radix: 36 } },
        });
        expect(result.modified).toBe(true);
        const idMatch = result.content.match(/id: (.+)/);
        expect(idMatch).not.toBeNull();
        // falls back to counter's length 6
        expect(idMatch![1].length).toBe(6);
    });

    it("should return error when ff1.useCounter references non-existent counter", async () => {
        const doc = "# Hello\n\nContent";
        const result = await frontmatterIdRule.execute(makeContext(doc), {
            template: "{ff1}",
            ff1: { useCounter: "nonexistent", encryptionKey: "test-secret-key-32-bytes!" },
            counter: { global: { length: 6, radix: 36 } },
        });
        expect(result.modified).toBe(false);
        expect(result.messages?.[0]).toContain("未在 counter 中定义");
    });

    it("should render combined template with mixed counter configs", async () => {
        const doc = "# Hello\n\nContent";
        const result = await frontmatterIdRule.execute(makeContext(doc), {
            template: "{counter_global}-{ff1}",
            fieldName: "id",
            ff1: { useCounter: "blog", encryptionKey: "test-secret-key-32-bytes!" },
            counter: {
                global: { length: 6, radix: 10 },
                blog: { length: 4, radix: 36 },
            },
        });
        expect(result.modified).toBe(true);
        const parts = result.content.match(/id: (\d+)-([A-Z0-9]+)/);
        expect(parts).not.toBeNull();
        // global: radix-10 → only digits
        expect(parts![1]).toMatch(/^\d+$/);
        // blog: radix-36 → may contain letters
        expect(parts![2]).toMatch(/^[A-Z0-9]+$/);
        expect(parts![2].length).toBe(4);
    });
});
