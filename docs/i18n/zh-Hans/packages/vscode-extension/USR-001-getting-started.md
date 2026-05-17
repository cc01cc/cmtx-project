---
title: "快速开始"
category: user-guide
group: "VS Code 扩展"
sidebar_order: 1
lang: zh-Hans
---

# 安装与快速开始

## 安装

从 VS Code Marketplace 安装 `cc01cc.cmtx-vscode`，或使用命令：

```bash
code --install-extension cc01cc.cmtx-vscode
```

## 要求

- VS Code 1.110.0 或更高版本

## VS Code 设置

扩展提供以下 VS Code 设置：

| 设置项 | 类型 | 说明 |
|--------|------|------|
| `cmtx.configDir` | string | CMTX 配置文件目录路径 |
| `cmtx.presignedUrls.enabled` | boolean | 启用预签名 URL 功能 |

在 VS Code 设置中搜索 `cmtx` 即可找到这些选项。

## 快速上手

1. 安装扩展后，使用命令面板（Ctrl+Shift+P）搜索 `CMTX:` 查看所有可用命令
2. 运行 `CMTX: Create configuration...` 创建 `.cmtx/config.yaml` 配置文件
3. 配置云存储凭证（参见 [CFG-001 - 配置参考](../../CFG-001-configuration-reference.md)）
4. 使用 `CMTX: Upload selected images` 上传 Markdown 中的本地图片

## 命令访问方式

扩展命令可通过以下方式访问：

- **命令面板**（Ctrl+Shift+P）：所有 CMTX 命令
- **Explorer 右键菜单**：文件/目录相关命令（仅 Markdown 文件）
- **Editor 右键菜单**：编辑器内命令（需选中内容）

部分命令需要满足特定条件才会显示：
- 缩放命令（`Ctrl+Up`/`Ctrl+Down`）需要选中文本（`editorHasSelection`）
- Explorer 右键命令仅在 Markdown 文件上显示
