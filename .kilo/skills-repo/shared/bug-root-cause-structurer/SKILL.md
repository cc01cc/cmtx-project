---
name: bug-root-cause-structurer
description: 提供结构化根因分析和修复方案。用于 bug analysis、issue triage、failure investigation、root cause mapping 等。
license: MIT
metadata:
    category: debugging
    references:
        - https://kilo.ai/docs/customize/skills
        - https://agentskills.io/specification
---

把问题分析从“描述现象”推进到“锁定根因、评估影响、设计验证”，输出能直接指导修复的结论。

## When to Use This Skill

在以下场景使用本 skill：

- 用户要分析 bug 根因
- 用户要写问题修复计划或问题修复记录
- 某个回归行为需要拆解症状、成因和影响面
- 需要把 issue 从现象升级为可执行修复方案

不要把本 skill 用于纯性能优化 brainstorming，除非已经出现明确异常症状。

## Required Inputs

尽量先明确：

1. 可观察到的症状。
2. 复现条件或最小触发路径。
3. 涉及的模块、命令或用户场景。
4. 是否已知最近改动。
5. 用户需要的是分析报告、修复计划还是直接修复。

## Investigation Workflow

### 1. 把症状写具体

不要接受模糊描述，如“有点不对”。优先明确：

- 谁触发
- 在什么输入或上下文下触发
- 实际结果是什么
- 预期结果是什么

### 2. 找触发链路

沿着“输入 -> 解析 -> 分支判断 -> 副作用 -> 输出”去找：

- 是输入错误、配置缺失还是状态不一致
- 是逻辑分支没命中，还是命中了错误分支
- 是初始化顺序问题、依赖问题还是异常吞掉了

### 3. 区分根因与表象

常见误判：

- 日志没输出，不等于日志系统本身是根因
- 某处报错，不等于报错行就是根因
- 测试失败，不等于测试就是问题源头

输出时要单独列出：

- 直接症状
- 近因
- 根因
- 促成因素

### 4. 评估影响面

至少回答：

- 哪些入口受影响
- 哪些用户场景受影响
- 是否会造成 silent failure、数据错误、错误提示缺失或安全问题
- 是否已有兼容层、缓存或默认值掩盖了问题

### 5. 设计修复方案与验证

修复方案不能只写“改一下逻辑”。至少说明：

- 改哪类代码
- 为什么能修根因而不是只压住现象
- 需要补什么测试
- 如何确认没有引入回归

## Templates and Checklists

根因报告模板、影响面表、修复方案对比和验证清单已拆分到：

- [references/TEMPLATES.md](./references/TEMPLATES.md)

## Analysis Heuristics

- 先缩小复现条件，再讨论修法。
- 先证明根因成立，再给方案。
- 如果现象能被多个原因解释，要明确区分证据强弱。
- 根因分析要指向代码结构、状态机、配置优先级或初始化顺序等可验证对象。

常见失败模式与规避建议在参考文档中统一维护。

## Example Prompts

- 帮我对这个问题做 root cause analysis，不要只给猜测。
- 这个 bug 为什么会发生，帮我写一份修复计划和验证清单。
- 我有一个回归问题，帮我把症状、根因、影响面和修复方案结构化输出。
