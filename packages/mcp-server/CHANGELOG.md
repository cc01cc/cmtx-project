# @cmtx/mcp-server 更新日志 / Changelog

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
