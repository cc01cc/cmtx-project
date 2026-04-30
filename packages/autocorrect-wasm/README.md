# @cmtx/autocorrect-wasm

[![npm version](https://img.shields.io/npm/v/@cmtx/autocorrect-wasm.svg)](https://www.npmjs.com/package/@cmtx/autocorrect-wasm)
[![License](https://img.shields.io/npm/l/@cmtx/autocorrect-wasm.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

AutoCorrect WASM bindings for CMTX - 文本自动纠正的 WebAssembly 实现，基于 Rust `autocorrect` crate。

> 完整 API 文档：`pnpm run docs`（生成于 `docs/api/`）

## 1. 安装

```bash
pnpm add @cmtx/autocorrect-wasm
```

## 2. 使用

```typescript
import { loadWASM, format } from "@cmtx/autocorrect-wasm";

await loadWASM();

const result = format("学习如何用Rust构建Application");
console.log(result); // "学习如何用 Rust 构建 Application"
```

## 3. API

| 函数 | 说明 |
|------|------|
| `loadWASM(options?)` | 加载 WASM 模块（异步，幂等） |
| `isWasmLoaded()` | 检查 WASM 是否已加载 |
| `format(text)` | 自动纠正文本格式 |
| `formatFor(text, filetype)` | 按指定文件类型格式化 |
| `lintFor(text, filetype)` | 按指定文件类型检查格式问题 |
| `loadConfig()` | 加载 autocorrect 配置 |
| `Ignorer` | `.gitignore` 风格路径匹配类 |

## 4. 文件类型格式化

```typescript
import { loadWASM, formatFor, lintFor } from "@cmtx/autocorrect-wasm";

await loadWASM();

// 按 Markdown 规则格式化
const md = formatFor("##标题", "markdown");

// 检查格式问题
const issues = lintFor("hello,world", "text");
```

## 5. 构建

```bash
pnpm build      # 构建 WASM 包
pnpm test       # 运行测试
pnpm run docs   # 生成 API 文档
```
