# PUBLISH-001: CMTX VS Code 插件发布指南

> 本文档记录 CMTX VS Code 插件的发布流程和版本管理策略。
>
> Publishing Extensions | Visual Studio Code Extension API: <https://code.visualstudio.com/api/working-with-extensions/publishing-extension>

## 1. 版本策略

### 1.1. 版本号规则

| 类型   | 版本号格式         | 示例                      | 说明                 |
| ------ | ------------------ | ------------------------- | -------------------- |
| 预览版 | `major.奇数.patch` | `0.1.0`, `0.1.1`, `0.3.0` | 开发中版本，供测试   |
| 正式版 | `major.偶数.patch` | `0.2.0`, `0.4.0`          | 稳定版本，发布给用户 |

### 1.2. 当前版本路线图

- `0.1.x` - 预览版（当前）
- `0.2.x` - 首个正式版（即将发布）
- `0.3.x` - 下一轮预览版（需要先有 0.2.x 正式版）
- `0.4.x` - 下一轮正式版

**重要**：预览版是在正式版基础上的迭代开发，必须先有正式版才能有后续的预览版。

### 1.3. 版本号手动控制

`package.json` 中的版本号由开发者手动控制，脚本不会自动修改：

- 开发版：运行 `package:dev` 时自动追加时间戳后缀（如 `0.1.0-dev.20260428T123645`）
- 发布预览版时，手动修改 `version` 为 `奇数.小版本`（如 `0.1.0`）
- 发布正式版时，手动修改 `version` 为 `偶数.小版本`（如 `0.2.0`）

---

## 2. 发布命令

### 2.1. 命令总览

```bash
# 预览版
pnpm -F cmtx-vscode package:pre-release    # 打包预览版
pnpm -F cmtx-vscode publish:pre-release    # 发布预览版

# 正式版
pnpm -F cmtx-vscode package:stable        # 打包正式版
pnpm -F cmtx-vscode publish:stable        # 发布正式版

# 开发版（本地测试）
pnpm -F cmtx-vscode package:dev           # 打包开发版（带时间戳）
```

### 2.2. 直接使用 vsce

```bash
# 预览版
vsce publish --pre-release --no-dependencies

# 正式版
vsce publish
```

---

## 3. 发布流程

### 3.1. 发布前检查

请先参照 [PUBLISH-002-publish-validation.md](./PUBLISH-002-publish-validation.md) 执行完整的发布前验证清单。

### 3.2. 发布预览版

```bash
# 1. 手动修改 package.json 版本号（如 0.1.0）
# 编辑 packages/vscode-extension/package.json 中的 version 字段

# 2. 构建
pnpm -F cmtx-vscode build

# 3. 打包并发布预览版
pnpm -F cmtx-vscode package:pre-release
pnpm -F cmtx-vscode publish:pre-release
```

### 3.3. 发布正式版

```bash
# 1. 手动修改 package.json 版本号（如 0.2.0）

# 2. 构建
pnpm -F cmtx-vscode build

# 3. 打包并发布正式版
pnpm -F cmtx-vscode package:stable
pnpm -F cmtx-vscode publish:stable
```

---

## 4. 版本递增示例

### 4.1. 预览版递增

```bash
# 从 0.1.0 到 0.1.1
# 先修改 package.json version 为 0.1.1
pnpm -F cmtx-vscode package:pre-release
pnpm -F cmtx-vscode publish:pre-release

# 或使用 vsce 自动递增
vsce publish patch --pre-release
```

### 4.2. 正式版递增

```bash
# 从 0.2.0 到 0.2.1
# 先修改 package.json version 为 0.2.1
pnpm -F cmtx-vscode package:stable
pnpm -F cmtx-vscode publish:stable

# 或使用 vsce 自动递增
vsce publish patch
```

### 4.3. 从预览版到正式版

```bash
# 当前预览版 0.1.5，发布正式版 0.2.0
# 修改 package.json version 为 0.2.0
pnpm -F cmtx-vscode package:stable
pnpm -F cmtx-vscode publish:stable
```

### 4.4. 从正式版到下一轮预览版

```bash
# 当前正式版 0.2.0，发布下一轮预览版 0.3.0
# 修改 package.json version 为 0.3.0
pnpm -F cmtx-vscode package:pre-release
pnpm -F cmtx-vscode publish:pre-release
```

---

## 5. 常见问题

### 5.1. Q1: 如何查看当前发布的版本？

访问 Marketplace 管理页面：
<https://marketplace.visualstudio.com/manage/publishers/cc01cc>

### 5.2. Q2: 预览版用户会自动更新到正式版吗？

- 如果正式版版本号更高，会自动更新到正式版
- 如果预览版版本号更高，保持预览版

### 5.3. Q3: 如何保持预览版用户不升级到正式版？

始终保持预览版版本号 > 正式版版本号。

例如：

- 正式版：`0.2.0`
- 预览版：`0.3.0`, `0.3.1`, ...

### 5.4. Q4: 发布失败怎么办？

检查以下事项：

1. vsce 版本是否最新：`pnpm add -g @vscode/vsce@latest`
2. PAT 是否有效且权限正确（需要 Marketplace Manage 权限）
3. 版本号格式是否正确（仅 `major.minor.patch`，不支持 `-beta` 等标签）
4. 网络是否正常

### 5.5. Q5: 什么是预发布版本（Pre-release）？

根据 VS Code 官方文档，预览版功能从 VS Code 1.63.0 开始支持。预览版允许用户在 VS Code 或 VS Code Insiders 中安装预发布版本，以便在正式发布前获取最新功能。

参考：<https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions>

---

## 6. 相关链接

| 资源                 | URL                                                                              |
| -------------------- | -------------------------------------------------------------------------------- |
| VS Code 官方发布文档 | <https://code.visualstudio.com/api/working-with-extensions/publishing-extension> |
| VS Marketplace 管理  | <https://marketplace.visualstudio.com/manage>                                    |
| vsce 工具 GitHub     | <https://github.com/microsoft/vscode-vsce>                                       |
| Azure DevOps PAT     | <https://go.microsoft.com/fwlink/?LinkId=307137>                                 |

---

**文档编号**: PUBLISH-001
**更新时间**: 2026-04-28
