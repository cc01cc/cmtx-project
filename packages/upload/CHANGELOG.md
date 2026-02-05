# @cmtx/upload Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Fixed

- **#BUG-位置偏移**: 修复单个 Markdown 文件中包含 3 个或更多不同图片时的文件损坏问题
  - 问题：当替换 3+ 图片时，使用循环中累积的替换导致位置偏移，产生文本重叠（如 `![Banner](...)es/ba![Icon](...)`）
  - 原因：原始代码在循环中多次调用 `replaceImagesInText()`，每次使用过时的位置信息到已修改的内容上应用
  - 解决：改为一次性收集所有替换任务，使用单个 MagicString 按倒序处理所有图片，避免位置累积偏移

### Tests

- 增强测试设计：实施 8 层验证策略，从返回值到文件完整性
  - 核心测试：添加详细注释说明为什么需要 3+ 图片的测试
  - 验证层级：返回值 → 计数 → 完整语法 → 原始值不变性 → 文本重叠检查 → 结构完整性 → 内容保留 → 一致性检查
  - 防护机制：防止类似"位置偏移"的累积修改 bug 在未来重复出现
  - 文档化：将 bug 分析整合到测试注释中，便于代码审查和维护理解

## 0.1.0 - 2026-01-22

### Added

#### 核心功能

- `analyzeImages`: 分析本地图片引用，统计文件大小和引用情况
- `uploadImage`: 上传单个图片并自动替换 Markdown 引用
- `uploadAndReplace`: 批量上传所有本地图片（串行执行，支持错误恢复）

#### 适配器

- `AliOSSAdapter`: 阿里云 OSS 存储适配器实现

#### 功能特性

- 路径安全验证（所有操作限制在 projectRoot 内）
- 文件大小限制（默认 10MB，可配置）
- 扩展名白名单过滤（默认支持 jpg/jpeg/png/gif/svg/webp）
- 事件回调机制（scan/upload/replace/complete 等事件）
- Dry-run 模式支持（预览而不实际执行）
- 可选的 logger 回调（调试和监控）
- 上传前缀配置（组织 OSS 文件结构）

#### 类型定义

- `IStorageAdapter`: 存储适配器接口（支持自定义实现）
- `UploadOptions`: 上传选项配置
- `UploadEvent`: 事件类型定义
- `UploadResult`: 单个文件上传结果
- `UploadAnalysis`: 图片分析结果

#### 文档和示例

- 完整的 README 文档（中文）
- 4 个使用示例：
  - 分析本地图片引用
  - 上传单个图片
  - 批量上传
  - 阿里云 OSS 完整示例
- TypeScript 类型声明和 JSDoc 注释

#### 测试

- 10 个测试用例全部通过
- 覆盖核心功能、路径验证、事件回调、错误处理

#### 依赖

- 依赖 @cmtx/core（workspace）
- ali-oss 作为 peerDependency（可选）
