---
title: USR-001 - 安装与配置
---

# USR-001: 安装与配置

## 安装

```bash
pnpm install @cmtx/mcp-server
```

## Claude Desktop 配置

完整环境变量名请参考 [CFG-001 配置参考](../../../docs/CFG-001-configuration-reference.md#环境变量)。

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

## Claude Code / Cursor

```bash
claude mcp add cmtx npx -y @cmtx/mcp-server
```
