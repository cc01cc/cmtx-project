# CHANGELOG 标准化指南

## 1. 概述

### 1.1. 核心原则

- **CHANGELOG 只记录用户可见的变更**，不记录内部开发过程中的临时修改、重构中间态、待办事项
- **对比基准是 main 分支的上一个发布版本**，不是最近的 git commit 或 PR
- **按包模式区分维护方式**：`changeset` 模式通过 changeset 文件驱动，`manual` 模式手动维护 `[Unreleased]`
- **发布时统一格式**：两种模式的最终 CHANGELOG 格式完全一致——先中文后英文的双语结构
- **日常维护仅写中文**，发布时再添加英文——减少日常维护负担

### 1.2. 包模式清单

详见 [changelog-updater skill](../../.agents/skills/changelog-updater/SKILL.md#cmtx-包模式清单)。

| 模式 | 包 |
|------|----|
| changeset | `@cmtx/core`, `@cmtx/asset`, `@cmtx/storage` 等 |
| manual | `cmtx-vscode` |

## 2. 格式标准

### 2.1. 文件结构

每个包目录下有 `CHANGELOG.md` 文件。发布后统一采用**先中文后英文**的双语结构。日常维护期间各模式格式不同（详见第 3 章），发布前精修为统一格式（详见第 4 章）。

### 2.2. 双语规范

- 文件标题使用双语：`# @cmtx/<name> 更新日志 / Changelog`
- 每个版本均采用**先中文后英文**的双语模式，用 `---` 分隔
- 中文与英文条目内容应一一对应，信息一致
- 初始发布版本可省略 `---`，但双语必须完整

### 2.3. 标题规范

| 位置 | 格式 | 说明 |
|------|------|------|
| 文件第一行 | `# @cmtx/<name> 更新日志 / Changelog` | 双语命名 |
| changeset 模式日常 | 无固定标题，由 changeset 驱动 | 创建 CHANGESET-XXX 文件，发布时 `changeset version` 自动生成 |
| manual 模式日常 | `## [Unreleased]` | 固定标题，手动编辑 |
| 发布后 | `## [<version>] - <YYYY-MM-DD>` | 由脚本自动替换 |

### 2.4. 变更类型

| 类型 | 说明 | 使用时机 |
|------|------|----------|
| `Added` | 新功能 | 新增面向用户的特性、API、CLI 命令 |
| `Changed` | 现有功能变更 | API 行为变化、内部重构但不影响签名 |
| `Deprecated` | 即将弃用的功能 | 标记即将移除的功能，并说明替代方案 |
| `Removed` | 已移除的功能 | 实际删除已弃用的功能 |
| `Fixed` | 错误修复 | 修复任何用户可见的 bug |
| `Security` | 安全漏洞 | 安全修复（可附带 CVE 编号） |

### 2.5. 条目编写规范

- 每个条目以 `-` 开头，末尾不加句号
- 英文条目首字母大写，中文条目直接写不加引号
- 如果条目标题不足以说明，另起一行缩进补充细节：

```markdown
### Added
- **ConfigAdapter**: 新增 `getMaxRetries()` 方法
    返回最大重试次数，默认值为 3，可通过构造函数注入
```

- 条目面向 CHANGELOG 读者（包的使用者），描述"做了什么"和"为什么做"，而不是"怎么实现"
- 如果某个变更需要更详细的迁移指南，在 CHANGELOG 中写简要说明，另开文档详述

### 2.6. 禁止写入 CHANGELOG 的内容

- WIP（Work in Progress）的部分实现
- 仅测试代码变更（新增/修改测试用例）
- 仅文档代码变更（修改 JSDoc、README）
- 仅配置变更（修改 CI、打包配置、lint 规则）
- 内部重构但无 API/行为变化
- 依赖版本更新但无行为变化

## 3. 日常维护流程

### 3.1. changeset 模式

不维护 `CHANGELOG.md` 中的 `[Unreleased]`，通过 changeset 文件驱动。完成一个用户可见功能或修复后，**立即**创建 changeset 文件：

```bash
NEXT_NUM=$(python3 .agents/skills/changeset-workflow/scripts/next-changeset-number.py .changeset)
# 在 .changeset/ 下创建 CHANGESET-XXX-描述.md
```

格式参考 [changeset-workflow skill](../../.agents/skills/changeset-workflow/SKILL.md)。

**禁止直接编辑 CHANGELOG.md**——由 `changeset version` 自动生成 CHANGELOG 条目。

### 3.2. manual 模式

在 `CHANGELOG.md` 中维护 `[Unreleased]` 章节，完成变更后**立即**添加条目。

```markdown
# cmtx-vscode 更新日志 / Changelog

## [Unreleased]

### Added
- **预览面板**: 新增 Markdown 预览面板
    支持实时渲染和滚动同步

### Fixed
- **中文路径**: 修复中文文件名无法打开的问题
```

日常维护只需写中文，英文在发布时添加。`[Unreleased]` 保持始终存在。

### 3.3. 确定受影响的包

根据变更影响的包来决定：

- 修改了 `packages/core/src/filter.ts` -> 影响 `@cmtx/core`
- 修改了 `packages/publish/src/index.ts` -> 影响 `@cmtx/rule-engine`
- 修改了跨包的类型定义 -> 影响所有受影响包

### 3.4. 比较基准

日常维护只需要关注本次 CHANGELOG 撰写期间的变更范围，即自上一次该包 CHANGELOG 更新以来发生的变化，而非从上一个发布版本开始的全量 diff。

## 4. 发布流程

### 4.1. Changeset 与 CHANGELOG 的关系

| 维度 | CHANGELOG | Changeset |
|------|-----------|-----------|
| 维护者 | `changeset version` 生成 + 开发者精修 | 开发者手动 |
| 内容 | 详细的功能描述（中英文双语） | 简短的版本变更说明（中文） |
| 用途 | 面向用户阅读 | 驱动 `changeset version` bump |
| 发布时 | `release-changelog.mjs` 添加日期，开发者精修标题和双语 | pre-release 模式下保留，exit 后删除 |

### 4.2. 发布后格式统一

无论包是 `changeset` 模式还是 `manual` 模式，**最终发布的 CHANGELOG 格式完全一致**：先中文后英文的双语结构，使用标准 Keep a Changelog 分类标题。

精修的目标是让 CHANGELOG.md 达到此统一格式。精修过程中**只修改 CHANGELOG.md，不修改 changeset 文件**。

**禁止删除版本号。** 即使 `changeset version` 生成的该版本条目内容没什么用，也要根据 commit 提炼一些内容出来，确保每个版本号都对应有内容的版本。删除版本号会导致 CHANGELOG 与 `package.json` 的 version 脱节。

### 4.3. changeset 模式精修步骤

`pnpm changeset version` 执行后，CHANGELOG.md 中新增了自动生成的半成品内容，精修在 CHANGELOG.md 上进行（**不修改 changeset 文件**）：

- 删除 `### Patch Changes` 中**仅**含依赖更新的块（`- Updated dependencies [sha]`），这不是用户可见变更
- 将 `### Minor Changes` / `### Patch Changes` 重命名为 Keep a Changelog 标准类型（`### Added` / `### Changed` / `### Fixed` 等），根据实际变更内容判断归属，不留映射规则
- 移除条目中的 commit SHA 前缀（`a539714:` 部分）
- 展开条目内容，将一行简写拆分为多行完整描述

### 4.4. manual 模式精修步骤

#### 步骤 1：更新版本号

更新 `package.json` 中的 `version` 字段到新版本。

#### 步骤 2：替换标题

将 `## [Unreleased]` 替换为 `## [<version>] - YYYY-MM-DD`。

如果 `[Unreleased]` 之后有新的开发中条目，在文件顶部重新创建一个 `## [Unreleased]` 章节。

### 4.5. 共同精修步骤（两种模式均需执行）

完成各自模式的特定步骤后，所有包都需要执行以下三步：

#### 步骤 1：验证标题格式与日期

确认版本标题格式为 `## [<version>] - YYYY-MM-DD`，与上一个版本的基准对齐。

#### 步骤 2：对比 git diff 审核内容

根据上一次实际发布的版本，对比 git diff 审核当前 CHANGELOG 内容：

```bash
# 查找包的上一个发布 tag
LAST_TAG=$(git tag --list '@cmtx/core/*' --sort=-v:refname | head -1)

# 查看自上一个版本以来的 src 变更
git diff "$LAST_TAG"...HEAD -- packages/core/src/ packages/core/package.json | head -100
```

审核点：
- 发现 diff 中有变更但 CHANGELOG 没有记录 -> **补齐遗漏**
- 发现 CHANGELOG 记录了但 diff 中找不到证据 -> **删除虚构条目**（可能是中间 commit 走了弯路，实际上不存在的变更）
- 确认所有用户可见的变更都已覆盖

#### 步骤 3：添加英文翻译

每个中文章节完成后，用 `---` 分隔，添加对应的英文版本。英文与中文条目一一对应。

### 4.6. 完整示例：精修前后对比

#### Before：`changeset version` 自动生成

```markdown
# @cmtx/core 更新日志 / Changelog

## [0.4.0] - 2026-05-06

### Minor Changes

- a539714: frontmatter-id FF1 配置解耦与校验增强

  - `ff1` 新增可选 `length`/`radix` 字段，可独立覆盖 counter 格式配置
  - `ff1.useCounter` 引用的 counter ID 不存在时返回可读错误，而非静默降级

- 862fc95: - ID 生成器重构：支持多 counter 模板化 ID 生成，移除废弃的 id-generate-rule
  - Counter 服务重构：新增 `peek()`/`commit()` 模式，支持多 counter 状态管理
  - 新增 `frontmatter-slug` 规则，支持 transform/extract/ai 三种 slug 生成策略
  - 集成 `@cmtx/ai` 包，支持 AI 驱动的 slug 生成
  - 新增 `transfer-images` 规则，支持跨存储图片转移
  - Service registry 注册 `TransferAssetsService` 和 `FrontmatterSlugRule`
  - `formatForPublish` 更新适配新的 template 化 ID 生成
  - 配置类型扩展：新增 counter 配置、FF1 配置、slug 配置、transfer 配置
  - frontmatter-id 模板化：`ff1` 新增可选 `length`/`radix` 字段，`useCounter` 引用无效 ID 时报错而非静默降级
  - counter 格式配置从顶层移至规则级别，简化配置结构

### Patch Changes

- Updated dependencies [862fc95]
- Updated dependencies [862fc95]
- Updated dependencies [862fc95]
- Updated dependencies [862fc95]
- Updated dependencies [862fc95]
- Updated dependencies [862fc95]
  - @cmtx/asset@0.2.0-alpha.3
  - @cmtx/autocorrect-wasm@0.1.1-alpha.2
  - @cmtx/core@0.4.0-alpha.3
  - @cmtx/fpe-wasm@0.1.1-alpha.3
  - @cmtx/storage@0.1.1-alpha.3
  - @cmtx/template@0.2.0-alpha.3
```

#### After：精修后（双语 + 标准分类，两条 changeset 合并）

```markdown
# @cmtx/core 更新日志 / Changelog

## [0.4.0] - 2026-05-06

### Added

- **FF1 配置解耦**: frontmatter-id FF1 配置解耦与校验增强
  - `ff1` 新增可选 `length`/`radix` 字段，可独立覆盖 counter 格式配置
  - `ff1.useCounter` 引用的 counter ID 不存在时返回可读错误，而非静默降级
- **ID 生成器重构**: 支持多 counter 模板化 ID 生成，移除废弃的 id-generate-rule
- **Counter 服务重构**: 新增 `peek()`/`commit()` 模式，支持多 counter 状态管理
- **frontmatter-slug 规则**: 新增 transform/extract/ai 三种 slug 生成策略
- **transfer-images 规则**: 新增跨存储图片转移能力
- **配置类型扩展**: 新增 counter、FF1、slug、transfer 等配置类型

---

### Added

- **FF1 Config Decoupling**: Decoupled FF1 config with enhanced validation
  - Added optional `length`/`radix` fields to `ff1` for independent counter format config
  - `ff1.useCounter` now returns a readable error for invalid counter IDs
- **ID Generator Refactor**: Multi-counter template-based ID generation, removed deprecated id-generate-rule
- **Counter Service Refactor**: New `peek()`/`commit()` pattern for multi-counter state management
- **frontmatter-slug Rule**: Three slug strategies: transform, extract, and AI
- **transfer-images Rule**: Cross-storage image transfer support
- **Config Type Extensions**: Added counter, FF1, slug, and transfer configs
```

（依赖更新块已删除，commit SHA 已移除，`### Minor Changes` 改为 `### Added`，条目按功能拆分合并。）

### 4.7. 补充示例

<details>
<summary>多个 changeset 合并（同一包）</summary>

三个 changeset 文件：

```
CHANGESET-021-url-check.md:
---
"@cmtx/asset": minor
---
- URL 存在性检测

CHANGESET-022-head-fallback.md:
---
"@cmtx/asset": patch
---
- HEAD 降级策略

CHANGESET-023-batch-check.md:
---
"@cmtx/asset": minor
---
- 批量 URL 检测
```

`changeset version` 自动合并后，开发者精修为：

```markdown
## [0.3.0] - 2026-05-06

### Added

- **URL 存在性检测**: 新增 `checkUrlExists()` 函数
- **批量 URL 检测**: 新增 `checkUrlExistsBatch()` 函数

### Fixed

- **HEAD 降级策略**: HEAD 请求返回 405/501 时自动降级为 GET + Range

---

### Added

- **URL Existence Check**: Added `checkUrlExists()` function
- **Batch URL Checking**: Added `checkUrlExistsBatch()` function

### Fixed

- **HEAD Fallback Strategy**: Auto-fallback to GET + Range on 405/501
```

</details>

<details>
<summary>破坏性变更</summary>

```markdown
## [0.3.0] - 2026-05-06

### Breaking Changes

- **`uploadImage()` 签名变更**: 第二个参数从 `options` 改为 `config`
    迁移方法: 将 `{ timeout, retry }` 改为 `{ strategy, maxRetries }`

---

### Breaking Changes

- **`uploadImage()` signature changed**: Second parameter changed from `options` to `config`
    Migration: Replace `{ timeout, retry }` with `{ strategy, maxRetries }`
```

</details>

<details>
<summary>manual 模式精修前后</summary>

#### Before（日常维护，仅中文）：

```markdown
# cmtx-vscode 更新日志 / Changelog

## [Unreleased]

### Added
- **预览面板**: 新增 Markdown 预览面板
    支持实时渲染和滚动同步

### Fixed
- **中文路径**: 修复中文文件名无法打开的问题
```

#### After（发布，添加英文，标题改为版本号）：

```markdown
# cmtx-vscode 更新日志 / Changelog

## [0.2.0] - 2026-05-06

### Added

- **预览面板**: 新增 Markdown 预览面板
    支持实时渲染和滚动同步

### Fixed

- **中文路径**: 修复中文文件名无法打开的问题

---

### Added

- **Preview Panel**: Added Markdown preview panel
    Supports live rendering and scroll sync

### Fixed

- **Chinese Paths**: Fixed issue with Chinese filenames not opening
```

</details>

### 4.8. 发布前验证：对比 git diff

**这是发布前最重要的验证步骤。** 必须验证 CHANGELOG 内容与实际代码变更一致。

```bash
# 1. 查找包的上一个发布 tag
LAST_TAG=$(git tag --list '@cmtx/core/*' --sort=-v:refname | head -1)

# 2. 查看自上一个版本以来的 src 变更
git diff "$LAST_TAG"...HEAD -- packages/core/src/ packages/core/package.json | head -100

# 3. 查看具体新增/删除的函数和导出
git diff "$LAST_TAG"...HEAD -- packages/core/src/index.ts
```

验证清单：

- [ ] CHANGELOG（或 changeset）中的所有条目都能在 git diff 中找到对应证据
- [ ] 没有"虚构条目"（diff 中不存在的变更）
- [ ] 没有遗漏用户可见的变更（新增/删除的导出函数、API 签名变化、破坏性变更）
- [ ] 移除的公开 API/类型必须在 `### Removed` 中记录
- [ ] 内部重构（仅修改实现、不修改导出签名）不写入 CHANGELOG
- [ ] 仅修改测试文件、JSDoc、lint 配置、CI 配置等不写入 CHANGELOG

### 4.9. 完整发布命令链

```bash
# [changeset 模式] 版本计算（自动触发 CHANGELOG 版本标题添加日期）
pnpm changeset version

# [changeset 模式] 精修 CHANGELOG（删除依赖更新块 + 重命名分类标题 + 移除 commit SHA + 展开条目）
# [manual 模式] 精修 CHANGELOG（更新 package.json version + 替换 [Unreleased]）

# [共同] 审核内容完整性（对比 git diff，补齐遗漏、删除虚构条目）
# [共同] 添加英文翻译

# 验证构建
pnpm prepublish:validate

# 提交 & 发布
git add -A
git commit -m "Release v<version>"
pnpm changeset publish
git push --follow-tags
```

## 5. 命令速查

### 5.1. Git 查询命令

```bash
# 查找包的上一个版本标签
git tag --list '@cmtx/core/*' --sort=-v:refname | head -1

# 查看自上一个版本以来的变化（按包筛选）
git diff <last-tag>...HEAD -- packages/core/

# 查看所有提交（按包筛选）
git log <last-tag>...HEAD -- packages/core/

# 查看变更的文件列表
git diff <last-tag>...HEAD --name-only -- packages/core/
```

### 5.2. npm scripts 参考

| 脚本 | 命令 | 触发时机 | 说明 |
|------|------|----------|------|
| `postchangeset:version` | `node scripts/release-changelog.mjs` | 自动 | 给版本标题添加日期 |
| `release:alpha:start` | `pre enter alpha` + `changeset version` | 发布 | 首次进入 alpha 预发布 |
| `release:alpha:continue` | `changeset version` | 发布 | 后续 alpha 发布 |
| `release:alpha:publish` | `changeset publish` + `git push` | 发布 | alpha 发布到 npm |
| `release:beta:start` | `pre exit` + `pre enter beta` + `changeset version` | 发布 | 切换到 beta 预发布 |
| `release:beta:continue` | `changeset version` | 发布 | 后续 beta 发布 |
| `release:beta:publish` | `changeset publish` + `git push` | 发布 | beta 发布到 npm |
| `release:latest` | `pre exit` + `changeset version` + `publish` + `git push` | 发布 | 正式版发布 |
| `prepublish:validate` | `validate:build` + `validate:tests` + `validate:typecheck` | 发布前 | 发布前验证三件套 |

### 5.3. 常用操作速查

```bash
# 日常：创建 changeset（手动，推荐）
# 直接在 .changeset/ 下创建 CHANGESET-XXX-<描述>.md 文件

# 发布：版本计算 + CHANGELOG 版本标题添加日期
pnpm changeset version

# 发布：验证
pnpm prepublish:validate

# 发布：提交
git add -A && git commit -m "Release v<version>"

# 发布：推送到 npm
pnpm changeset publish && git push --follow-tags

# 调试：单独运行 changelog 替换
pnpm changeset:changelog

# 预览发布效果（dry-run）
pnpm changeset version --dry-run
pnpm changeset publish --dry-run
```

## 6. 参考文档

- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) — CHANGELOG 格式标准
- [Semantic Versioning](https://semver.org/spec/v2.0.0.html) — 语义化版本规范
- [Changesets 官方文档](https://github.com/changesets/changesets) — 版本管理工具
- [Changesets 配置调研](../../docs/RSR-005-changesets-research.md) — Changesets 配置分析
- [包发布指南](./DEV-009-publish_guide.md) — 完整发布流程
