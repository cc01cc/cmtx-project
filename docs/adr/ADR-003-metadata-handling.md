# ADR-003: 元数据处理 - Frontmatter 和 ID 管理

**状态**：Proposed

**版本**：1.0

**日期**：2026-02-06

---

## 背景

Markdown 文档元数据管理是现代知识管理系统的核心。Frontmatter（YAML 前置元数据）已经成为静态网站生成器（Hugo、Jekyll、Astro）和笔记工具（Obsidian、Notion）的标准。

### 创作者的需求

创作者需要：

1. 从 Markdown 标题自动生成元数据
2. 为每个文档生成唯一标识符（ID）
3. 快速查询和定位文档
4. 维护文档关系（反向链接、分类等）

### CMTX 的角色

作为创作者工具箱，CMTX 应该提供：

- 元数据提取和处理
- ID 生成和管理
- 文档查询接口
- 与其他工具的集成

---

## 问题陈述

**如何设计 @cmtx/core 和 @cmtx/metadata 包，支持灵活的元数据管理，同时保持简洁性？**

### 核心问题

1. **Frontmatter 格式**：支持哪些格式（YAML、TOML、JSON）？
2. **ID 策略**：支持哪些 ID 生成方式（slug、UUID、hash、自定义）？
3. **元数据验证**：如何验证元数据的有效性？
4. **查询功能**：如何快速查询和定位文档？
5. **集成能力**：如何与 @cmtx/naming 包集成？

---

## 当前方案（@cmtx/core 已实现）

### 现有功能

#### 1. Frontmatter 转换

```typescript
// 从标题生成 frontmatter
const result = convertHeadingToFrontmatter('# 我的文章', {
  includeDate: true,
  customFields: { author: '作者名' }
});
// 输出：带有 frontmatter 的完整文档
```

#### 2. ID 生成

```typescript
// 支持多种策略
generateDocumentId('文章标题', 'slug');    // -> 文章标题
generateDocumentId('文章标题', 'uuid');    // -> UUID v4
generateDocumentId('文章标题', 'hash');    // -> MD5 hash
```

#### 3. 元数据提取

```typescript
const metadata = extractMetadata('# 我的文档\n\n内容...', {
  generateId: true,
  idStrategy: 'slug'
});
```

---

## 考虑的选项

### 选项 1️⃣：完整的元数据库（完整功能）

**设计**：

```typescript
// 支持复杂的元数据操作
class MarkdownMetadataDatabase {
  async scanDirectory(path: string): Promise<Document[]>;
  async findById(id: string): Promise<Document>;
  async findByTag(tag: string): Promise<Document[]>;
  async findByAuthor(author: string): Promise<Document[]>;
  async getBacklinks(id: string): Promise<Document[]>;
  async validateMetadata(): Promise<ValidationResult>;
}
```

**包含**：

- 内存数据库
- 快速查询引擎
- 关系图生成
- 数据验证

**优点**：

- [OK] 功能完整
- [OK] 性能优化（索引、缓存）
- [OK] 支持复杂查询

**缺点**：

- [x] 代码量大（~500+ 行）
- [x] 复杂度高
- [x] 维护成本高
- [x] 过度设计（大多数用户不需要）

**评估**：❌ 超出 @cmtx/core 范围，应在 @cmtx/metadata 中

---

### 选项 2️⃣：基础功能 + 查询接口（推荐）

**设计**：

**@cmtx/core** 层（基础）：

```typescript
// 基础操作
extractMetadata(text, options);
convertHeadingToFrontmatter(text, options);
parseFrontmatter(text);
generateDocumentId(title, strategy);
```

**@cmtx/metadata** 层（查询）：

```typescript
// 查询接口
listDocuments(dirPath, options);
findDocumentById(dirPath, id);
queryDocuments(dirPath, filter);
```

**优点**：

- [OK] core 保持简洁
- [OK] 关注点分离
- [OK] 渐进式功能
- [OK] 易于维护

**缺点**：

- [x] 功能分散在两个包中
- [x] 需要更多文档

**评估**：✅ 最佳方案

---

### 选项 3️⃣：利用现有的 YAML 库

**设计**：

```typescript
import YAML from 'js-yaml';

// 完整的 YAML 支持
const frontmatter = YAML.parse(text);
const updated = YAML.stringify(frontmatter);
```

**优点**：

- [OK] 完整的 YAML 支持
- [OK] 成熟的库

**缺点**：

- [x] 增加依赖（js-yaml ~20KB）
- [x] 与 core 的轻量哲学冲突
- [x] 只有当需要复杂的 YAML 操作时才值得

**评估**：⚠️ 可选，作为 peer dependency

---

## 决策

**采用选项 2️⃣：基础功能 + 查询接口**

### 实现分层

#### 第一层：@cmtx/core（基础元数据）

**职责**：提供基础的元数据操作

```typescript
// 提取元数据
export interface DocumentMetadata {
  title?: string;
  date?: Date;
  author?: string;
  id?: string;
  [key: string]: any;
}

export function extractMetadata(
  text: string,
  options?: {
    generateId?: boolean;
    idStrategy?: 'slug' | 'uuid' | 'hash' | 'custom';
    customFields?: Record<string, any>;
  }
): DocumentMetadata

// Frontmatter 转换
export function convertHeadingToFrontmatter(
  text: string,
  options?: {
    includeDate?: boolean;
    customFields?: Record<string, any>;
    format?: 'yaml' | 'toml' | 'json';
  }
): string

// Frontmatter 解析
export function parseFrontmatter(text: string): {
  frontmatter: Record<string, any>;
  content: string;
}

// ID 生成（支持模板）
export function generateDocumentId(
  title: string,
  template?: string  // 支持 {date}_{slug} 格式
): string
```

---

#### 第二层：@cmtx/metadata（元数据查询）[未来计划]

**职责**：提供文档查询和管理功能

```typescript
export interface DocumentInfo {
  path: string;
  id: string;
  title: string;
  date?: Date;
  author?: string;
  tags?: string[];
  categories?: string[];
}

export interface QueryFilter {
  id?: string;
  title?: string;
  author?: string;
  tag?: string;
  category?: string;
  dateRange?: [Date, Date];
  searchText?: string;
}

// 列出所有文档
export async function listDocuments(
  dirPath: string,
  options?: {
    recursive?: boolean;
    sortBy?: 'date' | 'title' | 'id';
    descending?: boolean;
  }
): Promise<DocumentInfo[]>

// 按 ID 查找
export async function findDocumentById(
  dirPath: string,
  id: string
): Promise<DocumentInfo | null>

// 高级查询
export async function queryDocuments(
  dirPath: string,
  filter: QueryFilter
): Promise<DocumentInfo[]>

// 获取反向链接
export async function getBacklinks(
  dirPath: string,
  id: string
): Promise<DocumentInfo[]>
```

---

## 工作流示例

### 初始化文档

```typescript
import { extractMetadata, convertHeadingToFrontmatter } from '@cmtx/core';

// Step 1: 提取元数据（从现有文档）
const metadata = extractMetadata('# 我的第一篇文章\n\n内容...', {
  generateId: true,
  idStrategy: 'slug'
});
// { title: '我的第一篇文章', id: '我的第一篇文章', ... }

// Step 2: 转换为 Frontmatter
const docWithFrontmatter = convertHeadingToFrontmatter(
  '# 我的第一篇文章\n\n内容...',
  { includeDate: true }
);
```

### 查询文档

```typescript
import { listDocuments, queryDocuments } from '@cmtx/metadata';

// 列出所有文档
const allDocs = await listDocuments('./docs', {
  sortBy: 'date',
  descending: true
});

// 查询特定作者的文章
const myArticles = await queryDocuments('./docs', {
  author: 'cc01cc',
  tag: 'markdown'
});
```

### 与 naming 包集成

```typescript
import { AINameBuilder } from '@cmtx/ai-naming';
import { queryDocuments } from '@cmtx/metadata';

// 根据元数据生成新名称
const article = await queryDocuments('./docs', { id: 'doc-123' })[0];

const newName = new AINameBuilder()
  .withDate()
  .withAIAnalysis(aiResult)
  .add('originalTitle', article.title)
  .render('{date}_{ai_category}_{originalTitle}');
```

---

## 格式支持

### 当前支持：YAML（优先）

```yaml
---
title: "我的文章"
date: 2026-02-06
author: "cc01cc"
id: "my-article"
tags: ["markdown", "tool"]
---
```

### 未来支持（可选）

```toml
+++
title = "我的文章"
date = 2026-02-06
author = "cc01cc"
id = "my-article"
tags = ["markdown", "tool"]
+++
```

```json
{
  "title": "我的文章",
  "date": "2026-02-06",
  "author": "cc01cc",
  "id": "my-article",
  "tags": ["markdown", "tool"]
}
```

---

## ID 生成策略

### 支持的策略

| 策略 | 示例 | 优点 | 缺点 |
|------|------|------|------|
| **slug** | `我的第一篇文章` | 人类可读 | 可能冲突 |
| **uuid** | `f47ac10b-58cc-4372-a567-0e02b2c3d479` | 唯一性强 | 不可读 |
| **hash** | `a1b2c3d4` | 确定性 + 紧凑 | 可能冲突 |
| **date-based** | `20260206_a1b2c3d4` | 可排序 + 聚类 | 需要时间戳 |
| **custom** | 用户定义的模板 | 灵活 | 需要验证冲突 |

### 在 @cmtx/naming 中支持模板

```typescript
import { generateDocumentId } from '@cmtx/naming';

// 使用模板（由 naming 包支持）
const id = generateDocumentId('我的文章', '{date}_{slug}');
// -> "20260206_我的文章"

const id2 = generateDocumentId('我的文章', '{year}{month}{day}_{md5_8}');
// -> "20260206_a1b2c3d4"
```

---

## 验证规则

### Frontmatter 验证

```typescript
interface FrontmatterSchema {
  title?: { type: 'string'; required: true };
  date?: { type: 'date' };
  id?: { type: 'string'; unique: true };
  author?: { type: 'string' };
  tags?: { type: 'array'; items: 'string' };
  categories?: { type: 'array'; items: 'string' };
  [key: string]: any;
}

// 验证函数（@cmtx/metadata）
async function validateFrontmatter(
  dirPath: string,
  schema?: FrontmatterSchema
): Promise<ValidationResult>
```

### 常见验证

- [x] ID 唯一性
- [x] 日期格式
- [x] 必填字段
- [x] 类型检查

---

## 后果

### 积极影响

1. ✅ **清晰的职责分工**
   - @cmtx/core 负责基础操作
   - @cmtx/metadata 负责查询和管理

2. ✅ **易于维护**
   - core 保持简洁
   - 查询功能可以独立演进

3. ✅ **灵活的扩展**
   - 支持多种 ID 策略
   - 支持多种 frontmatter 格式

4. ✅ **与其他包的集成**
   - 与 @cmtx/naming 无缝集成
   - 与 @cmtx/ai-naming 协作方便

### 消极影响

1. ⚠️ **查询功能分散**
   - 用户需要了解两个包
   - 文档维护工作增加

2. ⚠️ **性能考虑**
   - 简单的查询在大型文档库中可能较慢
   - 需要根据使用情况优化

---

## 将来的演进

### 第一步（v1.0）：基础功能

- [x] 元数据提取（@cmtx/core）
- [x] ID 生成（支持多策略）
- [x] Frontmatter 转换（YAML）

### 第二步（v1.1）：查询功能

- [ ] @cmtx/metadata 包
- [ ] listDocuments 和 queryDocuments
- [ ] 基础搜索

### 第三步（v1.2）：高级功能

- [ ] 关系追踪（反向链接）
- [ ] 数据验证
- [ ] 批量操作

### 第四步（v2.0）：额外格式支持

- [ ] TOML frontmatter
- [ ] JSON frontmatter
- [ ] 其他格式

---

## 相关决策

- [ADR-001: 包结构设计](./ADR-001-package-structure.md)：整体架构
- [ADR-002: 模板系统设计](./ADR-002-template-system.md)：模板与 ID 生成集成

---

## 参考资源

- [Hugo Frontmatter](https://gohugo.io/content-management/front-matter/)
- [Jekyll Front Matter](https://jekyllrb.com/docs/front-matter/)
- [Obsidian YAML Frontmatter](https://help.obsidian.md/Advanced+topics/YAML+front+matter)
- [YAML 规范](https://yaml.org/)

---

## 附录：API 参考

### @cmtx/core 导出

```typescript
export { extractMetadata };
export { convertHeadingToFrontmatter };
export { parseFrontmatter };
export { generateDocumentId };
export type { DocumentMetadata };
```

### @cmtx/metadata 导出（未来）

```typescript
export { listDocuments };
export { findDocumentById };
export { queryDocuments };
export { getBacklinks };
export { validateFrontmatter };
export type { DocumentInfo, QueryFilter };
```
