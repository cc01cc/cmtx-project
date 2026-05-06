# ADR-014: 移除 pnpm catalog 机制，直接管理依赖版本

**状态**：Accepted

**版本**：1.0

**日期**：2026-05-06

**相关 ADR**：无

---

## 背景

CMTX monorepo 使用 pnpm 作为包管理器，引入了 `catalog:` 机制来统一管理跨包的依赖版本。该机制将共享依赖的版本号集中定义在 `pnpm-workspace.yaml` 中：

```yaml
catalog:
    typescript: ^6.0.3
    vitest: ^4.0.18
    js-yaml: 4.1.1
    ...
```

各个包的 `package.json` 中通过 `"catalog:"` 引用：

```json
{
    "devDependencies": {
        "typescript": "catalog:"
    }
}
```

### 问题触发

在构建 `project.cc01cc.cn` 文档站点时，需要从 npm 安装 `@cmtx/*` 包以生成 TypeDoc API 文档。安装失败：

```
ERR_PNPM_SPEC_NOT_SUPPORTED_BY_ANY_RESOLVER
"js-yaml@catalog:cli" isn't supported by any available resolver.
```

**根因**：`pnpm publish`（通过 changeset 调用）未将 `catalog:xxx` 引用解析为实际版本号，导致发布的包中残留 `"catalog:cli"`。当外部项目尝试安装时，pnpm 无法解析这个 workspace 内部协议。

**受影响范围**：所有 13 个发布的 npm 包中，有 7 个在 runtime 依赖中存在 `catalog:` 引用，导致无法在 monorepo 外安装。

## 问题陈述

pnpm catalog 机制是否适合 CMTX 项目的依赖版本管理？具体需评估：

1. catalog 的收益（版本统一管理）是否大于其成本（发布泄漏、间接层心智负担）
2. pnpm 已有的版本管理能力是否已足够覆盖 catalog 试图解决的问题
3. 替代方案（直接写入版本号）的可行性和维护成本

## 考虑的选项

### 选项 A：保留 catalog，修复发布流程（已实施后否决）

在 `.npmrc` 中添加 `resolve-from-catalog=true`，让 pnpm 在 publish 时自动解析 `catalog:` 引用。

**优点**：
- 保持版本集中管理
- pnpm 原生支持，配置简单

**缺点**：
- 增加一层间接引用，查看版本号需查 `pnpm-workspace.yaml`
- 仍然存在配置遗漏导致 `catalog:` 泄漏的风险
- 发布失败时排查链路变长（需检查 `.npmrc` + workspace yaml + 各个 package.json）

### 选项 B：移除 catalog，直接写入版本号（选定方案）

将所有 `catalog:` 引用替换为实际版本号，删除 `pnpm-workspace.yaml` 中的 catalog 定义。

```json
{
    "devDependencies": {
        "typescript": "^6.0.3"
    }
}
```

**优点**：
- 版本号一目了然，无需间接跳转
- 发布时不存在泄漏风险
- 减少一层配置维护成本
- 与 pnpm 的锁文件和 `workspace:*` 协议互补而非重叠

**缺点**：
- 统一升级时需修改多个 `package.json`（实际工作中通过 `pnpm up -r` 或全局搜索替换即可解决）

## 决策

选择选项 B：移除 catalog 机制，所有依赖版本直接写入各自的 `package.json`。

### 理由

catalog 试图解决的核心问题 —— 跨包版本一致性 —— 在 pnpm monorepo 中已经有更好的工具解决：

| 需求 | Maven BOM 的解决方式 | pnpm 的解决方式 | 对比 |
|------|---------------------|-----------------|------|
| 版本冲突 | 一个 class 只能有一个版本 → 必须 BOM 统一 | **多版本可以共存**，子依赖各自管理 | pnpm 更灵活 |
| 版本锁定 | BOM POM + `dependency:tree` | **`pnpm-lock.yaml`** 是唯一真源 | pnpm 无需额外工具 |
| 包间引用 | parent POM 定义子模块版本 | **`workspace:*`** 协议天然解决 | pnpm 方案更简洁 |
| 发布风险 | 无（BOM 定义即最终版本） | `catalog:` 泄漏到 npm 导致**无法安装** | catalog 引入新风险 |

Catalog 在 pnpm monorepo 中是一个**非必要的间接层**。pnpm 的 `workspace:*` + lockfile + 多版本共存能力已经覆盖了 Maven BOM 试图解决的问题，且更适配 JavaScript 生态。

具体来说：

- **统一升级**：`pnpm up -r --filter @cmtx/core js-yaml` 或简单的全局搜索替换即可，比修改 `pnpm-workspace.yaml` 更直观
- **版本一致性**：对于需要在所有包中使用同一版本的依赖（如 `typescript`、`vitest`），通过代码审查和自动化工具而非 central config 来保证
- **新人理解成本**：`"typescript": "^6.0.3"` 是 npm 的标准写法，比 `"typescript": "catalog:"` 更无需解释

### 实施方式

使用迁移脚本将所有 `catalog:` 引用展开为实际版本号：

```bash
node scripts/unwrap-catalogs.mjs
```

然后清理配置：

- 删除 `pnpm-workspace.yaml` 中的 `catalog:` / `catalogs:` 块
- 删除 `.npmrc` 中的 `resolve-from-catalog=true`
- 删除迁移脚本

共替换 **68 处** catalog 引用，涉及 **13 个**包，覆盖 `dependencies`、`devDependencies`、`optionalDependencies`、`peerDependencies` 四种类型。

### 补充分析：changesets 的版本管理机制

本项目使用 changesets（`@changesets/apply-release-plan`）进行版本发布。分析其源码（`version-package.ts`）发现：

- changesets **自实现**了完整的版本管理逻辑，不调用 pnpm 的任何 API
- 对 `workspace:*` 的处理：自己识别前缀 → 自己 strip → 自己用 `semver` 库计算新版本 → 自己写回
- 对 `catalog:` 的处理：changesets **完全不知晓** `catalog:` 的存在，视为普通字符串原样保留

```
changeset version 执行流程:

  读取 package.json 中所有依赖
         ↓
  dep 以 "workspace:" 开头?   ───是──→ 自实现解析替换版本号
        否                          自实现写回 "workspace:^0.4.0"
         ↓
  验证是否为合法 semver range
         ↓
  合法 → 使用 semver 库计算新版本号
  非法 → 跳过，保持原值     ← catalog:cli 落入此分支，原样保留
```

因此 `workspace:*` 和 `catalog:` 在发布时表现完全不同：

| 机制 | changesets 处理 | 发布结果 |
|------|----------------|----------|
| `workspace:*` | 识别并转换为 `^0.4.0` | 正常 |
| `workspace:^` | 识别并转换为 `^0.4.0` | 正常 |
| `catalog:` | **不识别**，原样保留 | 泄漏 |
| `catalog:cli` | **不识别**，原样保留 | 泄漏 |

这解释了问题的根本原因：**catalog 是完全独立于 changesets 版本管理体系的另一套机制**，两者在设计上就没有交集。移除 catalog 后，每个包的版本号回归常规 semver range，changesets 可以正常处理。

## 后果

### 积极影响

- 发布到 npm 的包不再有 `catalog:` 泄漏，外部可直接安装
- 减少一层配置间接性，降低新人理解门槛
- 减少构建配置出错面（`.npmrc`、`pnpm-workspace.yaml`、各 `package.json` 三者一致性问题消失）

### 消极影响

- 统一升级时需修改多个 `package.json`（通过 `pnpm up -r` 或搜索替换缓解）
- 无法在 workspace 级别声明"这个依赖在所有包中必须用这个版本"的约束

### 缓解措施

对于统一版本约束的需求：

1. **常规依赖**（`typescript`、`vitest` 等开发工具）：约定使用相同版本范围，code review 时检查
2. **跨包一致性检查**：可在 CI 中加脚本检查各包的某依赖版本是否一致
3. `pnpm up -r <dep>` 是推荐的升级方式，可一次性更新 workspace 内所有引用

## 参考

- pnpm catalog 文档：<https://pnpm.io/catalogs>
- pnpm workspace 协议：<https://pnpm.io/workspaces>
- 问题发现上下文：PLAN-003 构建文档站时暴露（`packages/project/`）
- PR/提交：本 ADR 对应的实际变更为 `pnpm-workspace.yaml`、`.npmrc` 及 13 个 `package.json`
