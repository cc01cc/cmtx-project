---
title: API Reference
category: api
lang: zh-Hans
sidebar_order: 1
skip_doc_render: true
---

# API Reference

CMTX 各包的 API 文档。

> 本文档为手写维护，仅覆盖相对稳定的公共 API。类型签名以源码为准，本文档侧重用法说明和示例。

## 包文档

| 包 | 文档 | 说明 |
|:---|:------|:------|
| **Foundation** |
| `@cmtx/core` | [`core-image.md`](./core-image.md) · [`core-metadata.md`](./core-metadata.md) · [`core-utils.md`](./core-utils.md) | 图片处理 · 元数据 · 工具函数 |
| `@cmtx/template` | [`template.md`](./template.md) | 模板渲染引擎 |
| `@cmtx/storage` | [`storage.md`](./storage.md) · [`storage-adapters.md`](./storage-adapters.md) | 存储适配器接口 · 适配器实现 |
| `@cmtx/fpe-wasm` | [`fpe-wasm.md`](./fpe-wasm.md) | FPE 加密 WASM 包装器 |
| `@cmtx/autocorrect-wasm` | [`autocorrect-wasm.md`](./autocorrect-wasm.md) | 自动校正 WASM 包装器 |
| **Tooling** |
| `@cmtx/markdown-it-presigned-url` 系列 | [`markdown-it-plugins.md`](./markdown-it-plugins.md) | 预签名 URL markdown-it 插件 |
| **Orchestration** |
| `@cmtx/asset` | [`asset-services.md`](./asset-services.md) · [`asset-config.md`](./asset-config.md) | 服务层 · 配置 |
| **Processing** |
| `@cmtx/rule-engine` | [`rule-engine-core.md`](./rule-engine-core.md) · [`rule-engine-rules.md`](./rule-engine-rules.md) | 引擎核心 · 内置规则 |
| `@cmtx/ai` | [`ai.md`](./ai.md) | AI 辅助功能 |

## 使用须知

- 未在此文档中列出的导出可能为内部实现，不保证稳定性
- 多文件拆分配包（core/asset/storage/rule-engine）请在对应模块文件中查找
