# CMTX 实现路线图

基于已定决策的 ADR（ADR-001、ADR-002、ADR-003），本文档规划具体的实现步骤。

---

## 📅 阶段规划

### 🚀 第一阶段（v1.0）- 创建 @cmtx/naming 包

**目标**：实现模板系统和 ID 生成功能

**包结构**：

```
packages/naming/
├── src/
│   ├── builder.ts          # TemplateBuilder 基类
│   ├── renderer.ts         # 模板渲染引擎
│   ├── id-generator.ts     # ID 生成函数
│   ├── file-renamer.ts     # 文件重命名工具
│   ├── types.ts            # 类型定义
│   └── index.ts            # 导出
├── tests/
│   ├── builder.test.ts
│   ├── renderer.test.ts
│   ├── id-generator.test.ts
│   └── file-renamer.test.ts
├── examples/
│   ├── basic-template.ts
│   ├── ai-builder.ts
│   └── upload-builder.ts
└── README.md
```

**实现清单**：

- [OK] TemplateBuilder 基类（~50 行）

    ```typescript
    export class TemplateBuilder {
        protected context: TemplateContext = {};

        withDate(): this {
            /* ... */
        }
        add(key: string, value: any): this {
            /* ... */
        }
        merge(context: TemplateContext): this {
            /* ... */
        }
        render(template: string): string {
            /* ... */
        }
    }
    ```

- [OK] renderTemplate 函数（~30 行）

    ```typescript
    export function renderTemplate(template: string, context: TemplateContext): string {
        // 替换 {key} 为对应的值
    }
    ```

- [OK] generateDocumentId 函数（~40 行）

    ```typescript
    export function generateDocumentId(
        title: string,
        template: string,
        context?: TemplateContext,
    ): string {
        /* ... */
    }
    ```

- [OK] renameMarkdownFile 函数（~60 行）

    ```typescript
    export async function renameMarkdownFile(
        filePath: string,
        newNameTemplate: string,
        context?: TemplateContext,
    ): Promise<string> {
        /* ... */
    }
    ```

- [OK] 完整的测试用例
- [OK] 使用示例和文档

**时间估计**：6-8 小时  
**复杂度**：⭐⭐（低）  
**依赖**：@cmtx/core（用于文件操作）

**验收标准**：

- [x] 所有测试通过
- [x] 代码覆盖率 > 90%
- [x] 无 TypeScript 错误
- [x] ESLint 检查通过
- [x] 文档完整

---

### 📦 第二阶段（v1.0.1）- 更新 @cmtx/core

**目标**：将 generateDocumentId 迁移到 @cmtx/naming，@cmtx/core 只保留基础操作

**变更清单**：

- [x] 从 @cmtx/core 中移除：

    ```typescript
    // 旧 @cmtx/core
    generateDocumentId(); // -> 移到 @cmtx/naming
    ```

- [x] 更新 @cmtx/core 的导出：

    ```typescript
    // src/index.ts
    export * from "./delete";
    export * from "./filter";
    export * from "./replace";
    export * from "./parser";
    export * from "./types";
    // 不导出 generateDocumentId（现在在 @cmtx/naming）
    ```

- [x] 更新 README 文档
- [x] 更新测试用例（确保未使用已移除的函数）

**时间估计**：2-3 小时  
**复杂度**：⭐（极低）  
**依赖**：完成第一阶段

**验收标准**：

- [x] @cmtx/core 不提供 generateDocumentId
- [x] 所有核心功能测试通过
- [x] 无破坏性变更的通知

---

### 🔄 第三阶段（v1.1）- 重构 @cmtx/upload 为 @cmtx/storage

**目标**：将上传功能分离出来，集成 @cmtx/naming 的模板支持

**包结构**：

```
packages/storage/
├── src/
│   ├── upload-builder.ts       # UploadNameBuilder 类
│   ├── storage-adapter.ts      # 存储适配器接口
│   ├── aliyun-adapter.ts       # 阿里云 OSS 实现
│   ├── uploader.ts             # 主上传逻辑
│   ├── types.ts
│   └── index.ts
├── tests/
├── examples/
└── README.md
```

**实现清单**：

- [OK] 创建 UploadNameBuilder 类

    ```typescript
    export class UploadNameBuilder extends TemplateBuilder {
        withUploadResult(result: UploadResult): this {
            this.context.upload_url = result.url;
            this.context.upload_size = result.size;
            return this;
        }
    }
    ```

- [OK] 集成 @cmtx/naming 的依赖
- [OK] 更新上传流程使用新的模板系统
- [OK] 保留向后兼容性（如有）
- [OK] 更新文档和示例

**时间估计**：4-6 小时  
**复杂度**：⭐⭐⭐（中等）  
**依赖**：完成第一、二阶段

**验收标准**：

- [x] 上传功能正常工作
- [x] 支持模板文件命名
- [x] 所有测试通过
- [x] 向后兼容性维持

---

### 🤖 第四阶段（v1.2）- 创建 @cmtx/ai-naming 包

**目标**：实现 AI 驱动的命名功能

**包结构**：

```
packages/ai-naming/
├── src/
│   ├── ai-name-builder.ts      # AINameBuilder 类
│   ├── ai-client.ts            # AI 服务集成
│   ├── types.ts
│   └── index.ts
├── tests/
├── examples/
└── README.md
```

**实现清单**：

- [OK] 创建 AINameBuilder 类（继承 TemplateBuilder）

    ```typescript
    import { TemplateBuilder } from "@cmtx/naming";

    export class AINameBuilder extends TemplateBuilder {
        async withAIAnalysis(text: string): Promise<this> {
            const analysis = await analyzeWithAI(text);
            this.context.ai_score = analysis.confidence;
            this.context.ai_category = analysis.category;
            this.context.ai_keywords = analysis.keywords;
            return this;
        }
    }
    ```

- [OK] 集成 AI 服务（OpenAI/Claude 等）
- [OK] 实现异步 Builder 方法
- [OK] 错误处理和重试逻辑
- [OK] 文档和使用示例

**时间估计**：4-6 小时  
**复杂度**：⭐⭐⭐（中等）  
**依赖**：完成第一、二、三阶段

**验收标准**：

- [x] AI 分析功能正常
- [x] Builder 链式调用工作正确
- [x] 错误处理完善
- [x] 测试通过

---

### 📊 第五阶段（v2.0）- 创建 @cmtx/metadata 包

**目标**：提供文档查询和关系管理功能

**包结构**：

```
packages/metadata/
├── src/
│   ├── document-store.ts       # 文档存储
│   ├── query.ts                # 查询功能
│   ├── relationships.ts        # 关系管理
│   ├── backlinks.ts            # 反向链接
│   ├── types.ts
│   └── index.ts
├── tests/
├── examples/
└── README.md
```

**实现清单**：

- [OK] 创建文档存储接口
- [OK] 实现 listDocuments 函数
- [OK] 实现 queryDocuments 函数
- [OK] 实现 findDocumentById 函数
- [OK] 实现 getBacklinks 函数
- [OK] Frontmatter 验证

**时间估计**：6-8 小时  
**复杂度**：⭐⭐⭐⭐（高）  
**依赖**：完成第一、二、三阶段

---

## 📋 具体任务分解

### @cmtx/naming - 任务清单

**任务 1-1：项目初始化** (1 小时)

- [x] 创建 package.json 和基本结构
- [x] 配置 TypeScript 和 Vitest
- [x] 设置 ESLint 规则

**任务 1-2：TemplateBuilder 实现** (2 小时)

- [x] 设计接口
- [x] 实现基类方法
- [x] 编写单元测试（90%+ 覆盖率）

**任务 1-3：渲染引擎** (1.5 小时)

- [x] renderTemplate 函数实现
- [x] 支持变量替换 `{key}`
- [x] 支持默认值 `{key:default}`（可选）
- [x] 单元测试

**任务 1-4：ID 生成** (1 小时)

- [x] 支持多种策略（slug, UUID, hash, 模板）
- [x] 模板变量支持
- [x] 碰撞检测（可选）
- [x] 单元测试

**任务 1-5：文件重命名** (1.5 小时)

- [x] 解析当前文件名
- [x] 应用模板生成新名称
- [x] 文件系统操作
- [x] 单元测试

**任务 1-6：文档和示例** (1 小时)

- [x] README.md 编写
- [x] API 文档（JSDoc）
- [x] 3 个使用示例
- [x] 集成指南

---

### @cmtx/core - 任务清单

**任务 2-1：代码清理** (1 小时)

- [x] 移除 generateDocumentId
- [x] 更新导出
- [x] 更新类型定义

**任务 2-2：测试更新** (0.5 小时)

- [x] 更新依赖 ID 生成的测试
- [x] 确保所有测试通过

**任务 2-3：文档更新** (0.5 小时)

- [x] 更新 README
- [x] 更新示例
- [x] 更新迁移指南

**任务 2-4：发布** (0.5 小时)

- [x] 更新 CHANGELOG
- [x] 打标签和发布

---

### @cmtx/storage - 任务清单

**任务 3-1：UploadNameBuilder 实现** (2 小时)

- [x] 创建类并继承 TemplateBuilder
- [x] 支持上传结果变量
- [x] 链式调用支持
- [x] 单元测试

**任务 3-2：集成新的模板系统** (2 小时)

- [x] 移除旧的模板逻辑
- [x] 使用 @cmtx/naming 的 Builder
- [x] 迁移现有使用场景
- [x] 集成测试

**任务 3-3：示例更新** (1 小时)

- [x] 更新现有示例
- [x] 创建新的模板示例
- [x] 创建与命名包集成的示例

**任务 3-4：文档更新** (1 小时)

- [x] 更新 README
- [x] 迁移指南
- [x] API 文档

---

## 📈 进度跟踪

### 第一阶段进度

- [ ] 1-1: 项目初始化
- [ ] 1-2: TemplateBuilder
- [ ] 1-3: 渲染引擎
- [ ] 1-4: ID 生成
- [ ] 1-5: 文件重命名
- [ ] 1-6: 文档和示例

### 第二阶段进度

- [ ] 2-1: 代码清理
- [ ] 2-2: 测试更新
- [ ] 2-3: 文档更新
- [ ] 2-4: 发布

### 第三阶段进度

- [ ] 3-1: UploadNameBuilder
- [ ] 3-2: 集成新系统
- [ ] 3-3: 示例更新
- [ ] 3-4: 文档更新

---

## 🔧 开发工具和命令

### 工作流命令

```bash
# 在 @cmtx/naming 包中开发
cd packages/naming

# 构建
pnpm build

# 测试
pnpm test

# 监视模式
pnpm test -- --watch

# 覆盖率
pnpm test -- --coverage

# Lint
pnpm lint

# 生成文档
pnpm run docs
```

### 跨包测试

```bash
# 测试 @cmtx/naming 对 @cmtx/core 的依赖
pnpm -F @cmtx/naming test

# 测试整个工作区
pnpm test
```

---

## 📚 参考资源

### 相关 ADR

- [ADR-001: 包结构](./ADR-001-package-structure.md)
- [ADR-002: 模板系统](./ADR-002-template-system.md)
- [ADR-003: 元数据处理](./ADR-003-metadata-handling.md)

### 项目文档

- [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [README.md](../../README.md)
- [packages/core/README.md](../../packages/core/README.md)

### 外部资源

- [Builder 模式文档](https://refactoring.guru/design-patterns/builder)
- [TypeScript 最佳实践](https://www.typescriptlang.org/docs/handbook/)
- [Vitest 文档](https://vitest.dev/)

---

## ✅ 发布检查清单

### 每个阶段发布前

- [ ] 所有测试通过（`pnpm test`）
- [ ] 无 Lint 错误（`pnpm lint`）
- [ ] TypeScript 编译无误（`pnpm build`）
- [ ] 代码覆盖率 > 90%
- [ ] 文档完整（README + API 文档）
- [ ] CHANGELOG 更新
- [ ] 示例代码工作正常
- [ ] 向后兼容性检查（如适用）

### 版本号规划

```
v0.2.x -> v1.0.0  (第一阶段：新 @cmtx/naming 包)
v1.0.x -> v1.1.0  (第三阶段：重构 @cmtx/storage)
v1.1.x -> v1.2.0  (第四阶段：新 @cmtx/ai-naming 包)
v1.2.x -> v2.0.0  (第五阶段：新 @cmtx/metadata 包)
```

---

**更新日期**：2026-02-06  
**负责人**：架构委员会  
**审查频率**：每个阶段完成后更新
