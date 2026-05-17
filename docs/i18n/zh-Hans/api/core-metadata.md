---
title: "@cmtx/core - 元数据模块"
category: api
sidebar_order: 2
lang: zh-Hans
package: "@cmtx/core"
module: metadata
module_order: 2
status: stable
---

# @cmtx/core - 元数据模块

> Markdown 文档的元数据管理模块，提供 YAML frontmatter 的拆分、提取、修改和生成功能，以及章节标题提取和文档排序。


::: warning
CMTX 仍处于活跃开发阶段，API 可能随版本迭代发生变化。如有疑问或发现文档错误，欢迎通过 [GitHub Issues](https://github.com/cc01cc/cmtx-project/issues) 反馈。
:::

## 安装

```bash
pnpm add @cmtx/core
```

## 快速开始

```typescript
import {
  splitFrontmatter,
  extractFrontmatter,
  upsertFrontmatterFields,
  extractSectionHeadings,
  removeFrontmatter,
} from '@cmtx/core'

// 拆分 frontmatter 边界
const md = `---
title: "文档标题"
author: "Alice"
date: 2026-01-01
---

# Hello

正文内容...`
const result = splitFrontmatter(md)
console.log(result.data)   // 'title: "文档标题"\nauthor: "Alice"\ndate: 2026-01-01'
console.log(result.content) // '# Hello\n\n正文内容...'

// 提取 frontmatter 内容
const fm = extractFrontmatter(md)
console.log(fm?.title)  // "文档标题"

// 更新 frontmatter 字段
const updated = upsertFrontmatterFields(md, { tags: ['cmtx', 'docs'] })
console.log(updated.markdown)
```

## 元数据

### splitFrontmatter

拆分 Markdown 文本中的 YAML frontmatter 边界，返回原始 YAML 数据和正文。

```ts
function splitFrontmatter(input: string): { hasFrontmatter: boolean; data: string; content: string }
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `input` | `string` | 包含 frontmatter 的 Markdown 文本 |

返回值包含 `hasFrontmatter`（是否存在 frontmatter）、`data`（frontmatter 原始 YAML 内容）、`content`（移除 frontmatter 后的正文）。

### parseYamlFrontmatter

使用 js-yaml 解析 frontmatter 的 YAML 内容。

```ts
function parseYamlFrontmatter(content: string): Record<string, FrontmatterValue>
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `content` | `string` | YAML 内容字符串 |

```typescript
const { data } = splitFrontmatter(md)
const fields = parseYamlFrontmatter(data)
console.log(fields.title) // "文档标题"
```

`FrontmatterValue`：`string | number | boolean | null | FrontmatterValue[]`

### extractFrontmatter

提取 Markdown 文本中的 frontmatter 内容，返回解析后的完整 YAML 对象。

```ts
function extractFrontmatter(markdown: string): Record<string, FrontmatterValue> | undefined
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `markdown` | `string` | Markdown 文本 |

无 frontmatter 时返回 `undefined`，调用方可通过 `?.` 安全访问：

```typescript
const fm = extractFrontmatter(md)
fm?.title  // "文档标题"
fm?.author // "Alice"
```

### extractFrontmatterField

从 Markdown 文本中提取 frontmatter 的指定字段值。

```ts
function extractFrontmatterField(
  markdown: string,
  fieldName: string,
): string | undefined
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `markdown` | `string` | Markdown 文本 |
| `fieldName` | `string` | 要提取的字段名称 |

```typescript
const author = extractFrontmatterField(md, 'author')
// 返回 "Alice"
```

### upsertFrontmatterFields

插入或更新 frontmatter 字段，自动跟踪新增、更新和未变化的字段。

```ts
function upsertFrontmatterFields(
  markdown: string,
  fields: Record<string, FrontmatterValue>,
  options?: UpsertFrontmatterOptions,
): FrontmatterUpdateResult
```

| 参数 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `markdown` | `string` | — | Markdown 文本 |
| `fields` | `Record<string, FrontmatterValue>` | — | 要更新或新增的字段 |
| `options` | `UpsertFrontmatterOptions` | `{}` | 更新选项（format、createIfMissing） |

`FrontmatterUpdateResult`：

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `success` | `boolean` | 操作是否成功 |
| `markdown` | `string` | 处理后的 Markdown 文本 |
| `added` | `string[]` | 新增的字段名列表 |
| `updated` | `string[]` | 更新的字段名列表 |
| `unchanged` | `string[]` | 未变化的字段名列表 |

### deleteFrontmatterFields

从 frontmatter 中删除指定字段。删除所有字段后保留空的 `---\n---` 块。

```ts
function deleteFrontmatterFields(
  markdown: string,
  fieldKeys: string[],
): string
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `markdown` | `string` | Markdown 文本 |
| `fieldKeys` | `string[]` | 要删除的字段名数组 |

```typescript
const md = '---\nauthor: "Alice"\ndraft: true\n---\n\nContent'

// 部分删除：保留 frontmatter
const cleaned = deleteFrontmatterFields(md, ['draft'])

// 全部删除：保留空 frontmatter 块
const empty = deleteFrontmatterFields(md, ['author', 'draft'])
// => "---\n---\n\nContent"

// 如需移除整个 frontmatter 块，使用 removeFrontmatter
const noFm = removeFrontmatter(md)
// => "Content"
```

### extractSectionHeadings

提取 Markdown 文档的章节标题结构，自动排除代码块内的标题。

```ts
function extractSectionHeadings(
  markdown: string,
  options?: SectionHeadingExtractOptions,
): Array<SectionHeading & { lineIndex: number }>
```

| 参数 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `markdown` | `string` | — | Markdown 文本 |
| `options` | `SectionHeadingExtractOptions` | `{}` | 提取选项（minLevel 默认 2，maxLevel 默认 6） |

`SectionHeading`：

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `level` | `number` | 标题等级 (1-6) |
| `text` | `string` | 标题文本 |

### convertHeadingToFrontmatter

将指定等级的 Markdown 标题转换为 frontmatter 中的 `title` 字段。

```ts
function convertHeadingToFrontmatter(
  markdown: string,
  options?: HeadingConvertOptions,
): string
```

| 参数 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `markdown` | `string` | — | Markdown 文本 |
| `options` | `HeadingConvertOptions` | `{}` | 转换选项（headingLevel 默认 1） |

### removeFrontmatter

移除整个 frontmatter 块，仅保留正文内容。

```ts
function removeFrontmatter(markdown: string): string
```

## 参考

- 完整类型定义请查阅 [TypeDoc 生成的参考文档](/cmtx/typedoc/)
- 源码：[GitHub - packages/core/src/metadata.ts](https://github.com/cc01cc/cmtx-project/tree/main/packages/core/src/metadata.ts)
