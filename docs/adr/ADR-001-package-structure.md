# ADR-001: 包结构设计 - 三层分离架构

**状态**：Accepted

**版本**：1.0

**日期**：2026-02-06

---

## 背景

CMTX 是一个**创作者工具箱（Creator's ToolBox）** 项目，目标是为 Markdown 创作者提供完整的文档资产管理工具链。

### 初期功能

项目初期的功能包括：
- 图片处理（筛选、替换、删除）
- Frontmatter 和元数据处理
- 云存储上传（Aliyun OSS）

### 未来扩展方向

项目计划支持更多功能：
- 文档 ID 管理
- Markdown 文件重命名
- AI 驱动的智能命名
- SEO 优化建议
- 其他创作工具

---

## 问题陈述

**如何组织 CMTX 的包结构，使得：**

1. **核心库保持极简**：@cmtx/core 只做最基础的事
2. **功能可独立发展**：各个功能可以独立设计和演进
3. **避免复杂耦合**：各包之间清晰的单向依赖
4. **便于新功能加入**：新功能不需要修改已有包
5. **符合 SOLID 原则**：特别是单一职责原则

### 初期的错误方向

最初考虑的方案：
```
@cmtx/core
├─ 图片处理
├─ 元数据处理
├─ 模板引擎 ← 导致 core 变复杂
├─ ID 生成 ← 职责过多
└─ 文件重命名 ← 边界模糊
```

问题：
- [x] core 包变得很重（职责太多）
- [x] 新增功能都想加到 core 中
- [x] 包的边界模糊不清

---

## 考虑的选项

### 选项 1️⃣：单一大包（Monolithic）

**设计**：
```
@cmtx/core
├─ 所有功能都在这个包里
└─ 简单但不灵活
```

**优点**：
- [OK] 简单（没有包管理复杂性）
- [OK] 快速开发

**缺点**：
- [x] 包体积大
- [x] 职责混乱
- [x] 难以维护
- [x] 新功能不好分离
- [x] 用户只想要某个功能也要装整个包

**评估**：❌ 不符合现代 Node.js 生态实践

---

### 选项 2️⃣：过度拆分（Micropackages）

**设计**：
```
@cmtx/core-filter
@cmtx/core-replace
@cmtx/core-delete
@cmtx/naming-id-generator
@cmtx/naming-file-renamer
@cmtx/naming-template
@cmtx/upload-oss
@cmtx/upload-s3
... 太多包 ...
```

**优点**：
- [OK] 职责绝对清晰
- [OK] 用户可以精确选择

**缺点**：
- [x] 包管理复杂
- [x] 安装依赖过多
- [x] 维护成本高
- [x] 用户会被吓倒
- [x] 版本管理噩梦

**评估**：❌ 过度工程化

---

### 选项 3️⃣：三层分离架构（Layered）✅ 推荐

**设计**：
```
第一层：@cmtx/core（极简基础层）
  ├─ 图片处理
  ├─ 元数据提取
  └─ 原子操作

第二层：功能专家包（功能完整层）
  ├─ @cmtx/naming（命名相关）
  ├─ @cmtx/storage（存储相关）
  └─ @cmtx/metadata（元数据管理）

第三层：应用包（面向用户层）
  ├─ @cmtx/cli
  ├─ @cmtx/ai-naming
  ├─ @cmtx/mcp-server
  └─ 其他集成
```

**优点**：
- [OK] 职责清晰（每层有明确的边界）
- [OK] 灵活组合（用户可按需选择）
- [OK] 易于维护（每个包都是小而精）
- [OK] 便于扩展（新功能找到合适的层）
- [OK] 符合 SOLID 原则

**缺点**：
- [x] 包数量稍多
- [x] 需要清晰的设计规范
- [x] 包间协作需要定义好接口

**评估**：✅ 最佳方案

---

## 决策

**采用三层分离架构**

---

## 架构详细设计

### 第一层：@cmtx/core（极简基础层）

**职责**：提供原子操作，不做组合

**包含内容**：
- **images/** - 图片处理
  - filterImagesInText / filterImagesFromFile / filterImagesFromDirectory
  - replaceImagesInText / replaceImagesInFile / replaceImagesInDirectory
  - deleteLocalImage / deleteLocalImageSafely

- **metadata/** - 元数据处理
  - extractTitleFromMarkdown
  - parseFrontmatter / convertHeadingToFrontmatter
  - 提取文档元数据

- **types.ts** - 核心类型定义
  - ImageMatch、FilterOptions、ReplaceOptions 等

**依赖**：
- fast-glob（目录扫描）
- trash（回收站支持）
- 无其他外部依赖

**特点**：
- ✅ 极简（~300-400 行代码）
- ✅ 无聊（没有复杂的业务逻辑）
- ✅ 可靠（经过充分测试）
- ✅ 高性能（纯正则表达式）

---

### 第二层：功能专家包（功能完整层）

这层的包基于 core 的基础进行组合和增强，每个包专注于一个领域。

#### 2.1 @cmtx/naming（命名专家包）

**职责**：提供模板引擎和命名相关功能

**包含内容**：
- **template/** - 模板引擎
  - TemplateBuilder 基类
  - renderTemplate 函数
  - TemplateContext 接口

- **id-generator/** - ID 生成
  - generateDocumentId（支持模板）
  - 各种 ID 生成策略

- **file-rename/** - 文件重命名
  - renameMarkdownFile
  - renameMarkdownFilesInDirectory
  - previewFileRename

- **utilities/** - 辅助工具
  - slug 生成（中文转拼音、ASCII 等）
  - hash 计算
  - 文件工具函数

**依赖**：
- @cmtx/core（使用 metadata 提取和文件操作）
- 可选：pinyin 库（中文 slug）

**特点**：
- ✅ 模块化设计
- ✅ 易于扩展（下游包继承 TemplateBuilder）
- ✅ 职责单一（只负责命名相关）

---

#### 2.2 @cmtx/storage（存储专家包）[未来计划]

**职责**：提供存储相关功能（上传、删除、管理）

**包含内容**（从 @cmtx/upload 演化）：
- **adapter/** - 存储适配器
  - IStorageAdapter 接口
  - AliOSSAdapter
  - 其他适配器

- **uploader/** - 上传功能
  - UploadService
  - 重试机制
  - 去重管理

- **deleter/** - 删除功能
  - DeleteService
  - 安全删除策略

- **config/** - 配置管理
  - StorageConfig
  - ConfigBuilder（支持链式 API）

**依赖**：
- @cmtx/core（使用 images 处理）
- @cmtx/naming（使用模板生成文件名）
- ali-oss（可选 peer dependency）

**特点**：
- ✅ 专注于存储功能
- ✅ 与命名功能解耦

---

#### 2.3 @cmtx/metadata（元数据管理包）[未来计划]

**职责**：提供高级元数据处理

**包含内容**：
- **frontmatter/** - Frontmatter 处理
  - FrontmatterParser
  - FrontmatterBuilder
  - Frontmatter 验证

- **document-id/** - 文档 ID 管理
  - ID 映射
  - 文档关系追踪

- **backlinks/** - 反向链接
  - Backlink 解析
  - 关系图生成

**依赖**：
- @cmtx/core（基础元数据）
- @cmtx/naming（ID 生成支持）

**特点**：
- ✅ 高级功能
- ✅ 支持复杂元数据操作

---

### 第三层：应用包（面向用户层）

这层的包是面向最终用户的集成包，组合下层功能提供完整解决方案。

#### 3.1 @cmtx/cli（命令行工具）

**职责**：提供命令行界面

**使用**：
```bash
cmtx analyze README.md
cmtx upload --config cmtx.config.yaml
cmtx rename docs/ --template '{date}_{slug}'
```

**依赖**：
- @cmtx/core
- @cmtx/naming
- @cmtx/storage

---

#### 3.2 @cmtx/ai-naming（AI 命名包）[未来计划]

**职责**：提供 AI 驱动的智能命名

**包含内容**：
- AINameBuilder（继承 @cmtx/naming 的 TemplateBuilder）
- AI 模型集成
- 智能分类和关键词提取

**使用**：
```typescript
import { AINameBuilder } from '@cmtx/ai-naming';

const name = new AINameBuilder()
  .withDate()
  .withAIAnalysis(aiResult)
  .render('{date}_{ai_category}_{ai_keywords}');
```

**依赖**：
- @cmtx/naming（使用 TemplateBuilder）
- OpenAI 或其他 AI SDK

**特点**：
- ✅ 完全独立
- ✅ 通过继承扩展 naming
- ✅ 不修改 naming 包

---

#### 3.3 @cmtx/mcp-server（MCP 服务）[当前]

**职责**：提供 Model Context Protocol 接口

**依赖**：
- @cmtx/core
- @cmtx/naming
- @cmtx/storage

---

## 依赖图

```
第三层（应用）
  @cmtx/cli           @cmtx/ai-naming      @cmtx/mcp-server
     |                      |                    |
     └──────────────────────┼────────────────────┘
                    |       |       |
第二层（功能专家）
  @cmtx/naming ← @cmtx/storage → @cmtx/metadata
     |              |              |
     └──────────────┼──────────────┘
           |
第一层（基础）
        @cmtx/core
```

**关键特点**：
- ✅ 单向依赖：上层依赖下层，不存在循环依赖
- ✅ 清晰的包边界
- ✅ 可以选择性使用（只装需要的包）

---

## 包设计规范

### 每个包都应该遵循的规范

1. **单一职责**
   - 包在概念上只解决一类问题
   - 名称应该准确反映职责

2. **最小依赖**
   - 只依赖必要的下层包
   - 避免过度依赖

3. **清晰的 API**
   - 导出清晰的公开接口
   - 使用 index.ts 集中管理导出

4. **完整的文档**
   - README 说明包的功能
   - 类型定义的 JSDoc 注释
   - 使用示例

5. **充分的测试**
   - 单元测试覆盖核心功能
   - 集成测试验证包间协作

---

## 迁移计划

### 现状（2026-02 当前）

```
@cmtx/core          ← 图片 + 元数据
@cmtx/upload        ← 上传功能（包含部分命名逻辑）
@cmtx/cli           ← 命令行
@cmtx/mcp-server    ← MCP 服务
```

### 目标状态（2026-Q2）

```
@cmtx/core          ← 图片 + 基础元数据
@cmtx/naming        ← 新建，包含模板 + ID + 重命名
@cmtx/storage       ← 从 upload 重构
@cmtx/metadata      ← 未来计划
@cmtx/cli           ← 升级，依赖新的包
@cmtx/mcp-server    ← 升级，依赖新的包
@cmtx/ai-naming     ← 新建，依赖 naming
```

### 迁移步骤

1. **第一步**：创建 @cmtx/naming 包（基础 TemplateBuilder）
2. **第二步**：迁移 ID 生成和文件重命名到 naming
3. **第三步**：从 @cmtx/upload 中分离 @cmtx/storage
4. **第四步**：创建 @cmtx/ai-naming
5. **第五步**：创建 @cmtx/metadata（元数据高级功能）

---

## 后果

### 积极影响

1. ✅ **清晰的架构**
   - 每个包的职责一目了然
   - 新开发者容易上手

2. ✅ **易于维护**
   - 包的大小合理
   - 依赖链清晰

3. ✅ **高度可扩展**
   - 新功能找到合适的层
   - 无需修改已有包

4. ✅ **灵活使用**
   - 用户可以按需安装
   - 不必要的依赖最少

5. ✅ **便于演进**
   - 每个包可以独立演进
   - 不会影响其他包

### 消极影响

1. ⚠️ **包数量增加**
   - 维护工作增加
   - 版本管理更复杂

2. ⚠️ **更高的学习成本**
   - 需要理解各包的职责
   - 需要文档支持

3. ⚠️ **可能的代码重复**
   - 某些工具函数可能在多个包中出现
   - 需要通过共享实用库来管理

---

## 缓解措施

### 为了缓解消极影响，我们：

1. **编写清晰的文档**
   - 包结构图
   - 包间依赖关系说明
   - 功能分布表

2. **使用单一的 monorepo**
   - 统一的版本管理
   - 统一的发布流程
   - 便于跨包重构

3. **创建共享库**
   - @cmtx/utils（共享工具函数）
   - 减少代码重复

4. **清晰的包命名**
   - 前缀表示层级（core/, naming/, storage/）
   - 名称反映职责

---

## 相关决策

- [ADR-002: 模板系统设计](./ADR-002-template-system.md)：第二层 naming 包的设计
- [ADR-003: 元数据处理](./ADR-003-metadata-handling.md)：第二层 metadata 包的设计

---

## 参考资源

- [SOLID 原则](https://en.wikipedia.org/wiki/SOLID)
- [Monorepo 最佳实践](https://monorepo.tools/)
- [npm 包设计指南](https://docs.npmjs.com/cli/v8/configuring-npm/package-json)

---

## 附录：包清单

### 第一层

| 包名 | 状态 | 职责 |
|------|------|------|
| @cmtx/core | Active | 极简基础库 |

### 第二层

| 包名 | 状态 | 职责 |
|------|------|------|
| @cmtx/naming | Planned (v1.0) | 命名、模板、ID、重命名 |
| @cmtx/storage | Planned (v1.1) | 存储、上传、删除 |
| @cmtx/metadata | Planned (v1.2) | 元数据高级管理 |

### 第三层

| 包名 | 状态 | 职责 |
|------|------|------|
| @cmtx/cli | Active | 命令行工具 |
| @cmtx/mcp-server | Active | MCP 服务 |
| @cmtx/ai-naming | Planned (v2.0) | AI 驱动命名 |
