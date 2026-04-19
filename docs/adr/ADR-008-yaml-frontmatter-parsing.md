# ADR-008: YAML Frontmatter 解析方案 - 分层架构

**状态**：Accepted

**版本**：1.0

**日期**：2026-02-07

---

## 背景

### 问题陈述

@cmtx/core 使用自定义正则表达式解析 YAML Frontmatter。考虑到 YAML 规范的复杂性，是否应该使用专门的 YAML 解析库？

### 现状分析

当前自定义解析器的特点：

**支持的结构：**
- 基础类型：string, number, boolean, null
- 数组：单行 `[a,b,c]` 和多行 `- item` 格式

**不支持的结构：**
- 复杂嵌套对象
- 多行字符串（`|`, `>`）
- 锚点和别名
- 日期时间类型
- 特殊字符处理

### 业界参考

**Hexo (Node.js)**：使用 js-yaml 完整解析
**Hugo (Go)**：使用 Go 标准库 yaml.v2/v3

两个成熟的静态博客框架都采用完整 YAML 解析库，而非自定义实现。

---

## 决策

采用**分层架构**策略，兼顾轻量级与完整性。

### 方案选择对比

| 方案 | 包大小增长 | 性能 | 维护成本 | YAML 覆盖 |
|------|-----------|------|---------|----------|
| 自定义正则 | 0 | 最快 | 低 | 60% |
| +js-yaml | +62KB | 快 | 低 | 100% |
| +yaml 库 | +50KB | 最快 | 低 | 100% |
| +front-matter | +8KB | 快 | 低 | 90% |

### 最终决策

**@cmtx/core（基础层）**：保持自定义正则解析
- 零依赖，轻量级定位
- 支持基础类型和数组
- 在文档中明确说明限制

**@cmtx/metadata（高级层）**：引入 js-yaml 完整支持
- 完整 YAML 1.2 规范
- 支持嵌套、多行、日期等复杂结构
- 用户按需选择使用

---

## 实施细节

### @cmtx/core 改进

1. 统一返回类型为 `FrontmatterValue = string | string[] | null`
2. 精确参数类型 `Record<string, string | string[]>`
3. 添加详细 JSDoc 说明支持范围
4. 重构降低认知复杂度（拆分辅助函数）

### @cmtx/metadata 扩展

新增 `full-yaml-parser.ts`，提供以下 API：

```typescript
parseFullFrontmatter(content, options?)  // 完整解析
stringifyFrontmatter(data, options?)      // 序列化
extractFullFrontmatter(markdown)          // Markdown 提取
injectFullFrontmatter(markdown, data)     // Markdown 注入
mergeFrontmatter(base, updates, deep?)    // 深度合并
isValidYaml(content)                      // 验证
```

### 依赖变更

```json
{
  "@cmtx/core": "无变化",
  "@cmtx/metadata": {
    "dependencies": {
      "js-yaml": "^4.1.0"
    }
  }
}
```

js-yaml 体积约 62KB，周下载量约 6M（Webpack、ESLint、Prettier 等都在使用）。

---

## 使用指南

### 简单场景：使用 @cmtx/core

```yaml
title: Article
tags: [tech, guide]
author: John
```

```typescript
import { extractMetadata, upsertFrontmatterFields } from '@cmtx/core';
const metadata = await extractMetadata('./docs/article.md');
```

### 复杂场景：使用 @cmtx/metadata

```yaml
author:
  name: John Doe
  contact:
    email: john@example.com
description: |
  Multiline
  content
```

```typescript
import { parseFullFrontmatter } from '@cmtx/metadata';
const data = parseFullFrontmatter(yamlContent);
```

---

## 后果

### 正面影响

1. **顾虑分离**：核心库轻量，高级功能独立
2. **向后兼容**：现有 @cmtx/core 用户无需改动
3. **灵活依赖**：不强制用户依赖 js-yaml
4. **最佳实践**：参考 Hexo/Hugo 分层策略

### 负面影响

1. 维护两套解析逻辑
2. 用户需理解何时使用哪个包
3. @cmtx/metadata 增加依赖体积

### 风险缓解

- 通过详细文档（快速参考卡片）帮助用户选择
- 在 @cmtx/core README 中明确说明限制并链接到高级方案
- 完整测试覆盖（39 个测试）确保质量

---

## 测试结果

```
@cmtx/core:      247 tests passed
@cmtx/metadata:  39 tests passed (15 现有 + 24 新增)
@cmtx/upload:    33 tests passed

总计：319 个测试全部通过 ✅
```

---

## 相关文件

### 新增
- `packages/metadata/src/full-yaml-parser.ts`
- `packages/metadata/tests/full-yaml-parser.test.ts`

### 修改
- `packages/core/src/metadata.ts` - 添加 JSDoc
- `packages/core/src/types.ts` - 新增 FrontmatterValue 类型
- `packages/core/README.md` - 添加 YAML 支持范围说明
- `packages/metadata/package.json` - 添加 js-yaml 依赖

---

## 参考

- [YAML 规范](https://yaml.org/spec/1.2/spec.html)
- [js-yaml](https://github.com/nodeca/js-yaml)
- [Hexo 源码](https://github.com/hexojs/hexo)
- [Hugo 文档](https://gohugo.io/content-management/front-matter/)