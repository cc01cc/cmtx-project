---
name: multi-package-coverage-audit
description: 分析 monorepo 测试覆盖率缺口。用于 coverage audit、test gap analysis、补测规划。
license: MIT
metadata:
    category: testing
    references:
        - https://kilo.ai/docs/customize/skills
        - https://agentskills.io/specification
---

对多个 package 的覆盖率做统一审计，并输出可以直接转成测试任务的结果。

## When to Use This Skill

在以下场景使用本 skill：

- 用户想提升 monorepo 中多个 package 的测试覆盖率
- 用户需要 coverage summary 或 gap analysis
- 用户想知道先补哪些文件、哪些分支最有价值
- CI 对 coverage 有阈值要求，需要制定补测顺序

不要把本 skill 用于单个失败用例的调试。

## Required Inputs

尽量明确：

1. 涉及哪些 package。
2. 是否已有 coverage 报告。
3. 目标阈值是什么。
4. 是否更关注 statement、branch 还是关键路径。
5. 是否只输出计划，还是要继续实现测试。

## Audit Workflow

### 1. 统一收集指标

先按 package 汇总这四类指标：

- statement coverage
- branch coverage
- function coverage
- line coverage

如果已有多个 coverage 文档，先识别哪个是主视图，避免重复汇总造成冲突。

### 2. 优先看 branch coverage

当 statement 很高但 branch 偏低时，通常说明：

- 错误路径没测
- 可选参数分支没测
- null/undefined/empty 输入没测
- fallback/default 行为没测

除非用户明确只追 statement，否则 branch gap 要优先写清。

### 3. 按文件找高价值缺口

优先关注：

- 核心业务文件
- 导出面文件
- 处理配置、错误、边界条件的文件
- 历史 bug 集中区域

不要平均分配精力。先补收益最高的文件。

### 4. 把缺口翻译成测试场景

不要只写“覆盖率低”，要写成具体场景：

- 传入空值时如何处理
- 配置缺失时返回什么错误
- 上传失败或下载失败的异常路径
- 命中默认分支时行为是什么
- 同名资源、重复输入、冲突处理是否覆盖

### 5. 统一输出结构

避免同时产出多个口径不同的 coverage 文档。默认输出：

1. 总览表
2. package 优先级排序
3. 文件级 gap 清单
4. 测试设计建议
5. 剩余风险

## Templates and Checklists

覆盖率总表、文件级 gap 表、补测优先级表和执行清单已拆分到：

- [references/TEMPLATES.md](./references/TEMPLATES.md)

## Coverage Heuristics

- 单看总百分比没有意义，必须结合文件风险。
- 低覆盖的自动生成代码、外部绑定、极薄导出层，可以说明原因后降权处理。
- 先补 deterministic unit tests，再考虑高成本 integration tests。
- 覆盖率文档要记录“为什么暂不补”，否则以后会重复分析同一问题。

常见错误模式和规避建议在参考文档中统一维护。

## Example Prompts

- 帮我审计一下这个 monorepo 哪些 package 最值得先补测试。
- 基于 coverage 报告，给我一个按优先级排序的补测计划。
- 为什么 branch coverage 一直上不去，帮我定位高价值缺口。
