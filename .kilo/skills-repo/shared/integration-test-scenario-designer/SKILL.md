---
name: integration-test-scenario-designer
description: 设计集成测试、端到端场景和验收清单。用于 test design、manual plan、feature validation、acceptance checklist 等。
license: MIT
metadata:
    category: testing
    references:
        - https://kilo.ai/docs/customize/skills
        - https://agentskills.io/specification
---

把复杂功能测试拆成可执行的场景、数据、步骤和预期结果，避免只写“测一下功能是否正常”。

## When to Use This Skill

在以下场景使用本 skill：

- 用户需要集成测试方案或手动验收计划
- 某个功能涉及多步骤、多配置或多角色交互
- 需要为 VS Code Extension、CLI workflow、发布流程、上传下载流程设计验证场景
- 需要把功能测试拆成前置条件、步骤和预期结果

不要把本 skill 用于单个纯函数的单元测试设计。

## Required Inputs

尽量先明确：

1. 被测功能或工作流。
2. 测试目标是自动化、手动还是混合。
3. 涉及哪些环境、平台、凭证或外部服务。
4. 哪些边界条件或历史问题需要重点覆盖。
5. 产出是测试计划、测试表格还是验收 checklist。

## Scenario Design Workflow

### 1. 先按用户场景分组

优先按真实使用路径分组，而不是按函数名分组：

- 首次使用
- 常规成功路径
- 错误路径
- 冲突处理
- 配置切换
- 回滚或恢复

### 2. 为每个场景定义四件事

每个场景都应至少包含：

1. 前置条件
2. 操作步骤
3. 预期结果
4. 验证点

如果缺任一项，场景通常不可执行。

### 3. 单独列边界与异常路径

不要把异常路径藏在 happy path 之后。应单独列出：

- 空输入
- 缺失配置
- 无权限
- 网络失败
- 资源冲突
- 格式兼容问题

### 4. 区分自动化与手动

优先自动化这些内容：

- 稳定、可重复的行为验证
- 数据驱动组合
- 边界条件和错误分支

优先手动验证这些内容：

- 交互体验
- 多步骤 UI 流程
- 状态提示、文案、焦点、通知
- 演示价值高的场景

### 5. 输出最小可执行测试集

如果场景很多，先给出最小必测集：

- 1 个首次使用场景
- 2 到 3 个核心成功场景
- 2 到 3 个高风险异常场景
- 1 个回归校验场景

## Templates and Checklists

测试计划模板、场景总表、异常场景表和验收清单已拆分到：

- [references/TEMPLATES.md](./references/TEMPLATES.md)

## Design Heuristics

- 场景优先于技术实现细节。
- 测试计划要覆盖用户真正关心的成功路径和失败路径。
- 能表格化的内容尽量表格化，便于执行和维护。
- 不要把所有组合都列出来，优先选最能暴露问题的场景。

常见失败模式与规避建议在参考文档中统一维护。

## Example Prompts

- 帮我给这个 VS Code 功能写一份手动测试计划和自动化建议。
- 设计一套上传和下载工作流的集成测试场景。
- 我需要一个 feature validation checklist，覆盖正常路径和错误路径。
