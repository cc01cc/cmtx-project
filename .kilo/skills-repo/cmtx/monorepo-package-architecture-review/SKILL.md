---
name: monorepo-package-architecture-review
description: 评审 monorepo package 边界、职责拆分、依赖方向。用于拆包、抽 shared 层、循环依赖检查。
license: MIT
metadata:
    category: architecture
    references:
        - https://kilo.ai/docs/customize/skills
        - https://agentskills.io/specification
---

评审 monorepo 中一个或多个 package 的职责、边界和迁移路径，并产出可执行的架构结论。

## When to Use This Skill

在以下场景使用本 skill：

- 用户想把一个 package 拆成两个或多个 package
- 用户想把共享逻辑抽到新的 shared/core/common package
- 用户质疑某个 package 职责过重或边界不清
- 用户要求评估 CLI、MCP、VS Code Extension、SDK 之间的复用层次
- 用户担心循环依赖、跨层依赖、导出面污染或 breaking change

不要把本 skill 用于纯代码实现细节、单函数重构或普通 bug 修复。

## Required Inputs

开始前尽量补齐这些输入：

1. 当前涉及的 package 或目录。
2. 想解决的核心问题，例如职责过重、复用困难、依赖混乱、发布边界不清。
3. 是否允许 breaking changes。
4. 哪些入口或下游调用方不能被破坏。
5. 是否需要输出正式迁移计划。

如果输入不全，优先基于代码结构和 import 关系补充事实，再提炼风险。

## Review Workflow

### 1. 明确当前职责与边界

先识别每个候选 package 当前承担的职责：

- 是否同时包含 domain logic、infrastructure、UI、adapter、config、logging 等多类职责
- 是否既定义抽象又持有具体实现
- 是否把仅一个入口需要的逻辑暴露给了多个入口

输出时优先使用职责矩阵：

| Package | 当前职责 | 不应继续承载的职责 | 建议归属 |
| ------- | -------- | ------------------ | -------- |

### 2. 检查依赖方向

检查依赖是否符合层次化方向：

- 应用层 -> 业务层 -> 基础设施层
- 上层可以依赖下层
- 下层不应反向依赖上层
- shared 包不应依赖具体入口包

重点标记以下风险：

- 可能形成循环依赖
- "公共包" 依赖了业务实现
- 一个 package 既被当成 SDK 又被当成应用实现容器
- 为了复用少量工具函数而引入整包依赖

### 3. 判断是否值得拆分

满足以下任意两条，通常就值得拆分：

- 一个 package 同时承担两种以上稳定变化原因
- 多个入口都需要其中某一部分能力，但不需要整包能力
- 测试、构建、发布或 peer dependency 已明显受到结构影响
- 文档、命名和导出面已经无法自然解释当前结构
- 新功能持续在“临时共享目录”上堆积

若拆分收益不明显，明确写出“不拆分”的理由，不要为了抽象而抽象。

### 4. 设计目标结构

设计目标结构时，优先回答：

- 新 package 的单一职责是什么
- 新旧包之间的依赖方向是什么
- 哪些类型、接口、适配器、工具函数需要迁移
- 哪些导出应保留，哪些应收缩

推荐输出格式：

```text
应用层
├── package-a
└── package-b

业务层
├── package-c
└── package-d

基础层
├── package-e
└── package-f
```

### 5. 评估 breaking changes

按下面的顺序判断兼容性：

1. 导出路径是否变化。
2. 类型名、函数签名、默认行为是否变化。
3. peer dependency 或安装方式是否变化。
4. 下游是否必须同步修改 import。

如果要保守迁移，优先考虑：

- 先复制导出，再逐步迁移调用方
- 在旧包保留兼容 re-export
- 先抽内部实现，后迁移 public API

如果允许 breaking changes，直接说明收益和代价，不要伪装成非 breaking。

### 6. 产出 phased migration plan

默认拆成 3 个阶段：

1. 结构准备：创建新包、迁移类型、建立最小编译链路。
2. 逻辑迁移：按模块迁移实现、调整依赖、补测试。
3. 收口清理：删除旧实现、收缩导出、更新文档与示例。

每个阶段都要包含：

- 修改范围
- 风险点
- 验证方式

## Templates and Checklists

输出模板、表格骨架和执行清单已拆分到：

- [references/TEMPLATES.md](./references/TEMPLATES.md)

## Review Heuristics

优先遵守这些原则：

- 单一职责优先于“看起来整齐”的目录重排。
- 依赖方向清晰优先于短期少改几行 import。
- 先解决重复变化原因，再考虑命名好不好看。
- 不要把 logging、config、monitoring 这种横切关注点随意塞进业务包。
- 公共包必须服务多个入口，而不是为了抽而抽。

常见失败模式与规避建议也在同一参考文档中统一维护，避免主文档膨胀。

## Example Prompts

- 评审一下 `packages/asset` 和 `packages/storage` 是否应该继续拆分。
- 帮我设计一个不引入循环依赖的 shared package 迁移方案。
- 我想把 VS Code Extension 里可复用逻辑抽到 monorepo 公共层，帮我做架构评审。
