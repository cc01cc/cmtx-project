# 混合执行模型

本文档定义 Main Agent 和 Sub-agents 如何与 Core Scripts 协作，以及在何时使用 Agent vs Script 的决策规则。

---

## 核心原则

1. **Agent (智能)**
   - 理解自然语言意图
   - 做出语义决策 (NEW vs UPDATE vs SKIP)
   - 协调 Sub-agents
   - 与用户交互

2. **Scripts (确定性)**
   - 执行计算和验证
   - 管理文件I/O和并发
   - 返回结构化数据
   - 不做决策

3. **协作**
   - Agent 调用 scripts，等待结果
   - Agent 基于结果做决策
   - Scripts 永不调用 Agent

---

## 执行模式

### 1. 简单导入流程

```
用户发送导入请求
    ↓
[Main Agent 理解意图: "导入 20 个极限相关题目"]
    ↓ Task(math-import-agent, domain=math, file_path=..., count=20)
[Sub-agent import]
    ├─ 遍历文件列表
    ├─ 对每个文件：
    │  ├─ 调用 format-validator.js
    │  ├─ 检查 validation.valid == true
    │  ├─ 调用 similarity-detector.js
    │  ├─ 决策: NEW/UPDATE/SKIP
    │  └─ 调用 index-updater.js
    └─ 返回汇总结果
    ↓
[Main Agent 收集报告，返回用户]
```

### 2. 复杂多步骤流程 (例: 构建知识图谱)

```
用户输入: "基于所有导入的题目自动构建知识图谱"
    ↓
[Main Agent 拆解]: 需要分析+可视化
    ├─ Task(concept-agent, domain=math, action=analyze)
    ├─ Task(visual-agent, domain=math, action=graph)
    └─ 等待并发完成
    ↓
[concept-agent] 分析单个习题的概念依赖
    ├─ 遍历 questions/index.json
    ├─ 调用类似度脚本找关联
    └─ 返回 concept_map
    ↓
[visual-agent] 整理并返回图形格式
    ├─ 读取 concept_map
    ├─ 生成 Mermaid/JSON 格式
    └─ 返回 graph_definition
    ↓
[Main Agent] 整合结果，保存到 knowledge-graph/index.json
```

---

## 决策树: Agent vs Script

### 场景分析

```
需要执行的操作
    │
    ├─ "验证文件格式" ? ─Y→ [Script: format-validator]
    │                  └─N
    │                     ↓
    ├─ "检测内容重复" ? ─Y→ [Script: similarity-detector]
    │                  └─N
    │                     ↓
    ├─ "更新索引" ? ────Y→ [Script: index-updater]
    │              └─N
    │                 ↓
    ├─ "生成报告" ? ────Y→ [Agent: 调用相关数据脚本]
    │              └─N
    │                 ↓
    ├─ "理解用户意图" ?─Y→ [Agent: 语义分析]
    │              └─N
    │                 ↓
    ├─ "做出决策" ? ────Y→ [Agent: 基于规则和数据]
    │              └─N
    │                 ↓
    └─ [未知操作，询问用户]
```

### 实例

| 操作 | Agent | Script | 理由 |
|------|-------|--------|------|
| 验证 20 个题目格式 | ✓ 协调 | ✓✓ 执行20次 | 并发验证，脚本高效 |
| 判断 "这个题是否新题" | ✓✓ 决策 | ✓ 计算相似度 | 相似度计算确定性，决策需语义 |
| 更新数据库索引 | ✓ 触发 | ✓✓ 执行 | 需原子性和文件锁 |
| 解释错题原因 | ✓✓ 能力 | - | Agent 特有能力 |
| 读现有题目完成练习 | ✓ 查询 | ✓ 读JSON | 都可以，Agent 更灵活 |
| 识别 "哪个知识点薄弱" | ✓✓ 分析 | - | Agent 的语义分析能力 |

---

## 架构模式

### 模式 1: 批处理导入

```javascript
// Sub-agent: math-import-agent
async function importQuestions(domain, filePaths) {
  const results = [];
  
  for (const filePath of filePaths) {
    // 1. 验证格式
    const validation = await execScript(
      `format-validator.js --file=${filePath} --domain=${domain}`
    );
    
    if (!validation.valid) {
      results.push({ filePath, status: "INVALID", error: validation.errors });
      continue;
    }
    
    // 2. 检测重复
    const item = readJSON(filePath);
    const similarity = await execScript(
      `similarity-detector.js --domain=${domain} --type=question --item='${JSON.stringify(item)}'`
    );
    
    // 3. 决策
    let action;
    if (similarity.recommendation === "SKIP") {
      action = "SKIP";
    } else if (similarity.recommendation === "UPDATE") {
      action = "UPDATE";
      item.id = similarity.matches[0].id;  // 使用现有 ID
    } else {
      action = "NEW";
      item.id = generateID();  // 生成新 ID
    }
    
    // 4. 执行
    const update = await execScript(
      `index-updater.js --domain=${domain} --action=${action} --item='${JSON.stringify(item)}'`
    );
    
    results.push({
      filePath,
      status: action,
      itemId: item.id,
      details: update.changes
    });
  }
  
  return {
    success: true,
    domain,
    processed: filePaths.length,
    results
  };
}
```

### 模式 2: 实时反馈导入

```javascript
// Sub-agent: math-import-agent (支持进度回调)
async function importQuestionsWithProgress(domain, filePaths, onProgress) {
  const results = [];
  
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    
    onProgress({
      processed: i,
      total: filePaths.length,
      current_file: filePath,
      status: "validating"
    });
    
    // ... 验证、检测、决策、执行 (同模式 1)
    
    onProgress({
      processed: i + 1,
      total: filePaths.length,
      current_file: filePath,
      status: "completed",
      result: results[i]
    });
  }
  
  return { success: true, results };
}
```

### 模式 3: 交互式导入决策

```javascript
// Sub-agent: math-import-agent (支持用户确认)
async function importQuestionsInteractive(domain, filePaths) {
  for (const filePath of filePaths) {
    const validation = await execScript(`format-validator.js ...`);
    
    if (!validation.valid) {
      const userChoice = await askUser(
        `Format error in ${filePath}: ${validation.errors.join(', ')}. Skip?`
      );
      if (userChoice === "skip") continue;
    }
    
    const item = readJSON(filePath);
    const similarity = await execScript(`similarity-detector.js ...`);
    
    if (similarity.matches.length > 0) {
      const userChoice = await askUser(
        `Found ${similarity.matches.length} similar items. Merge with ${similarity.matches[0].id}?`
      );
      if (userChoice === "yes") {
        // 执行 UPDATE
      } else {
        // 执行 NEW
      }
    }
  }
}
```

---

## 性能优化

### 1. 并行处理

```javascript
// 法 1: Promise.all - 快速但消耗内存
async function importParallel_All(domain, filePaths) {
  const promises = filePaths.map(async (filePath) => {
    const validation = await execScript(`format-validator.js ...`);
    const similarity = await execScript(`similarity-detector.js ...`);
    return execScript(`index-updater.js ...`);
  });
  
  const results = await Promise.all(promises);
  return results;
}

// 法 2: pLimit - 控制并发数 (推荐)
import pLimit from "p-limit";

async function importParallel_Limited(domain, filePaths, concurrency = 4) {
  const limit = pLimit(concurrency);
  
  const promises = filePaths.map((filePath) =>
    limit(async () => {
      const validation = await execScript(`format-validator.js ...`);
      const similarity = await execScript(`similarity-detector.js ...`);
      return execScript(`index-updater.js ...`);
    })
  );
  
  return Promise.all(promises);
}
```

### 2. 批量相似度检测

若有 100 个新文件，不要逐个调 similarity-detector（100次），考虑：

- 批处理：一次传递多个 item，脚本返回所有匹配
- 预过滤：按 topic/difficulty 分组后检测（减少比对集合）

```javascript
// 推荐: 按主题分组后批检测
const byTopic = groupBy(filePaths, (f) => JSON.parse(readFile(f)).topic);

for (const [topic, files] of Object.entries(byTopic)) {
  // 只对该主题的现有题目做相似度检测
  const batchResult = await execScript(
    `similarity-detector.js --domain=${domain} --type=question ` +
    `--topic=${topic} --batch='${JSON.stringify(files.map(...))}' `
  );
  
  // 处理批结果
}
```

### 3. 索引缓存

若同一流程中多次查询索引，缓存结果：

```javascript
class ImportContext {
  constructor(domain) {
    this.domain = domain;
    this.questionIndex = null;  // 缓存
    this.conceptIndex = null;
  }
  
  async getQuestionIndex() {
    if (!this.questionIndex) {
      this.questionIndex = readJSON(
        `domains/${this.domain}/questions/index.json`
      );
    }
    return this.questionIndex;
  }
  
  invalidateCache() {
    this.questionIndex = null;
    this.conceptIndex = null;
  }
}
```

---

## 错误处理与恢复

### 试图重试策略

```javascript
async function executeWithRetry(scriptCommand, maxRetries = 3, backoff = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await execSync(scriptCommand);
      return JSON.parse(result);
    } catch (error) {
      if (attempt < maxRetries - 1) {
        const waitTime = backoff * Math.pow(2, attempt);
        console.warn(
          `Attempt ${attempt + 1} failed, retry in ${waitTime}ms: ${error.message}`
        );
        await sleep(waitTime);
      } else {
        throw error;
      }
    }
  }
}
```

### 部分失败恢复

```javascript
async function importQuestions(domain, filePaths) {
  const results = { success: [], failed: [], skipped: [] };
  
  for (const filePath of filePaths) {
    try {
      const item = await processFile(filePath);
      results.success.push(item);
    } catch (error) {
      results.failed.push({ filePath, error: error.message });
      
      // 决策: 继续还是停止?
      if (error.message.includes("lock_timeout")) {
        // 重试，不中断
        const retry = await executeWithRetry(...);
        results.success.push(retry);
      } else if (error.message.includes("format_error")) {
        // 记录，继续处理下一个
        continue;
      } else {
        // 中断流程
        throw error;
      }
    }
  }
  
  return results;
}
```

---

## 跨域协作

### 场景: 在多域导入相同内容

```javascript
// Main Agent 协调多个 Sub-agents
async function importToDomains(filePath, targetDomains = ["math", "cs408"]) {
  const content = readFile(filePath);
  const baseItem = parseMarkdown(content);
  
  const tasks = targetDomains.map((domain) => 
    Task("math-import-agent", {
      domain,
      content,
      action: "import",
      variant: domain  // 允许 sub-agent 调整 domain 字段
    })
  );
  
  const results = await Promise.all(tasks);
  
  return {
    success: true,
    domains_affected: targetDomains,
    results: Object.fromEntries(
      targetDomains.map((d, i) => [d, results[i]])
    )
  };
}
```

---

## 监控与日志

### 执行跟踪

```javascript
// 记录关键事件
class ExecutionTracer {
  constructor(domain, traceId) {
    this.domain = domain;
    this.traceId = traceId;
    this.events = [];
  }
  
  log(event, details) {
    this.events.push({
      timestamp: new Date().toISOString(),
      event,
      details
    });
    console.log(`[${this.traceId}] ${event}:`, details);
  }
  
  async executeScript(scriptPath, args) {
    this.log("script_start", { script: scriptPath, args });
    
    const start = Date.now();
    try {
      const result = await execSync(`node ${scriptPath} ...`);
      const duration = Date.now() - start;
      this.log("script_end", { script: scriptPath, duration_ms: duration });
      return JSON.parse(result);
    } catch (error) {
      this.log("script_error", { script: scriptPath, error: error.message });
      throw error;
    }
  }
  
  getSummary() {
    return {
      traceId: this.traceId,
      domain: this.domain,
      event_count: this.events.length,
      events: this.events
    };
  }
}
```

### 性能基准

```
导入操作        耗时 (100个题目)
─────────────────────────────
验证格式        1-2 秒（100 × 10ms）
相似度检测      3-5 秒（100 × 30-50ms）
索引更新        2-3 秒（100 × 20-30ms）
─────────────────────────────
总耗时 (串行)   6-10 秒
总耗时 (并发)   3-5 秒 (concurrency=4)
```

---

## 新域扩展清单

为新域 (如 `physical`) 启用混合执行：

- [ ] 创建 `domains/physical/domain-config.json`
- [ ] 创建 `domains/physical/{knowledge-graph,questions,progress,sessions}` 目录
- [ ] 创建对应的 Sub-agent (physical-import-agent, physical-concept-agent 等)
- [ ] Sub-agent 中使用现有脚本 + `--domain=physical` 调用
- [ ] Main Agent 的 Task 分配增加 physical 的目标域
- [ ] 测试: 导入 5 个示例题目并验证索引

脚本和通用逻辑无需修改，纯配置扩展。
