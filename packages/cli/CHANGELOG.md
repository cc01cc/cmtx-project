# @cmtx/cli 更新日志 / Changelog

### Added

- **Logger**: 使用 winston 重构 CLI Logger，支持每日日志轮转
- **Storage Pool**: 支持多存储后端配置，适配 v2 存储池配置结构
- **namingTemplate**: 新增 `namingTemplate` 选项支持

### Changed

- **Rule Engine**: 集成 `@cmtx/publish` 的规则引擎，统一 CLI 和 MCP 命令
- **配置加载**: 配置验证和加载逻辑迁移至 `@cmtx/asset`
- **构建迁移**: 构建系统从 `tsc` 迁移至 `tsdown`，新增 `tsdown.config.ts`
- **Node.js 版本要求**: Node.js 最低版本从 `>=18.0.0` 提升至 `>=22.0.0`
- **二进制文件路径**: `bin` 字段从 `./dist/bin/cmtx.js` 变更为 `./dist/cli.mjs`
- **双格式构建**: `exports` 新增 ESM 和 CJS 双格式入口

### Fixed

- 修复 `cmtx adapt` 和 `cmtx download` 命令的日志方法
- 修复 TypeScript 编译错误（缺少 `createRuleEngine` 导入）
- 修复 DeleteConfig 类型错误

---

### Added

- **Logger**: Refactored CLI Logger with winston, supporting daily log rotation
- **Storage Pool**: Support for multi-backend storage configuration with v2 pool config structure
- **namingTemplate**: Added `namingTemplate` option support

### Changed

- **Rule Engine**: Integrated `@cmtx/publish` rule engine, unifying CLI and MCP commands
- **Config Loading**: Configuration validation and loading migrated to `@cmtx/asset`
- **Build Migration**: Build system migrated from `tsc` to `tsdown`; added `tsdown.config.ts`
- **Node.js Version Requirement**: Minimum Node.js version raised from `>=18.0.0` to `>=22.0.0`
- **Binary Path**: `bin` field changed from `./dist/bin/cmtx.js` to `./dist/cli.mjs`
- **Dual Format Build**: `exports` now provides both ESM and CJS entry points

### Fixed

- Fixed logging methods for `cmtx adapt` and `cmtx download` commands
- Fixed TypeScript compilation error (missing `createRuleEngine` import)
- Fixed `DeleteConfig` type error

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

- 基于 @cmtx/publish、@cmtx/core 和 @cmtx/asset 构建
- 支持 Node.js 18.0.0 或更高版本
- ESM 模块格式
- 完整的 TypeScript 类型定义支持

#### 依赖

- @cmtx/publish: 发布工作流
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

- Built on top of @cmtx/publish, @cmtx/core, and @cmtx/asset
- Supports Node.js 18.0.0 or higher
- ESM module format
- TypeScript support with full type definitions

#### Dependencies

- @cmtx/publish: Publishing workflow
- @cmtx/core: Core markdown processing
- @cmtx/asset: Asset management
- ali-oss: Aliyun OSS SDK
- chalk: Terminal styling
- ora: Loading indicators
- yargs: Command-line argument parsing
