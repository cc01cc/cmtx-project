---
title: "@cmtx/ai API"
category: api
sidebar_order: 50
lang: zh-Hans
package: "@cmtx/ai"
status: stable
---

# @cmtx/ai API

> AI 模型调用封装层，基于 Vercel AI SDK 提供统一的文本生成和 Slug 生成接口。支持 DeepSeek、阿里云通义千问和 OpenAI 兼容协议。


::: warning
CMTX 仍处于活跃开发阶段，API 可能随版本迭代发生变化。如有疑问或发现文档错误，欢迎通过 [GitHub Issues](https://github.com/cc01cc/cmtx-project/issues) 反馈。
:::

## 安装

```bash
pnpm add @cmtx/ai
```

## 快速开始

```typescript
import { generateWithModel, generateSlug } from '@cmtx/ai'
import type { AIModelConfig } from '@cmtx/ai'

const model: AIModelConfig = {
  provider: 'deepseek',
  model: 'deepseek-chat',
  apiKey: process.env.DEEPSEEK_API_KEY!,
}

// 文本生成
const response = await generateWithModel(model, '介绍 TypeScript')
console.log(response)

// Slug 生成
const slug = await generateSlug(model, 'TypeScript 入门教程')
// => 'typescript-ru-men-jiao-cheng'
```

## 类型定义

### AIConfig / AIProvider / AIModelConfig

AI 配置相关类型定义于 `@cmtx/asset` 并在此 re-export。完整文档请见 [asset-config.md](./asset-config.md)。

### GenerateOptions

文本生成选项。

```ts
interface GenerateOptions {
  system?: string
  temperature?: number
  maxTokens?: number
}
```

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `system` | `string` | 系统提示词（可选） |
| `temperature` | `number` | 生成温度，控制随机性（可选） |
| `maxTokens` | `number` | 最大输出 token 数（可选） |

## 文本生成

### generateWithModel

使用指定模型生成文本。

```ts
function generateWithModel(
  modelConfig: AIModelConfig,
  prompt: string,
  options?: GenerateOptions,
): Promise<string>
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `modelConfig` | `AIModelConfig` | 模型配置 |
| `prompt` | `string` | 提示文本 |
| `options` | `GenerateOptions` | 生成选项（可选） |

#### 返回值

`Promise<string>` — 生成的文本内容。

```typescript
const result = await generateWithModel(
  { provider: 'alibaba', model: 'qwen-plus', apiKey: process.env.DASHSCOPE_API_KEY! },
  '用一句话解释什么是 FPE',
  { temperature: 0.5, maxTokens: 200 },
)
```

::: tip
当 `provider` 为 `'deepseek'` 时，自动禁用思维链（chain-of-thought）输出，确保只返回最终文本。
:::


## Slug 生成

### SlugOptions

Slug 生成选项。

```ts
interface SlugOptions {
  temperature?: number
  maxTokens?: number
}
```

| 属性 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `temperature` | `number` | `0.3` | 生成温度（可选） |
| `maxTokens` | `number` | `300` | 最大输出 token 数（可选） |

### generateSlug

根据标题和可选内容生成 URL 友好的 Slug。

```ts
function generateSlug(
  modelConfig: AIModelConfig,
  title: string,
  content?: string,
  options?: SlugOptions,
): Promise<string>
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `modelConfig` | `AIModelConfig` | 模型配置 |
| `title` | `string` | 标题 |
| `content` | `string` | 正文内容（可选，用于上下文） |
| `options` | `SlugOptions` | 生成选项（可选） |

#### 返回值

`Promise<string>` — 生成的 Slug。仅包含小写字母、数字和连字符，不超过 30 字符。

```typescript
const slug = await generateSlug(
  { provider: 'deepseek', model: 'deepseek-chat', apiKey: process.env.DEEPSEEK_API_KEY! },
  'TypeScript 入门教程',
  '本文介绍 TypeScript 的基础概念和类型系统',
)
// => 'typescript-ru-men-jiao-cheng'
```

::: tip
Slug 使用专用的系统提示词，要求模型仅输出 Slug 本身，不输出推理过程或其他文本。
:::


## 参考

- 完整类型定义请查阅 [TypeDoc 生成的参考文档](/cmtx/typedoc/)
- 源码：[GitHub - packages/ai](https://github.com/cc01cc/cmtx-project/tree/main/packages/ai)
- Vercel AI SDK：[ai-sdk](https://github.com/vercel/ai)
