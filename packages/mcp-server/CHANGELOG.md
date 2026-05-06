# @cmtx/mcp-server 更新日志 / Changelog

## [0.2.0-alpha.1] - 2026-05-06

### Added

- **Transfer Tools**: 新增 `transfer.execute` 工具，支持跨存储图片转移
- **Domain Config**: `transfer.analyze` 和 `transfer.preview` 工具支持 source/target 独立 domain 配置

### Fixed

- **CustomDomain Field**: 修复 `customDomain` 字段名与 `@cmtx/asset/transfer` 接口不匹配的 typecheck 错误

---

### Added

- **Transfer Tools**: New `transfer.execute` tool for cross-storage image transfer
- **Domain Config**: `transfer.analyze` and `transfer.preview` tools support independent source/target domain configuration

### Fixed

- **CustomDomain Field**: Fixed typecheck error where `customDomain` field name mismatched `@cmtx/asset/transfer` interface

## [0.1.1-alpha.0] - 2026-05-05

### Changed

- **Rule Engine**: 集成 `@cmtx/rule-engine` 的规则引擎，统一 CLI 和 MCP 命令
- **RuleEngineAdapter**: 重构为异步工厂方法（`createAsync`）加载内置规则
- **文档重构**: 拆分用户文档到 `docs/` 目录，README 精简为安装说明和文档链接导航
- **构建工具**: 从 `tsc` 迁移到 `tsdown`，新增 `tsdown.config.ts`
- **Node.js 版本**: 引擎要求从 `>=18.0.0` 升级到 `>=22.0.0`

### Added

- **错误处理**: 新增上传命令的错误处理和日志改进

### Fixed

- 修复缺少 `createRuleEngine` 导入导致的 TypeScript 编译错误
- 修复 DeleteConfig 类型错误

---

### Changed

- **Rule Engine**: Integrated `@cmtx/rule-engine` rule engine, unifying CLI and MCP commands
- **RuleEngineAdapter**: Refactored to async factory method (`createAsync`) for built-in rules
- **Docs restructuring**: Split user docs to `docs/` directory, README simplified to installation and navigation
- **Build Tool**: Migrated from `tsc` to `tsdown`, added `tsdown.config.ts`
- **Node.js Version**: Engine requirement bumped from `>=18.0.0` to `>=22.0.0`

### Added

- **Error Handling**: Added upload command error handling and logging improvements

### Fixed

- Fixed missing `createRuleEngine` import causing TypeScript compilation error
- Fixed `DeleteConfig` type error

## 0.1.0 - 2026-04-11

### 初始发布

#### 功能特性

**MCP 协议支持**

- JSON-RPC 2.0 协议实现
- 用于 AI 代理集成的标准输入/输出传输
- 基于工具的 API 设计

**可用工具**

- `scan.analyze` - 分析 Markdown 文档中的图片
- `upload.run` - 上传本地图片到云存储
- `delete.safe` - 安全删除图片（带使用检查）

**AI 代理集成**

- 为 Claude 和其他 AI 助手设计
- 结构化工具响应
- 错误处理和验证

#### 使用方法

```bash
# 启动 MCP 服务器
cmtx-mcp

# 或通过 npx
npx @cmtx/mcp-server
```

#### 技术细节

- 基于 @cmtx/core 和 @cmtx/asset 构建
- 支持 Node.js 18.0.0 或更高版本
- ESM 模块格式
- 完整的 TypeScript 类型定义支持

#### 依赖

- @cmtx/core: Markdown 处理核心
- @cmtx/asset: 资产管理（上传、删除）
- ali-oss: 阿里云 OSS SDK（对等依赖）

#### 集成

此 MCP 服务器可通过添加到 MCP 配置来与 Claude Desktop 等 AI 代理集成：

```json
{
  "mcpServers": {
    "cmtx": {
      "command": "npx",
      "args": ["-y", "@cmtx/mcp-server"]
    }
  }
}
```

---

### Initial Release

#### Features

**MCP Protocol Support**

- JSON-RPC 2.0 protocol implementation
- Stdio transport for AI agent integration
- Tool-based API design

**Available Tools**

- `scan.analyze` - Analyze images in Markdown documents
- `upload.run` - Upload local images to cloud storage
- `delete.safe` - Safely delete images with usage checking

**AI Agent Integration**

- Designed for Claude and other AI assistants
- Structured tool responses
- Error handling and validation

#### Usage

```bash
# Start the MCP server
cmtx-mcp

# Or via npx
npx @cmtx/mcp-server
```

#### Technical Details

- Built on top of @cmtx/core and @cmtx/asset
- Supports Node.js 18.0.0 or higher
- ESM module format
- TypeScript support with full type definitions

#### Dependencies

- @cmtx/core: Core markdown processing
- @cmtx/asset: Asset management (upload, delete)
- ali-oss: Aliyun OSS SDK (peer dependency)

#### Integration

This MCP server can be integrated with AI agents like Claude Desktop by adding to the MCP configuration:

```json
{
  "mcpServers": {
    "cmtx": {
      "command": "npx",
      "args": ["-y", "@cmtx/mcp-server"]
    }
  }
}
```
