---
title: "@cmtx/core - 图片模块"
category: api
sidebar_order: 1
lang: zh-Hans
package: "@cmtx/core"
module: image
module_order: 1
status: stable
---

# @cmtx/core - 图片模块

> Markdown 图片处理核心库的图片模块，提供纯文本层的图片筛选、解析、替换、格式化和尺寸调整功能。

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
  filterImages,
  parseImages,
  updateImageRefs,
  formatMarkdownImage,
} from '@cmtx/core'

// 1. 从 Markdown 中筛选本地图片
const markdown = '![alt](./local.png) ![](https://example.com/img.png)'
const localImages = filterImages(markdown, {
  mode: 'sourceType',
  value: 'local',
})

// 2. 解析所有图片
const allImages = parseImages(markdown)

// 3. 替换图片路径和属性（多字段模式：通过 src 匹配，同时替换多个字段）
const result = updateImageRefs(markdown, [
  {
    field: 'src',
    pattern: './local.png',
    newSrc: './uploaded/local.png',
    newAlt: '上传后的图片',
    newTitle: '点击查看大图',
  },
])

// 4. 格式化图片
const mdImage = formatMarkdownImage({ src: './image.png', alt: '描述' })
```

## 图片筛选

### filterImages

从 Markdown 文本中筛选图片，支持多种过滤模式。

```ts
function filterImages(
  markdown: string,
  options?: ImageFilterOptions,
): ImageMatch[]
```

`ImageFilterOptions`：

| 属性 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `mode` | `ImageFilterMode` | — | 筛选模式 |
| `value` | `ImageFilterValue` | — | 筛选值，含义取决于 mode |
| `logger?` | `Logger` | — | 可选的日志记录器 |

`ImageFilterMode`：`'sourceType' | 'hostname' | 'absolutePath' | 'regex'`

`ImageFilterValue`：`string | RegExp`

- `sourceType` — 按图片来源筛选（`'web'` / `'local'`）
- `hostname` — 按 Web 图片的主机名筛选
- `absolutePath` — 按本地图片的路径筛选
- `regex` — 按正则表达式匹配 src 字段

#### 返回值

`ImageMatch[]` — 匹配到的图片数组，每个结果包含解析后的图片信息。

```typescript
interface ImageMatch {
  type: 'local' | 'web'
  alt: string
  src: string
  title?: string
  width?: string
  height?: string
  raw: string
  syntax: 'md' | 'html'
}
```

## 图片解析

### parseImages

解析 Markdown 文本中的所有图片引用（同时支持 Markdown 内联语法和 HTML img 标签）。

```ts
function parseImages(text: string): ParsedImage[]
```

`ParsedImage`：

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `src` | `string` | 图片 URL 或路径 |
| `alt?` | `string` | 替代文本 |
| `title?` | `string` | 标题文本 |
| `raw` | `string` | 原始匹配文本 |
| `syntax` | `'md' \| 'html'` | 图片语法类型 |
| `width?` | `string` | 宽度（仅 HTML 图片） |
| `height?` | `string` | 高度（仅 HTML 图片） |

## 图片替换

### updateImageRefs

使用正则表达式批量替换图片的 src、alt、title 属性。支持多字段模式：通过 src 或 raw 识别图片，同时替换多个字段。

```ts
function updateImageRefs(text: string, options: ReplaceOptions[]): ReplaceResult
```

`ReplaceOptions`：

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `field` | `'src' \| 'raw'` | 用于识别图片的字段（通过 src 或 raw 匹配） |
| `pattern` | `string \| RegExp` | 匹配模式（字符串或正则表达式） |
| `newSrc?` | `string` | 替换后的 src 值 |
| `newAlt?` | `string` | 替换后的 alt 值 |
| `newTitle?` | `string` | 替换后的 title 值 |

```typescript
// 通过 src 匹配，同时替换多个字段
const result = updateImageRefs(markdown, [
  {
    field: 'src',
    pattern: './old.png',
    newSrc: './new.png',
    newAlt: '新描述',
  },
])
```

### applyReplacementOps

按偏移量批量替换文档内容。纯函数，按 offset 降序排序后从后向前替换，避免偏移量错位。

```ts
function applyReplacementOps(documentText: string, options: ReplacementOp[]): string
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `documentText` | `string` | 原始文档文本 |
| `options` | `ReplacementOp[]` | 替换操作数组 |

`ReplacementOp`：

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `offset` | `number` | 替换在原文本中的起始位置 |
| `length` | `number` | 被替换文本的长度 |
| `newText` | `string` | 替换后的文本 |

```typescript
import { applyReplacementOps, type ReplacementOp } from '@cmtx/core'

const result = applyReplacementOps("Hello World!", [
  { offset: 6, length: 5, newText: "TypeScript" }
])
// => "Hello TypeScript!"
```

## 图片格式化

### formatMarkdownImage

生成 Markdown 图片语法。

```ts
function formatMarkdownImage(options: FormatMarkdownImageOptions): string
```

### formatHtmlImage

生成 HTML img 标签。

```ts
function formatHtmlImage(options: FormatHtmlImageOptions): string
```

## 图片尺寸调整

图片尺寸调整模块提供纯文本层的 HTML 属性设置和 Markdown 转 HTML 功能。

### setImageDimensions

设置 HTML img 标签的 width / height 属性，属性存在时替换，不存在时添加。

```ts
function setImageDimensions(html: string, attrs?: { width?: string; height?: string }): string
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `html` | `string` | 包含 img 标签的 HTML 字符串 |
| `attrs` | `{ width?: string; height?: string }` | 要设置的尺寸属性 |

```typescript
// 替换现有 width
setImageDimensions('<img src="test.png" width="300">', { width: '500' })
// => '<img src="test.png" width="500">'

// 添加 height
setImageDimensions('<img src="test.png" width="300">', { width: '500', height: '400' })
// => '<img src="test.png" width="500" height="400">'
```

### toHtmlImage

将 Markdown 图片语法转换为 HTML img 标签，支持自定义 HTML 属性。

```ts
function toHtmlImage(
  markdown: string,
  attributes?: Record<string, string>,
): string
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `markdown` | `string` | Markdown 图片语法 |
| `attributes` | `Record<string, string>` | 可选的自定义属性 |

```typescript
toHtmlImage('![alt text](image.png)')
// '<img src="image.png" alt="alt text">'

toHtmlImage('![alt](image.png "title")')
// '<img src="image.png" alt="alt" title="title">'

toHtmlImage('![alt](img.png)', { width: '800', loading: 'lazy' })
// '<img src="img.png" alt="alt" width="800" loading="lazy">'
```

## 参考

- 完整类型定义请查阅 [TypeDoc 生成的参考文档](/cmtx/typedoc/)
- 源码：[GitHub - packages/core](https://github.com/cc01cc/cmtx-project/tree/main/packages/core)
