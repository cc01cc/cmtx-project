# OpenCode Agents 索引

本项目的 Agent 定义位于 `.opencode/agents/` 目录。详细架构设计参见 [ARCHITECTURE.md](../docs/ARCHITECTURE.md)。

## Agents 快速查询

### 主协调 Agent

**[tutor-main.md](agents/tutor-main.md)**

- **角色**: 主协调 Agent (primary)
- **职责**: 理解用户需求、路由任务、协调 Sub-agents、整合结果
- **调用**: Task(tutor-main, domain="math", intent="...", params={})

---

### Sub-Agents (并行/串行执行)

#### 学习数据分析类

**[progress-agent.md](agents/math-progress-agent.md)**

- **角色**: 进度分析 Agent
- **职责**: 分析学习进度、计算效率、识别薄弱领域
- **数据源**: `domains/{domain}/history/`, `progress/`, `mistakes/`
- **输出**: 进度报告、能力评估、效率指标

**[diagnosis-agent.md](agents/math-diagnosis-agent.md)**

- **角色**: 学习诊断 Agent
- **职责**: 分析学习行为数据、诊断学习能力、生成改进建议
- **数据源**: `domains/{domain}/history/`, `mistakes/`, `adaptive/`
- **输出**: 诊断报告、能力画像、个性化策略

#### 学习内容生成类

**[concept-agent.md](agents/math-concept-agent.md)**

- **角色**: 概念讲解 Agent
- **职责**: 解释知识点、回答疑问、澄清难点
- **数据源**: `domains/{domain}/glossary/`, `knowledge-graph/`
- **输出**: 讲解文档、双语术语、示例和类比

**[exercise-agent.md](agents/math-exercise-agent.md)**

- **角色**: 练习题生成 Agent
- **职责**: 筛选匹配题目、动态调整难度、评估答案
- **数据源**: `domains/{domain}/questions/`, `adaptive/`
- **输出**: 练习题集、题目元数据、批改反馈

#### 学习管理类

**[mistake-agent.md](agents/math-mistake-agent.md)**

- **角色**: 错题管理 Agent
- **职责**: 记录学习困难、分析错误模式、支持复习安排
- **数据源**: `domains/{domain}/mistakes/`
- **输出**: 错题记录、统计、复习提醒

**[planning-agent.md](agents/math-planning-agent.md)**

- **角色**: 学习规划 Agent
- **职责**: 推荐下一个学习概念、平衡学习节奏
- **数据源**: `domains/{domain}/knowledge-graph/`, `config/`, `progress/`
- **输出**: 学习计划、学习路径、预计时间

**[knowledge-agent.md](agents/math-knowledge-agent.md)**

- **角色**: 知识管理 Agent
- **职责**: 导入/更新资源、维护知识图谱、检索内容
- **数据源**: `domains/{domain}/knowledge-graph/`, `questions/`, `glossary/`
- **输出**: 索引更新、图谱修改确认、检索结果

---

## Agent 调用示例

### 单个 Agent 调用

```
Task(concept-agent, domain="math", topic="limits", format="bilingual")
  → 返回极限概念讲解

Task(exercise-agent, domain="math", topic="limits", difficulty=3, count=2)
  → 返回2道中等难度练习题
```

### 串行调用模式

```
Main Agent
  → Task(concept-agent, domain="math", topic="X")
  → Task(exercise-agent, domain="math", topic="X")
  → Task(mistake-agent, record=true, ...)
  → 整合输出
```

---

## 文件结构

```
.opencode/
├── README.md                      # 本文件 - Agent 快速索引
├── opencode.json                  # 配置文件（见下文）
└── agents/                        # Agent 定义
    ├── tutor-main.md             # 主 Agent
    ├── concept-agent.md          # 概念讲解
    ├── exercise-agent.md         # 练习生成
    ├── mistake-agent.md          # 错题管理
    ├── planning-agent.md         # 学习规划
    ├── progress-agent.md         # 进度分析
    ├── diagnosis-agent.md        # 学习诊断
    └── knowledge-agent.md        # 知识管理
```

---

## 配置说明

### opencode.json

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "docs/ARCHITECTURE.md",
    "docs/CODING-STANDARDS.md"
  ]
}
```

**instructions** 字段引用外部规范文档，自动与 AGENTS.md 合并为 LLM 上下文。

---

## 常用操作

### 查看 Agent 详细信息

进入对应文件（如 `agents/concept-agent.md`）查看完整的 role、permissions、temperature 等配置。

### 添加新 Agent

1. 在 `agents/` 目录创建新文件 `name-agent.md`
2. 包含 Front Matter（name、description、mode、permissions 等）
3. 提供 role、核心职责、数据源、输出说明
4. 本文件中添加索引条目

### 更新 Agent 配置

修改 `.opencode/agents/*.md` 文件的 Front Matter 或内容，无需触发特殊命令。

---

## 文档链接

- 🏗️ [系统架构设计](../docs/ARCHITECTURE.md)
- 📏 [编码与内容规范](../docs/CODING-STANDARDS.md)
- 📋 [项目 Rules](../AGENTS.md)
- 🔧 [开发工具指南](.opencode-instructions.md)（内部参考）
