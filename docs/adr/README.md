# Architecture Decision Records

本目录记录 CMTX 项目的重要架构决策。每个 ADR 文件记录了一个架构问题、考虑的选项、最终决策及其后果。

## 1. ADR 列表

### 1.1. 文档导航

| 文档                                                              | 内容                              | 状态                  | 优先级   |
| ----------------------------------------------------------------- | --------------------------------- | --------------------- | -------- |
| [**总结文档**](./ADR-006-decisions_summary.md)                    | 所有决策的快速概览（推荐先读）    | -                     | 入门必读 |
| [ADR-001: 包结构](./ADR-001-package-structure.md)                 | CMTX 四层架构设计                 | Accepted              | 必读     |
| [ADR-002: 模板系统](./ADR-002-template-system.md)                 | Builder 模式实现（历史版本）      | Superseded by ADR-004 | 参考     |
| [ADR-003: 元数据处理](./ADR-003-metadata-handling.md)             | Frontmatter 和 ID 管理            | Proposed              | 必读     |
| [ADR-004: 模板包重新设计](./ADR-004-template-package-redesign.md) | @cmtx/template 包设计（当前版本） | Proposed              | 必读     |
| [ADR-011: Service 层设计](./ADR-011-service-layer-design.md)      | 底层包 Service 接口设计           | Proposed              | 参考     |
| [ADR-012: Preset 与回调设计](./ADR-012-preset-callback-design.md) | Preset 机制和回调设计分析         | Proposed              | 当前     |
| [ADR-013: Rule 回调复杂度](./ADR-013-rule-callback-complexity.md) | Rule 级别回调的复杂度影响分析     | Proposed              | 当前     |
| [ADR-014: 移除 pnpm catalog](./ADR-014-remove-pnpm-catalogs.md)   | 用直接版本号替代 catalog 机制      | Accepted              | 当前     |

## 2. 如何使用本文档

### 2.1. 阅读 ADR

1. 从 [ADR-001](./ADR-001-package-structure.md) 开始理解整体架构
2. 查阅相关的具体决策文档
3. 理解每个决策的背景和权衡

### 2.2. 创建新的 ADR

当需要做出重要的架构决策时：

1. 创建新文件：`ADR-XXX-decision-title.md`
2. 按照标准格式填写（参考现有 ADR）
3. 提交 PR 供讨论
4. 更新此 README

### 2.3. ADR 格式

每个 ADR 包含以下部分：

- **标题**：清晰的决策主题
- **状态**：Proposed | Accepted | Deprecated | Superseded by ADR-xxx
- **背景**：问题的产生背景
- **问题陈述**：具体需要解决的问题
- **考虑的选项**：至少 2-3 个方案及其权衡
- **决策**：最终选择及理由
- **后果**：积极和消极的影响
- **相关链接**：相关的代码、文档或讨论

---

## 3. 关键决策概览

### 3.1. 架构风格

CMTX 项目采用**四层分离架构**：

```
第一层：基础层（无内部依赖）
  ├─ @cmtx/core - 文档处理核心（图片筛选/替换/删除 + 元数据）
  ├─ @cmtx/template - 模板渲染引擎
  └─ @cmtx/storage - 对象存储适配器

第二层：业务编排层
  └─ @cmtx/asset - 资产管理（上传、转移）

第三层：处理层（文档处理）
  ├─ @cmtx/normalize - Markdown 文档标准化处理
  └─ @cmtx/rule-engine - 文章发布与平台适配

第四层：应用层（面向用户）
  ├─ @cmtx/cli - 命令行工具
  └─ @cmtx/mcp-server - MCP 服务接口
```

#### 依赖关系表

| 层级 | 包                 | 内部依赖                                        |
| :--: | ------------------ | ----------------------------------------------- |
|  4   | `@cmtx/cli`        | `@cmtx/core`, `@cmtx/asset`, `@cmtx/rule-engine`    |
|  4   | `@cmtx/mcp-server` | `@cmtx/core`, `@cmtx/asset`                     |
|  3   | `@cmtx/normalize`  | `@cmtx/core`, `@cmtx/template`                  |
|  3   | `@cmtx/rule-engine`    | `@cmtx/core`, `@cmtx/asset`                     |
|  2   | `@cmtx/asset`      | `@cmtx/core`, `@cmtx/storage`, `@cmtx/template` |
|  1   | `@cmtx/core`       | -                                               |
|  1   | `@cmtx/template`   | -                                               |
|  1   | `@cmtx/storage`    | -                                               |

**循环依赖检查：无循环依赖。** 所有依赖均为单向。

### 3.2. 模板系统

CMTX 采用 **Builder 模式**用于模板渲染，具有以下特点：

- 无全局状态（每个实例独立）
- 链式 API（易读易用）
- 完全解耦（下游包独立继承）
- 易于测试（普通对象，无副作用）

---

## 4. 参考资源

- [CONTRIBUTING.md](../../CONTRIBUTING.md)：贡献指南
- [.github/instructions/](../../.github/instructions/)：开发指引
- [.github/copilot-instructions.md](../../.github/copilot-instructions.md)：项目背景和快速开始
