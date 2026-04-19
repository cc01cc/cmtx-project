# Agent 通信规范

本文档定义 OpenCode 系统中 Agent 间如何通信、传递参数和处理结果。

---

## 基本规则

### 1. Main Agent 作为协调者

**Main Agent (tutor-main)** 是唯一的入口点，负责：

- 接收用户请求
- 解析意图和参数
- 调度 Sub-agents
- 整合结果并回复用户

### 2. Sub-agents 无法直接通信

- Sub-agents **只能** 被 Main Agent 调用
- Sub-agents **不能** 调用其他 Sub-agents
- Sub-agents **不能** 自主发起任务

### 3. 任务调用语法

```
Task(agent-name, param1=value1, param2=value2, ...)
```

所有参数必须显式传递，不依赖全局状态。

---

## 标准参数规范

### 必须参数

每个 Sub-agent 调用都应包含：

```
Task(concept-agent, 
  domain="math",              // [必须] 学习域
  topic="limits",             // [必须] 知识点
  context={...}               // [可选] 上下文
)
```

#### domain 参数值

- `"math"` - 数学域（当前实现）
- `"english"` - 英语域（规划）
- `"cs408"` - 计算机408域（规划）
- `"physical"` - 物理/运动域（规划）
- `"vocal"` - 声乐域（规划）

### 常用参数

| 参数 | Agent | 用途 | 示例 |
|------|-------|------|------|
| `domain` | 所有 | 指定学习域 | `"math"` |
| `topic` | concept, exercise, planning | 指定知识点 | `"limits"` |
| `difficulty` | exercise, adaptive | 难度级别 | `1-5` |
| `count` | exercise | 生成题目数 | `2` |
| `mode` | concept, exercise | 工作模式 | `"review"`, `"learn"` |
| `evaluate` | exercise | 是否评估 | `true/false` |
| `record` | mistake | 是否记录 | `true/false` |

---

## 调用模式

### 模式 1：单个 Agent（同步）

```
用户: "讲解极限的概念"

Main Agent:
  1. 解析意图: concept_learning, topic="limits"
  2. Task(concept-agent, domain="math", topic="limits")
  3. [等待返回]
  4. [整合并输出讲解文档]
```

**等待时间**: 30-60 秒（LLM推理）

### 模式 2：顺序多 Agent（串行）

```
用户: "学习极限：讲解+练习"

Main Agent:
  1. Task(concept-agent, domain="math", topic="limits")
  2. [等待完成，获得讲解]
  
  3. Task(exercise-agent, domain="math", topic="limits", count=2)
  4. [等待完成，获得练习题]
  
  5. Task(mistake-agent, record=true, ...)
  6. [等待完成，获得记录确认]
  
  7. [整合讲解 + 练习 + 反馈，输出给用户]
```

**总时间**: 90-180 秒（3个Agent顺序执行）

### 模式 3：并行多 Agent（并发）

```
用户: "给我学习报告"

Main Agent:
  1. [同时发起3个任务]
     - Task(progress-agent, domain="math", comprehensive=true)
     - Task(diagnosis-agent, domain="math", recent=true)
     - Task(planning-agent, domain="math", next-steps=true)
  
  2. [等待所有任务完成_parallel]
  
  3. [整合三份报告，输出综合分析]
```

**总时间**: 60-100 秒（3个Agent并行执行）

---

## 错误处理

### Agent 返回错误时

```javascript
Task(concept-agent, domain="math", topic="limits")
返回: {
  error: "insufficient_context",
  message: "Required prerequisite knowledge missing",
  suggestion: "Recommend learning 'functions' first"
}
```

**Main Agent 应该**:

1. 捕获错误
2. 根据 `suggestion` 调整计划
3. 重新尝试或提示用户

### 超时处理

```
如果Agent超过120秒未返回:
  - Main Agent 中止等待
  - 返回给用户: "任务超时，请重试"
  - 记录日志供调试
```

---

## 参数校验

### Main Agent 应该在调用前验证

```javascript
function validateTaskParams(agentName, params) {
  // 1. 检查必选参数
  if (!params.domain) throw new Error("Missing domain parameter");
  
  // 2. 检查domain有效性
  const validDomains = ["math", "english", "cs408", "physical", "vocal"];
  if (!validDomains.includes(params.domain)) {
    throw new Error(`Invalid domain: ${params.domain}`);
  }
  
  // 3. 检查Agent特定参数
  const schema = getAgentSchema(agentName);
  validateAgainstSchema(params, schema);
}
```

---

## 数据结构约定

### 概念讲解返回格式

```json
{
  "success": true,
  "domain": "math",
  "topic": "limits",
  "content": {
    "title": "Limit (极限)",
    "definition": "...",
    "examples": [...],
    "related_terms": [...]
  },
  "file_saved_to": "domains/math/sessions/..."
}
```

### 练习题返回格式

```json
{
  "success": true,
  "domain": "math",
  "topic": "limits",
  "exercises": [
    {
      "id": "q-lim-001",
      "question": "...",
      "difficulty": 3,
      "hint": "...",
      "solution": "..."
    }
  ],
  "file_saved_to": "domains/math/sessions/..."
}
```

### 错题记录返回格式

```json
{
  "success": true,
  "recorded": {
    "id": "mistake-uuid",
    "question_id": "q-lim-001",
    "user_answer": "...",
    "correct_answer": "...",
    "error_type": "calculation_error"
  },
  "file_saved_to": "domains/math/mistakes/..."
}
```

---

## 最佳实践

### 1. 显式传递所有需要的上下文

❌ **不好**:

```
Task(exercise-agent, topic="limits")
// domain从哪来？难度多少？
```

✅ **正确**:

```
Task(exercise-agent, 
  domain="math", 
  topic="limits", 
  difficulty=3,
  count=2
)
```

### 2. 检查返回的success字段

```
response = Task(concept-agent, ...)
if (!response.success) {
  // 处理错误
  console.log(response.error);
} else {
  // 使用结果
  displayContent(response.content);
}
```

### 3. 记录调用日志

```
log({
  timestamp: now(),
  action: "task_call",
  agent: "concept-agent",
  params: {...},
  result: response,
  duration: elapsed_ms
});
```

### 4. 尊重各Agent的职责边界

- **concept-agent**: 只讲解，不评估
- **exercise-agent**: 只生成和评估，不讲解原理
- **mistake-agent**: 只记录，不改变学习路径
- **planning-agent**: 只规划，不执行学习
