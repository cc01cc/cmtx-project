---
title: "命令参考"
category: user-guide
group: "VS Code 扩展"
sidebar_order: 2
lang: zh-Hans
---

# 命令参考

## 命令列表

| 命令 | 描述 |
|---|---|
| `CMTX: Upload selected images` | 上传选中文字中的图片 |
| `CMTX: Upload images in current file` | [Explorer 右键] 上传 .md 文件中所有本地图片 |
| `CMTX: Upload images in directory` | [Explorer 右键] 上传目录内所有 .md 文件中的图片 |
| `CMTX: Delete unused images in directory` | [Explorer 右键] 扫描并删除目录内未被任何 .md 引用的孤立图片 |
| `CMTX: Download images in file` | 下载远程图片到本地 |
| `CMTX: Delete image...` | 删除指定图片 |
| `CMTX: Convert images to HTML format` | 将 Markdown 图片转换为 HTML |
| `CMTX: Set image width...` | 使用 QuickPick 设置图片宽度 |
| `CMTX: Increase image size (zoom in)` | 增加图片宽度 (Ctrl+Up) |
| `CMTX: Decrease image size (zoom out)` | 减小图片宽度 (Ctrl+Down) |
| `CMTX: Apply preset...` | 应用预设 |
| `CMTX: Add/Update section numbers` | 添加/更新章节编号 |
| `CMTX: Remove section numbers` | 移除章节编号 |
| `CMTX: Clear presigned URL cache` | 清除预签名 URL 缓存 |
| `CMTX: Toggle presigned URLs` | 切换预签名 URL 功能开关 |
| `CMTX: Create configuration...` | 创建 CMTX 配置文件 |
| `CMTX: Update configuration schema` | 更新配置 schema |
| `CMTX: Refresh configuration (reload window to apply)` | 刷新配置（需重载窗口后生效） |
| `CMTX: Reload window to apply config changes` | 重载窗口以应用配置变更 |

## 规则模式命令

| 命令 | 描述 |
|---|---|
| `CMTX (Rule): Upload images` | 上传图片（规则模式） |
| `CMTX (Rule): Download remote images` | 下载远程图片（规则模式） |
| `CMTX (Rule): Delete image` | 删除图片（规则模式） |
| `CMTX (Rule): Convert images to HTML` | 转换图片为 HTML（规则模式） |
| `CMTX (Rule): Resize image` | 调整图片尺寸（规则模式） |
| `CMTX (Rule): Transfer images` | 跨存储转移图片（规则模式） |
| `CMTX (Rule): Generate frontmatter ID` | 生成 frontmatter ID |
| `CMTX (Rule): Generate frontmatter slug` | 生成 frontmatter slug |
| `CMTX (Rule): Convert title to frontmatter` | 将标题转换为 frontmatter |
| `CMTX (Rule): Strip frontmatter` | 移除 frontmatter |
| `CMTX (Rule): Add frontmatter date` | 添加 frontmatter 日期 |
| `CMTX (Rule): Add frontmatter updated date` | 添加 frontmatter 更新日期 |
| `CMTX (Rule): Promote headings` | 提升标题级别 |
| `CMTX (Rule): Add section numbers` | 添加章节编号（规则模式） |
| `CMTX (Rule): Remove section numbers` | 移除章节编号（规则模式） |

## 快捷键

| 快捷键 | 命令 | 前置条件 |
|---|---|---|
| `Ctrl+Shift+H` | 转换为 HTML 格式 | 选中 Markdown 内容 |
| `Ctrl+Up` | 增加图片宽度 | 选中文本（`editorHasSelection`） |
| `Ctrl+Down` | 减小图片宽度 | 选中文本（`editorHasSelection`） |

## 命令访问方式

### Explorer 右键菜单

在文件资源管理器中右键点击 Markdown 文件或目录时显示：

- `Upload images in current file` — 上传当前文件中的图片
- `Upload images in directory` — 上传目录内所有 Markdown 文件中的图片
- `Delete unused images in directory` — 删除目录内未被引用的图片

**注意**：Explorer 右键命令**不会**显示在命令面板中（`when: false`），只能通过右键菜单访问。

### Editor 右键菜单

在 Markdown 编辑器中右键点击时显示 CMTX 子菜单：

- `Upload selected images` — 上传选中文字中的图片（需选中内容）
- `Set image width...` — 设置图片宽度（需选中内容）
- `Increase image size (zoom in)` — 增加图片宽度（需选中内容）
- `Decrease image size (zoom out)` — 减小图片宽度（需选中内容）
- `Convert images to HTML format` — 转换为 HTML 格式（需选中内容）
- `Apply preset...` — 应用预设

### 命令面板

使用 `Ctrl+Shift+P` 打开命令面板，搜索 `CMTX:` 查看所有可用命令。

部分命令仅在特定条件下可用：
- 需要选中文本的命令仅在 `editorHasSelection` 时显示
- Explorer 右键命令不显示在命令面板中
