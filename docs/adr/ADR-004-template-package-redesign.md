# ADR-004: @cmtx/template 包重新设计

**状态**：Proposed

**版本**：1.0

**日期**：2026-02-06

---

## 背景

根据最新的架构讨论和用户反馈，需要重新设计模板系统：

1. **包名调整**：从 `@cmtx/naming` 改为 `@cmtx/template`，更准确反映功能定位
2. **职责重新定义**：template 包专注于模板渲染，不涉及具体业务逻辑
3. **架构澄清**：明确 core/template/upload 三者的关系和数据流向
4. **文档同步**：需要更新各包的 README 文档以反映新的架构

### 新的职责分工

```
@cmtx/core       → 文档处理原子操作（增删改查）
@cmtx/template   → 模板渲染引擎（纯函数）
@cmtx/upload     → 业务逻辑编排（调用 template 生成文本，调用 core 执行替换）
```

---

## 问题陈述

**如何重新设计 @cmtx/template 包，使其：**

1. 与 @cmtx/core 完全解耦，无循环依赖
2. 作为纯粹的模板渲染引擎，不包含业务逻辑
3. 支持下游包（如 upload）通过继承扩展功能
4. 保持 API 简洁易用，符合 Builder 模式
5. 更新相关文档以反映新的架构关系

**核心挑战**：
- 确保 template 包的通用性（可被其他应用作为依赖库使用）
- 明确各包间的数据流向和调用关系
- 保持向后兼容性（如果有现有用户）

---

## 设计方案

### 包结构设计

```
packages/template/
├── src/
│   ├── core/
│   │   ├── template-engine.ts    # 核心渲染引擎
│   │   ├── context.ts           # 上下文管理
│   │   └── types.ts            # 核心类型定义
│   ├── builder/
│   │   ├── base-builder.ts     # 基础 Builder 类
│   │   └── index.ts           # Builder 导出
│   ├── variables/
│   │   ├── builtin.ts         # 内置变量提供者
│   │   └── registry.ts       # 变量注册管理
│   └── index.ts              # 包入口导出
├── tests/
├── examples/
├── README.md
└── package.json
```

### 核心类型定义

```typescript
// packages/template/src/core/types.ts
export interface TemplateContext {
  [key: string]: string | number | boolean | undefined;
  // 内置标准变量
  date?: string;
  timestamp?: string;
  uuid?: string;
}

export interface TemplateEngine {
  render(template: string, context: TemplateContext): string;
  validate(template: string): ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

### 基础 Builder 模式

```typescript
// packages/template/src/builder/base-builder.ts
export abstract class BaseTemplateBuilder {
  protected context: TemplateContext = {};
  
  withDate(): this {
    this.context.date = new Date().toISOString().split('T')[0];
    return this;
  }
  
  withTimestamp(): this {
    this.context.timestamp = Date.now().toString();
    return this;
  }
  
  withUUID(): this {
    this.context.uuid = crypto.randomUUID();
    return this;
  }
  
  addVariable(key: string, value: string | number | boolean): this {
    this.context[key] = value;
    return this;
  }
  
  merge(context: TemplateContext): this {
    Object.assign(this.context, context);
    return this;
  }
  
  getContext(): TemplateContext {
    return { ...this.context };
  }
  
  abstract build(): string;
}
```

### 核心渲染引擎

```typescript
// packages/template/src/core/template-engine.ts
export function renderTemplate(
  template: string,
  context: TemplateContext
): string {
  return template.replaceAll(/\{([^}]+)\}/g, (match, key) => {
    const value = context[key];
    return value !== undefined ? String(value) : match;
  });
}

export function validateTemplate(template: string): ValidationResult {
  // 基本语法验证
  const unmatchedBraces = template.match(/(?<!\{)\{[^{}]*\}(?!\})/g) || [];
  return {
    isValid: unmatchedBraces.length === 0,
    errors: unmatchedBraces.map(match => `未闭合的模板变量: ${match}`)
  };
}
```

### 下游包扩展示例

```typescript
// packages/upload/src/naming/builder.ts
import { BaseTemplateBuilder } from '@cmtx/template';

export interface FileInfo {
  name: string;
  size: number;
  extension: string;
  path: string;
}

export class UploadNameBuilder extends BaseTemplateBuilder {
  constructor(private fileInfo: FileInfo) {
    super();
  }
  
  withFileInfo(): this {
    this.context.filename = this.fileInfo.name;
    this.context.filesize = this.fileInfo.size.toString();
    this.context.fileext = this.fileInfo.extension;
    return this;
  }
  
  withCloudUrl(url: string): this {
    this.context.cloudSrc = url;
    return this;
  }
  
  build(): string {
    // 可以在这里添加特定的构建逻辑
    return super.getContext() as unknown as string; // 实际实现会更复杂
  }
}
```

---

## 数据流向和调用关系

### 正确的调用链

```
用户/CLI → @cmtx/upload → @cmtx/template → @cmtx/core
     ↓         ↓              ↓              ↓
   配置参数   业务编排      生成文本        执行替换
```

### 具体示例

```typescript
// 1. Upload 包调用 Template 包生成文本
const templateResult = new UploadNameBuilder(fileInfo)
  .withFileInfo()
  .withDate()
  .withCloudUrl(cloudUrl)
  .build(); // 生成 "2024-01-01_image.jpg"

// 2. Upload 包调用 Core 包执行替换
const result = core.replaceImagesInText(
  markdownContent,
  imagePattern,  // 要匹配的 pattern
  templateResult // 生成的纯文本
);
```

### 各包职责边界

| 包 | 职责 | 不做的事 |
|---|------|----------|
| @cmtx/core | 提供文档处理的原子操作 | 不生成具体内容，不包含业务逻辑 |
| @cmtx/template | 提供模板渲染能力 | 不直接操作文档，不包含业务逻辑 |
| @cmtx/upload | 编排业务逻辑 | 不直接处理文档，不实现模板语法 |

---

## 文档更新计划

### 需要更新的文件

1. **@cmtx/core/README.md**
   - 更新定位描述：从"图片处理核心库"扩展为"文档处理原子操作库"
   - 添加元数据处理功能说明
   - 明确与其他包的关系

2. **@cmtx/template/README.md**（新建）
   - 包定位和功能说明
   - API 文档和使用示例
   - 与 core/upload 的关系说明

3. **@cmtx/upload/README.md**
   - 更新架构说明
   - 明确调用 template 包生成文本的流程
   - 更新示例代码

### 核心文档更新要点

#### @cmtx/core README 更新
```markdown
# @cmtx/core v0.3.0

文档处理原子操作库。提供完整的图片处理、元数据处理和文档操作功能。

## 核心理念
- **原子操作**：提供最小粒度的文档处理功能
- **无业务逻辑**：专注于基础操作，不包含具体业务场景
- **高度可组合**：可与其他包灵活组合使用

## 主要功能模块
### 1. 图片处理
- 图片筛选、替换、删除
- 支持多种图片格式和语法

### 2. 元数据处理  
- 标题提取、Frontmatter 生成
- 文档 ID 管理

### 3. 文档操作
- 基础的增删改查操作
- 为上层应用提供可靠支撑
```

#### @cmtx/template README（新建）
```markdown
# @cmtx/template v0.1.0

轻量级模板渲染引擎。提供灵活的模板变量管理和 Builder 模式 API。

## 核心特性
- **纯函数设计**：无副作用，易于测试
- **Builder 模式**：链式 API，使用直观
- **高度可扩展**：支持下游包继承扩展
- **零业务逻辑**：专注于模板渲染本身

## 适用场景
- 文件命名生成
- 内容格式化
- 作为其他应用的依赖库

## 与相关包的关系
- **@cmtx/core**：不依赖，提供原子操作能力
- **@cmtx/upload**：被调用，为其提供文本生成功能
```

---

## 实施计划

### 阶段一：包结构调整（1-2 天）
- [ ] 创建 @cmtx/template 包结构
- [ ] 实现核心模板引擎
- [ ] 实现基础 Builder 模式
- [ ] 编写单元测试

### 阶段二：功能迁移（2-3 天）
- [ ] 将现有命名相关功能从 core 迁移到 template
- [ ] 更新 upload 包调用方式
- [ ] 验证功能完整性

### 阶段三：文档更新（1 天）
- [ ] 更新 core 包文档
- [ ] 创建 template 包文档
- [ ] 更新 upload 包文档

### 阶段四：测试和验证（1 天）
- [ ] 运行完整测试套件
- [ ] 验证各包间无循环依赖
- [ ] 确认 API 兼容性

---

## 风险和缓解措施

### 风险 1：API 不兼容
**缓解措施**：
- 提供迁移指南
- 保持旧 API 的兼容层（如有必要）
- 逐步弃用旧接口

### 风险 2：性能影响
**缓解措施**：
- 进行性能基准测试
- 优化核心渲染算法
- 提供缓存机制（如需要）

### 风险 3：文档不同步
**缓解措施**：
- 建立文档更新检查清单
- 在 CI 中加入文档验证
- 定期审查文档准确性

---

## 决策依据

此设计基于以下考虑：

1. **职责清晰**：各包职责明确，避免功能重叠
2. **解耦设计**：无循环依赖，便于独立发展
3. **用户友好**：API 设计直观，学习成本低
4. **可维护性**：代码结构清晰，易于测试和调试
5. **扩展性**：支持未来功能扩展和第三方集成

---

## 相关文档

- [ADR-001: 包结构设计](./ADR-001-package-structure.md)
- [ADR-002: 模板系统设计](./ADR-002-template-system.md)
- [ADR-003: 元数据处理](./ADR-003-metadata-handling.md)