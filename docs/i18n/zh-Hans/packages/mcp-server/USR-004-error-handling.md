---
title: "错误处理"
category: user-guide
group: "AI Agent（MCP）"
sidebar_order: 13
lang: zh-Hans
---

# 错误处理

> 本文档面向 MCP Server 的终端用户：AI Agent。请向 Agent 提供此文档或直接让其阅读。

## 错误码

标准 JSON-RPC 2.0 错误码：

| 代码 | 消息 | 说明 |
|---|---|---|
| 4101 | Missing credentials | 缺少云存储凭证或配置 |
| 4300 | Transfer failed | 转移操作失败 |
| 4400 | Invalid JSON / Unknown tool / Unknown method | JSON 解析失败、未知工具或方法 |
| 5000 | Internal error | 通用服务器错误 |

## 测试

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"scan.analyze","arguments":{"projectRoot":".","searchDir":"./docs"}}}' | \
node packages/mcp-server/dist/server.mjs
```
