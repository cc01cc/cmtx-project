# @cmtx/asset 更新日志 / Changelog

## [0.2.0-alpha.2] - 2026-05-05

### Breaking Changes

- **配置层级调整**: 移除顶层 `upload` 和 `resize` 配置字段，迁移到 `rules.upload-images` 和 `rules.resize-image`
- **移除类型导出**: `CmtxUploadConfig`、`CmtxResizeConfig`、`CmtxResizeDomain`、`DeleteConfig`、`SafeDeleteStrategy`
- **Upload pipeline 重构**: `UploadConfig.delete`、`UploadPipelineInput.selection`、`upload-context.ts`、`ConfigBuilder.delete()` / `noDelete()` 已移除。`uploadLocalImageInMarkdown()` 已移除，改用 `executeUploadPipeline()`。`buildPipelineResult` 签名变更（移除 `deleted` 和 `applied` 参数）
- **PresignedUrl 凭证重构**: `CmtxPresignedUrlDomain` 移除 `provider`、`bucket`、`region`、`accessKeyId`、`accessKeySecret` 内联凭证字段，`useStorage` 改为必填。`initializePresignedUrl` 签名变更

### Added

- **URL 存在性检测**: 新增 `checkUrlExists()`（单 URL）和 `checkUrlExistsBatch()`（批量）函数，支持超时控制、自定义请求头和 HEAD 降级策略
- **文本 URL 提取**: 新增 `extractUrlsFromText()` 和 `checkUrlsInText()` 函数，从文本中提取 URL 并批量检测
- **JSON Schema 生成**: 从 TypeScript 类型自动生成 `cmtx.schema.json`，构建时产出，配置模板首行添加 `$schema` modeline
- **类型迁移**: 从 `@cmtx/core` 迁入 `DeletionStrategy`、`DeleteFileOptions`、`DeleteFileResult`、`FileReplaceResult`、`DirectoryReplaceResult` 类型定义
- **Service 层**: 新增 `CoreService`、`createCoreService`、`Service<TConfig>` 接口、`AssetService`、`AssetServiceConfig`、`CoreServiceConfig` 公共导出
- **清理未引用图片**: 新增 `DeleteService.pruneDirectory()` 方法及 `PruneOptions`、`PruneEntry`、`PruneResult` 类型
- **服务拆分**: 拆分 AssetService 为 UploadService（单存储上传）、DownloadAssetsService（多存储下载）、TransferAssetsService（跨存储转移），AssetService 保留为 deprecated 兼容层
- **download-images**: 新增 `download-images` 默认配置到 `DEFAULT_CONFIG` 和模板
- **HEAD 降级策略**: HEAD 请求返回 405/501 时自动降级为 GET + `Range: bytes=0-0`

### Changed

- **配置模板**: `$schema` modeline 路径修复 `./.cmtx/config.schema.json` -> `./config.schema.json`
- **配置模板**: `DEFAULT_CONFIG_TEMPLATE` 移除废弃顶层 `upload` 字段，改为 `rules.upload-images`
- **`baseDirectory` -> `basePath`**: `UploadPipelineInput` 和 `uploadImagesInDocument()` 形参重命名，配合 `stat` 自动检测
- **`renderTemplate`**: 未定义的模板变量不再保留字面量占位符，改为替换为空字符串
- **命名模板**: 未知变量通过 `Logger.warn` 输出警告
- **`parseStorages`**: 敏感字段明文时从抛错改为 `consoleLogger.warn`
- Schema 复制失败不再静默吞错误，改为显示警告信息

### Fixed

- **`AssetService.deleteImage()`**: 修复空实现，现可正确删除本地图片
- 移除 `upload-service.ts` 遗留死代码
- 移除 `upload-images` 默认配置中的 `width: 800`（非规则参数）

---

### Breaking Changes

- **Config restructuring**: Removed top-level `upload` and `resize` config fields, migrated to `rules.upload-images` and `rules.resize-image`
- **Type exports removed**: `CmtxUploadConfig`, `CmtxResizeConfig`, `CmtxResizeDomain`, `DeleteConfig`, `SafeDeleteStrategy`
- **Upload pipeline refactored**: `UploadConfig.delete`, `UploadPipelineInput.selection`, `upload-context.ts`, `ConfigBuilder.delete()`/`noDelete()` removed. `uploadLocalImageInMarkdown()` removed, use `executeUploadPipeline()` instead. `buildPipelineResult` signature changed
- **PresignedUrl credential refactoring**: `CmtxPresignedUrlDomain` inline credential fields removed, `useStorage` now required. `initializePresignedUrl` signature changed

### Added

- **URL existence check**: New `checkUrlExists()` (single URL) and `checkUrlExistsBatch()` (batch) functions with timeout control, custom headers, and HEAD fallback strategy
- **Text URL extraction**: New `extractUrlsFromText()` and `checkUrlsInText()` functions for extracting and checking URLs from text
- **JSON Schema generation**: Auto-generated `cmtx.schema.json` from TypeScript types, `$schema` modeline added to config template
- **Type migration**: `DeletionStrategy`, `DeleteFileOptions`, `DeleteFileResult`, `FileReplaceResult`, `DirectoryReplaceResult` types moved from `@cmtx/core`
- **Service layer**: New `CoreService`, `createCoreService`, `Service<TConfig>` interface, `AssetService`, `AssetServiceConfig`, `CoreServiceConfig` public exports
- **Unreferenced image cleanup**: New `DeleteService.pruneDirectory()` method with `PruneOptions`, `PruneEntry`, `PruneResult` types
- **Service split**: AssetService split into UploadService, DownloadAssetsService, TransferAssetsService; AssetService retained as deprecated compatibility layer
- **download-images**: Default configuration added to `DEFAULT_CONFIG` and template
- **HEAD fallback**: Auto-fallback from HEAD to GET + `Range: bytes=0-0` on 405/501

### Changed

- **Config template**: Fixed `$schema` modeline path `./.cmtx/config.schema.json` -> `./config.schema.json`
- **Config template**: Removed deprecated top-level `upload` field from `DEFAULT_CONFIG_TEMPLATE`
- **`baseDirectory` -> `basePath`**: `UploadPipelineInput` and `uploadImagesInDocument()` parameter renamed for `stat` auto-detection
- **`renderTemplate`**: Undefined template variables replaced with empty string instead of literal placeholders
- **Naming template**: Unknown variables now log warning via `Logger.warn`
- **`parseStorages`**: Plaintext sensitive fields now warn instead of throwing
- Schema copy failures now show warning instead of silent error

### Fixed

- **`AssetService.deleteImage()`**: Fixed empty implementation, now correctly deletes local images
- Removed dead code in `upload-service.ts`
- Removed `width: 800` from `upload-images` default config (not a rule parameter)

## [Unreleased]

### Breaking Changes

- **`pipeline.ts` / `executeUploadPipeline` 已移除** — 改用 `batchUploadImages()` + `matchesToSources()` + `renderReplacementText()` + `applyReplacementOps()`
- **`uploader.ts` 已删除** — 该文件仅 re-export pipeline
- **`ConflictResolutionStrategy` 移除 `download-all` 变体** — 该功能从未实际实现
- **`UploadConfig.delete` 已移除** — 删除不是 upload 的职责，调用者自行决定是否删除已上传的文件（对应 CLI `--enable-delete` 暂未实现）
- **`UploadPipelineInput.selection` 已移除** — 改用 `selections[]` 数组
- **`upload-context.ts` 已删除** — `UploadContext` 已内联到 `UploadProcessingState`，不再对外导出
- **`buildPipelineResult` 签名变更** — 移除 `deleted` 和 `applied` 参数
- **`uploadLocalImageInMarkdown()` 已移除** — 改用 `executeUploadPipeline()` 直连
- **`ConfigBuilder.delete()` / `noDelete()` 已移除**

### Changed

- **`baseDirectory` → `basePath`** — `UploadPipelineInput` 和 `uploadImagesInDocument()` 形参重命名，配合 `stat` 自动检测文件/目录
- **`DocumentAccessor.applyReplacements` 标记 `@deprecated`** — pipeline 不再调用此方法，写回是调用者职责
- **`processMatchEntry` 拆分为子函数** — 提高可维护性
- **`conflictReplaceCount` 替代 `applied` 计算 `replacedCount`**
- **pipeline 不再处理本地文件删除** — `removeUploadedLocals` 已移除
- **`batchUploadImages()` 新增 `renderReplacementText()` 和 `applyReplacementOps()` 导出** — 由 pipeline.ts 提取，供 `AssetService` 和 `upload-and-replace` 共用
- **`AssetService.uploadImagesInDocument()` 改用 `batchUploadImages`** — 移除对 `executeUploadPipeline` 的依赖

## [0.1.1-alpha.1] - 2026-04-30

### Added

- **Storage Pool**: 支持多存储后端配置（v2），存储配置重构
- **进度追踪**: 新增上传进度跟踪功能（`ProgressTracker`）
- **冲突处理**: 上传冲突处理策略（`conflictResolution`），可配置覆盖/跳过/重命名
- **完成统计**: 上传完成后输出详细统计信息（成功/失败/跳过数量）
- **环境变量替换**: 支持配置中的 `${ENV_VAR}` 环境变量替换
- **临时目录管理**: 新增临时文件目录管理工具
- **FileService**: 新增文件服务模块，替代直接的 `@cmtx/core` 函数调用
- **DeleteService**: 新增删除服务模块，封装文件删除逻辑
- **AssetService**: 新增资产管理服务模块

### Changed

- **配置架构**: 配置验证和加载逻辑从 VS Code 扩展迁移至 `@cmtx/asset`，配置集中管理
- **日志系统**: 日志回调从函数类型 `LoggerCallback` 变更为对象类型 `Logger`（`.debug()/.info()/.error()`），破坏性变更
- **命名模板**: 优化命名模板渲染，支持更多内置变量
- **类型重命名**: `StorageOptions` -> `StorageConfig`、`DeleteOptions` -> `DeleteConfig`、`ReplaceOptions` -> `ReplaceConfig`、`EventOptions` -> `EventConfig`（保留类型别名以兼容旧代码）
- **Uploader API**: 移除 `UploadOptions | LoggerCallback` 第三参数重载，仅保留对象参数形式
- 更新 Vitest 配置，简化 workspace 定义

### Removed

- **renderTemplateImage**: 移除 `renderTemplateImage()` 方法，改为委托 `@cmtx/template` 的 `renderTemplate()` 并传入 `emptyString: "preserve"` 选项

### Fixed

- 修复多图片替换时的位置偏移 bug

---

### Added

- **Storage Pool**: Support for multi-storage backend configuration (v2), storage config refactored
- **Progress Tracking**: Upload progress tracking (`ProgressTracker`)
- **Conflict Resolution**: Upload conflict resolution strategy (`conflictResolution`) with overwrite/skip/rename options
- **Completion Stats**: Detailed upload statistics upon completion (success/failure/skip counts)
- **Env Var Substitution**: Support for `${ENV_VAR}` environment variable substitution in config
- **Temp Directory Management**: Temporary file directory management utility
- **FileService**: New file service module, replacing direct `@cmtx/core` function calls
- **DeleteService**: New delete service module encapsulating file deletion logic
- **AssetService**: New asset management service module

### Changed

- **Config Architecture**: Config validation and loading logic migrated from VS Code extension to `@cmtx/asset` for centralized management
- **Logger**: Logger callback changed from function type `LoggerCallback` to object type `Logger` (`.debug()/.info()/.error()`), breaking change
- **Naming Template**: Optimized naming template rendering with more built-in variables
- **Type Renames**: `StorageOptions` -> `StorageConfig`, `DeleteOptions` -> `DeleteConfig`, `ReplaceOptions` -> `ReplaceConfig`, `EventOptions` -> `EventConfig` (type aliases preserved for backward compatibility)
- **Uploader API**: Removed `UploadOptions | LoggerCallback` third-parameter overload, only object parameter form retained
- Updated Vitest config, simplified workspace definition

### Removed

- **renderTemplateImage**: Removed `renderTemplateImage()` method, delegates to `@cmtx/template`'s `renderTemplate()` with `emptyString: "preserve"` option

### Fixed

- Fixed position offset bug during multi-image replacement

## 0.1.2-alpha.0

### Breaking Changes

- **ConfigAdapter**: 移除 `getDeduplicateEnabled()` 方法
- **TransferConfig**: 移除 `namingStrategy` 属性，使用 `namingTemplate` 替代

### Migration Guide

- 移除对 `ConfigAdapter.getDeduplicateEnabled()` 的调用（该方法始终返回 true）
- 将 `namingStrategy` 配置替换为 `namingTemplate`：

  ```typescript
  // 旧配置
  {
    namingStrategy: "preserve";
  }

  // 新配置
  {
    namingTemplate: "{name}{ext}";
  }
  ```

## 0.1.1-alpha.0

### Patch Changes

- 7d85dec: changeset test
- Updated dependencies [7d85dec]
  - @cmtx/core@0.3.1-alpha.0
  - @cmtx/storage@0.1.1-alpha.0
  - @cmtx/template@0.1.1-alpha.0

All notable changes to this project will be documented in this file.

## 0.1.0 - 2026-01-22

### 核心功能

- `analyzeImages`: 分析本地图片引用，统计文件大小和引用情况
- `uploadImage`: 上传单个图片并自动替换 Markdown 引用
- `uploadAndReplace`: 批量上传所有本地图片（串行执行，支持错误恢复）

### 适配器

- `AliOSSAdapter`: 阿里云 OSS 存储适配器实现

### 功能特性

- 路径安全验证（所有操作限制在 projectRoot 内）
- 文件大小限制（默认 10MB，可配置）
- 扩展名白名单过滤（默认支持 jpg/jpeg/png/gif/svg/webp）
- 事件回调机制（scan/upload/replace/complete 等事件）
- Dry-run 模式支持（预览而不实际执行）
- 可选的 logger 回调（调试和监控）
- 上传前缀配置（组织 OSS 文件结构）

### 类型定义

- `IStorageAdapter`: 存储适配器接口（支持自定义实现）
- `UploadOptions`: 上传选项配置
- `UploadEvent`: 事件类型定义
- `UploadResult`: 单个文件上传结果
- `UploadAnalysis`: 图片分析结果

### 文档和示例

- 完整的 README 文档（中文）
- 4 个使用示例：
  - 分析本地图片引用
  - 上传单个图片
  - 批量上传
  - 阿里云 OSS 完整示例
- TypeScript 类型声明和 JSDoc 注释

### 测试

- 10 个测试用例全部通过
- 覆盖核心功能、路径验证、事件回调、错误处理

### 依赖

- 依赖 @cmtx/core（workspace）
- ali-oss 作为 peerDependency（可选）

---

### Core Features

- `analyzeImages`: Analyze local image references, report file sizes and reference counts
- `uploadImage`: Upload a single image and automatically replace Markdown references
- `uploadAndReplace`: Batch upload all local images (serial execution with error recovery)

### Adapters

- `AliOSSAdapter`: Alibaba Cloud OSS storage adapter implementation

### Features

- Path safety validation (all operations scoped within projectRoot)
- File size limit (default 10MB, configurable)
- Extension whitelist filtering (supports jpg/jpeg/png/gif/svg/webp by default)
- Event callback mechanism (scan/upload/replace/complete events)
- Dry-run mode support (preview without actual execution)
- Optional logger callback (debugging and monitoring)
- Upload prefix configuration (organize OSS file structure)

### Type Definitions

- `IStorageAdapter`: Storage adapter interface (supports custom implementations)
- `UploadOptions`: Upload option configuration
- `UploadEvent`: Event type definitions
- `UploadResult`: Single file upload result
- `UploadAnalysis`: Image analysis result

### Documentation and Examples

- Complete README documentation (Chinese)
- 4 usage examples:
  - Analyze local image references
  - Upload a single image
  - Batch upload
  - Alibaba Cloud OSS complete example
- TypeScript type declarations and JSDoc comments

### Tests

- 10 test cases all passing
- Covers core functionality, path validation, event callbacks, error handling

### Dependencies

- Depends on @cmtx/core (workspace)
- ali-oss as peerDependency (optional)
