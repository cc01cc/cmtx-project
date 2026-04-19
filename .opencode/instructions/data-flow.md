# 数据流与存储规则

本文档定义多域学习系统中数据的存储、流转、版本管理和事务规则。

---

## 核心原则

1. **多域隔离**: 每个域 (`domains/{domain}/`) 完全独立
2. **通用架构**: 所有域遵循相同的目录结构和命名规范
3. **不可变文件**: 已发布的题目/试卷不修改，新版本单独存储
4. **原子操作**: 索引更新用文件锁保证一致性
5. **审计日志**: 所有变更记录在目录级别的日志

---

## 目录结构

```
domains/{domain}/
├── domain-config.json           # 域配置（导入规则、元数据）
├── config/
│   └── user-profile.json         # 用户学习档案（与 main agent 同步）
├── knowledge-graph/
│   ├── concepts/                 # 概念和讲义
│   │   └── {concept}-{subtopic}.md
│   └── index.json                # 概念索引和关系图
├── questions/
│   ├── {exercise-type}/          # 试题分类（chapter1, limits, continuity 等）
│   │   └── q-{id}.md             # 单个试题
│   ├── index.json                # 试题总索引
│   └── {topic}-index.json        # 主题级索引（自动生成）
├── progress/
│   ├── status.json               # 学习进度统计（每日更新）
│   └── {user-id}.json            # 用户个人进度（可选）
├── sessions/
│   └── {timestamp}-{type}.md     # 学习会话记录
├── mistakes/
│   ├── index.json                # 错题集索引
│   └── {user-id}.json            # 个人错题本
├── glossary/
│   └── {lang}-terms.json         # 术语表（key: 术语, value: 定义+lang_equiv）
└── history/
    └── learning-log.json         # 改动日志（导入、修改、删除）
```

---

## 文件格式规范

### 1. 概念文件 (knowledge-graph/concepts/)

```yaml
---
id: "chapter1-limits"
title: "极限与连续性"
domain: "math"
chapter: 1
subtopics:
  - "极限定义"
  - "连续性"
  - "介值定理"
difficulty: 3
created_at: "2024-01-15T10:00:00Z"
version: "1.0"
---

## 极限的定义

[内容以 Markdown 格式...]
```

#### 元数据字段

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | ✓ | 唯一标识 (小写，用 `-` 分隔) |
| `title` | string | ✓ | 显示标题 |
| `domain` | string | ✓ | `math` \| `english` \| `cs408` \| `physical` \| `vocal` |
| `chapter` | number | ○ | 所属章节 |
| `subtopics` | array | ○ | 涵盖的子主题列表 |
| `difficulty` | 1-5 | ○ | 难度等级 |
| `created_at` | ISO8601 | ✓ | 创建时间 (UTC) |
| `version` | string | ✓ | 版本号 (semantic, 如 1.0, 1.2, 2.0) |
| `tags` | array | ○ | 分类标签 |

### 2. 试题文件 (questions/{type}/)

```yaml
---
id: "q-ch1-lim-18"
type: "calculation"
domain: "math"
topic: "limits"
chapter: 1
subtopic: "limit_definition"
difficulty: 3
tags: ["epsilon_delta", "proof"]
created_at: "2024-01-15T10:00:00Z"
version: "1.0"
answers: 1
estimate_time_mins: 15
---

## 题目

证明 $\lim_{x \to 2} (3x - 1) = 5$

### [隐藏内容]

**提示**: 使用 $\epsilon$-$\delta$ 定义...

### [隐藏内容]

**正确答案**: 对任意 $\epsilon > 0$，取 $\delta = \epsilon/3$...
```

#### 元数据字段

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | ✓ | 唯一标识 (格式: `q-{id}`) |
| `type` | string | ✓ | `calculation` \| `proof` \| `conceptual` \| `matching` |
| `domain` | string | ✓ | 所属域 |
| `topic` | string | ✓ | 主题 (如 `limits`, `derivatives`) |
| `difficulty` | 1-5 | ✓ | 难度等级 |
| `version` | string | ✓ | 版本号 |
| `created_at` | ISO8601 | ✓ | 创建时间 |
| `answers` | number | ○ | 答案数量 |
| `estimate_time_mins` | number | ○ | 预计做题时间 |

### 3. 索引文件 (*.json)

#### questions/index.json

```json
{
  "domain": "math",
  "total_questions": 150,
  "by_topic": {
    "limits": {
      "count": 12,
      "difficulty_distribution": [0, 2, 4, 4, 2],
      "ids": ["q-ch1-lim-18", "q-ch1-lim-24", ...]
    },
    "continuity": {
      "count": 8,
      "difficulty_distribution": [0, 1, 3, 3, 1],
      "ids": [...]
    }
  },
  "by_type": {
    "calculation": { "count": 85 },
    "proof": { "count": 40 },
    "conceptual": { "count": 25 }
  },
  "last_updated": "2024-03-15T14:30:00Z"
}
```

#### knowledge-graph/index.json

```json
{
  "domain": "math",
  "total_concepts": 45,
  "chapters": {
    "1": {
      "title": "极限与连续性",
      "concepts": [
        {
          "id": "chapter1-limits",
          "title": "极限定义",
          "subtopics": 5
        }
      ]
    }
  },
  "relationships": [
    {
      "from": "limits",
      "to": "continuity",
      "type": "prerequisite"
    }
  ],
  "last_updated": "2024-03-15T14:30:00Z"
}
```

---

## 数据流规程

### 导入流程 (Agent + Script)

```
[外部数据源]
    ↓
[Main Agent] 
    ↓ (验证)
format-validator.js  ← 格式检查
    ↓ (检测重复)
similarity-detector.js  ← 相似度检测 (加权 Jaccard)
    ↓ (决策: NEW/UPDATE/SKIP)
[Main Agent 决策]
    ↓ (执行 CRUD)
index-updater.js  ← 原子性更新索引 (文件锁)
    ↓
[domains/{domain}/ 文件系统] 
    ↓ (日志)
history/learning-log.json  ← 记录变更
```

### Agent 的责任

- 理解用户导入意图
- 调用验证脚本检查格式
- 调用相似度脚本检测重复
- 决定 NEW/UPDATE/SKIP
- 调用索引脚本执行操作
- 记录变更日志

### 脚本的责任

- 格式验证 (正则表达式)
- 相似度计算 (Jaccard + 加权字段)
- 索引更新 (原子性 + 文件锁)
- 不做决策，仅执行指令

---

## 版本管理

### 不可变文件策略

已发布的题目和概念**不修改**，遵循如下规则：

1. **新版本创建**: 修改时创建新的版本号

   ```
   q-ch1-lim-18.md  (v1.0) → (修改) → q-ch1-lim-18-v2.md  (v2.0)
   ```

2. **索引主文件**: `q-ch1-lim-18.md` 始终指向**最新生产版本**

   ```json
   {
     "id": "q-ch1-lim-18",
     "version": "2.0",
     "file_path": "questions/calculus/chapter1/q-ch1-lim-18-v2.md",
     "history": [
       { "version": "1.0", "path": "...v1.md", "modified_at": "2024-01-15" },
       { "version": "2.0", "path": "...v2.md", "modified_at": "2024-02-10" }
     ]
   }
   ```

3. **版本编号规则**
   - 补丁 (1.0 → 1.1): 错别字、格式调整
   - 次版本 (1.0 → 2.0): 答案/解释重写、难度调整
   - 主版本 (1.0 → 3.0): 题目本质改变（少用）

---

## 事务与并发安全

### 文件锁机制

脚本使用 `proper-lockfile` 保证原子操作：

```javascript
// index-updater.js 中的锁获取
const lockFilePath = `${domainPath}/questions/.index.lock`;
const lock = await lockfile.lock(lockFilePath, {
  stale: 30000,      // 30秒超时
  lockfilePath: lockFilePath
});

// 执行更新
try {
  const index = readJSON(`${domainPath}/questions/index.json`);
  index.total_questions++;
  writeJSON(`${domainPath}/questions/index.json`, index);
} finally {
  await lock.unlock();
}
```

### 并发场景

| 场景 | 处理方式 | 耗时 |
|------|---------|------|
| 两个 Agent 同时导入 | 第二个等待锁30s，超时后重试 | 0-30s + 重试延迟 |
| 导入过程中读索引 | 读取不阻塞，但可能读旧数据 | < 1ms |
| 索引损坏 | 拒绝操作，报错 + 建议修复 | 即时 |

---

## 日志与审计

### history/learning-log.json

```json
{
  "domain": "math",
  "entries": [
    {
      "timestamp": "2024-03-15T14:30:00Z",
      "action": "IMPORT",
      "item_id": "q-new-limits-01",
      "result": "NEW",
      "agent": "math-import-agent",
      "details": {
        "source": "user_upload",
        "file_size_bytes": 2048,
        "validation_time_ms": 45,
        "similarity_check_time_ms": 120
      }
    },
    {
      "timestamp": "2024-03-15T14:35:00Z",
      "action": "UPDATE",
      "item_id": "q-ch1-lim-18",
      "result": "MERGED",
      "agent": "math-import-agent",
      "details": {
        "merged_from": "q-new-limits-01",
        "supplemented_fields": ["solution_steps"],
        "version_before": "1.0",
        "version_after": "2.0"
      }
    }
  ],
  "last_entry": "2024-03-15T14:35:00Z"
}
```

---

## 多域部署

所有域使用相同的脚本和目录结构，无需修改：

```
domains/
├── math/
│   ├── domain-config.json
│   ├── questions/
│   ├── knowledge-graph/
│   └── ...
├── english/
│   ├── domain-config.json  (相同结构，不同内容)
│   ├── questions/
│   ├── knowledge-graph/
│   └── ...
├── cs408/
│   └── (相同结构)
└── ...
```

脚本通过 `--domain` 参数自动寻找正确的目录。

---

## 数据完整性检查

### 定期验证脚本 (TODO)

```bash
# 检查索引一致性
pnpm run validate:indexes

# 检查文件链接有效性
pnpm run validate:links

# 检查格式
pnpm run validate:formats
```

---

## 存储容量规划

### 当前状态 (math 域)

| 项目 | 数量 | 文件大小 | 总计 |
|------|------|---------|------|
| 概念文档 | 12 | 5-15 KB | 120 KB |
| 试题文件 | 150 | 2-8 KB | 900 KB |
| 索引文件 | 5 | 10-50 KB | 100 KB |
| 日志 | 1 | 200-500 KB/月 | 200 KB |
| **总计** | - | - | **1.3 MB** |

### 扩展场景 (全5域)

- 每域类似大小 × 5 + 交叉索引
- 预计 **10-15 MB** (完全集合)
- 无性能瓶颈（所有操作 O(n) 其中 n = 题目数 < 1000）

---

## 迁移与备份

### 版本升级

1. 备份现有 `domains/` 目录
2. 创建新的目录结构
3. 脚本迁移数据（保持 ID 和 metadata）
4. 验证索引完整性
5. 删除备份

### 跨域同步

某些场景下需要同步数据 (如概念从 math → cs408)：

```javascript
// 在 main agent 中
const sourcePath = `domains/math/knowledge-graph/concepts/chapter1-limits.md`;
const targetPath = `domains/cs408/knowledge-graph/concepts/calculus-limits.md`;

// 复制并调整 metadata (domain, chapter, id 等)
const content = readFile(sourcePath);
const updated = adjustMetadata(content, { domain: "cs408", id: "calculus-limits" });
writeFile(targetPath, updated);

// 更新索引
execSync(`node core/engines/import/index-updater.js --domain=cs408 --action=NEW --item='...'`);
```
