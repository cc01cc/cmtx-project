# Changesets 调研文档

本文档记录了 CMTX 项目对 Changesets 的配置调研和分析，方便日后复查。

## 1. 参考资料与官方文档来源

- 官方仓库：<https://github.com/changesets/changesets>
- 配置选项：<https://github.com/changesets/changesets/blob/main/docs/config-file-options.md>
- 常见问题：<https://github.com/changesets/changesets/blob/main/docs/common-questions.md>
- 修改 changelog 格式：<https://github.com/changesets/changesets/blob/main/docs/modifying-changelog-format.md>
- 设计决策：<https://github.com/changesets/changesets/blob/main/docs/decisions.md>
- Monorepo 发布问题：<https://github.com/changesets/changesets/blob/main/docs/problems-publishing-in-monorepos.md>
- NPM: <https://www.npmjs.com/package/@changesets/cli>

## 2. Changesets 核心机制

### 2.1. 包发现机制

Changesets 通过 `@manypkg/get-packages` 发现 workspace 中的包，该工具读取 pnpm 的 `pnpm-workspace.yaml` 来确定哪些目录包含需要管理的包。

**不会递归扫描**所有目录 — 只扫描 workspace 配置中声明的路径。

- 源码位置：`packages/config/src/index.ts:96`
- 关键调用：`getPackages(cwd)` — 读取 pnpm-workspace.yaml
- CMTX 当前配置：

    ```yaml
    packages:
        - packages/*
        - private-workspace
    ```

### 2.2. ignore 配置行为

`ignore` 选项用于**临时**阻止包被发布。它不做"排除扫描"，而是"扫描后发现但跳过处理"。

```json
"ignore": ["cmtx-vscode", "@cmtx/cli", "@cmtx/mcp-server", "@cmtx/kilo-exporter"]
```

**关键行为**:

- 如果 ignore 中的包名在 workspace 中不存在，配置校验会抛 `ValidationError` (来源：`packages/config/src/index.ts:362-368`)
- 如果 ignore 的包同时在 changeset 中和非 ignore 的包一起出现，发布会失败 (来源：[config-file-options.md](https://github.com/changesets/changesets/blob/main/docs/config-file-options.md))
- 官方文档强调："This feature is designed for **temporary use**" — 长期不应依赖 ignore

### 2.3. CHANGELOG 生成逻辑

源码：`packages/apply-release-plan/src/`

**生成过程**:

1. `get-changelog-entry.ts` — 生成单条 changelog entry，格式为：

    ```
    ## <newVersion>

    ### Major Changes
    ...
    ### Minor Changes
    ...
    ### Patch Changes
    ...
    ```

2. `updateChangelog` (`index.ts:288-309`) — 写入 CHANGELOG.md 文件
    - 文件不存在：创建 `# <pkgName>` + entry
    - 文件已存在：调用 `prependFile`

3. `prependFile` (`index.ts:323-359`) — 前置插入逻辑：

    ```typescript
    const isVersionHeading = /^#{1,6}\s+\d+\.\d+/.test(fileData);
    if (isVersionHeading) {
        // 前置插入到所有内容之前
        newChangelog = data.trimStart() + fileData;
    } else {
        // 在首行（# title）之后插入
        const index = fileData.indexOf("\n");
        newChangelog = fileData.slice(0, index) + data + fileData.slice(index + 1);
    }
    ```

    - 版本标题检测正则：`/^#{1,6}\s+\d+\.\d+/` — 匹配 `## 0.3.0` 或 `## 0.3.0 - 2026-04-03`

**heading 兼容性**:

| 格式 | 示例 | 是否被 prependFile 检测 |
|------|------|------------------------|
| Changesets 默认 | `## 0.3.1-alpha.0` | 是 |
| 手动管理（带日期） | `## 0.3.0 - 2026-04-03` | 是 |

### 2.4. 其他核心功能

| 功能 | 说明 | 源码位置 |
|------|------|----------|
| Version bump | 读取 changeset 文件，计算 semver 级别，更新 package.json | `packages/assemble-release-plan/` |
| 内部依赖更新 | A 依赖 B，B 升级时自动更新 A 的依赖范围 | `packages/apply-release-plan/src/version-package.ts` |
| Pre-release | `pre enter alpha/beta` 管理版本后缀 | `packages/pre/` |
| changeset 自动删除 | `changeset version` 执行后所有 changeset 文件被删除 | 官方文档：common-questions.md |

## 3. CMTX 项目当前配置分析

### 3.1. 配置文件

```json
{
    "changelog": "@changesets/cli/changelog",
    "commit": true,
    "fixed": [],
    "linked": [],
    "access": "restricted",
    "baseBranch": "main",
    "updateInternalDependencies": "patch",
    "ignore": ["cmtx-vscode", "@cmtx/cli", "@cmtx/mcp-server", "@cmtx/kilo-exporter"]
}
```

位置：`.changeset/config.json`

### 3.2. 当前 Pre-release 状态

```json
{
    "mode": "pre",
    "tag": "alpha",
    "initialVersions": {
        "@cmtx/asset": "0.1.0",
        "@cmtx/core": "0.3.0",
        ...
    },
    "changesets": ["lucky-buckets-start"]
}
```

位置：`.changeset/pre.json`

### 3.3. `@cmtx/kilo-exporter` 已失效

| 项目 | 旧状态 | 新状态 |
|------|--------|--------|
| 目录 | `packages/kilo-exporter/` | `internal/kilo-exporter/` |
| 包名 | `@cmtx/kilo-exporter` | `@internal/kilo-exporter` |
| workspace 归属 | 在 `packages/*` 中 | **不在 workspace 中** |
| ignore 配置 | 列表中有 `@cmtx/kilo-exporter` | 应移除（包已不存在于 workspace） |

**结论**: `internal/` 不在 `pnpm-workspace.yaml` 中，Changesets 不会扫描到 `@internal/kilo-exporter`。ignore 列表中的旧名 `@cmtx/kilo-exporter` 会导致配置校验失败，**必须移除**。

### 3.4. 参与版本管理的包

通过 Changesets 管理的包（排除 ignore 列表后）:

- `@cmtx/asset`
- `@cmtx/core`
- `@cmtx/fpe-wasm`
- `@cmtx/markdown-it-presigned-url`
- `@cmtx/markdown-it-presigned-url-adapter-nodejs`
- `@cmtx/publish`
- `@cmtx/storage`
- `@cmtx/template`

## 4. CHANGELOG 冲突分析

### 4.1. 冲突场景

当同时存在以下需求时产生冲突：

1. 开发者日常动态更新 CHANGELOG.md
2. `changeset version` 发布时自动生成 changelog entry 并前置插入

**结果**: 同一版本号下会出现两份内容（手动 + 自动），造成重复。

### 4.2. 解决方案对比

| 方案 | 做法 | 优点 | 缺点 |
|------|------|------|------|
| **A (推荐)** `changelog: false` | 关闭 Changesets 的 changelog 生成功能，完全手动维护 CHANGELOG | 零冲突，格式完全自定义，实现成本最低 | Changesets 只负责 version bump 和依赖更新 |
| **B** 自定义 changelog 生成器 | 实现 `getReleaseLine`/`getDependencyReleaseLine`，配合 `## Unreleased` 章节管理 | 兼顾日常记录和自动发布 | 实现复杂，维护成本高 |
| **C** 只用 changeset summary | 不手动编辑 CHANGELOG，通过 `.changeset/*.md` 文件记录每日变更 | 纯自动化，无冲突 | 日常查看 changelog 不便，需通过 Release PR 预览 |

## 5. 关键源码位置（本地）

Changesets 源码已克隆到 `ignore-git/references/changesets/changesets/`:

| 文件 | 用途 |
|------|------|
| `packages/config/src/index.ts` | 配置读取与校验 |
| `packages/apply-release-plan/src/index.ts` | 版本号更新 + changelog 写入 |
| `packages/apply-release-plan/src/get-changelog-entry.ts` | changelog entry 格式生成 |
| `packages/cli/src/commands/version/index.ts` | `changeset version` 命令入口 |
| `packages/should-skip-package/src/index.ts` | 判断包是否应被跳过 |
| `packages/assemble-release-plan/src/` | 版本编排核心逻辑 |
