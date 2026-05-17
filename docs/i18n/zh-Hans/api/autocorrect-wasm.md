---
title: "@cmtx/autocorrect-wasm API"
category: api
sidebar_order: 8
lang: zh-Hans
package: "@cmtx/autocorrect-wasm"
status: stable
---

# @cmtx/autocorrect-wasm API

> AutoCorrect 文本自动纠正引擎的 WASM 封装。自动在中英文之间添加空格、纠正标点符号，支持按文件类型格式化、lint 检查和忽略规则。


::: warning
CMTX 仍处于活跃开发阶段，API 可能随版本迭代发生变化。如有疑问或发现文档错误，欢迎通过 [GitHub Issues](https://github.com/cc01cc/cmtx-project/issues) 反馈。
:::

## 安装

```bash
pnpm add @cmtx/autocorrect-wasm
```

## 快速开始

```typescript
import { loadWASM, format, lintFor } from '@cmtx/autocorrect-wasm'

await loadWASM()

// 自动格式化中英文间距
const result = format('学习如何用Rust构建Application')
// => '学习如何用 Rust 构建 Application'

// Lint 检查
const errors = lintFor('你好世界Hello', 'test.md')
// => lint 结果数组
```

## WASM 加载

### loadWASM

加载 AutoCorrect WASM 模块。必须在调用其他函数前先加载 WASM。

```ts
function loadWASM(options?: LoadWasmOptions): Promise<void>
```

| 参数 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `options` | `LoadWasmOptions` | — | 加载选项（可选） |

`LoadWasmOptions`：

| 属性 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `data` | `InitInput` | — | WASM 二进制数据，不提供时自动从 pkg 目录加载 |

```typescript
await loadWASM()

// 手动传入 WASM buffer
const wasmBuffer = readFileSync('./cmtx_autocorrect_wasm_bg.wasm')
await loadWASM({ data: wasmBuffer })
```

::: warning
`loadWASM` 必须在调用 `format`、`lintFor` 等函数之前完成。多次调用是安全的，WASM 只会被加载一次。
:::


### isWasmLoaded

检查 WASM 模块是否已加载完成。

```ts
function isWasmLoaded(): boolean
```

### InitInput

WASM 初始化输入的类型，支持多种数据来源。

```ts
type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module
```

### InitOutput

WASM 初始化后的输出实例类型（由 wasm-bindgen 生成）。

## 文本格式化

### format

自动格式化纯文本，在中英文之间添加空格、纠正标点。

```ts
function format(text: string): string
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `text` | `string` | 要格式化的纯文本 |

#### 返回值

`string` — 格式化后的文本。

```typescript
format('学习如何用Rust构建Application')
// => '学习如何用 Rust 构建 Application'

format('于3月10日开始')
// => '于 3 月 10 日开始'
```

### formatFor

按文件类型格式化文本内容。

```ts
function formatFor(raw: string, filename_or_ext: string): unknown
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `raw` | `string` | 原始文本内容 |
| `filename_or_ext` | `string` | 文件名或扩展名（如 `.md`、`index.ts`） |

#### 返回值

`unknown` — 格式化后的结果。格式取决于文件类型（纯文本、Markdown 等）。

```typescript
const result = formatFor('使用Rust开发', 'README.md')
```

### lintFor

对文本进行 lint 检查，返回不合规的位置和类型。

```ts
function lintFor(raw: string, filename_or_ext: string): unknown
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `raw` | `string` | 原始文本内容 |
| `filenameOrExt` | `string` | 文件名或扩展名（如 `.md`、`index.ts`） |

#### 返回值

`unknown` — 格式化后的结果。格式取决于文件类型（纯文本、Markdown 等）。

```typescript
const result = formatFor('使用Rust开发', 'README.md')
```

## 文本检查

### lintFor

对文本进行 lint 检查，返回不合规的位置和类型。

```ts
function lintFor(raw: string, filenameOrExt: string): unknown
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `raw` | `string` | 原始文本内容 |
| `filename_or_ext` | `string` | 文件名或扩展名 |

#### 返回值

`unknown` — lint 结果数组，每项包含位置、类型和描述信息。

```typescript
const results = lintFor('你好世界Hello', 'test.md')
```

### loadConfig

加载 AutoCorrect 配置。

```ts
function loadConfig(config_str: string): unknown
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `config_str` | `string` | 配置内容的 JSON 字符串 |

```typescript
loadConfig(JSON.stringify({
  rules: {
    'spacing': true,
    'punctuation': true,
  },
}))
```

### Ignorer

文件忽略器，根据工作目录中的 `.autocorrectignore` 规则判断文件是否应被忽略。

```ts
class Ignorer {
  constructor(workDir: string)
  isIgnored(path: string): boolean
  free(): void
  [Symbol.dispose](): void
}
```

| 方法 | 返回值 | 说明 |
|:------|:--------|:------|
| `constructor(workDir)` | `Ignorer` | 创建忽略器，从 workDir 加载忽略规则 |
| `isIgnored(path)` | `boolean` | 检查路径是否被忽略 |
| `free()` | `void` | 释放 WASM 资源 |
| `[Symbol.dispose]()` | `void` | 显式资源释放 |

```typescript
const ignorer = new Ignorer('/path/to/project')
if (ignorer.isIgnored('src/main.rs')) {
  // 此文件被忽略
}
```

## 参考

- 完整类型定义请查阅 [TypeDoc 生成的参考文档](/cmtx/typedoc/)
- 源码：[GitHub - packages/autocorrect-wasm](https://github.com/cc01cc/cmtx-project/tree/main/packages/autocorrect-wasm)
- AutoCorrect 项目：[huacnlee/autocorrect](https://github.com/huacnlee/autocorrect)
