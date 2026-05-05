---
title: USR-003 - 配置指南
---

# USR-003: 配置指南

## 环境变量

凭证可通过环境变量传入，避免在命令历史中暴露敏感信息。
完整环境变量清单请参考 [CFG-001 配置参考](../../../docs/CFG-001-configuration-reference.md#环境变量)。

## 配置文件

`copy` 和 `move` 命令支持 YAML 配置文件：

```bash
cmtx image copy ./article.md --config ./cmtx.config.yaml
```

配置文件参见 `cmtx.config.yaml.example`。
