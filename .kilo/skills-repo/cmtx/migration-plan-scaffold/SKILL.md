---
name: migration-plan-scaffold
description: 生成重构、迁移、分阶段计划。用于迁移方案、roadmap、风险评估、回滚策略等。
license: MIT
metadata:
    category: planning
    references:
        - https://kilo.ai/docs/customize/skills
        - https://agentskills.io/specification
---

生成可执行、可验证、可回滚的迁移计划，而不是泛泛的思路清单。

## When to Use This Skill

在以下场景使用本 skill：

- 用户要求“先出方案”或“先写计划”
- 需要把大任务拆成多个阶段落地
- 需要写正式的实施文档、roadmap 或 checklist
- 需要明确兼容性、风险、验证与回滚

如果用户只是让 agent 直接改代码，不必强行产出完整迁移文档。

## Required Inputs

尽量先明确：

1. 目标是什么。
2. 当前状态有什么痛点。
3. 是否允许 breaking changes。
4. 是否要求保守迁移或一次性切换。
5. 哪些内容必须验证，例如 build、test、docs、runtime behavior。

## Plan Writing Rules

输出的计划必须满足：

- 章节完整，但不过度空泛。
- 每个阶段都有明确目标和完成标准。
- 风险必须具体到行为、接口、依赖或数据，不要只写“有风险”。
- 验证步骤必须可执行。
- 如果存在替代方案，要写清取舍原因。

## Standard Structure

默认按以下章节组织：

### 1. 背景

- 当前现状
- 触发这次迁移的直接原因

### 2. 目标

- 迁移完成后的期望状态
- 不在本次范围内的内容

### 3. 方案概述

- 推荐方案
- 不采用的备选方案及原因

### 4. 分阶段实施

- Phase 1: 准备阶段
- Phase 2: 核心迁移
- Phase 3: 清理与收口

### 5. 风险与兼容性

- breaking changes
- 回滚难点
- 依赖方影响

### 6. 验证与验收

- 编译
- 测试
- 文档
- 用户可见行为

## Phase Design Guide

### Phase 1: 准备

适合放这些任务：

- 建立骨架目录
- 引入新类型或适配层
- 补必要测试或保护性封装
- 加兼容出口

### Phase 2: 迁移

适合放这些任务：

- 核心实现迁移
- 调整调用方
- 切换入口逻辑
- 验证主要行为

### Phase 3: 收口

适合放这些任务：

- 删除旧实现
- 删除兼容层
- 更新文档、示例、配置说明
- 清理技术债与命名残留

## Templates and Checklists

迁移计划的输出模板、风险模板、验证模板与任务清单已拆分到：

- [references/TEMPLATES.md](./references/TEMPLATES.md)

## Writing Heuristics

- 优先写“为什么这样分阶段”，再写“分几阶段”。
- 一个阶段不要同时引入结构变更、行为变更、接口变更和文档大改，除非强相关。
- 如果回滚困难，必须提前显式指出，不要埋在细节里。
- 如果用户只要简版计划，保留背景、方案、阶段、风险、验证五个最小章节。

## Example Prompts

- 给我一个把 upload 拆成 storage + upload 的 phased migration plan。
- 帮我写一份不破坏现有 API 的迁移计划。
- 先出实施方案，要求包含风险、回滚和验证清单。
