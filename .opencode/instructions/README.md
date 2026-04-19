# OpenCode Instructions - 内部参考指南

本目录包含 OpenCode 工具链的内部参考文档，用于指导 Agent 和开发工具的配置与使用。

## 文件索引

- **[README.md](README.md)** - 本文件
- **[agent-communication.md](agent-communication.md)** - Agent 间通信规范
- **[script-execution.md](script-execution.md)** - 脚本执行界面
- **[data-flow.md](data-flow.md)** - 数据流与存储规范
- **[hybrid-execution.md](hybrid-execution.md)** - 混合执行模型（Agent + Scripts）

## 使用场景

### 开发工程师

- 参考 [script-execution.md](script-execution.md) 了解如何调用核心脚本
- 参考 [data-flow.md](data-flow.md) 理解数据如何在系统中流动

### Agent 配置者

- 参考 [agent-communication.md](agent-communication.md) 了解 Agent 如何相互通信
- 参考 [hybrid-execution.md](hybrid-execution.md) 了解 Agent 如何调用脚本

### 系统架构师

- 参考 [data-flow.md](data-flow.md) 规划新域的数据结构
- 参考 [hybrid-execution.md](hybrid-execution.md) 设计新的协作模式

---

## 快速参考

### Agent to Agent 通信

```
Main Agent 
  → Task(concept-agent, domain="math", topic="limits")
  → Task(exercise-agent, domain="math", topic="limits", difficulty=3)
  → Task(mistake-agent, record=true, ...)
```

### Agent 调用脚本

```
Task(concept-agent, domain="math", topic="X")
  内部调用:
  → node core/engines/import/format-validator.js --domain=math --file=...
  → node core/engines/import/similarity-detector.js --domain=math --type=question
  → node core/engines/import/index-updater.js --domain=math --action=NEW
```

### 关键数据路径

```
domains/
├── math/
│   ├── knowledge-graph/     # 知识点依赖关系
│   ├── questions/           # 题库（按主题分类）
│   ├── glossary/            # 术语库
│   ├── progress/            # 学习进度
│   └── sessions/            # 会话记录
```

---

## 更新日志

- **2026-03-04**: 初始创建，包含基础指导文档
  - agent-communication.md - Agent通信规范
  - script-execution.md - 脚本执行界面
  - data-flow.md - 数据流规范
  - hybrid-execution.md - 混合执行模型

---

## 相关链接

- 📐 [系统架构设计](../../docs/ARCHITECTURE.md)
- 📏 [编码与内容规范](../../docs/CODING-STANDARDS.md)
- 🤖 [Agent 索引](../README.md)
- 📋 [项目 Rules](../../AGENTS.md)
