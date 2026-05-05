---
title: USR-005 - 错误处理
---

# USR-005: 错误处理

## 错误码

标准 JSON-RPC 2.0 错误码：

| 代码 | 消息 | 说明 |
|---|---|---|
| 4001 | PATH_OUTSIDE_ROOT | 路径超出项目根目录 |
| 4101 | ADAPTER_UNAVAILABLE | 存储适配器未配置或不可用 |
| 4102 | UNSUPPORTED_PROVIDER | 不支持的云存储提供商类型 |
| 4300 | DELETE_REFERENCED | 图片仍被引用，无法安全删除 |
| 4301 | DELETE_FAILED | 删除操作失败 |
| 4400 | INVALID_ARGS | 参数无效或缺失 |
| 5000 | INTERNAL_ERROR | 通用服务器错误 |

## 测试

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools.call","params":{"name":"scan.analyze","arguments":{"projectRoot":".","searchDir":"./docs"}}}' | \
node packages/mcp-server/dist/bin/cmtx-mcp.js
```
