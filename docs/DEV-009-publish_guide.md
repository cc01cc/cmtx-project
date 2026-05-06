# NPM 包发布指南

本文档介绍如何使用 Changesets 发布 CMTX 项目的 NPM 包。

## 1. 概述

CMTX 项目使用 [@changesets/cli](https://github.com/changesets/changesets) 管理版本和发布流程，支持三个发布阶段：

| 标签     | 用途       | 稳定性       | 版本格式        |
| -------- | ---------- | ------------ | --------------- |
| `alpha`  | 测试一阶段 | API 不稳定   | `x.x.x-alpha.n` |
| `beta`   | 测试二阶段 | API 大致稳定 | `x.x.x-beta.n`  |
| `latest` | 正式发布   | 稳定         | `x.x.x`         |

### 1.1 适用范围

**适用包列表：**

以下包使用本发布流程：

- `@cmtx/core`
- `@cmtx/storage`
- `@cmtx/template`
- `@cmtx/fpe-wasm`
- `@cmtx/asset`
- `@cmtx/rule-engine`
- `@cmtx/markdown-it-presigned-url`
- `@cmtx/markdown-it-presigned-url-adapter-nodejs`
- `@cmtx/cli`
- `@cmtx/mcp-server`

**不适用包：**

- `cmtx-vscode` - VS Code 扩展使用 VS Marketplace 的预发布机制（参见 [`packages/vscode-extension/PUBLISH.md`](../packages/vscode-extension/PUBLISH.md)）

## 2. 前置要求

### 2.1 环境准备

```bash
# 确保已安装 Node.js 22+
node --version

# 确保已登录 npm
npm whoami
```

### 2.2 权限要求

- 确保 npm 账号有 `@cmtx` 组织的发布权限
- 确认包名在 npm 上可用：<https://www.npmjs.com/search?q=@cmtx>

## 3. 日常开发流程

### 3.1 创建变更集

每次 PR 前，为更改创建变更集：

```bash
pnpm changeset add
```

按提示操作：

1. 选择受影响的包
2. 选择版本类型（major/minor/patch）
3. 输入更改说明

变更集将保存在 `.changeset/` 目录下。

### 3.2 提交变更集

```bash
git add .changeset/*.md
git commit -m "Add changeset for feature X"
```

### 3.3 维护 CHANGELOG

CMTX 采用 [Keep a Changelog](https://keepachangelog.com/) 标准手动维护 CHANGELOG：

- 日常在包目录下的 `CHANGELOG.md` 顶部维护 `## [Unreleased]` 章节
- 发布时 `pnpm changeset:changelog` 自动将其替换为版本号 `## [<version>] - <YYYY-MM-DD>`
- 新版本发布后，脚本会创建空的 `## [Unreleased]` 章节供继续记录

**CHANGELOG 格式示例（先中文后英文）：**

```markdown
# @cmtx/core 更新日志 / Changelog

## [Unreleased]

### Added
- 新功能 A

### Fixed
- 修复 B

## [0.3.0] - 2026-04-03

### Added
- 功能描述

---

### Added
- Feature description
```

**变更类型**（参考 [Keep a Changelog 分类](https://keepachangelog.com/#types)）：

| 类型 | 说明 |
|------|------|
| `Added` | 新功能 |
| `Changed` | 现有功能变更 |
| `Deprecated` | 即将弃用的功能 |
| `Removed` | 已移除的功能 |
| `Fixed` | 错误修复 |
| `Security` | 安全漏洞 |

## 4. 发布流程

### 4.1 Alpha 发布（API 不稳定阶段）

**首次启动 alpha 预发布：**

```bash
# 1. 进入 alpha 模式、递增版本号、更新 CHANGELOG
pnpm release:alpha:start

# 2. 验证构建
pnpm prepublish:validate

# 3. 提交变更
git add -A
git commit -m "Release alpha $(node -e "console.log(require('./package.json').version)")"

# 4. 发布并推送 git tags
pnpm release:alpha:publish
```

**后续 alpha 发布：**

```bash
pnpm release:alpha:continue
pnpm prepublish:validate
git add -A && git commit -m "Release alpha <version>"
pnpm release:alpha:publish
```

### 4.2 Beta 发布（API 稳定阶段）

**切换到 beta 模式：**

```bash
# 1. 切换到 beta 模式、递增版本号、更新 CHANGELOG
pnpm release:beta:start

# 2. 验证构建
pnpm prepublish:validate

# 3. 提交变更
git add -A && git commit -m "Release beta <version>"

# 4. 发布并推送 git tags
pnpm release:beta:publish
```

**后续 beta 发布：**

```bash
pnpm release:beta:continue
pnpm prepublish:validate
git add -A && git commit -m "Release beta <version>"
pnpm release:beta:publish
```

### 4.3 Latest 发布（正式版）

```bash
# 1. 退出预发布模式、递增正式版本号、更新 CHANGELOG
pnpm release:latest

# 2. 验证构建
pnpm prepublish:validate

# 3. 提交变更
git add -A && git commit -m "Release v<version>"

# 4. 推送 tags 已在 latest 命令中自动执行
```

## 5. 发布前验证清单

发布前必须检查：

- [ ] TypeDoc 注释覆盖检查 (`pnpm run docs:check` 无报错)
- [ ] 所有包构建成功 (`pnpm -r build`)
- [ ] 所有测试通过 (`pnpm -r test`)
- [ ] TypeScript 类型检查通过 (`pnpm -r typecheck`)
- [ ] 代码格式检查通过 (`pnpm lint`)
- [ ] dist 文件存在：build 后 `dist/index.js` 和 `dist/index.d.ts`
- [ ] CHANGELOG 完整：包含 `[Unreleased]` 章节和版本记录，采用先中文后英文的双语格式
- [ ] README 准确：版本正确，功能说明完整
- [ ] 已登录 npm (`npm whoami`)
- [ ] 当前分支为 main 分支
- [ ] 工作区干净，无未提交更改

## 6. 验证包内容

### 6.1 安装测试

**安装正式版：**

```bash
npm install @cmtx/cli
```

**安装测试版：**

```bash
# Beta 版本（推荐测试用户）
npm install @cmtx/cli@beta

# Alpha 版本（仅限核心开发者）
npm install @cmtx/cli@alpha
```

**安装特定版本：**

```bash
npm install @cmtx/cli@<version>
```

### 6.2 检查类型定义

```bash
# 在临时目录安装并测试
mkdir /tmp/test-cmtx
cd /tmp/test-cmtx
npm install @cmtx/core@<version>

# 检查类型定义
head -20 node_modules/@cmtx/core/dist/index.d.ts

# 验证导出
node -e "import('@cmtx/core').then(m => console.log(Object.keys(m)))"
```

## 7. 标签管理

### 7.1 查看所有标签

```bash
npm dist-tag ls @cmtx/cli
```

输出示例：

```
alpha: <version>
beta: <version>
latest: <version>
```

### 7.2 添加/修改标签

```bash
# 为特定版本添加标签
npm dist-tag add @cmtx/cli@<version> alpha
```

### 7.3 删除标签

```bash
npm dist-tag rm @cmtx/cli alpha
```

## 8. 本地测试

### 8.1 Dry-run 预览

```bash
pnpm changeset publish --dry-run
```

### 8.2 Verdaccio 本地测试（未来可选）

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
npm install @cmtx/cli@<version>

# 恢复默认 registry
npm set registry https://registry.npmjs.org
```

## 9. 故障排除

### 9.1 发布失败

如果发布中途失败：

1. 检查错误日志
2. 修复问题后重新运行发布命令
3. Changesets 会跳过已发布的版本

### 9.2 版本号冲突

确保没有其他人在同时发布，如有冲突：

1. 拉取最新代码：`git pull`
2. 重新运行 version 命令
3. 重新发布

### 9.3 Git tag 推送失败

```bash
# 手动推送 tags
git push --follow-tags
```

### 9.4 如何撤销发布？

在 24 小时内可撤销：

```bash
npm unpublish @cmtx/core@<version>
```

之后需要联系 npm support。

### 9.5 发布失败常见原因

- 未登录或无权限：`npm login` 重新登录
- 版本已存在：升级 package.json 中的版本号
- 网络问题：检查网络连接，重试

## 10. 参考文档

- [Changesets 官方文档](https://github.com/changesets/changesets)
- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
- [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- [npm dist-tag](https://docs.npmjs.com/cli/commands/npm-dist-tag)
- [npm publish](https://docs.npmjs.com/cli/commands/npm-publish)
- [pnpm publish](https://pnpm.io/cli/publish)
- [发布前校验与质量门禁指南](./DEV-008-publish-validation.md)
