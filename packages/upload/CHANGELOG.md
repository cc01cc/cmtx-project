# @cmtx/upload Changelog

All notable changes to this project will be documented in this file.

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
