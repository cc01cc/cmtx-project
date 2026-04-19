# @cmtx/cli 更新日志 / Changelog

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
