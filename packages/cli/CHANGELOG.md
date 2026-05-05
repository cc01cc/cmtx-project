# @cmtx/cli 更新日志 / Changelog

## [0.2.0-alpha.0] - 2026-05-05

### Breaking Changes

- **命令分组重构**: 6 个图片相关命令从顶层移入 `image` 分组：

  - `cmtx copy <file>` -> `cmtx image copy <file>`
  - `cmtx move <file>` -> `cmtx image move <file>`
  - `cmtx upload <file>` -> `cmtx image upload <file>`
  - `cmtx download <file>` -> `cmtx image download <file>`
  - `cmtx analyze <dir>` -> `cmtx image analyze <dir>`
  - `cmtx presign [input]` -> `cmtx image presign [input]`

  顶层命令保持不变：`cmtx config`、`cmtx format`、`cmtx publish`。迁移指南：将脚本中的 `cmtx <command>` 替换为 `cmtx image <command>`。

### Added

- **`cmtx image prune`**: 新增 `cmtx image prune <searchDir>` 命令，清理目录下所有未被引用的图片，支持 `--dry-run`、`--force`、`--yes`、`--strategy`、`--extensions`、`--max-size`、`--output` 选项

### Changed

- **cmtx copy/move/upload/download** 命令内部改用新服务层（TransferAssetsService / UploadService / DownloadAssetsService）
- **文档重构**: 拆分用户文档到 `docs/` 目录，README 精简为安装说明和文档链接导航

### Fixed

- **`upload` 命令**: `baseDirectory` 传值修复，配合 pipeline 的 `basePath` 自动检测，兼容文件路径和目录路径
- **`upload` 命令**: `--enable-delete` 配置声明，删除功能待 `RuleResult` 扩展后实现，目前仅写回文件

---

### Breaking Changes

- **Command grouping restructured**: 6 image-related commands moved from top-level to `image` subcommand group

  Migration: `cmtx <command>` -> `cmtx image <command>` for image commands

### Added

- **`cmtx image prune`**: New `cmtx image prune <searchDir>` command to clean up unreferenced images with `--dry-run`, `--force`, `--yes`, `--strategy`, `--extensions`, `--max-size`, `--output` options

### Changed

- **cmtx copy/move/upload/download** commands now use the new service layer (TransferAssetsService / UploadService / DownloadAssetsService)
- **Docs restructuring**: Split user docs to `docs/` directory, README simplified to installation and navigation

### Fixed

- **`upload` command**: Fixed `baseDirectory` to work with pipeline's `basePath` auto-detection for both file and directory paths
- **`upload` command**: `--enable-delete` config declaration; delete functionality pending `RuleResult` extension

## 0.1.0 - 2026-04-11

### 初始发布

#### 功能特性

**图片分析**

- 分析 Markdown 文件中的本地图片
- 报告图片统计信息（数量、大小、类型）
- 识别损坏或缺失的图片引用

**图片上传**

- 批量上传本地图片到云存储
- 支持阿里云 OSS
- 自动替换 Markdown 图片引用
- 预览更改的干运行模式

**配置管理**

- 交互式配置设置
- 支持环境变量
- 基于 YAML 的配置格式

**命令结构**

- `cmtx analyze <file>` - 分析 Markdown 文件中的图片
- `cmtx upload <file>` - 上传 Markdown 文件中的图片
- `cmtx config init` - 初始化配置

#### 技术细节

- 基于 @cmtx/rule-engine、@cmtx/core 和 @cmtx/asset 构建
- 支持 Node.js 18.0.0 或更高版本
- ESM 模块格式
- 完整的 TypeScript 类型定义支持

#### 依赖

- @cmtx/rule-engine: 发布工作流
- @cmtx/core: Markdown 处理核心
- @cmtx/asset: 资产管理
- ali-oss: 阿里云 OSS SDK
- chalk: 终端样式
- ora: 加载指示器
- yargs: 命令行参数解析

---

### Initial Release

#### Features

**Image Analysis**

- Analyze local images in Markdown files
- Report image statistics (count, size, types)
- Identify broken or missing image references

**Image Upload**

- Batch upload local images to cloud storage
- Support for Aliyun OSS
- Automatic Markdown reference replacement
- Dry-run mode for previewing changes

**Configuration Management**

- Interactive configuration setup
- Support for environment variables
- YAML-based configuration format

**Commands**

- `cmtx analyze <file>` - Analyze images in a Markdown file
- `cmtx upload <file>` - Upload images in a Markdown file
- `cmtx config init` - Initialize configuration

#### Technical Details

- Built on top of @cmtx/rule-engine, @cmtx/core, and @cmtx/asset
- Supports Node.js 18.0.0 or higher
- ESM module format
- TypeScript support with full type definitions

#### Dependencies

- @cmtx/rule-engine: Publishing workflow
- @cmtx/core: Core markdown processing
- @cmtx/asset: Asset management
- ali-oss: Aliyun OSS SDK
- chalk: Terminal styling
- ora: Loading indicators
- yargs: Command-line argument parsing
