# @cmtx/rule-engine 更新日志 / Changelog

## [0.2.0-alpha.3] - 2026-05-06

### Added

- **frontmatter-slug Rule**: 新增规则，支持 transform/extract/ai 三种 slug 生成策略
  - 集成 `@cmtx/ai` 包，支持 AI 驱动的 slug 生成
- **transfer-images Rule**: 新增规则，支持跨存储图片转移
- **FF1 Config Decoupling**: `ff1` 新增可选 `length`/`radix` 字段，可独立覆盖 counter 格式配置
  - `ff1.useCounter` 引用的 counter ID 不存在时返回可读错误，而非静默降级
- **Config Type Extensions**: 新增 counter、FF1、slug、transfer 等配置类型

### Changed

- **ID Generator**: 重构为多 counter 模板化 ID 生成
- **Counter Service**: 新增 `peek()`/`commit()` 模式，支持多 counter 状态管理
- **formatForPublish**: 更新适配新的 template 化 ID 生成
- **Counter Config**: 格式配置从顶层移至规则级别，简化配置结构

### Removed

- **id-generate-rule**: 移除废弃的 ID 生成规则

---

### Added

- **frontmatter-slug Rule**: New rule supporting three slug strategies: transform, extract, and AI
  - Integrated with `@cmtx/ai` for AI-powered slug generation
- **transfer-images Rule**: New rule for cross-storage image transfer
- **FF1 Config Decoupling**: Added optional `length`/`radix` fields to `ff1` for independent counter format config
  - `ff1.useCounter` now returns a readable error for invalid counter IDs instead of silent fallback
- **Config Type Extensions**: New counter, FF1, slug, and transfer config types

### Changed

- **ID Generator**: Refactored to multi-counter template-based ID generation
- **Counter Service**: New `peek()`/`commit()` pattern for multi-counter state management
- **formatForPublish**: Updated to support template-based ID generation
- **Counter Config**: Moved from top-level to rule-level, simplifying configuration structure

### Removed

- **id-generate-rule**: Removed deprecated ID generation rule

## [0.2.0-alpha.2] - 2026-05-05

### Breaking Changes

- **包重命名**: `@cmtx/publish` 重命名为 `@cmtx/rule-engine`

  迁移指南：

  ```diff
  - import { createDefaultRuleEngine } from "@cmtx/publish";
  + import { createDefaultRuleEngine } from "@cmtx/rule-engine";
  - import { publishAndReplaceFile } from "@cmtx/publish/node";
  + import { publishAndReplaceFile } from "@cmtx/rule-engine/node";
  ```

### Added

- **transfer-images rule**: 新增跨存储图片转移规则，`createRuleEngineContext` 支持 upload / download / transfer 三组独立配置
- **resize-image rule**: 新增 `selection` 配置支持，允许只处理文档中的指定选区

### Changed

- 移除 `asset-service-wrapper.ts` 和 `core-service-wrapper.ts`（重复实现，改为从 `@cmtx/asset` 导入）
- `Service<TConfig>` 接口、`AssetService`、`CoreService` 类型改从 `@cmtx/asset` 统一导入

---

### Breaking Changes

- **Package rename**: `@cmtx/publish` renamed to `@cmtx/rule-engine`

  Migration guide:

  ```diff
  - import { createDefaultRuleEngine } from "@cmtx/publish";
  + import { createDefaultRuleEngine } from "@cmtx/rule-engine";
  - import { publishAndReplaceFile } from "@cmtx/publish/node";
  + import { publishAndReplaceFile } from "@cmtx/rule-engine/node";
  ```

### Added

- **transfer-images rule**: New cross-storage image transfer rule, `createRuleEngineContext` supports upload / download / transfer config groups
- **resize-image rule**: Added `selection` config support for processing specific document sections

### Changed

- Removed `asset-service-wrapper.ts` and `core-service-wrapper.ts` (duplicated implementations, now imported from `@cmtx/asset`)
- `Service<TConfig>`, `AssetService`, `CoreService` types now imported from `@cmtx/asset`

## [0.1.1-alpha.1] - 2026-04-30

### Added

- **createDefaultRuleEngine**: 新增默认规则引擎工厂函数，统一 CLI/MCP 的规则引擎入口
- **Service 模式**: 新增 `AssetServiceWrapper`、`CoreServiceWrapper`、`ServiceRegistryImpl` 服务包装层
- **CounterService**: 新增计数器服务，支持 Frontmatter ID 规则防止失败时错误递增
- **Metadata 规则**: 新增 `frontmatter-date` 和 `frontmatter-updated` 字段管理规则
- **图片调整规则**: 新增图片尺寸调整规则
- **MemoryDocumentAccessor**: 新增内存文档访问器工具

### Changed

- **autocorrect**: 从 `@huacnlee/autocorrect` 迁移至 `@cmtx/autocorrect-wasm`
- **配置加载**: 重构项目结构，移除 `loader.ts`、`parse.ts`、`validate.ts`、`apply.ts`（YAML 规则系统），统一配置加载架构
- 替换 `fast-glob` 为 `tinyglobby`，提升 ESM/CJS 兼容性
- **RuleContext 重构**: 移除 `storage`/`presignedUrls` 直接字段，替换为 `services: ServiceRegistry`。规则作者需通过 `services.storage` 和 `services.presignedUrls` 访问
- **依赖更新**: 新增 `@cmtx/asset`（workspace:\*）和 `@cmtx/storage`（0.1.1-alpha.0）依赖；`@cmtx/fpe-wasm` 从 `optionalDependencies` 移至 `dependencies`

### Fixed

- 修复无效的动态导入（`INEFFECTIVE_DYNAMIC_IMPORT` 警告）
- 修复 TypeScript 编译错误

### Removed

- 移除废弃的示例脚本
- **类型清理**: 移除 `AdaptRule`、`AdaptConfig`、`AdaptFileOptions`、`AdaptDirectoryOptions`、`AdaptPlatform`、`PlatformAdapter` 类型
- **目录重命名**: `platform/` 目录重命名为 `preset/`，影响使用深度导入路径的消费者

---

### Added

- **createDefaultRuleEngine**: New default rule engine factory function, unifying CLI/MCP rule engine entry points
- **Service pattern**: Added `AssetServiceWrapper`, `CoreServiceWrapper`, `ServiceRegistryImpl` service wrapper layer
- **CounterService**: Added counter service supporting Frontmatter ID rule to prevent incorrect increments on failure
- **Metadata rules**: Added `frontmatter-date` and `frontmatter-updated` field management rules
- **Image resize rules**: Added image dimension adjustment rules
- **MemoryDocumentAccessor**: Added in-memory document accessor utility

### Changed

- **autocorrect**: Migrated from `@huacnlee/autocorrect` to `@cmtx/autocorrect-wasm`
- **Config loading**: Restructured project, removed `loader.ts`, `parse.ts`, `validate.ts`, `apply.ts` (YAML rule system), unified config loading architecture
- Replaced `fast-glob` with `tinyglobby` for improved ESM/CJS compatibility
- **RuleContext redesign**: Removed `storage`/`presignedUrls` direct fields, replaced by `services: ServiceRegistry`. Rule authors should access via `services.storage` and `services.presignedUrls`
- **Dependency changes**: Added `@cmtx/asset` (workspace:\*) and `@cmtx/storage` (0.1.1-alpha.0) dependencies; moved `@cmtx/fpe-wasm` from `optionalDependencies` to `dependencies`

### Fixed

- Fixed ineffective dynamic imports (`INEFFECTIVE_DYNAMIC_IMPORT` warnings)
- Fixed TypeScript compilation errors

### Removed

- Removed deprecated example scripts
- **Type cleanup**: Removed `AdaptRule`, `AdaptConfig`, `AdaptFileOptions`, `AdaptDirectoryOptions`, `AdaptPlatform`, `PlatformAdapter` types
- **Directory rename**: Renamed `platform/` directory to `preset/`, affecting consumers using deep import paths

## 0.1.2-alpha.0

### Breaking Changes

- **frontmatterIdRule**: 移除 `idSource` 配置项，使用 `strategy` 替代

### Migration Guide

- 将 `idSource` 配置项替换为 `strategy`：

  ```typescript
  // 旧配置
  {
    idSource: "filepath";
  }

  // 新配置
  {
    strategy: "filepath";
  }
  ```

## 0.1.1-alpha.0

### Patch Changes

- 7d85dec: changeset test
- Updated dependencies [7d85dec]
  - @cmtx/asset@0.1.1-alpha.0
  - @cmtx/core@0.3.1-alpha.0
  - @cmtx/fpe-wasm@0.1.1-alpha.0
  - @cmtx/template@0.1.1-alpha.0

## 0.1.0 - 2026-04-11

### 初始发布

#### 功能特性

**元数据管理**

- 从 Markdown 文件中提取元数据（Frontmatter、标题、文件名）
- 按元数据查询和筛选 Markdown 文件
- 为文档生成唯一 ID
- 管理文档发布状态

**平台适配**

- 微信公众号平台适配器
- 知乎平台适配器
- CSDN 平台适配器
- 可扩展的适配器架构，支持自定义平台

**文档渲染**

- Markdown 转 HTML 转换
- 平台特定的渲染规则
- 基于 @cmtx/template 的模板渲染
- 发布图片处理和优化

**发布工作流**

- 发布前验证 Markdown 文档
- 处理发布图片（上传、转换）
- 针对特定平台格式化文档
- 支持批量处理

#### API 接口

- `MarkdownMetadataExtractor` - 提取和管理文档元数据
- `MarkdownFileQuery` - 查询和筛选 Markdown 文件
- `IdGenerator` - 生成唯一文档 ID
- `adaptMarkdown()` - 针对特定平台适配文档
- `renderMarkdown()` - 将 Markdown 渲染为 HTML
- `validateMarkdown()` - 发布前验证文档
- `processImagesForPublish()` - 处理发布图片
- `formatForPublish()` - 格式化文档用于发布

#### 依赖

- @cmtx/core: Markdown 处理核心
- @cmtx/asset: 资产管理（上传、转移）
- @cmtx/template: 模板渲染引擎
- @cmtx/fpe-wasm: 用于 ID 生成的格式保留加密
- @huacnlee/autocorrect: 中文文本校正
- unified/remark/rehype: Markdown 处理生态系统

---

### Initial Release

#### Features

**Metadata Management**

- Extract metadata from Markdown files (Frontmatter, headings, filename)
- Query and filter Markdown files by metadata
- Generate unique IDs for documents
- Manage document publication status

**Platform Adaptation**

- WeChat platform adapter
- Zhihu platform adapter
- CSDN platform adapter
- Extensible adapter architecture for custom platforms

**Document Rendering**

- Markdown to HTML conversion
- Platform-specific rendering rules
- Template-based rendering with @cmtx/template
- Image processing and optimization for publishing

**Publishing Workflow**

- Validate Markdown documents before publishing
- Process images for publishing (upload, transform)
- Format documents for specific platforms
- Batch processing support

#### API

- `MarkdownMetadataExtractor` - Extract and manage document metadata
- `MarkdownFileQuery` - Query and filter Markdown files
- `IdGenerator` - Generate unique document IDs
- `adaptMarkdown()` - Adapt documents for specific platforms
- `renderMarkdown()` - Render Markdown to HTML
- `validateMarkdown()` - Validate documents before publishing
- `processImagesForPublish()` - Process images for publishing
- `formatForPublish()` - Format documents for publishing

#### Dependencies

- @cmtx/core: Core markdown processing
- @cmtx/asset: Asset management (upload, transfer)
- @cmtx/template: Template rendering engine
- @cmtx/fpe-wasm: Format-preserving encryption for ID generation
- @huacnlee/autocorrect: Chinese text correction
- unified/remark/rehype: Markdown processing ecosystem
