# Markdown 格式规范

## 标题规范

- 使用 `##` 表示 H2（章节），`###` 表示 H3（小节）。
- 避免超过 3 层嵌套；如果超过，考虑拆分文档。
- 对于 Kilo 框架文档，某些文件可能由系统管理 H1，请遵循项目运行时的约定。

### 1.1. 正确示例

```markdown
## 项目简介

这是 H2 标题。

### 1.1. 核心功能

这是 H3 标题。

### 1.2. 技术栈

另一个 H3 标题。
```

### 1.2. 错误示例

```markdown
# 项目简介

FORBIDDEN: 不应使用 H1 标题。

#### 过深的标题

FORBIDDEN: 避免使用 H4 标题。
```

---

## 2. 列表规范

**MUST** 无序列表使用 `-` 符号。

**MUST** 有序列表使用 `1.` `2.` `3.` 格式。

**MUST** 嵌套列表缩进 2 个空格。

### 2.1. 无序列表示例

```markdown
- 第一项
- 第二项
- 第三项
  - 子项 1
  - 子项 2
    - 孙项 1
```

### 2.2. 有序列表示例

```markdown
1. 第一步
2. 第二步
3. 第三步
   1. 子步骤 1
   2. 子步骤 2
```

### 2.3. 错误示例

```markdown
* 使用星号的无序列表

FORBIDDEN: 应使用 `-` 而非 `*`。

+ 使用加号的无序列表

FORBIDDEN: 应使用 `-` 而非 `+`。
```

---

## 3. 代码块规范

**MUST** 使用三反引号（```）创建代码块。

**MUST** 指定语言以启用语法高亮。

### 3.1. 正确示例

```markdown
```javascript
function hello() {
  console.log('Hello, World!');
}
```

```python
def greet(name):
    print(f'Hello, {name}!')
```

```json
{
  "name": "project",
  "version": "1.0.0"
}
```

### 3.2. 错误示例

```
```

没有指定语言的代码块

FORBIDDEN: 必须指定语言以启用语法高亮。

---

## 4. 链接规范

**MUST** 优先使用自动链接格式显示 URL。

**MUST** URL 超过 80 字符时使用标准链接语法。

### 4.1. 自动链接格式（推荐）

```markdown
查看文档 <https://example.com/docs>
```

### 4.2. 标准链接格式（长 URL）

```markdown
[查看文档](https://example.com/docs/very/long/path/that/exceeds/eighty/characters/in/length)
```

### 4.3. 错误示例

```markdown
https://example.com/docs

WARN: 直接显示 URL 不利于阅读，应使用链接格式。
```

---

## 5. 图片规范

**MUST** 使用 `![alt text](image URL)` 格式。

**MUST** Alt 文本应包含图片描述。

### 5.1. 正确示例

```markdown
![系统架构图 - 展示 Main Agent 与 Sub-agents 的协作关系](./images/architecture-diagram.png)
```

### 5.2. 错误示例

```markdown
![](./images/architecture-diagram.png)

FORBIDDEN: Alt 文本为空，应提供图片描述。

![图片](./images/architecture-diagram.png)

WARN: Alt 文本过于简单，应提供更详细的描述。
```

---

## 6. 表格规范

**MUST** 使用 `|` 创建表格。

**MUST** 列之间使用空格分隔。

**MUST** 内容前后保留空行。

### 6.1. 正确示例

```markdown
| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `name` | string | 名称 |
| `value` | number | 值 |
```

### 6.2. 错误示例

```markdown
|字段 | 类型|说明 |
|----|----|----|
|`name`|string|名称 |

WARN: 列之间缺少空格分隔。
```

---

## 7. 行长度限制

**RECOMMEND** 在 80 字符处换行。

**MUST** 最大不超过 160 字符。

### 7.1. 正确示例

```markdown
这是一个段落示例，展示了如何在适当的位置进行换行。
当一行接近 80 字符时，应该在单词边界处换行，以保持代码的可读性。
```

### 7.2. 错误示例

```markdown
这是一行非常长的文本，超过了推荐的 80 字符限制，应该被分成多行以提高可读性和维护性。

WARN: 行长度超过 80 字符，建议在适当位置换行。
```

---

## 8. YAML Front Matter 要求

**MUST** 在文档开头包含 YAML Front Matter。

### 8.1. 必需字段

```yaml
---
post_title: 文档标题
author1: 主要作者
post_slug: URL 标识符
microsoft_alias: 作者别名
featured_image: 封面图片 URL
categories:
  - 分类 1
  - 分类 2
tags:
  - 标签 1
  - 标签 2
ai_note: AI 使用声明
summary: 文档摘要
post_date: 2024-01-01
---
```

### 8.2. 字段说明

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `post_title` | string | 文档标题 |
| `author1` | string | 主要作者 |
| `post_slug` | string | URL 标识符，用于生成文档链接 |
| `microsoft_alias` | string | 作者别名 |
| `featured_image` | string | 封面图片 URL |
| `categories` | array | 分类列表，必须来自预定义分类 |
| `tags` | array | 标签列表 |
| `ai_note` | string | AI 使用声明 |
| `summary` | string | 文档摘要 |
| `post_date` | date | 发布日期 |

---

## 9. 空白和格式

**MUST** 使用适当空白分隔章节。

**FORBIDDEN** 使用过度空白。

### 9.1. 9.1 章节分隔

```markdown
## 第一章

这是第一章的内容。

---

## 第二章

这是第二章的内容。
```

### 9.2. 段落间距

```markdown
这是第一段。

这是第二段，与第一段之间保留一个空行。
```

### 9.3. 错误示例

```markdown
这是第一段。




这是第二段，之间有过多空行。

FORBIDDEN: 段落之间只应保留一个空行。
```

---

## 10. 编号规范

**MUST** 二级标题（`##`）开始使用数字编号，格式为 `## 1. 标题`、`## 2. 标题`。

**MUST** 三级标题（`###`）编号采用 `父编号。子序号` 格式，如 `### 1.1.`、`### 1.2.`、`### 2.1.`。

**MUST** 编号中的每个数字后必须跟随点号（`.`），如 `1.`、`1.1.`、`1.2.`。

**MUST** 编号应连续递增，不得跳跃或重复。

### 10.1. 10.1 正确示例

```markdown
## 1. 项目简介

这是第一章内容。

### 1.1. 核心功能

这是 1.1 节内容。

### 1.2. 技术栈

这是 1.2 节内容。

## 2. 快速开始

这是第二章内容。

### 2.1. 安装步骤

这是 2.1 节内容。

### 2.2. 配置说明

这是 2.2 节内容。
```

### 10.2. 错误示例

```markdown
## 项目简介

FORBIDDEN: 二级标题缺少数字编号。

## 1 项目简介

FORBIDDEN: 数字后缺少点号。

### 1.1. 核心功能

### 1.2 技术栈

FORBIDDEN: 数字后缺少点号。

## 4. 快速开始

FORBIDDEN: 编号跳跃（从 1 直接到 4）。
```

---

## 11. 总结

**一句话：当有疑问时，记住以下核心规则：**

1. 标题：用 `##` 和 `###`，不用 `#`
2. 列表：用 `-` 和 `1.`，嵌套缩进 2 空格
3. 代码块：用三反引号，必须指定语言
4. 链接：用 `<URL>` 格式，长 URL 用标准语法
5. 图片：必须有 alt 描述文本
6. 行长度：建议 80 字符，最大 160 字符
7. Front Matter：必须包含所有必需字段
8. 空白：适当分隔，避免过度
9. 编号：二级标题从 1. 开始，三级标题用 1.1. 1.2. 格式，每个数字后加点号
