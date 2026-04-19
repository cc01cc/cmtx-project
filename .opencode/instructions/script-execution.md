# 脚本执行界面

本文档定义核心脚本的执行接口、参数、返回值和使用场景。

---

## 核心脚本概览

```
core/engines/import/
├── format-validator.js      # 格式验证 (Deterministic)
├── similarity-detector.js   # 相似度检测 (Deterministic + Weighted)
└── index-updater.js         # 索引更新 (Atomic + Safe)
```

所有脚本都遵循以下约定：

- 纯 Node.js，无依赖外部服务
- 接收 `--domain` 参数以支持多域
- 返回 JSON 格式结果
- 报错时返回 error 字段

---

## 1. format-validator.js

### 用途

验证 Markdown/JSON 文件格式的完整性和正确性，确保数据能安全导入。

### 命令行接口

```bash
node core/engines/import/format-validator.js \
  --file=<filepath> \
  --domain=<domain>
```

#### 参数

| 参数 | 必需 | 类型 | 示例 |
|------|------|------|------|
| `--file` | ✓ | string | `domains/math/knowledge-graph/concepts/chapter1-limits.md` |
| `--domain` | ✓ | string | `math` \| `english` |

#### 返回值

**成功**:

```json
{
  "success": true,
  "valid": true,
  "file": "domains/math/knowledge-graph/concepts/chapter1-limits.md",
  "checks": {
    "frontmatter": { "valid": true, "warnings": [] },
    "latex": { "valid": true, "pairs_count": 12 },
    "markdown": { "valid": true, "structure_ok": true },
    "codeblocks": { "valid": true, "count": 2 }
  }
}
```

**失败**:

```json
{
  "success": true,
  "valid": false,
  "file": "domains/math/knowledge-graph/concepts/chapter1-limits.md",
  "errors": [
    "Missing frontmatter (must start with ---)",
    "Unclosed LaTeX math: Found 5 opening $, 4 closing $",
    "Unbalanced code block: Found 1 opening ```, 0 closing ```"
  ]
}
```

### 使用场景

**Agent 调用脚本验证导入的内容**:

```javascript
// 在 knowledge-agent 中使用
const result = execSync(
  `node core/engines/import/format-validator.js ` +
  `--file=${filePath} --domain=${domain}`
).toString();

const validation = JSON.parse(result);
if (!validation.valid) {
  throw new Error(`Format validation failed: ${validation.errors.join('; ')}`);
}
```

---

## 2. similarity-detector.js

### 用途

使用 Jaccard 相似度 + 加权字段匹配，检测新项目与现有题库的相似度，支持智能去重。

### 命令行接口

```bash
node core/engines/import/similarity-detector.js \
  --domain=<domain> \
  --type=<type> \
  --item=<json>
```

#### 参数

| 参数 | 必需 | 类型 | 示例 |
|------|------|------|------|
| `--domain` | ✓ | string | `math` |
| `--type` | ✓ | string | `question` \| `concept` |
| `--item` | ✓ | JSON string | `'{"id":"q-1","topic":"limits",...}'` |

#### 返回值

**找到相似项**:

```json
{
  "success": true,
  "query": {
    "id": "q-new-limits-01",
    "type": "question",
    "domain": "math"
  },
  "matches": [
    {
      "id": "q-ch1-lim-18",
      "similarity_score": 0.78,
      "score_breakdown": {
        "topic_match": 1.0,
        "difficulty_match": 0.8,
        "description_similarity": 0.65
      },
      "fields_diff": {
        "only_in_new": ["hint_count"],
        "only_in_existing": ["review_status"],
        "different": ["description"]
      }
    }
  ],
  "recommendation": "UPDATE",
  "reason": "70% similar - recommend merging"
}
```

**未找到相似项**:

```json
{
  "success": true,
  "query": {
    "id": "q-new-limits-01",
    "type": "question",
    "domain": "math"
  },
  "matches": [],
  "recommendation": "NEW",
  "reason": "No similar items found"
}
```

### 使用场景

**Agent 判断是否重复**:

```javascript
// 在 import-agent 中使用
const result = execSync(
  `node core/engines/import/similarity-detector.js ` +
  `--domain=math --type=question --item='${JSON.stringify(newQuestion)}'`
).toString();

const detection = JSON.parse(result);
if (detection.recommendation === "SKIP") {
  console.log("Duplicate detected, skipping import");
  return { action: "SKIP", reason: "Complete duplicate" };
}
```

---

## 3. index-updater.js

### 用途

原子性更新索引文件，使用文件锁防止并发写入冲突，支持 NEW/UPDATE/SKIP 操作。

### 命令行接口

```bash
node core/engines/import/index-updater.js \
  --domain=<domain> \
  --action=<action> \
  --item=<json>
```

#### 参数

| 参数 | 必需 | 类型 | 值 |
|------|------|------|-----|
| `--domain` | ✓ | string | `math` |
| `--action` | ✓ | string | `NEW` \| `UPDATE` \| `SKIP` |
| `--item` | ✓ | JSON string | 完整的题目/概念对象 |

#### 返回值

**NEW 操作**:

```json
{
  "success": true,
  "action": "NEW",
  "item_id": "q-new-limits-01",
  "changes": {
    "questions_index": {
      "previous_count": 145,
      "new_count": 146,
      "added_topics": ["limits"]
    },
    "topic_stats": {
      "limits": { "count": 12, "difficulty_avg": 3.2 }
    }
  },
  "file_saved_to": "domains/math/questions/index.json"
}
```

**UPDATE 操作**:

```json
{
  "success": true,
  "action": "UPDATE",
  "item_id": "q-ch1-lim-18",
  "merged_from": "q-new-limits-01",
  "changes": {
    "supplemented_fields": ["solution_steps", "alternative_methods"],
    "kept_original": ["created_date", "author"],
    "updated_fields": ["difficulty", "description"]
  },
  "file_saved_to": "domains/math/questions/q-ch1-lim-18.md"
}
```

**SKIP 操作**:

```json
{
  "success": true,
  "action": "SKIP",
  "item_id": "q-new-limits-01",
  "reason": "Complete duplicate of q-ch1-lim-18",
  "index_unchanged": true
}
```

**错误**:

```json
{
  "success": false,
  "error": "lock_timeout",
  "message": "Could not acquire lock for 30s - index may be busy",
  "retry_advice": "Wait 5s and retry"
}
```

### 使用场景

**Agent 更新索引**:

```javascript
// 在 import-agent 中使用
for (let i = 0; i < 3; i++) {  // 重试最多3次
  try {
    const result = execSync(
      `node core/engines/import/index-updater.js ` +
      `--domain=math --action=${action} --item='${JSON.stringify(item)}'`
    ).toString();
    
    const update = JSON.parse(result);
    if (update.success) {
      return update;
    }
    
    if (update.error === "lock_timeout" && i < 2) {
      await sleep(5000);  // 等待5秒后重试
      continue;
    }
    throw new Error(update.message);
  } catch (e) {
    console.error(`Update attempt ${i+1} failed: ${e.message}`);
  }
}
```

---

## 脚本性能指标

| 脚本 | 99th percentile | 平均耗时 | 用途 |
|------|----------------|---------|------|
| format-validator | 200ms | 10-50ms | 验证单个文件 |
| similarity-detector | 500ms | 100-300ms | 比对题库（200+题） |
| index-updater | 1000ms | 200-600ms | 更新索引（含锁） |

---

## 错误处理

### 通用错误代码

| 错误码 | 含义 | 建议 |
|--------|------|------|
| `validation_failed` | 格式验证失败 | 修复文件格式 |
| `invalid_domain` | 域不存在 | 检查 domain 参数 |
| `file_not_found` | 文件路径错误 | 验证文件路径 |
| `lock_timeout` | 锁获取超时 | 等待后重试 |
| `permission_denied` | 文件权限不足 | 检查路径权限 |

### Agent 重试策略

```javascript
async function executeScriptWithRetry(command, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = execSync(command).toString();
      return JSON.parse(result);
    } catch (error) {
      if (error.includes("lock_timeout") && i < maxRetries - 1) {
        await sleep(Math.pow(2, i) * 1000);  // 指数退避
        continue;
      }
      throw error;
    }
  }
}
```

---

## 多域调用示例

### 为 english 域导入内容

```bash
# 验证
node core/engines/import/format-validator.js \
  --file=domains/english/questions/vocabulary-unit1.md \
  --domain=english

# 检测相似度
node core/engines/import/similarity-detector.js \
  --domain=english \
  --type=vocabulary \
  --item='{...}'

# 更新索引
node core/engines/import/index-updater.js \
  --domain=english \
  --action=NEW \
  --item='{...}'
```

脚本自动适应各域，无需修改。
