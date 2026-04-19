# NPM 包发布指南

本文档介绍如何使用 Changesets 发布 CMTX 项目的 NPM 包。

## 1. 概述

CMTX 项目使用 [@changesets/cli](https://github.com/changesets/changesets) 管理版本和发布流程，支持三个发布阶段：

| 标签 | 用途 | 稳定性 | 版本格式 |
|------|------|--------|----------|
| `alpha` | 测试一阶段 | API 不稳定 | `x.x.x-alpha.n` |
| `beta` | 测试二阶段 | API 大致稳定 | `x.x.x-beta.n` |
| `latest` | 正式发布 | 稳定 | `x.x.x` |

## 2. 适用范围

### 2.1 适用包列表

以下包使用本发布流程：

- `@cmtx/core`
- `@cmtx/storage`
- `@cmtx/template`
- `@cmtx/fpe-wasm`
- `@cmtx/asset`
- `@cmtx/publish`
- `@cmtx/markdown-it-presigned-url`
- `@cmtx/markdown-it-presigned-url-adapter-nodejs`
- `@cmtx/cli`
- `@cmtx/mcp-server`

### 2.2 不适用包

- `cmtx-vscode` - VS Code 扩展使用 VS Marketplace 的预发布机制

## 3. 前置要求

### 3.1 环境准备

```bash
# 确保已安装 Node.js 22+
node --version

# 确保已登录 npm
npm whoami
```

### 3.2 权限要求

- 确保 npm 账号有 `@cmtx` 组织的发布权限
- 确认包名在 npm 上可用：https://www.npmjs.com/search?q=@cmtx

## 4. 日常开发流程

### 4.1 创建变更集

每次 PR 前，为更改创建变更集：

```bash
pnpm changeset add
```

按提示操作：
1. 选择受影响的包
2. 选择版本类型（major/minor/patch）
3. 输入更改说明

变更集将保存在 `.changeset/` 目录下。

### 4.2 提交变更集

```bash
git add .changeset/*.md
git commit -m "Add changeset for feature X"
```

## 5. 发布流程

### 5.1 Alpha 发布（API 不稳定阶段）

**首次启动 alpha 预发布：**

```bash
# 1. 进入 alpha 模式并递增版本号
pnpm release:alpha:start

# 2. 验证构建
pnpm prepublish:validate

# 3. 发布并推送 git tags
pnpm release:alpha:publish
```

**后续 alpha 发布：**

```bash
pnpm release:alpha:continue
pnpm prepublish:validate
pnpm release:alpha:publish
```

### 5.2 Beta 发布（API 稳定阶段）

**切换到 beta 模式：**

```bash
# 1. 切换到 beta 模式并递增版本号
pnpm release:beta:start

# 2. 验证构建
pnpm prepublish:validate

# 3. 发布并推送 git tags
pnpm release:beta:publish
```

**后续 beta 发布：**

```bash
pnpm release:beta:continue
pnpm prepublish:validate
pnpm release:beta:publish
```

### 5.3 Latest 发布（正式版）

```bash
# 1. 退出预发布模式并发布正式版
pnpm release:latest

# 2. 验证构建（在 version 之前）
pnpm prepublish:validate
```

## 6. 验证清单

发布前必须检查：

- [ ] 所有包构建成功 (`pnpm -r build`)
- [ ] 所有测试通过 (`pnpm -r test`)
- [ ] TypeScript 类型检查通过 (`pnpm -r typecheck`)
- [ ] 代码格式检查通过 (`pnpm lint`)
- [ ] 已登录 npm (`npm whoami`)
- [ ] 当前分支为 main 分支
- [ ] 工作区干净，无未提交更改

## 7. 安装测试

### 7.1 安装正式版

```bash
npm install @cmtx/cli
```

### 7.2 安装测试版

```bash
# Beta 版本（推荐测试用户）
npm install @cmtx/cli@beta

# Alpha 版本（仅限核心开发者）
npm install @cmtx/cli@alpha
```

### 7.3 安装特定版本

```bash
npm install @cmtx/cli@0.2.0-alpha.1
```

## 8. 标签管理

### 8.1 查看所有标签

```bash
npm dist-tag ls @cmtx/cli
```

输出示例：
```
alpha: 0.2.0-alpha.1
beta: 0.2.0-beta.0
latest: 0.1.0
```

### 8.2 添加/修改标签

```bash
# 为特定版本添加标签
npm dist-tag add @cmtx/cli@0.2.0-alpha.1 alpha
```

### 8.3 删除标签

```bash
npm dist-tag rm @cmtx/cli alpha
```

## 9. 本地测试（可选）

### 9.1 Dry-run 预览

```bash
pnpm changeset publish --dry-run
```

### 9.2 Verdaccio 本地测试（未来可选）

待项目稳定后，可使用 Verdaccio 进行更完整的发布测试：

```bash
# 安装 verdaccio
pnpm add -g verdaccio

# 启动本地 npm 仓库
verdaccio

# 配置 npm 指向本地仓库
npm set registry http://localhost:4873

# 发布到本地仓库
pnpm changeset publish --no-git-tag

# 测试安装
npm install @cmtx/cli@0.1.0

# 恢复默认 registry
npm set registry https://registry.npmjs.org
```

## 10. 故障排除

### 10.1 发布失败

如果发布中途失败：
1. 检查错误日志
2. 修复问题后重新运行发布命令
3. Changesets 会跳过已发布的版本

### 10.2 版本号冲突

确保没有其他人在同时发布，如有冲突：
1. 拉取最新代码：`git pull`
2. 重新运行 version 命令
3. 重新发布

### 10.3 Git tag 推送失败

```bash
# 手动推送 tags
git push --follow-tags
```

## 11. 参考文档

- [Changesets 官方文档](https://github.com/changesets/changesets)
- [npm dist-tag](https://docs.npmjs.com/cli/commands/npm-dist-tag)
- [npm publish](https://docs.npmjs.com/cli/commands/npm-publish)

## 12. 自动化（未来计划）

当前所有发布均为手动触发。项目稳定后，可考虑添加 CI/CD 自动化：

- PR 合并到 develop 分支 → 自动发布到 `alpha` 标签
- 手动触发 workflow → 发布到 `beta` 或 `latest` 标签
