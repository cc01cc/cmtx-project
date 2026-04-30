# @cmtx/vscode-extension 更新日志 / Changelog

## [0.1.1] - 2026-05-01

### Added

- **autocorrect-wasm**: 集成 `@cmtx/autocorrect-wasm`，替换 `@huacnlee/autocorrect`
- **WASM 加载**: 新增统一的 WASM 加载机制，增强错误处理和调试日志
- **UnifiedLogger**: 重构日志系统，统一 Output Channel 和 DEBUG CONSOLE 输出
- **进度追踪**: 上传进度跟踪支持，配置驱动的冲突处理
- **完成统计**: 上传完成后显示详细统计信息
- **内置规则加载**: 增强内置规则加载功能

### Changed

- **构建系统**: 迁移至 tsdown，实现 ESM/CJS 双格式构建
- **CJS 兼容**: 新增 CJS Alias 插件解决 ESM/CJS 混用问题
- **WASM 路径**: 统一 WASM 加载路径，支持 VS Code 扩展环境
- **日志系统**: 统一日志与通知系统
- **配置模板**: 配置模板统一从 `@cmtx/asset` 导入

### Fixed

- 修复 `ali-oss` 类型导入错误在扩展构建中的问题
- 修复 VS Code 扩展 ESM/CJS bundle 错误

### Removed

- 移除 `@huacnlee/autocorrect` 依赖

## 0.1.0 - 2026-04-11

### 初始发布

#### 功能特性

**图片管理**

- 上传本地图片到云存储（阿里云 OSS、腾讯云 COS）
- 下载远程图片到本地目录
- 使用预设值调整图片宽度
- 私有存储桶图片的预签名 URL 预览

**文档处理**

- 在 Markdown 和 HTML 格式之间转换图片
- 适配微信公众号、知乎、CSDN 平台
- 分析和报告文档中的图片

**实用工具**

- 查找图片的所有引用
- CMTX 配置初始化向导
- 章节编号管理

#### 命令

| 命令                                      | 描述                        |
| ----------------------------------------- | --------------------------- |
| `CMTX: Upload local images`               | 上传文档中的所有本地图片    |
| `CMTX: Upload selected images`            | 上传选中文字中的图片        |
| `CMTX: Download remote images`            | 下载远程图片到本地          |
| `CMTX: Convert images to HTML format`     | 将 Markdown 图片转换为 HTML |
| `CMTX: Convert images to Markdown format` | 将 HTML 图片转换为 Markdown |
| `CMTX: Set image width`                   | 使用 QuickPick 设置图片宽度 |
| `CMTX: Increase image width`              | 增加图片宽度 (Ctrl+Up)      |
| `CMTX: Decrease image width`              | 减小图片宽度 (Ctrl+Down)    |
| `CMTX: Analyze document images`           | 分析文档中的图片            |
| `CMTX: Find image references`             | 查找选中图片的所有引用      |
| `CMTX: Initialize configuration`          | 创建 CMTX 配置文件          |

#### 快捷键

| 快捷键         | 命令             |
| -------------- | ---------------- |
| `Ctrl+Shift+H` | 转换为 HTML 格式 |
| `Ctrl+Up`      | 增加图片宽度     |
| `Ctrl+Down`    | 减小图片宽度     |

#### 依赖

- @cmtx/asset: 资产管理的工作空间依赖
- @cmtx/core: Markdown 处理核心库的工作空间依赖
- @cmtx/markdown-it-presigned-url: 预签名 URL 支持的工作空间依赖
- @cmtx/markdown-it-presigned-url-adapter-nodejs: Node.js 适配器的工作空间依赖
- @cmtx/publish: 发布工作流的工作空间依赖
- @cmtx/storage: 存储适配器的工作空间依赖

---

### Initial Release

#### Features

**Image Management**

- Upload local images to cloud storage (Aliyun OSS, Tencent COS)
- Download remote images to local directory
- Adjust image width with preset values
- Presigned URL preview for private bucket images

**Document Processing**

- Convert images between Markdown and HTML formats
- Platform adaptation for WeChat, Zhihu, CSDN
- Image analysis and reporting

**Utilities**

- Find all references to an image
- Configuration wizard for CMTX setup
- Section numbering management

#### Commands

| Command                                   | Description                           |
| ----------------------------------------- | ------------------------------------- |
| `CMTX: Upload local images`               | Upload all local images in document   |
| `CMTX: Upload selected images`            | Upload images in selected text        |
| `CMTX: Download remote images`            | Download remote images to local       |
| `CMTX: Convert images to HTML format`     | Convert Markdown images to HTML       |
| `CMTX: Convert images to Markdown format` | Convert HTML images to Markdown       |
| `CMTX: Set image width`                   | Set image width with QuickPick        |
| `CMTX: Increase image width`              | Increase image width (Ctrl+Up)        |
| `CMTX: Decrease image width`              | Decrease image width (Ctrl+Down)      |
| `CMTX: Analyze document images`           | Analyze images in document            |
| `CMTX: Find image references`             | Find all references to selected image |
| `CMTX: Initialize configuration`          | Create CMTX configuration file        |

#### Keyboard Shortcuts

| Shortcut       | Command                |
| -------------- | ---------------------- |
| `Ctrl+Shift+H` | Convert to HTML format |
| `Ctrl+Up`      | Increase image width   |
| `Ctrl+Down`    | Decrease image width   |

#### Dependencies

- @cmtx/asset: Workspace dependency for asset management
- @cmtx/core: Workspace dependency for core markdown processing
- @cmtx/markdown-it-presigned-url: Workspace dependency for presigned URL support
- @cmtx/markdown-it-presigned-url-adapter-nodejs: Workspace dependency for Node.js adapter
- @cmtx/publish: Workspace dependency for publishing workflow
- @cmtx/storage: Workspace dependency for storage adapters
