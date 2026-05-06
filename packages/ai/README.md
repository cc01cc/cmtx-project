# @cmtx/ai

[![npm version](https://img.shields.io/npm/v/@cmtx/ai.svg)](https://www.npmjs.com/package/@cmtx/ai)
[![License](https://img.shields.io/npm/l/@cmtx/ai.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

CMTX AI 能力包 — Slug 生成、内容校验、Agent 编排（基于 Vercel AI SDK）。

> 完整 API 文档：`pnpm run docs`（生成于 `docs/api/`）

## 安装

```bash
pnpm add @cmtx/ai
```

AI Provider 为可选依赖，按需安装：

```bash
# DeepSeek
pnpm add @ai-sdk/deepseek

# Alibaba Qwen
pnpm add @ai-sdk/alibaba

# OpenAI 兼容接口（DeepSeek/Qwen/本地模型等）
pnpm add @ai-sdk/openai-compatible
```

## Slug 生成

```typescript
import { generateSlug } from "@cmtx/ai";

const slug = await generateSlug(
    {
        provider: "deepseek",
        model: "deepseek-v4-flash",
        apiKey: process.env.CMTX_DEEPSEEK_API_KEY,
    },
    "深入理解 TypeScript 类型系统",
);
// => "shen-ru-li-jie-typescript-lei-xing-xi-tong"
```

## 依赖层级

```
foundation (@cmtx/core)
    ↓
@cmtx/ai (AI 能力)
    ↓
@cmtx/rule-engine (规则引擎，集成 AI 规则)
    ↓
应用层 (cli, vscode)
```
