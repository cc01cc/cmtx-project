---
title: DEV-012 - 已知问题
category: dev-guide
sidebar_order: 12
lang: zh-Hans
---

# DEV-012: 已知问题

## 1. CLI 问题

### 1.1. verbose 不显示 config 加载状态

`cmtx section-numbers add --verbose` 只输出文件路径，不输出 config 是否加载成功、加载了哪些值。排错时无法判断配置来源。

**影响范围**：`@cmtx/cli` 的 section-numbers 命令组

**建议修复**：`loadSectionNumbersConfig` 成功加载配置时输出 `formatInfo` 日志，失败时输出 `formatWarn`。
