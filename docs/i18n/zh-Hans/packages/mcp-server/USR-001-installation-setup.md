---
title: "安装与设置"
category: user-guide
group: "AI Agent（MCP）"
sidebar_order: 10
lang: zh-Hans
---

# 安装与配置

> 本文档面向 MCP Server 的终端用户：AI Agent。请向 Agent 提供此文档或直接让其阅读。

## 前置要求

- Node.js >= 22.0.0

## 安装

### 使用 npx（推荐）

```bash
npx -y @cmtx/mcp-server
```

### 使用 pnpm

```bash
pnpm install @cmtx/mcp-server
```

## Claude Desktop 配置

完整环境变量名请参考 [CFG-001 配置参考](../../CFG-001-configuration-reference.md#环境变量)。

```json
{
    "mcpServers": {
        "cmtx": {
            "command": "node",
            "args": ["path/to/mcp-server/dist/server.mjs"],
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

## 环境变量

凭证可通过环境变量或工具调用参数传入。

完整环境变量清单请参考 [CFG-001 配置参考](../../CFG-001-configuration-reference.md#环境变量)。

### 凭证解析流程

```
1. 工具调用参数（如 upload.run 的 region、bucket）
2. 环境变量（CMTX_ALIYUN_*）
3. 配置文件（cmtx.config.yaml）
```

当三个来源任一缺失必要字段时报错。

## 验证安装

测试 MCP 服务器是否正常工作：

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
node packages/mcp-server/dist/server.mjs
```
