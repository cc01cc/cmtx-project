/**
 * Section Numbers 模块测试
 *
 * 测试章节编号功能：
 * - 添加章节编号（addSectionNumbers）
 * - 移除章节编号（removeSectionNumbers）
 * - 代码块内容排除
 * - 多级标题层级编号
 * - 配置选项
 */

import { describe, expect, it } from "vitest";
import { addSectionNumbers, removeSectionNumbers } from "../src/section-numbers.js";

// ==================== addSectionNumbers 测试 ====================

describe("addSectionNumbers", () => {
    describe("基本功能", () => {
        it("应该为 H1-H6 标题添加编号", () => {
            const md = `# Title
## Section 1
### Subsection
## Section 2`;

            const result = addSectionNumbers(md);
            expect(result.modified).toBe(true);
            expect(result.headingsCount).toBe(4);
            expect(result.content).toContain("# 1. Title");
            expect(result.content).toContain("## 1.1. Section 1");
            expect(result.content).toContain("### 1.1.1. Subsection");
            expect(result.content).toContain("## 1.2. Section 2");
        });

        it("应该正确处理多级层级", () => {
            const md = `# A
## B
### C
#### D
##### E
###### F`;

            const result = addSectionNumbers(md);
            expect(result.content).toContain("# 1. A");
            expect(result.content).toContain("## 1.1. B");
            expect(result.content).toContain("### 1.1.1. C");
            expect(result.content).toContain("#### 1.1.1.1. D");
            expect(result.content).toContain("##### 1.1.1.1.1. E");
            expect(result.content).toContain("###### 1.1.1.1.1.1. F");
        });

        it("无标题时返回未修改", () => {
            const md = "Just content, no headings";
            const result = addSectionNumbers(md);
            expect(result.modified).toBe(false);
            expect(result.headingsCount).toBe(0);
            expect(result.content).toBe(md);
        });
    });

    describe("代码块排除", () => {
        it("应该排除代码块内的 # 注释", () => {
            const md = `## Section 1

\`\`\`bash
# This is a comment
npm install
\`\`\`

## Section 2`;

            const result = addSectionNumbers(md);
            expect(result.headingsCount).toBe(2);
            // 默认 minLevel=1，但文档中只有 H2，所以 H2 显示为 1.
            expect(result.content).toContain("## 1. Section 1");
            expect(result.content).toContain("## 2. Section 2");
            // 代码块内的 # 注释不应该被编号
            expect(result.content).toContain("# This is a comment");
        });

        it("应该正确处理包含 bash 注释的代码块", () => {
            const md = `## Server Config

\`\`\`bash
# Check node version
node -v

# Install dependencies
npm install
\`\`\`

## Security Config`;

            const result = addSectionNumbers(md);
            expect(result.headingsCount).toBe(2);
            expect(result.content).toContain("## 1. Server Config");
            expect(result.content).toContain("## 2. Security Config");
            // 代码块内的注释保持原样
            expect(result.content).toContain("# Check node version");
            expect(result.content).toContain("# Install dependencies");
        });

        it("应该处理多个代码块", () => {
            const md = `## Section 1

\`\`\`bash
# Comment 1
\`\`\`

### Subsection

\`\`\`python
# Comment 2
\`\`\`

## Section 2`;

            const result = addSectionNumbers(md);
            expect(result.headingsCount).toBe(3);
            expect(result.content).toContain("## 1. Section 1");
            expect(result.content).toContain("### 1.1. Subsection");
            expect(result.content).toContain("## 2. Section 2");
        });

        it("应该处理 ~~~ 风格的代码块", () => {
            const md = `## Section

~~~javascript
// # Not a heading
console.log('test');
~~~

### Subsection`;

            const result = addSectionNumbers(md);
            expect(result.headingsCount).toBe(2);
            expect(result.content).toContain("## 1. Section");
            expect(result.content).toContain("### 1.1. Subsection");
        });
    });

    describe("已有编号的文档", () => {
        it("应该更新现有编号", () => {
            const md = `# 1. Title
## 1.1. Section
### 1.1.1. Subsection`;

            const result = addSectionNumbers(md);
            expect(result.modified).toBe(true);
            expect(result.content).toContain("# 1. Title");
            expect(result.content).toContain("## 1.1. Section");
            expect(result.content).toContain("### 1.1.1. Subsection");
        });

        it("应该替换错误的编号", () => {
            const md = `# 5. Title
## 3.2. Section
### 1.1.1. Subsection`;

            const result = addSectionNumbers(md);
            expect(result.content).toContain("# 1. Title");
            expect(result.content).toContain("## 1.1. Section");
            expect(result.content).toContain("### 1.1.1. Subsection");
        });
    });

    describe("配置选项", () => {
        it("应该支持 minLevel 选项", () => {
            const md = `# Title
## Section 1
### Subsection`;

            const result = addSectionNumbers(md, { minLevel: 2 });
            // H1 应该保持原样，未被编号
            expect(result.content).toContain("# Title");
            expect(result.content).not.toContain("# 1. Title");
            expect(result.content).not.toContain("# 1.Title");
            // H2 和 H3 应该被正确编号
            expect(result.content).toContain("## 1. Section 1");
            expect(result.content).toContain("### 1.1. Subsection");
        });

        it("应该支持 maxLevel 选项", () => {
            const md = `## Section
### Subsection
#### Deep`;

            const result = addSectionNumbers(md, { maxLevel: 3 });
            expect(result.content).toContain("## 1. Section");
            expect(result.content).toContain("### 1.1. Subsection");
            expect(result.content).toContain("#### Deep"); // H4 未被编号
        });

        it("应该支持 startLevel 选项", () => {
            const md = `## Section 1
### Subsection
## Section 2`;

            const result = addSectionNumbers(md, { startLevel: 2 });
            // 从 H2 开始编号，所以 H2 显示为 1., 1.1.
            expect(result.content).toContain("## 1. Section 1");
            expect(result.content).toContain("### 1.1. Subsection");
            expect(result.content).toContain("## 2. Section 2");
        });

        it("应该支持自定义分隔符", () => {
            const md = `## Section
### Subsection`;

            const result = addSectionNumbers(md, { separator: "-" });
            expect(result.content).toContain("## 1- Section");
            expect(result.content).toContain("### 1-1- Subsection");
        });
    });

    describe("复杂文档结构", () => {
        it("应该处理用户提供的示例文档", () => {
            const md = `# OpenClaw 安装避坑不完全指南

## 1. 服务器配置

### 1.1. 服务器镜像配置

\`\`\`bash
node -v
\`\`\`

### 1.2. 云服务器安全组配置

## 2. 安全性配置

### 2.1. 创建非 root 用户

\`\`\`bash
sudo adduser claw
\`\`\`

### 2.2. SSH 密钥配置
### 2.3. SSH 密钥冲突处理

## 3. 系统优化

### 3.1. 内存与 Swap 配置

\`\`\`bash
# 查看 swap 状态
sudo swapon --show
\`\`\`

## 4. OpenClaw 安装与配置

### 4.1. NPM 镜像源配置
### 4.2. 安装 OpenClaw
### 4.3. 配置 Onboarding

## 5. 安装后的操作

### 5.1. SSH 转发访问
### 5.2. 获取控制面板信息
### 5.3. 故障诊断与修复

## 6. 常用命令速查`;

            const result = addSectionNumbers(md);
            expect(result.headingsCount).toBe(19); // 1 H1 + 6 H2 + 12 H3
            expect(result.content).toContain("# 1. OpenClaw 安装避坑不完全指南");
            expect(result.content).toContain("## 1.1. 服务器配置");
            expect(result.content).toContain("### 1.1.1. 服务器镜像配置");
            expect(result.content).toContain("### 1.1.2. 云服务器安全组配置");
            expect(result.content).toContain("## 1.2. 安全性配置");
            expect(result.content).toContain("### 1.2.1. 创建非 root 用户");
            expect(result.content).toContain("### 1.2.2. SSH 密钥配置");
            expect(result.content).toContain("### 1.2.3. SSH 密钥冲突处理");
            expect(result.content).toContain("## 1.3. 系统优化");
            expect(result.content).toContain("### 1.3.1. 内存与 Swap 配置");
            expect(result.content).toContain("## 1.4. OpenClaw 安装与配置");
            expect(result.content).toContain("## 1.6. 常用命令速查");
            // 代码块内的注释保持原样
            expect(result.content).toContain("# 查看 swap 状态");
        });
    });
});

// ==================== removeSectionNumbers 测试 ====================

describe("removeSectionNumbers", () => {
    describe("基本功能", () => {
        it("应该移除章节编号", () => {
            const md = `# 1. Title
## 1.1. Section
### 1.1.1. Subsection`;

            const result = removeSectionNumbers(md);
            expect(result.modified).toBe(true);
            expect(result.content).toContain("# Title");
            expect(result.content).toContain("## Section");
            expect(result.content).toContain("### Subsection");
        });

        it("应该处理不同层级的编号", () => {
            const md = `# 1. A
## 1.1. B
### 1.1.1. C
#### 1.1.1.1. D`;

            const result = removeSectionNumbers(md);
            expect(result.content).toContain("# A");
            expect(result.content).toContain("## B");
            expect(result.content).toContain("### C");
            expect(result.content).toContain("#### D");
        });

        it("无编号时返回未修改", () => {
            const md = `# Title
## Section
### Subsection`;

            const result = removeSectionNumbers(md);
            expect(result.modified).toBe(false);
            expect(result.content).toBe(md);
        });
    });

    describe("代码块处理", () => {
        it("不应该修改代码块内的内容", () => {
            const md = `## 1. Section

\`\`\`bash
# This is a comment
\`\`\``;

            const result = removeSectionNumbers(md);
            expect(result.content).toContain("## Section");
            expect(result.content).toContain("# This is a comment");
        });
    });

    describe("配置选项", () => {
        it("应该支持 minLevel 选项", () => {
            const md = `# 1. Title
## 2.1. Section
### 3.1.1. Subsection`;

            const result = removeSectionNumbers(md, { minLevel: 2 });
            expect(result.content).toContain("# 1. Title"); // H1 保持原样
            expect(result.content).toContain("## Section");
            expect(result.content).toContain("### Subsection");
        });

        it("应该支持 maxLevel 选项", () => {
            const md = `## 1.1. Section
### 1.1.1. Subsection
#### 1.1.1.1. Deep`;

            const result = removeSectionNumbers(md, { maxLevel: 3 });
            expect(result.content).toContain("## Section");
            expect(result.content).toContain("### Subsection");
            expect(result.content).toContain("#### 1.1.1.1. Deep"); // H4 保持原样
        });
    });

    describe("边界情况", () => {
        it("空文档应该返回未修改", () => {
            const md = "";
            const result = removeSectionNumbers(md);
            expect(result.modified).toBe(false);
            expect(result.content).toBe("");
        });

        it("只有代码块的文档应该返回未修改", () => {
            const md = `\`\`\`bash
# Comment
\`\`\``;

            const result = removeSectionNumbers(md);
            expect(result.modified).toBe(false);
            expect(result.content).toBe(md);
        });
    });
});

// ==================== 集成测试 ====================

describe("章节编号集成", () => {
    it("应该能够添加然后移除编号", () => {
        const original = `# Title
## Section 1
### Subsection
## Section 2`;

        // 添加编号
        const withNumbers = addSectionNumbers(original);
        expect(withNumbers.content).toContain("# 1. Title");
        expect(withNumbers.content).toContain("## 1.1. Section 1");

        // 移除编号
        const removed = removeSectionNumbers(withNumbers.content);
        expect(removed.content).toBe(original);
    });

    it("应该能够更新已有编号的文档", () => {
        const md = `# 1. Title
## 1.1. Old Section
### 1.1.1. Subsection

## 1.2. Another Section`;

        // 添加新编号（应该替换旧编号）
        const result = addSectionNumbers(md);
        expect(result.content).toContain("# 1. Title");
        expect(result.content).toContain("## 1.1. Old Section");
        expect(result.content).toContain("### 1.1.1. Subsection");
        expect(result.content).toContain("## 1.2. Another Section");
    });
});
