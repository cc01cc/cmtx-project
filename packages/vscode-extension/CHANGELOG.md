# @cmtx/vscode-extension 更新日志 / Changelog

## [0.1.3] - 2026-05-06

### Added

- **`frontmatter-slug` Rule 接入**: 新增 `cmtx.rule.frontmatter-slug` 命令，支持三种策略（transform/extract/ai）生成 frontmatter slug 字段
- **`transfer-images` Rule 接入**: 新增 `cmtx.rule.transfer-images` 命令，支持跨存储图片转移功能（复制/移动）
- **Transfer 服务配置**: `setupRuleEngineServices()` 支持注册 `TransferAssetsService`，实现源存储到目标存储的图片转移

### Changed

- **配置解析**: `cmtx-config.ts` 新增 `getTransferConfigFromCmtx()` 函数，支持解析 `rules.transfer-images` 配置

---

### Added

- **`frontmatter-slug` Rule**: New `cmtx.rule.frontmatter-slug` command supporting three strategies (transform/extract/ai) for frontmatter slug generation
- **`transfer-images` Rule**: New `cmtx.rule.transfer-images` command for cross-storage image transfer (copy/move)
- **Transfer Service Config**: `setupRuleEngineServices()` now registers `TransferAssetsService` for source-to-target storage transfer

### Changed

- **Config Parsing**: `cmtx-config.ts` added `getTransferConfigFromCmtx()` function for parsing `rules.transfer-images` config

## [0.1.2] - 2026-05-05

### Added

- **Explorer 右键菜单**: `.md` 文件右键 "Upload all images"、目录右键 "Upload images in markdowns" 和 "Safe delete unreferenced images"。底层新增 `batchUploadImages()` 统一上传 API、`FileAccessor` 策略接口
- **Explorer 上传写回**: 上传完成后自动将 markdown 中的本地图片引用替换为云端 URL，添加 `withProgress` 进度条
- **Explorer 右键下载**: `.md` 文件右键 "Download images in file"，不依赖存储配置，直接 HTTP 下载
- **Toggle Presigned URLs**: 新增 `cmtx.togglePresignedUrls` 命令，支持一键切换预签名 URL 功能的开启/关闭
- **Presigned URLs Setting**: 新增 VS Code setting `cmtx.presignedUrls.enabled`，在 Settings UI 中持久化控制预签名 URL 功能
- **用户文档**: 新增 USR-001（安装与快速开始）和 USR-002（命令参考），README 精简为功能列表和文档链接导航

### Changed

- **命令分组重构**: 图片相关命令 ID 从 `cmtx.*` 重命名为 `cmtx.image.*`（`cmtx.uploadSelected` -> `cmtx.image.upload`、`cmtx.download` -> `cmtx.image.download` 等 7 个命令）。非图片命令及 `cmtx.rule.*` 前缀保持不变
- **`initializePresignedUrl` 签名简化**: config 解析逻辑移至 `@cmtx/asset`，VS Code 侧只做 adapter 创建
- **Explorer 上传改用 `publishAndReplaceFile`**: 从直接调用 `batchUploadImages` 切换为通过 rule engine 路径，支持模板变量渲染
- **`resize-image` Rule 集成**: `zoomIn`/`zoomOut`/`setImageWidth` 命令改为通过 rule engine 执行
- **`cmtx.togglePresignedUrls` 不再需要 reload window**: toggle 命令和修改 `cmtx.presignedUrls.enabled` 后立即生效，预览自动刷新

### Fixed

- **`download-images` Rule 服务注册**: 修复未注册 `DownloadAssetsService` 导致下载功能不可用的问题
- **`upload-images` rule `baseDirectory` 传值**: 现在正确使用编辑器文件所在目录而非 workspace 根目录解析相对图片路径
- **Schema 文件复制**: `cmtx.configInit` 创建配置时 schema 文件复制支持 F5 开发环境，失败时弹窗警告

### Removed

- **`cmtx.image.download` 命令**: 非 Rule 遗留命令，功能已被 `cmtx.rule.download-images` 覆盖
- **`conflict-strategy-picker` 中 `download-all`**: 该策略从未实现

---

### Added

- **Explorer context menus**: "Upload all images" on `.md` files, "Upload images in markdowns" and "Safe delete unreferenced images" on directories. New `batchUploadImages()` API and `FileAccessor` strategy interface
- **Explorer upload write-back**: Auto-replace local image references with cloud URLs after upload, with `withProgress` progress bar
- **Explorer right-click download**: "Download images in file" on `.md` files, direct HTTP download without storage config
- **Toggle Presigned URLs**: New `cmtx.togglePresignedUrls` command for one-click toggle
- **Presigned URLs Setting**: New `cmtx.presignedUrls.enabled` VS Code setting for persistent control
- **User docs**: New USR-001 (Getting Started) and USR-002 (Commands Reference), simplified README

### Changed

- **Command grouping restructured**: Image-related command IDs renamed from `cmtx.*` to `cmtx.image.*` for 7 commands. Non-image commands and `cmtx.rule.*` prefixes unchanged
- **`initializePresignedUrl` signature simplified**: Config parsing moved to `@cmtx/asset`; VS Code side only handles adapter creation
- **Explorer upload uses `publishAndReplaceFile`**: Switched from direct `batchUploadImages` to rule engine path with template variable support
- **`resize-image` Rule integration**: `zoomIn`/`zoomOut`/`setImageWidth` commands now execute through rule engine
- **`cmtx.togglePresignedUrls` no longer requires reload**: Toggle command and setting changes take effect immediately

### Fixed

- **`download-images` Rule service registration**: Fixed missing `DownloadAssetsService` registration causing download functionality failure
- **`upload-images` rule `baseDirectory`**: Now correctly resolves relative image paths from editor file directory instead of workspace root
- **Schema file copy**: `cmtx.configInit` now supports F5 development environment; shows dialog warning on failure

### Removed

- **`cmtx.image.download` command**: Legacy non-Rule command, superseded by `cmtx.rule.download-images`
- **`conflict-strategy-picker` `download-all`**: Feature never implemented

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
- @cmtx/rule-engine: 发布工作流的工作空间依赖
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
- @cmtx/rule-engine: Workspace dependency for publishing workflow
- @cmtx/storage: Workspace dependency for storage adapters
