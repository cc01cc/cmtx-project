# ADR-002: 模板系统设计 - Builder 模式（历史版本）

> **注意**：此文档已被 [ADR-004](./ADR-004-template-package-redesign.md) 取代，请参考新版本。

**状态**：Superseded
**取代版本**：ADR-004

**版本**：1.0

**日期**：2026-02-06



---

## 背景（历史记录）

CMTX 项目旨在成为一个**创作者工具箱**，需要支持多种内容处理功能：

- ID 生成（支持自定义格式）
- Markdown 文件重命名（支持自定义命名规则）
- 文件上传（支持智能命名）
- 未来的 AI 驱动命名等

这些功能都需要一个**灵活的模板系统**来支持用户自定义输出格式。

### 核心需求

1. **模板变量可扩展**：不同功能需要不同的变量集合
2. **下游包独立**：新增的下游包（如 AI 命名包）不应修改核心包
3. **无循环依赖**：各包之间应该清晰的单向依赖
4. **易于使用**：API 应该直观、学习成本低
5. **易于维护**：代码复杂度应该保持最低

### 初期方向

最初考虑将模板系统放在 `@cmtx/core` 中，但这会导致：

- core 包变得复杂（违反单一职责原则）
- 模板变量"大杂烩"（所有功能的变量都堆在一起）
- 核心包的边界模糊

因此，决定将模板系统转移到独立的 `@cmtx/naming` 包。

---

## 问题陈述

**如何设计一个可扩展的模板系统，使得：**

1. `@cmtx/naming` 包可以提供基础的模板功能
2. 下游包（如 `@cmtx/ai-naming`、升级后的 `@cmtx/upload`）可以独立地扩展变量
3. 这些下游包不需要相互依赖或相互了解
4. 各包完全解耦，但可以灵活组合

**核心挑战**：

- AI 包的数据（ai_score、ai_category）如何传递给模板系统？
- Upload 包的文件信息（fileSize、fileName）如何传递给模板系统？
- 新增的下游包如何不修改 naming 包就能添加自己的变量？
- 是否需要全局注册机制，还是能用更轻量的方案？

---

## 考虑的选项

### 选项 1️⃣：开放式变量注册系统（Variable Registry）

**设计**：

```typescript
class TemplateVariableRegistry {
  register(namespace: string, provider: VariableProvider);
  async resolveVariables(): Promise<Record<string, string>>;
}

// 下游包向全局注册表注册
globalRegistry.register('ai', aiProvider);
globalRegistry.register('upload', uploadProvider);
```

**优点**：

- [OK] 完全解耦
- [OK] 无限扩展能力
- [OK] 下游包自动生效

**缺点**：

- [x] 全局状态复杂
- [x] 初始化顺序依赖
- [x] 调试困难（变量来源分散）
- [x] 测试需要清理全局状态
- [x] 变量冲突难以预防

**评估**：❌ 过度设计，不适合

---

### 选项 2️⃣：上下文对象法（Context Pattern）

**设计**：

```typescript
interface TemplateContext extends Record<string, string> {
  [key: string]: string | number | boolean | undefined;
}

function renderTemplate(template: string, context: TemplateContext): string {
  return template.replaceAll(/\{([^}]+)\}/g, (match, key) => 
    context[key] ?? match
  );
}
```

**优点**：

- [OK] 极其灵活
- [OK] 无需预注册
- [OK] 数据流向清晰
- [OK] 无全局状态

**缺点**：

- [x] 变量发现困难
- [x] 类型安全性差
- [x] IDE 智能提示弱
- [x] 下游包无法提供便捷 API

**评估**：⭐⭐⭐ 基础可行，但需要改进

---

### 选项 3️⃣：组合工厂法（Composition Factory Pattern / Builder Pattern）✅ 推荐

**设计**：

```typescript
// 基础 builder
export class TemplateBuilder {
  protected context: TemplateContext = {};
  
  withDate(): this {
    this.context.date = new Date().toISOString().split('T')[0];
    return this;
  }
  
  add(key: string, value: any): this {
    this.context[key] = String(value);
    return this;
  }
  
  render(template: string): string {
    return renderTemplate(template, this.context);
  }
}

// 下游包继承并扩展
export class AINameBuilder extends TemplateBuilder {
  withAIResult(result: AIResult): this {
    this.context.ai_score = result.confidence.toFixed(2);
    this.context.ai_category = result.category;
    return this;
  }
}

// 使用
const id = new AINameBuilder()
  .withDate()
  .withAIResult(aiResult)
  .render('{date}_{ai_category}');
```

**优点**：

- [OK] 简单直接
- [OK] 链式 API（易读易用）
- [OK] 无全局状态
- [OK] 完全解耦
- [OK] 易于测试
- [OK] IDE 支持好
- [OK] 数据流向一目了然
- [OK] 类型安全（下游包定义自己的方法）
- [OK] 支持多实例并行
- [OK] 支持灵活组合

**缺点**：

- [x] 下游包代码有小部分重复（每个包都要创建 builder 子类）
- [x] Builder 类会增多

**评估**：✅ 最佳方案

---

### 选项 4️⃣：插件系统（Plugin Architecture）

**设计**：

```typescript
interface VariableProvider {
  name: string;
  priority: number;
  provideVariables(context: BaseContext): Record<string, string>;
}

class TemplateEngine {
  private providers: VariableProvider[] = [];
  
  use(provider: VariableProvider): this {
    this.providers.push(provider);
    return this;
  }
  
  async render(template: string, context: BaseContext): Promise<string> {
    const variables = await this.resolveAllVariables(context);
    return renderTemplate(template, variables);
  }
}
```

**优点**：

- [OK] 高度灵活
- [OK] 优先级控制
- [OK] 条件加载

**缺点**：

- [x] 复杂度高
- [x] 学习曲线陡
- [x] 全局状态问题
- [x] 初始化顺序依赖
- [x] 测试困难
- [x] 调试困难

**评估**：❌ 过度设计，在 naming 场景中不适合

---

## 决策

**采用 Builder 模式（选项 3️⃣）**

### 理由

1. **最小化复杂度**
   - 核心实现仅需 ~80 行代码
   - 下游包扩展仅需 ~20-30 行代码
   - 容易理解、维护和扩展

2. **完全解耦**
   - 各包之间无相互依赖
   - 下游包完全独立开发
   - 无全局状态污染

3. **易用性强**
   - 链式 API 直观自然
   - 学习曲线平缓
   - 使用时数据流向清晰

4. **测试友好**
   - 无副作用
   - 无全局状态清理
   - 易于 mock 和验证

5. **性能最优**
   - 简单的字符串操作
   - 无反射、无循环遍历
   - 轻量高效

6. **易于演进**
   - 将来需要时可升级到插件系统
   - 现有 API 无需改变
   - 可以同时支持两种方式

---

## 架构设计

### 第一层：@cmtx/naming 核心

```typescript
// 基础模板上下文接口
export interface TemplateContext extends Record<string, string | number | boolean | undefined> {
  // 可选的标准字段
  date?: string;
  timestamp?: string;
}

// 核心渲染函数
export function renderTemplate(
  template: string,
  context: TemplateContext
): string {
  return template.replaceAll(/\{([^}]+)\}/g, (match, key) => {
    const value = context[key];
    return value !== undefined ? String(value) : match;
  });
}

// 基础 Builder
export class TemplateBuilder {
  protected context: TemplateContext = {};
  
  withDate(): this {
    this.context.date = new Date().toISOString().split('T')[0];
    return this;
  }
  
  withTimestamp(): this {
    this.context.timestamp = Date.now().toString();
    return this;
  }
  
  add(key: string, value: string | number | boolean | undefined): this {
    if (value !== undefined) {
      this.context[key] = value;
    }
    return this;
  }
  
  merge(other: TemplateContext): this {
    Object.assign(this.context, other);
    return this;
  }
  
  render(template: string): string {
    return renderTemplate(template, this.context);
  }
  
  getContext(): TemplateContext {
    return { ...this.context };
  }
}
```

### 第二层：下游包扩展

```typescript
// @cmtx/ai-naming
export interface AIResult {
  confidence: number;
  category: string;
  keywords: string[];
}

export class AINameBuilder extends TemplateBuilder {
  withAIResult(result: AIResult): this {
    this.context.ai_score = result.confidence.toFixed(2);
    this.context.ai_category = result.category;
    this.context.ai_keywords = result.keywords.join('_');
    return this;
  }
}

// @cmtx/upload（升级版）
export interface FileInfo {
  name: string;
  size: number;
  ext: string;
}

export class UploadNameBuilder extends TemplateBuilder {
  withFileInfo(fileInfo: FileInfo): this {
    this.context.fileName = fileInfo.name;
    this.context.fileSize = fileInfo.size.toString();
    this.context.fileExt = fileInfo.ext;
    return this;
  }
  
  withCloudUrl(url: string): this {
    this.context.cloudSrc = url;
    return this;
  }
}
```

### 使用示例

```typescript
// 简单用法
const id = new TemplateBuilder()
  .withDate()
  .add('title', 'my-article')
  .render('{date}_{title}');

// AI 命名
const aiName = new AINameBuilder()
  .withDate()
  .withAIResult(aiResult)
  .render('{date}_{ai_category}_{ai_keywords}');

// 上传命名
const remotePath = new UploadNameBuilder()
  .withDate()
  .withFileInfo(fileInfo)
  .withCloudUrl(cloudUrl)
  .render('{date}_{fileName}');

// 灵活组合
const combined = new TemplateBuilder()
  .withDate()
  .merge(new AINameBuilder().withAIResult(aiResult).getContext())
  .merge(new UploadNameBuilder().withFileInfo(fileInfo).getContext())
  .add('custom', 'value')
  .render('{date}_{ai_category}_{fileName}_{custom}');
```

---

## 后果

### 积极影响

1. ✅ **架构清晰**
   - @cmtx/core 保持极简
   - @cmtx/naming 专注于命名功能
   - 各层职责分明

2. ✅ **高度可扩展**
   - 新下游包只需继承 TemplateBuilder
   - 无需修改已有代码
   - 完全开放扩展

3. ✅ **易于维护**
   - 代码量少（~100 行核心代码）
   - 无复杂的全局状态管理
   - 测试覆盖完整

4. ✅ **用户友好**
   - API 直观自然
   - 文档易于编写
   - IDE 支持完整

### 消极影响

1. ⚠️ **代码重复**
   - 下游包的 Builder 子类有小部分重复
   - 但可接受，因为每个包只需 ~20 行代码

2. ⚠️ **类数量增加**
   - 每个下游包都有自己的 Builder 子类
   - 但这是合理的组织方式

3. ⚠️ **命名约定依赖**
   - 需要依赖下游包遵循命名前缀约定（ai_, file_, seo_ 等）
   - 但通过清晰的文档可以解决

---

## 命名约定

为了避免变量冲突，下游包应遵循以下命名约定：

| 包 | 变量前缀 | 示例 |
|---|---------|------|
| @cmtx/naming | (core) | date, timestamp, title |
| @cmtx/ai-naming | ai_ | ai_score, ai_category |
| @cmtx/upload | file_ | file_name, file_size |
| @cmtx/seo | seo_ | seo_keywords, seo_score |
| 用户自定义 | custom_ | custom_field |

---

## 实现计划

### 第 1 阶段：核心 Builder（v1.0）

- [ ] 实现 @cmtx/naming 包
- [ ] 基础 TemplateBuilder 类
- [ ] 文档和示例

### 第 2 阶段：集成现有功能（v1.1）

- [ ] ID 生成支持模板
- [ ] 文件重命名支持模板
- [ ] 更新 @cmtx/core 中的相关功能

### 第 3 阶段：升级下游包（v1.2）

- [ ] 创建 AINameBuilder
- [ ] 升级 @cmtx/upload 为 UploadNameBuilder
- [ ] 文档和示例

---

## 相关决策

- [ADR-001: 包结构设计](./ADR-001-package-structure.md)：整体架构
- [ADR-003: 元数据处理](./ADR-003-metadata-handling.md)：元数据集成

---

## 讨论和反馈

### 已考虑的替代方案及为何排除

1. **Handlebars/Mustache 等第三方库**
   - 理由：不符合项目轻量原则，过度设计
   - 参见：相关讨论记录

2. **全局注册系统**
   - 理由：引入不必要的全局状态，测试复杂
   - 参见：选项 1

3. **在 @cmtx/core 中提供模板**
   - 理由：违反单一职责原则，模糊边界
   - 参见：ADR-001

### 将来可能的演进

1. 如果使用场景变得复杂，可以在 TemplateBuilder 基础上添加插件系统作为**高级特性**

2. 如果性能成为瓶颈，可以引入缓存或预编译机制

3. 如果需要条件逻辑，可以考虑升级到完整模板语言

---

## 附录：性能和体积分析

### 代码体积

```
@cmtx/naming 核心代码：
  - renderTemplate()：~30 行
  - TemplateBuilder：~50 行
  总计：~80 行，编译后 ~1KB

下游包 Builder 扩展（每个）：
  - AINameBuilder：~20 行，编译后 ~0.5KB
  - UploadNameBuilder：~25 行，编译后 ~0.6KB
```

### 性能特性

| 操作 | 复杂度 | 性能 |
|------|--------|------|
| 创建 Builder | O(1) | < 1ms |
| add() 调用 | O(1) | < 0.1ms |
| merge() 调用 | O(n) | < 1ms（n = 字段数） |
| render() 调用 | O(n) | < 10ms（n = 模板长度） |

完全满足实时应用需求。

---

## 参考资源

- [Builder 模式 - 设计模式](https://refactoring.guru/design-patterns/builder)
- [模板模式对比 - 文档](../../packages/naming/docs/template-comparison.md)
- 相关讨论记录（2026-02-06 Github 讨论）
