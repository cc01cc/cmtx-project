# CMTX 架构决策总结

## 📋 概述

本文档总结了 CMTX 项目的核心架构决策，这些决策形成了项目的整体设计框架。

---

## 🏗️ 核心决策链

### 决策 1️⃣：包结构 → 三层分离架构（ADR-001）

**问题**：如何组织代码结构，既保持简洁，又支持未来的功能扩展？

**解决方案**：

```
第一层（@cmtx/core）- 极简基础
  ↓ 依赖
第二层（@cmtx/naming, @cmtx/storage, @cmtx/metadata）- 功能专家
  ↓ 依赖
第三层（@cmtx/cli, @cmtx/mcp-server, @cmtx/ai-naming）- 应用集成
```

**关键特点**：

- ✅ 单向依赖（无循环）
- ✅ 职责清晰（每层一个角色）
- ✅ 易于扩展（新功能知道该放哪里）

---

### 决策 2️⃣：模板系统 → Builder 模式（ADR-002）

**问题**：如何设计一个灵活的模板系统，让下游包能独立地扩展变量？

**核心选项对比**：
| 方案 | 全局注册 | 上下文对象 | Builder 模式 ✅ | 插件系统 |
|------|---------|---------|-------------|--------|
| 复杂度 | 高 | 低 | 低 | 高 |
| 全局状态 | 有 | 无 | 无 | 有 |
| 易用性 | 中 | 高 | ⭐⭐⭐⭐⭐ | 中 |
| 可扩展性 | 高 | 高 | 高 | 最高 |

**解决方案**：

```typescript
// @cmtx/naming
export class TemplateBuilder {
  withDate(): this { ... }
  add(key, value): this { ... }
  render(template): string { ... }
}

// @cmtx/ai-naming（下游包）
export class AINameBuilder extends TemplateBuilder {
  withAIResult(result): this { ... }
}

// 使用
new AINameBuilder()
  .withDate()
  .withAIResult(aiResult)
  .render('{date}_{ai_category}');
```

**关键特点**：

- ✅ 链式 API（易读易用）
- ✅ 无全局状态（易于测试）
- ✅ 完全解耦（下游包独立开发）

---

### 决策 3️⃣：元数据处理 → 分层设计（ADR-003）

**问题**：元数据操作放在哪一层最合适？

**解决方案**：

```
@cmtx/core（第一层）
├─ extractMetadata()
├─ convertHeadingToFrontmatter()
├─ parseFrontmatter()
└─ generateDocumentId()（支持模板）
      ↓ 使用 @cmtx/naming 的模板引擎

@cmtx/metadata（第二层）[未来]
├─ listDocuments()
├─ findDocumentById()
├─ queryDocuments()
└─ getBacklinks()
```

**关键特点**：

- ✅ core 保持简洁（基础操作）
- ✅ metadata 提供查询（高级功能）
- ✅ 与 naming 无缝集成（ID 生成支持模板）

---

## 🔄 数据流向示例

### 场景：用户创建一篇新文章，想自动生成 ID 和文件名

```
用户的 Markdown 文件
  ↓
1️⃣ @cmtx/core: extractMetadata()
   提取标题、日期等基础元数据
  ↓
2️⃣ @cmtx/naming: AINameBuilder
   通过继承 TemplateBuilder
   添加自己的变量（ai_score, ai_category）
  ↓
3️⃣ @cmtx/naming: generateDocumentId()
   使用模板生成 ID
   {date}_{ai_category}_{ai_keywords}
  ↓
4️⃣ @cmtx/core: convertHeadingToFrontmatter()
   将元数据（包括 ID）写入 frontmatter
  ↓
结果：更新后的 Markdown 文件（带有 frontmatter 和自动生成的 ID）
```

---

## 📦 包的角色定义

### 第一层：@cmtx/core

```
职责：提供原子操作
特点：
  - 极简（无业务逻辑）
  - 可靠（充分测试）
  - 高性能（纯正则表达式）

导出：
  - filterImages*, replaceImages*, deleteImages*
  - extractMetadata, convertHeadingToFrontmatter
  - generateDocumentId, parseFrontmatter
```

### 第二层：@cmtx/naming

```
职责：提供命名和模板功能
特点：
  - 基于 Builder 模式的灵活 API
  - 支持链式调用
  - 可被下游包继承扩展

导出：
  - TemplateBuilder（基类）
  - renderTemplate（核心函数）
  - generateDocumentId（支持模板）
  - renameMarkdownFile（文件重命名）
```

### 第二层：@cmtx/storage（未来）

```
职责：提供存储和上传功能
特点：
  - 包装上传逻辑
  - 支持模板命名（依赖 @cmtx/naming）

依赖：
  - @cmtx/core（图片 + 元数据处理）
  - @cmtx/naming（模板）
```

### 第三层：应用包

```
@cmtx/cli
  - 命令行工具
  - 组合 core、naming、storage 功能

@cmtx/ai-naming
  - AI 驱动的命名
  - 继承 TemplateBuilder 添加 AI 变量

@cmtx/mcp-server
  - MCP 协议接口
  - 暴露功能给 AI 代理
```

---

## 🔑 设计原则总结

### 1. 单一职责原则（SRP）

每个包只做一类事：

- core 只做基础操作
- naming 只做命名相关
- storage 只做存储相关

### 2. 开闭原则（OCP）

对扩展开放，对修改关闭：

- 新下游包只需继承 TemplateBuilder
- 无需修改 naming 包的代码

### 3. 依赖倒置原则（DIP）

- 下层包不依赖上层包
- 上层包通过继承和组合依赖下层包
- 定义清晰的接口（TemplateBuilder）

### 4. DRY（不重复）

- 模板逻辑集中在 naming 包
- 下游包只需实现自己的 Builder 子类（~20 行代码）

### 5. KISS（保持简单）

- Builder 模式比插件系统简单
- 无需全局状态管理
- 代码量少，容易理解

---

## 📈 演进路线

### 当前状态（v0.2）

```
@cmtx/core（图片 + 基础元数据）✓
@cmtx/upload（上传）✓
@cmtx/cli（命令行）✓
@cmtx/mcp-server（MCP）✓
```

### 第一阶段（v1.0）- 模板和 ID 生成

```
+ @cmtx/naming（新）
  ├─ TemplateBuilder
  ├─ ID 生成（支持模板）
  └─ 文件重命名（支持模板）
```

### 第二阶段（v1.1）- 存储重构

```
重构 @cmtx/upload → @cmtx/storage
  └─ 集成 @cmtx/naming 的模板功能
```

### 第三阶段（v1.2）- AI 集成

```
+ @cmtx/ai-naming（新）
  └─ 继承 TemplateBuilder 添加 AI 变量
```

### 第四阶段（v2.0）- 查询功能

```
+ @cmtx/metadata（新）
  ├─ 文档查询
  ├─ 反向链接
  └─ 关系图生成
```

---

## ✅ 决策效果评估

### 问题解决

- ✅ **core 保持简洁** - 无模板、无 ID、无复杂逻辑
- ✅ **职责清晰** - 各包的角色一目了然
- ✅ **易于扩展** - 新下游包只需继承 TemplateBuilder
- ✅ **无循环依赖** - 单向依赖链清晰
- ✅ **易于维护** - 每个包代码量合理

### 已考虑的权衡

- ⚠️ **包数量增加** → 通过统一的 pnpm workspace 管理
- ⚠️ **代码有轻微重复** → Builder 子类简单，可接受
- ⚠️ **需要更多文档** → 通过 ADR 清晰说明

---

## 📚 文档导航

### 深入阅读

1. 先读 [ADR-001](./ADR-001-package-structure.md) - 了解整体架构
2. 再读 [ADR-002](./ADR-002-template-system.md) - 了解模板设计
3. 最后读 [ADR-003](./ADR-003-metadata-handling.md) - 了解元数据处理

### 实现参考

- [packages/core/README.md](../../packages/core/README.md) - 已实现的功能
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - 开发指南
- [.github/copilot-instructions.md](../copilot-instructions.md) - 项目背景

---

## 🤝 贡献指南

### 遵循已有的决策

- 新功能要找到合适的层（core / naming / storage 等）
- 优先使用 Builder 模式来扩展功能
- 避免创建循环依赖

### 当需要做出新的架构决策时

1. 创建新的 ADR 文件（ADR-004, ADR-005 等）
2. 按照现有 ADR 的格式记录
3. 在 PR 中解释决策的理由
4. 更新本文档和 README.md

---

## 🎓 学习资源

### 架构模式

- [三层架构](https://en.wikipedia.org/wiki/Multitier_architecture)
- [Builder 模式](https://refactoring.guru/design-patterns/builder)
- [SOLID 原则](https://en.wikipedia.org/wiki/SOLID)

### Node.js 最佳实践

- [npm 包设计](https://docs.npmjs.com/cli/v8/configuring-npm/package-json)
- [Monorepo 最佳实践](https://monorepo.tools/)
- [TypeScript 项目配置](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)

---

**最后更新**：2026-04-04  
**下一次更新**：当有新的 ADR 或重大决策时

---

## 快速索引

| 文档                                      | 用途         | 阅读时间 |
| ----------------------------------------- | ------------ | -------- |
| [README.md](./README.md)                  | ADR 目录导航 | 5 分钟   |
| [ADR-001](./ADR-001-package-structure.md) | 包结构设计   | 15 分钟  |
| [ADR-002](./ADR-002-template-system.md)   | 模板系统设计 | 20 分钟  |
| [ADR-003](./ADR-003-metadata-handling.md) | 元数据处理   | 15 分钟  |
| 本文档                                    | 决策总结     | 10 分钟  |
