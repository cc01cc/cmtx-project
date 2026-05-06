---
post_title: Changesets 完整指南
author1: CMTX Team
post_slug: changesets-guide
microsoft_alias: ""
featured_image: ""
categories:
    - Development
    - Monorepo
tags:
    - changesets
    - versioning
    - publishing
    - monorepo
ai_note: AI-assisted research and documentation
summary: Changesets 工具的完整操作与配置指南，涵盖核心概念、工作流、配置项、预发布、Monorepo 特性、CI/CD 集成、文件格式与校验等
post_date: 2026-04-30
---

## 1. 概述

### 1.1. 什么是 Changesets

Changesets 是一个版本管理工具，用于解决 Monorepo 中的版本发布问题。它的核心思想是将「变更意图」与「代码提交」同步记录，而非在发布时回忆。

一个 changeset 是一个 Markdown 文件（含 YAML front matter），声明两件事：

- **哪些包需要发布，各自的 semver bump 类型**（major / minor / patch）
- **一段人类可读的变更描述**（用于 CHANGELOG）

```markdown
---
"@my-org/core": minor
"@my-org/utils": patch
---

Added new validation API to core, fixed edge case in utils.
```

### 1.2. 解决的问题

- 版本号变更决策应在**写代码时**完成，而非发布时批量回忆
- Git commit message 不适合存储详细的变更描述
- Monorepo 中包之间的依赖关系需要自动追踪和更新

### 1.3. 安装与初始化

```bash
# 安装
pnpm add -W -D @changesets/cli

# 初始化（创建 .changeset/ 目录和 config.json）
pnpm changeset init
```

## 2. 核心工作流

Changesets 的工作流分为三个阶段：

```
PR 阶段                  发布阶段
--------                 -----------
changeset add  -->  changeset version  -->  changeset publish  -->  git push --follow-tags
(记录变更意图)       (消费意图，升版本)       (发布到 npm，建 git tag)
```

### 2.1. add（记录变更）

在 PR 中添加 changeset，记录本次变更的意图：

```bash
# 交互式：选择包、bump 类型、输入描述
pnpm changeset

# 非交互式：仅指定描述文本（包和 bump 类型仍需交互选择）
pnpm changeset add -m "Added new validation API"

# 空 changeset（CI 要求必须有 changeset 但本次无需发布时）
pnpm changeset add --empty
```

**`-m` 只能指定 summary 文本**，无法指定包和 bump 类型。源码中 `message` 参数仅传入 `createChangeset` 的 summary 字段，包选择始终通过交互式 CLI 完成（`packages/cli/src/commands/add/index.ts:82-86`）。

**CLI 不支持非交互式多包操作**，但可以直接手动写 changeset 文件，官方明确支持：

> "You can even write changesets without the command if you want to." -- [common-questions.md](https://github.com/changesets/changesets/blob/main/docs/common-questions.md)

```bash
# 手动创建 changeset（完全非交互式，等价于 pnpm changeset add）
cat > .changeset/my-change.md << 'EOF'
---
"@cmtx/core": minor
"@cmtx/storage": patch
---

Added new validation API to core, fixed edge case in storage.
EOF
```

效果与交互式完全等价。`writeChangeset` 只是将 releases 和 summary 写成 markdown 文件，无特殊处理（`packages/write/src/index.ts:41-46`）。

产出文件：`.changeset/随机ID.md`

```markdown
---
"@cmtx/core": minor
"@cmtx/storage": patch
---

Added new validation API to core, fixed edge case in storage.
```

**注意事项：**

- `add` 只写 `.changeset/*.md` 文件，**不会**写入 CHANGELOG.md。CHANGELOG 在 `version` 阶段才写入
- 可以手动编辑 changeset 文件，修改 bump 类型或描述
- 一个 PR 可以包含多个 changeset
- 不是每个 PR 都需要 changeset（纯文档、CI 配置变更不需要）
- 文件名是随机生成的可读名称，可以重命名

### 2.2. version（消费变更，升版本）

```bash
pnpm changeset version
```

这一步执行以下操作：

1. 读取 `.changeset/` 下所有 `.md` 文件
2. 对每个包，取所有 changeset 中的**最大 bump 类型**
    - 多个 patch = patch
    - patch + minor = minor
    - 任何 + major = major
3. 更新各包 `package.json` 中的 `version` 字段
4. 更新内部依赖范围（如 `@cmtx/asset` 依赖 `@cmtx/core`）
5. 生成/更新各包的 `CHANGELOG.md`
6. **删除所有已消费的 changeset 文件**

**版本号合并规则：**

同一包在多个 changeset 中被声明时，取最大 bump 类型：

| changeset 1 | changeset 2 | 最终 bump |
|-------------|-------------|-----------|
| patch       | patch       | patch     |
| patch       | minor       | minor     |
| minor       | minor       | minor     |
| patch       | major       | major     |

**具体示例：**

假设提交了两个 PR，各自带一个 changeset：

```
.changeset/pr-1.md:
  "@cmtx/core": patch
  "@cmtx/storage": minor

.changeset/pr-2.md:
  "@cmtx/core": minor
  "@cmtx/storage": patch
```

执行 `pnpm changeset version` 时：

- `@cmtx/core`：pr-1 给了 patch，pr-2 给了 minor -> 取 minor
- `@cmtx/storage`：pr-1 给了 minor，pr-2 给了 patch -> 取 minor

核心逻辑在 `packages/assemble-release-plan/src/index.ts`，遍历所有 changeset，对每个包维护一个 `highestBump` 变量，最终决定版本号。

### 2.3. publish（发布到 npm）

```bash
pnpm changeset publish
```

逻辑：遍历每个包，比较 `package.json` 中的 version 与 npm registry 上的版本。如果本地版本更新，则执行 `npm publish`（检测到 pnpm 时自动使用 `pnpm publish`）。同时创建 git tag（格式：`pkg-name@version`）。

发布后**必须**手动推送 tag：

```bash
git push --follow-tags
```

### 2.4. 完整发布流程

```bash
# 1. 版本计算（自动触发 CHANGELOG 替换）
pnpm changeset:version

# 2. 验证
pnpm prepublish:validate

# 3. 提交
git add -A && git commit -m "Release v<version>"

# 4. 发布
pnpm changeset:publish && git push --follow-tags
```

### 2.5. Changeset 文件生命周期

changeset `.md` 文件会在 `.changeset/` 目录下**持续堆积**，直到执行 `changeset version` 才会被批量消费和删除：

```
PR 1 -> add a.md
PR 2 -> add b.md
PR 3 -> add c.md        文件不断堆积
PR 4 -> add d.md
         |
    changeset version   全部删除，版本升上去
         |
    干净的 .changeset/   只剩 config.json, pre.json, README.md
```

`config.json`、`pre.json`、`README.md` 不会被删除，只有 changeset 的 `.md` 文件会被消费清除。

### 2.6. Changeset 文件格式与校验

Changeset 文件的格式非常宽松。唯一硬性要求是：**YAML front matter 用 `---` 包围**。

**最小格式：**

```markdown
---
"@cmtx/core": patch
---

Description text here
```

**格式要求（源码：`packages/parse/src/index.ts`）：**

| 部分 | 要求 | 严格程度 |
|------|------|----------|
| front matter 定界符 | 必须有 `---` 开头和 `---` 结束 | 严格 |
| YAML 内容 | 必须是合法 YAML 对象 | 严格 |
| package name | 非空字符串 | 严格 |
| version type | 只能是 `major`、`minor`、`patch`、`none` | 严格 |
| summary（markdown 部分） | 无任何要求，可为空或任意文本 | 非常宽松 |
| 文件名 | 任意字符串（不冲突即可） | 非常宽松 |

**官方示例（`command-line-options.md`）：**

```markdown
---
"@changesets/cli": major
---

A description of the major changes.
```

**空 changeset（`--empty` 生成）：**

```markdown
---
---
```

**CLI 校验规则（`parseChangesetFile`，`packages/parse/src/index.ts:51-109`）：**

| 校验项 | 错误信息 |
|--------|----------|
| 空文件 | `could not parse changeset - file is empty` |
| 无 `---` 定界符 | `could not parse changeset - missing or invalid frontmatter` |
| YAML 语法错误 | `could not parse changeset - invalid YAML in frontmatter` |
| YAML 非对象 | `frontmatter must be an object mapping package names to version types` |
| package name 为空 | `invalid package name in frontmatter` |
| version type 非法 | `invalid version type`，提示 `Valid version types are: major, minor, patch, none` |

**注意**：`changeset add` 写入时会用 prettier 格式化（如果项目安装了 prettier），手动写的文件不经过格式化，但只要 YAML 合法、定界符正确即可正常解析。官方生成时会强制给包名加引号：

> "The quotation marks in here are really important even though they are not spec for yaml. This is because package names can contain special characters that will otherwise break the parsing step." -- `packages/write/src/index.ts:38-40`

## 3. config.json 配置详解

文件位置：`.changeset/config.json`

### 3.1. 完整配置结构

```json
{
    "$schema": "https://unpkg.com/@changesets/config@3.1.4/schema.json",
    "changelog": "@changesets/cli/changelog",
    "commit": false,
    "fixed": [],
    "linked": [],
    "access": "restricted",
    "baseBranch": "main",
    "updateInternalDependencies": "patch",
    "ignore": []
}
```

### 3.2. 各字段说明

**`changelog`**

类型：`false | string | [string, options]`

Changelog 生成器配置。设为 `false` 可关闭自动生成。

| 值 | 效果 | 适用平台 |
|----|------|----------|
| `false` | 不生成 changelog（CMTX 当前采用此方案） | 任意 |
| `"@changesets/cli/changelog"` | 默认生成器，仅包含 commit hash | 任意 git |
| `"@changesets/changelog-git"` | 包含短 commit hash 链接 | 任意 git |
| `["@changesets/changelog-github", { "repo": "org/repo" }]` | 包含 PR 链接、commit 链接和作者信息 | **仅 GitHub** |

> **注意**：`changelog` 的合法值是 `false`、模块路径字符串或元组。**不能设为 `true`**，否则会抛出 `ValidationError`（源码：`packages/config/src/index.ts`）。

**默认生成器（`@changesets/cli/changelog`）的行为：**

默认生成器实际导出自 `@changesets/changelog-git`（`packages/cli/src/changelog.ts`），只使用 git commit hash，不依赖任何平台 API：

```typescript
// packages/changelog-git/src/index.ts
const [firstLine, ...futureLines] = changeset.summary.split("\n");
returnVal = `- ${changeset.commit ? `${changeset.commit.slice(0, 7)}: ` : ""}${firstLine}`;
```

输出示例：

```markdown
## 1.0.0

### Minor Changes

- abc1234: Added new validation API
```

**GitHub 生成器（`@changesets/changelog-github`）的行为：**

该生成器**依赖 GitHub API**（`@changesets/get-github-info`），需要设置 `GITHUB_TOKEN` 环境变量，只能在 GitHub 仓库中使用：

```typescript
// packages/changelog-github/src/index.ts
const GITHUB_SERVER_URL = process.env.GITHUB_SERVER_URL || "https://github.com";
// 构造 GitHub 链接: ${serverUrl}/${repo}/issues/${issue}
// 调用 GitHub API 获取 PR 和 commit 信息
```

输出示例：

```markdown
## 1.0.0

### Minor Changes

- [#42](https://github.com/my-org/my-repo/pull/42) [`abc1234`](https://github.com/my-org/my-repo/commit/abc1234) Thanks [@author](https://github.com/author)! - Added new validation API
```

**生成器对比：**

| 生成器 | 平台 | 需要 API Token | 输出内容 |
|--------|------|---------------|----------|
| `false` | 任意 | 否 | 不生成 changelog |
| `@changesets/changelog-git` | 任意 git | 否 | 短 commit hash |
| `@changesets/changelog-github` | **仅 GitHub** | `GITHUB_TOKEN` | PR 链接 + commit 链接 + 作者 |

> 来源：[modifying-changelog-format.md](https://github.com/changesets/changesets/blob/main/docs/modifying-changelog-format.md)

**`changelog: false` 的行为（源码：`packages/apply-release-plan/src/index.ts:204-210`）：**

当 `changelog` 设为 `false` 时，所有 release 的 changelog 字段直接设为 `null`，`updateChangelog` 不会被调用。changeset 的 summary 只存在于 `.changeset/*.md` 文件中，`changeset version` 消费后该文件被删除，**message 不会写入任何 CHANGELOG**。

**`commit`**

类型：`boolean | string | [string, options]`

控制 `changeset add` 和 `changeset version` 后是否自动 git commit。

| 值 | 效果 |
|----|------|
| `false` | 不自动提交（默认） |
| `true` | 自动提交，使用默认消息 |
| `["path/to/commit.js", { "options" }]` | 自定义提交消息生成器 |

自定义提交模块需导出：

```javascript
module.exports = {
    getAddMessage(changeset, options) {},
    getVersionMessage(releasePlan, options) {}
};
```

**`access`**

类型：`"restricted" | "public"`

npm 包的可见性。

- `"restricted"`：私有包，需 npm 账户权限（默认）
- `"public"`：公开包，scoped 包（如 `@cmtx/core`）要公开发布**必须**设为 `"public"`

可在单个包的 `package.json` 中覆盖。要阻止包发布，在 `package.json` 中设 `"private": true`。

**`baseBranch`**

类型：`string`

对比基准分支。`changeset status` 用此检测变更。通常设为 `"main"` 或 `"master"`。

**`ignore`**

类型：`string[]`

被忽略的包不会被 version 和 publish 处理。支持 glob 模式（基于 micromatch）。

```json
"ignore": ["cmtx-vscode", "@cmtx/cli", "@cmtx/mcp-server"]
```

**关键行为：**

- 包仍会被扫描发现，只是跳过处理
- 如果 ignore 中的包名在 workspace 中不存在，会抛出 `ValidationError`
- 如果 ignore 的包与非 ignore 的包同时出现在一个 changeset 中，发布会失败
- 官方强调这是**临时用途**，长期不应依赖 ignore

**`fixed`**

类型：`string[][]`

固定版本组。组内包**始终同步升版**，即使某个包没有变更。

```json
"fixed": [["@cmtx/core", "@cmtx/storage"]]
```

示例（`@cmtx/core` 有 patch，`@cmtx/storage` 无变更）：

- 发布前：`@cmtx/core@1.0.0`，`@cmtx/storage@1.0.0`
- 发布后：`@cmtx/core@1.0.1`，`@cmtx/storage@1.0.1`（同步升版）

**`linked`**

类型：`string[][]`

链接版本组。组内有变更的包**共享最高版本**，无变更的包不升。

```json
"linked": [["@cmtx/core", "@cmtx/storage"]]
```

示例（`@cmtx/core` 有 minor，`@cmtx/storage` 有 patch）：

- 发布前：`@cmtx/core@1.0.0`，`@cmtx/storage@1.0.0`
- 发布后：`@cmtx/core@1.1.0`，`@cmtx/storage@1.1.0`（共享最高 minor）

**fixed vs linked 对比：**

| 特性 | fixed | linked |
|------|-------|--------|
| 无变更的包是否升版 | 是 | 否 |
| 版本号关系 | 始终相同 | 有变更时才同步 |
| 适用场景 | 组件库统一版本 | 需要版本对齐但允许独立发布 |

**`updateInternalDependencies`**

类型：`"patch" | "minor"`

内部依赖范围何时更新。

假设 `pkg-b` 依赖 `pkg-a@^1.0.0`，两者同时发布 patch：

| 值 | `pkg-a` 新版本 | `pkg-b` 依赖范围 |
|----|---------------|-----------------|
| `"patch"` | `1.0.1` | `^1.0.1`（更新） |
| `"minor"` | `1.0.1` | `^1.0.0`（不更新） |

- `"patch"`：消费者更常使用最新代码，但可能影响 dedup
- `"minor"`：消费者有更多 dedup 控制权

**`bumpVersionsWithWorkspaceProtocolOnly`**

类型：`boolean`，默认 `false`

设为 `true` 时，只更新使用 `workspace:` 协议的依赖范围。

**`snapshot`**

类型：`object | undefined`

Snapshot 发布配置（见第 6 节）。

**`privatePackages`**

类型：`{ version: boolean, tag: boolean } | false`

控制私有包的行为。

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `version` | `true` | 是否更新私有包的版本号 |
| `tag` | `false` | 是否为私有包创建 git tag |

## 4. Pre-release 模式

### 4.1. 概述

Pre-release 模式用于发布 alpha / beta / rc 等预发布版本。进入此模式后，版本号会附加后缀（如 `1.0.1-alpha.0`）。

### 4.2. 状态机

```
正常模式 --[pre enter alpha]--> Pre 模式 (pre.json 存在)
                                     |
                                     v
                              version (生成 -alpha.0, -alpha.1, ...)
                                     |
                                     v
                              publish (npm dist-tag = alpha)
                                     |
                                     v
                              pre exit (标记退出意图)
                                     |
                                     v
                              version (去掉 -alpha.N 后缀)
                                     |
                                     v
                              publish (npm dist-tag = latest)
```

### 4.3. pre.json 结构

进入 pre 模式后，`.changeset/pre.json` 被创建：

```json
{
    "mode": "pre",
    "tag": "alpha",
    "initialVersions": {
        "@cmtx/core": "0.3.0",
        "@cmtx/asset": "0.1.0"
    },
    "changesets": ["lucky-buckets-start"]
}
```

| 字段 | 说明 |
|------|------|
| `mode` | `"pre"` = 在 pre 模式中，`"exit"` = 正在退出 |
| `tag` | 版本后缀 + npm dist-tag（如 `alpha`、`beta`、`next`） |
| `initialVersions` | 进入 pre 模式时各包的版本快照 |
| `changesets` | 已在 pre 模式中消费的 changeset ID 列表 |

### 4.4. 版本号变化示例

```
进入前:          @cmtx/core@0.3.0
首次 version:    @cmtx/core@0.3.1-alpha.0
再次 version:    @cmtx/core@0.3.1-alpha.1   (递增末尾数字)
exit + version:  @cmtx/core@0.3.1            (去掉后缀)
```

### 4.5. Pre-release 工作流

**进入 alpha：**

```bash
changeset pre enter alpha
changeset version
git add . && git commit -m "Enter alpha pre-release"
changeset publish
git push --follow-tags
```

**继续 alpha 发布：**

```bash
changeset version
git add . && git commit -m "Alpha release"
changeset publish
git push --follow-tags
```

**切换到 beta：**

```bash
changeset pre exit
changeset pre enter beta
changeset version
git add . && git commit -m "Enter beta pre-release"
changeset publish
git push --follow-tags
```

**正式发布：**

```bash
changeset pre exit
changeset version
git add . && git commit -m "Exit pre-release"
changeset publish
git push --follow-tags
```

### 4.6. 关键注意事项

- **不能重复 enter**：已在 pre 模式时再执行 `pre enter` 会报错 `cannot be run when in pre mode`。如果需要切换 tag，必须先 `pre exit` 再 `pre enter`
- **必须在非默认分支操作**：否则会阻塞稳定版发布
- **pre 模式移除安全限制**：依赖范围可能不满足标准 semver
- **首次 publish 的新包**：即使在 pre 模式，新包也会发布到 `latest` tag
- **dependent 包会额外升版**：pre-release 版本不满足 `^x.y.z` 范围，所以依赖它的包也会被 bump
- **`pre enter` 只改变 pre.json 状态**：不做实际版本计算，必须随后运行 `changeset version`

## 5. Monorepo 特性

### 5.1. 包发现机制

Changesets 通过 `@manypkg/get-packages` 发现 workspace 中的包，读取 `pnpm-workspace.yaml` 确定扫描路径。**不会递归扫描**所有目录。

### 5.2. 内部依赖更新

当包 A 依赖包 B，且 B 被发布时：

- A 的 `package.json` 中对 B 的依赖范围会被自动更新
- 由 `updateInternalDependencies` 配置控制更新时机

### 5.3. ignore 与 private 的区别

| 特性 | `ignore` 配置 | `private: true` |
|------|--------------|-----------------|
| 用途 | 临时阻止发布 | 永久不发布 |
| 包是否被扫描 | 是 | 是 |
| 配置位置 | `.changeset/config.json` | 包的 `package.json` |
| 官方建议 | 短期使用 | 长期方案 |

## 6. Snapshot 临时发布

Snapshot 是一种不修改正式版本号的临时发布方式，用于测试。

### 6.1. 使用方法

```bash
# 版本变为 0.0.0-canary-20260430144500
pnpm changeset version --snapshot canary

# 发布到 canary tag（不会污染 latest）
pnpm changeset publish --tag canary
```

### 6.2. 版本号格式

默认格式：`0.0.0-{tag}-{datetime}`

可在 `config.json` 中自定义：

```json
{
    "snapshot": {
        "useCalculatedVersion": true,
        "prereleaseTemplate": "{tag}-{commit}-{datetime}"
    }
}
```

可用占位符：`{tag}`、`{commit}`、`{timestamp}`、`{datetime}`

### 6.3. 注意事项

- **不要把 snapshot 版本合并回 main**
- 发布时**必须**使用 `--tag` 参数，否则会污染 `latest` tag
- 用户安装：`pnpm add @cmtx/core@canary`

## 7. CLI 命令参考

### 7.1. 命令列表

| 命令 | 说明 |
|------|------|
| `changeset init` | 初始化 `.changeset/` 目录 |
| `changeset` / `changeset add` | 交互式添加 changeset |
| `changeset add -m "desc"` | 非交互式添加 |
| `changeset add --empty` | 空 changeset（CI 用） |
| `changeset add --since=branch` | 检测指定分支以来的变更 |
| `changeset version` | 消费 changesets，升版本 |
| `changeset version --snapshot [tag]` | Snapshot 版本 |
| `changeset version --ignore pkg` | 跳过指定包 |
| `changeset publish [--tag name]` | 发布到 npm |
| `changeset publish --otp=code` | 提供 npm OTP |
| `changeset publish --no-git-tag` | 发布但不建 git tag |
| `changeset status [--verbose]` | 查看待发布状态 |
| `changeset status --since=main` | 检测自 main 以来的 changeset |
| `changeset status --output=file.json` | 输出 JSON 格式状态 |
| `changeset pre enter <tag>` | 进入 pre-release 模式 |
| `changeset pre exit` | 退出 pre-release 模式 |
| `changeset tag` | 只建 git tag，不发布 |

### 7.2. 常用操作速查

```bash
# 日常：创建 changeset
pnpm changeset

# 查看待发布状态
pnpm changeset status --verbose

# 发布：版本计算
pnpm changeset:version

# 发布：验证
pnpm prepublish:validate

# 发布：推送
pnpm changeset:publish && git push --follow-tags

# 调试：单独运行 changelog 替换
pnpm changeset:changelog
```

## 8. CI/CD 集成

### 8.1. GitHub Actions

使用官方 `changesets/action`：

```yaml
- uses: changesets/action@v1
    with:
        version: pnpm changeset version
        publish: pnpm changeset publish
        commit: "chore: version packages"
        title: "chore: version packages"
    env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

该 action 的行为：

- 有未消费的 changeset 时 -> 自动创建 "Version Packages" PR
- 该 PR 被合并后 -> 自动执行 publish

### 8.2. 检测缺失的 changeset

**非阻塞方式（推荐）：**

安装 [changeset bot](https://github.com/apps/changeset-bot)，在 PR 中提示但不阻塞。

**阻塞方式：**

在 CI 中添加：

```bash
changeset status --since=main
```

如果自 main 以来没有新 changeset，退出码为 1。无需发布时使用 `changeset --empty`。

### 8.3. 手动发布流程

1. 发布协调人暂停合并到 base branch
2. 拉取 base branch，运行 `changeset version`，创建版本 PR
3. 合并版本 PR
4. 拉取 base branch，运行 `changeset publish`
5. 运行 `git push --follow-tags`
6. 恢复合并

## 9. 最佳实践

1. **每个 PR 一个 changeset** -- 趁记忆新鲜时记录变更
2. **不是每个 PR 都需要 changeset** -- 纯文档、CI、重构不需要
3. **`access: "public"`** -- scoped 包要公开 npm 必须设置
4. **pre-release 在非默认分支进行** -- 避免阻塞稳定版
5. **snapshot 发布不要合并回 main** -- 临时测试用
6. **发布后 `git push --follow-tags`** -- 同步 git tag
7. **使用 `@changesets/changelog-github`** -- changelog 带 PR 链接和作者信息
8. **`fixed` 用于组件库** -- 需要统一版本的包组
9. **`linked` 用于相关包** -- 需要版本对齐但允许独立发布
10. **`ignore` 仅临时使用** -- 长期不发布用 `private: true`

## 10. CMTX 项目配置

### 10.1. 当前 config.json

```json
{
    "$schema": "https://unpkg.com/@changesets/config@3.1.4/schema.json",
    "changelog": "@changesets/cli/changelog",
    "commit": false,
    "fixed": [],
    "linked": [],
    "access": "restricted",
    "baseBranch": "main",
    "updateInternalDependencies": "patch",
    "ignore": ["cmtx-vscode", "@cmtx/cli", "@cmtx/mcp-server"]
}
```

- `changelog: "@changesets/cli/changelog"` -- 启用 changelog 生成，`changeset version` 自动生成 CHANGELOG 条目
- `access: "restricted"` -- 私有包发布
- `ignore` -- 应用层包暂不参与版本管理

### 10.2. 发布脚本

```json
{
    "postchangeset:version": "node scripts/release-changelog.mjs",
    "release:alpha:start": "changeset pre enter alpha && pnpm changeset version",
    "release:alpha:continue": "pnpm changeset version",
    "release:alpha:publish": "changeset publish && git push --follow-tags",
    "release:beta:start": "changeset pre exit && changeset pre enter beta && pnpm changeset version",
    "release:beta:continue": "pnpm changeset version",
    "release:beta:publish": "changeset publish && git push --follow-tags",
    "release:latest": "changeset pre exit && pnpm changeset version && changeset publish && git push --follow-tags"
}
```

单步操作直接使用 `pnpm changeset <command>` 命令，不再通过包装脚本间接调用。

### 10.3. 参与版本管理的包

排除 ignore 列表后：

- `@cmtx/asset`
- `@cmtx/core`
- `@cmtx/fpe-wasm`
- `@cmtx/markdown-it-presigned-url`
- `@cmtx/markdown-it-presigned-url-adapter-nodejs`
- `@cmtx/rule-engine`
- `@cmtx/storage`
- `@cmtx/template`
- `@cmtx/autocorrect-wasm`（新包，尚未发布）

### 10.4. CHANGELOG 与 Changeset 的关系

CMTX 采用双轨工作流：

**Changeset 管理包（除 ignore 外的所有包）：**

| 维度 | CHANGELOG | Changeset |
|------|-----------|-----------|
| 维护者 | `changeset version` 生成 + 开发者精修 | 开发者手动 |
| 内容 | 详细的功能描述（中英文双语） | 简短的版本变更说明（中文） |
| 用途 | 面向用户阅读 | 驱动 version bump |
| 发布时 | `release-changelog.mjs` 给版本标题添加日期 | pre-release 模式下保留，exit 后删除 |

**Ignored 包（`cmtx-vscode`, `@cmtx/cli`, `@cmtx/mcp-server`）：**

| 维度 | CHANGELOG |
|------|-----------|
| 维护者 | 开发者手动编辑 `[Unreleased]` |
| 内容 | 详细的功能描述（中英文双语） |
| 用途 | 面向用户阅读 |
| 发布时 | 手动替换 `[Unreleased]` 为版本号+日期 |

详见 [CHANGELOG 标准化指南](./DEV-013-changelog_guide.md)。

## 11. 源码参考

Changesets 源码已克隆到 `ignore-git/references/changesets/changesets/`：

| 文件 | 用途 |
|------|------|
| `packages/config/src/index.ts` | 配置读取与校验 |
| `packages/apply-release-plan/src/index.ts` | 版本号更新 + changelog 写入，`changelog: false` 短路逻辑（L204-210） |
| `packages/apply-release-plan/src/get-changelog-entry.ts` | changelog entry 格式生成，遍历 changeset 匹配包（L53-60） |
| `packages/cli/src/commands/add/index.ts` | `changeset add` 命令入口，`-m` 只传 summary（L82-86） |
| `packages/cli/src/commands/version/index.ts` | `changeset version` 命令入口 |
| `packages/write/src/index.ts` | changeset 文件写入，YAML 格式化 + prettier |
| `packages/parse/src/index.ts` | changeset 文件解析与校验（front matter 格式、version type 合法性） |
| `packages/changelog-git/src/index.ts` | 默认 changelog 生成器（`@changesets/cli/changelog` 导出自此），summary 转 bullet point |
| `packages/changelog-github/src/index.ts` | GitHub 专用 changelog 生成器，调用 GitHub API 获取 PR/commit 链接 |
| `packages/should-skip-package/src/index.ts` | 判断包是否应被跳过 |
| `packages/assemble-release-plan/src/` | 版本编排核心逻辑，bump 类型合并 |
| `packages/pre/src/index.ts` | Pre-release 模式管理 |

详见 [Changesets 调研文档](../../docs/RSR-005-changesets-research.md)。

## 12. 参考资料

- [Changesets 官方仓库](https://github.com/changesets/changesets)
- [官方文档 - 使用 Changesets](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)
- [官方文档 - 配置选项](https://github.com/changesets/changesets/blob/main/docs/config-file-options.md)
- [官方文档 - Pre-release](https://github.com/changesets/changesets/blob/main/docs/prereleases.md)
- [官方文档 - CLI 命令](https://github.com/changesets/changesets/blob/main/docs/command-line-options.md)
- [官方文档 - Snapshot 发布](https://github.com/changesets/changesets/blob/main/docs/snapshot-releases.md)
- [官方文档 - Fixed 包](https://github.com/changesets/changesets/blob/main/docs/fixed-packages.md)
- [官方文档 - Linked 包](https://github.com/changesets/changesets/blob/main/docs/linked-packages.md)
- [官方文档 - 自动化](https://github.com/changesets/changesets/blob/main/docs/automating-changesets.md)
- [Changesets 调研文档](../../docs/RSR-005-changesets-research.md)
- [CHANGELOG 标准化指南](./DEV-013-changelog_guide.md)
- [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
