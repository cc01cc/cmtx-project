# CHANGELOG 标准化指南

## 1. 概述

CMTX 项目所有公开 npm 包的 CHANGELOG 遵循 [Keep a Changelog](https://keepachangelog.com/) 标准，配合 Changesets 实现版本管理和发布自动化。

### 1.1. 核心原则

- **CHANGELOG 只记录用户可见的变更**，不记录内部开发过程中的临时修改、重构中间态、待办事项
- **对比基准是 main 分支的上一个发布版本**，不是最近的 git commit 或 PR
- **双轨工作流**：changeset 管理包通过 changeset 文件驱动，ignored 包手动维护 `[Unreleased]`
- **每个版本采用先中文后英文的双语模式**，确保中英文用户均可阅读变更记录

### 1.2. 适用包列表

CHANGELOG 管理的包与 Changesets 管理的包一致（详见 `.changeset/config.json` 的 ignore 列表排除后剩余的包）：

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

## 2. 格式标准

### 2.1. 文件结构

每个包目录下有 `CHANGELOG.md` 文件，采用**先中文后英文**的双语结构。

**Ignored 包（手动维护 `[Unreleased]`）**：

```markdown
# @cmtx/<name> 更新日志 / Changelog

## [Unreleased]

### Added
- 新功能 A

### Fixed
- 修复问题 B

---

### Added
- Feature A

### Fixed
- Fixed issue B

## [0.3.0] - 2026-04-03

### Added 中文
- 功能描述

---

### Added English
- Feature description
```

**Changeset 包**：日常不维护 `[Unreleased]`，通过 changeset 文件驱动。`changeset version` 自动生成版本标题后，开发者精修罗列的双语内容。

### 2.2. 双语规范

**文件标题：**

- 使用双语命名：`# @cmtx/<name> 更新日志 / Changelog`

**版本内容：**

- **每个版本**均采用**先中文后英文**的双语模式
- 先写中文版本，再用 `---` 分隔线分隔
- 后写英文版本
- 中文与英文条目内容应一一对应，信息一致
- 初始发布版本可省略 `---` 分隔线，但双语必须完整

**`[Unreleased]` 示例（仅限 ignored 包）：**

```markdown
## [Unreleased]

### Added
- 新功能 A

### Fixed
- 修复问题 B

---

### Added
- Feature A

### Fixed
- Fixed issue B
```

**对比示例：**

<details>
<summary>正确示例（publish 包）</summary>

```markdown
# @cmtx/rule-engine 更新日志 / Changelog

## 0.1.0 - 2026-04-11

### 功能特性

**元数据管理**

- 从 Markdown 文件中提取元数据

---

### Features

**Metadata Management**

- Extract metadata from Markdown files
```

</details>

<details>
<summary>错误示例（无英文版本）</summary>

```markdown
# @cmtx/core Changelog

## 0.3.0 - 2026-04-03

### Added
- 功能描述
#  缺少英文版本，不符合双语要求
```

</details>

### 2.3. 标题规范

| 位置 | 格式 | 说明 |
|------|------|------|
| 文件第一行 | `# @cmtx/<name> 更新日志 / Changelog` | 双语命名 |
| 日常维护（changeset 包） | 无固定标题，由 changeset 驱动 | 创建 `CHANGESET-XXX-*.md` 文件，发布时 `changeset version` 自动生成 |
| 日常维护（ignored 包） | `## [Unreleased]` | 固定标题，全部大写，手动编辑 |
| 发布后 | `## [<version>] - <YYYY-MM-DD>` | 由脚本自动替换，如 `## [0.3.1] - 2026-04-27` |

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
- 英文条目首字母大写
- 中文条目直接写，不加引号
- 如果条目标题不足以说明，另起一行缩进补充细节：

```markdown
### Added
- **ConfigAdapter**: 新增 `getMaxRetries()` 方法
    返回最大重试次数，默认值为 3，可通过构造函数注入
```

## 3. 日常维护流程

### 3.1. 双轨概述

CMTX 采用双轨 CHANGELOG 维护流程：

| 维度 | Changeset 管理包 | Ignored 包 |
|------|-----------------|-------------|
| 包含的包 | `@cmtx/asset`, `@cmtx/core` 等（详见 1.2） | `cmtx-vscode`, `@cmtx/cli`, `@cmtx/mcp-server` |
| 日常维护方式 | 创建 `CHANGESET-XXX-*.md` 文件 | 编辑 `CHANGELOG.md` 的 `[Unreleased]` |
| 发布时 | `changeset version` 自动生成 CHANGELOG 条目 | 手动替换 `[Unreleased]` 为版本号+日期 |
| CHANGELOG 内容来源 | changeset 文件驱动 | 手动编写 |

### 3.2. Changeset 包工作流

在完成一个用户可见功能或修复后，**立即**创建 changeset 文件：

```bash
# 获取下一个编号
NEXT_NUM=$(python3 .agents/skills/changeset-workflow/scripts/next-changeset-number.py .changeset)

# 在 .changeset/ 下创建 CHANGESET-XXX-描述.md
```

格式参考 [changeset-workflow skill](../../.agents/skills/changeset-workflow/SKILL.md)。

**禁止直接编辑 CHANGELOG.md**——changeset 包的 CHANGELOG 由 `changeset version` 自动生成。

### 3.3. Ignored 包工作流

在完成一个用户可见功能或修复后，**立即**编辑对应包的 `CHANGELOG.md`，在 `[Unreleased]` 下添加条目：

```bash
# 编辑对应包的 CHANGELOG.md，在 [Unreleased] 下添加条目
```

### 3.4. 比较基准（通用）

**重要**：CHANGELOG 的变更应该基于 **main 分支上该包的上一个发布版本**，而非当前分支的最新 commit。

```bash
# 查找上一个版本 tag（假设当前在功能分支上）
git tag --list '@cmtx/core/*' --sort=-v:refname | head -1

# 查看自上一个版本以来该包的变化
git diff <last-tag>...HEAD -- packages/core/
```

### 3.5. 确定变更应写入哪个包

根据变更影响的包来决定：

- 修改了 `packages/core/src/filter.ts` -> 影响 `@cmtx/core`
- 修改了 `packages/publish/src/index.ts` -> 影响 `@cmtx/rule-engine`
- 修改了跨包的类型定义 -> 影响所有受影响包

### 3.6. 禁止写入 CHANGELOG 的内容

- WIP（Work in Progress）的部分实现
- 仅测试代码变更（新增/修改测试用例）
- 仅文档代码变更（修改 JSDoc、README）
- 仅配置变更（修改 CI、打包配置、lint 规则）
- 内部重构但无 API/行为变化
- 依赖版本更新但无行为变化

### 3.7. 保持条目简洁

- 条目面向 CHANGELOG 读者（包的使用者），不是代码审查者
- 描述"做了什么"和"为什么做"，而不是"怎么实现"
- 如果某个变更需要更详细的迁移指南，在 CHANGELOG 中写简要说明，另开文档详述

### 3.8. 发布前验证：对比 git diff

**这是发布前最重要的验证步骤。** 必须验证 CHANGELOG 内容与实际代码变更一致。

```bash
# 1. 查找包的上一个发布 tag
LAST_TAG=$(git tag --list '@cmtx/core/*' --sort=-v:refname | head -1)
echo "上版本: $LAST_TAG"

# 2. 查看自上一个版本以来的 src 变更摘要
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
- [ ] 包描述的变更（功能从 core 移到 asset 等）必须如实记录

## 4. 发布前（Changesets）流程

### 4.1. 创建 Changeset

每次 PR 前，判断是否需要 changelog 更新（用户可见功能、API 变更、bug 修复、破坏性变更）。如需要，创建 changeset 文件：

**方式 A：交互式**

```bash
pnpm changeset
```

**方式 B：手动创建文件（推荐，一包一文件）**

参考 [changeset-workflow skill](../../.agents/skills/changeset-workflow/SKILL.md) 获取编号并按模板创建：

```bash
NEXT_NUM=$(python3 .agents/skills/changeset-workflow/scripts/next-changeset-number.py .changeset)
# 然后在 .changeset/ 下创建 CHANGESET-XXX-<描述>.md
```

格式：

```markdown
---
"@cmtx/core": minor
---

- 新功能 A 的描述
- 修复 B 的描述
```

**约束**：每个 changeset 文件只声明一个包。

### 4.2. Changeset 与 CHANGELOG 的关系

| 维度 | CHANGELOG | Changeset |
|------|-----------|-----------|
| 维护者 | `changeset version` 生成 + 开发者精修 | 开发者手动 |
| 内容 | 详细的功能描述（中英文双语） | 简短的版本变更说明（中文） |
| 用途 | 面向用户阅读 | 驱动 `changeset version` bump |
| 发布时 | `release-changelog.mjs` 给版本标题添加日期 | pre-release 模式下保留，exit 后删除 |

**关键点**：`changeset version` 会自动生成 CHANGELOG 条目（`## X.Y.Z` + `### Minor Changes` 等），然后由 `release-changelog.mjs` 添加日期，最后开发者精修（移除实验性改动、调整分类标题为 Added/Fixed 等、添加英文翻译）。

## 5. 发布流程

### 5.1. 版本标题日期添加

`changeset version` 会生成 `## X.Y.Z` 格式的版本标题（含 pre-release 后缀如 `## 0.3.1-alpha.0`）。`scripts/release-changelog.mjs` 自动将其替换为 `## [X.Y.Z] - YYYY-MM-DD`。

**不**再插入 `[Unreleased]` 章节。

### 5.2. 自动触发机制

`pnpm changeset version` 执行后，npm `post` 钩子 `postchangeset:version` 自动触发 `node scripts/release-changelog.mjs`，给版本标题添加日期。

### 5.3. 完整发布命令链

```bash
# 1. Changeset 版本计算（自动触发 CHANGELOG 版本标题添加日期）
pnpm changeset version

# 2. 编辑 CHANGELOG（移除实验性改动、精修中文、添加英文）

# 3. 验证
pnpm prepublish:validate

# 4. 提交 & 发布
git add -A
git commit -m "Release v<version>"
pnpm changeset publish
git push --follow-tags
```

## 6. 维护建议

### 6.1. [Unreleased] 章节管理

**Ignored 包**：保持 `## [Unreleased]` 章节始终存在，是日常维护的唯一入口。

**Changeset 管理包**：不使用 `[Unreleased]`。发布后 `changeset version` 自动生成新版本标题，无需手动创建。

### 6.2. 特殊情况处理

**同一包有多个独立变更**：

Ignored 包 `[Unreleased]` 示例：

```markdown
## [Unreleased]

### Added
- 功能 A
- 功能 B

### Fixed
- 修复 C
- 修复 D
```

Changeset 包：为每个变更加载不同的 changeset 文件条目，`changeset version` 自动合并。

**重大变更**：

Ignored 包：

```markdown
## [Unreleased]

### Breaking Changes
- **API 签名变更**: `uploadImage()` 的第二个参数从 `options` 改为 `config`
    迁移方法: ...
```

Changeset 包：在 changeset 文件中描述 breaking change，`changeset version` 自动归入 `### Major Changes`。

## 7. 命令速查

### 7.1. Git 查询命令

```bash
# 查找包的上一个版本标签
git tag --list '@cmtx/core/*' --sort=-v:refname | head -1

# 查看自上一个版本以来的变化（按包筛选）
git diff <last-tag>...HEAD -- packages/core/

# 查看所有自上一个版本以来的提交（按包筛选）
git log <last-tag>...HEAD -- packages/core/

# 查看自上一个版本以来变更的文件列表
git diff <last-tag>...HEAD --name-only -- packages/core/
```

### 7.2. npm scripts 参考

| 脚本 | 命令 | 触发时机 | 说明 |
|------|------|----------|------|
| `postchangeset:version` | `node scripts/release-changelog.mjs` | 自动 | npm `post` 钩子，给版本标题添加日期 |
| `release:alpha:start` | `pre enter alpha` + `changeset version` | 发布 | 首次进入 alpha 预发布 |
| `release:alpha:continue` | `changeset version` | 发布 | 后续 alpha 发布 |
| `release:alpha:publish` | `changeset publish` + `git push` | 发布 | alpha 发布到 npm |
| `release:beta:start` | `pre exit` + `pre enter beta` + `changeset version` | 发布 | 切换到 beta 预发布 |
| `release:beta:continue` | `changeset version` | 发布 | 后续 beta 发布 |
| `release:beta:publish` | `changeset publish` + `git push` | 发布 | beta 发布到 npm |
| `release:latest` | `pre exit` + `changeset version` + `publish` + `git push` | 发布 | 正式版发布 |
| `prepublish:validate` | `validate:build` + `validate:tests` + `validate:typecheck` | 发布前 | 发布前验证三件套 |

单步操作直接使用 `pnpm changeset <command>` 命令，不再通过包装脚本间接调用。

### 7.3. 常用操作速查

```bash
# 日常：创建 changeset（交互式）
pnpm changeset

# 日常：创建 changeset（手动，推荐）
# 直接在 .changeset/ 下创建 CHANGESET-XXX-<描述>.md 文件

# 发布：版本计算 + CHANGELOG 版本标题添加日期（自动触发 post 钩子）
pnpm changeset version

# 发布：验证
pnpm prepublish:validate

# 发布：确认后提交
git add -A && git commit -m "Release v<version>"

# 发布：推送到 npm
pnpm changeset:publish && git push --follow-tags

# 调试：单独运行 changelog 替换
pnpm changeset:changelog

# 预览发布效果（dry-run）
pnpm changeset version --dry-run
pnpm changeset publish --dry-run
```

## 8. 参考文档

- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) — CHANGELOG 格式标准
- [Semantic Versioning](https://semver.org/spec/v2.0.0.html) — 语义化版本规范
- [Changesets 官方文档](https://github.com/changesets/changesets) — 版本管理工具
- [Changesets 配置调研](./DOC-011-changesets-research.md) — CMTX Changesets 配置分析
- [包发布指南](./DOC-004-publish_guide.md) — 完整发布流程
