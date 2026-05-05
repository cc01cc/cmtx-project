---
title: USR-001 - 安装与快速开始
---

# USR-001: 安装与快速开始

## 安装

从 VS Code Marketplace 安装 `cc01cc.cmtx-vscode`，或使用命令：

```bash
code --install-extension cc01cc.cmtx-vscode
```

## 要求

- VS Code 1.110.0 或更高版本
- Node.js 18.0.0 或更高版本

## 快速上手

1. 安装扩展后，使用命令面板（Ctrl+Shift+P）搜索 `CMTX:` 查看所有可用命令
2. 运行 `CMTX: Create configuration...` 创建 `.cmtx/config.yaml` 配置文件
3. 配置云存储凭证（参见 [USR-003 - 配置指南](./USR-003-configuration.md)）
4. 使用 `CMTX: Upload selected images` 上传 Markdown 中的本地图片
