# @cmtx/mcp-server

[![npm version](https://img.shields.io/npm/v/@cmtx/mcp-server.svg)](https://www.npmjs.com/package/@cmtx/mcp-server)
[![License](https://img.shields.io/npm/l/@cmtx/mcp-server.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Model Context Protocol (MCP) 服务器，让 AI Agent 直接管理 Markdown 文档中的图片资源。

## 安装

```bash
pnpm install @cmtx/mcp-server
```

## 快速开始

Claude Desktop 配置：

完整环境变量名请参考 [CFG-001 配置参考](../../docs/CFG-001-configuration-reference.md#环境变量)。

```json
{
    "mcpServers": {
        "cmtx": {
            "command": "node",
            "args": ["path/to/mcp-server/dist/bin/cmtx-mcp.js"],
            "env": {
                "CMTX_ALIYUN_REGION": "oss-cn-hangzhou",
                "CMTX_ALIYUN_BUCKET": "my-bucket",
                "CMTX_ALIYUN_ACCESS_KEY_ID": "your-key-id",
                "CMTX_ALIYUN_ACCESS_KEY_SECRET": "your-secret"
            }
        }
    }
}
```

## 文档

- [安装与配置](./docs/USR-001-installation-setup.md)
- [工具参考](./docs/USR-002-tools-reference.md)
- [配置指南](./docs/USR-003-configuration.md)
- [Agent 集成](./docs/USR-004-agent-integration.md)
- [错误处理](./docs/USR-005-error-handling.md)
- [文档索引](./docs/INDEX.md)

## 许可证

Apache-2.0
