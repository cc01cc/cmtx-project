# 发布前校验与质量门禁指南

本文档定义 CMTX 项目中所有 npm 包发布前的质量校验标准，涵盖 package.json、README、CHANGELOG、TypeDoc 注释及构建产物的验证要求。

## 1. 概述

CMTX 使用 Changesets 管理版本号和发布流程。发布前需按以下顺序通过六个维度的校验：

1. **TypeDoc**: 公开 API 注释覆盖（优先执行，涉及代码变更）
2. **代码质量门禁**: build / test / lint / typecheck
3. **package.json**: npm 发布元数据字段
4. **README**: 文档准确性与格式规范
5. **CHANGELOG**: 变更记录完整性、双语格式对齐
6. **构建产物**: 输出文件与导出正确性

### 1.1. 适用范围

以下包须通过完整校验：

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

**不适用**: `cmtx-vscode`（VS Code 扩展使用独立发布机制，参见 [`DEV-008-vscode-publish-guide.md`](../packages/vscode-extension/docs/DEV-008-vscode-publish-guide.md)）

---

## 2. package.json 校验（npm 发布字段）

发布前重点校验 npm 包元数据字段，完整的 package.json 配置模板参见 [Package & Scripts 标准化指南](./DEV-007-package_scripts_guide.md)。

### 2.1. 校验清单

- [ ] `name`: 使用正确的 `@cmtx/` 作用域
- [ ] `description`: 非空，**必须根据包的最新设计更新**，准确概括当前功能范围
- [ ] `license`: 为 `Apache-2.0`
- [ ] `repository`: `url` 和 `directory` 指向正确
- [ ] `bugs`: `url` 指向 GitHub Issues
- [ ] `homepage`: 指向 GitHub 仓库主页
- [ ] `author`: 为 `cc01cc`
- [ ] `keywords`: 包含相关关键词，至少含 `cmtx`
- [ ] `private`: 公开包不设置，私有包为 `true`
- [ ] `publishConfig.access`: 公开包为 `public`
- [ ] `files`: 包含 `dist`，不含 `src/`、`tests/` 等非发布文件
- [ ] `version`: 由 Changesets 管理，不手动修改

---

## 3. README 校验

### 3.1. 语言要求

- 主要语言为 **中文**
- 英文版本应同步存在（推荐方案：`README.md` 中文 + `README.en.md` 英文）

### 3.2. 内容限制

- **禁止大段代码示例**：代码块不超过 15 行
- **禁止手写 API 文档**：API 文档由 TypeDoc 自动生成，引用的标准文本：
    > 完整 API 文档：运行 `pnpm run docs` 生成（位于 `docs/api/` 目录）

### 3.3. 标准章节结构

每个包 README 应包含以下章节：

1. **标题与徽章**：包名 (H1)、npm 版本徽章、License 徽章
2. **简介**：说明包的功能、核心能力和用例。**必须检查是否匹配最新设计和当前功能集，避免描述过时或与实际实现不符**
3. **安装**：`pnpm add @cmtx/<name>`
4. **功能模块**：按模块组织代码示例，每块不超过 15 行
5. **与其他包的关系**：可选，依赖方向图
6. **开发**：`pnpm build`、`pnpm test`、`pnpm lint` 命令

### 3.4. 徽章格式

```markdown
# @cmtx/package-name

[![npm version](https://img.shields.io/npm/v/@cmtx/package-name.svg)](https://www.npmjs.com/package/@cmtx/package-name)
[![License](https://img.shields.io/npm/l/@cmtx/package-name.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)
```

### 3.5. 源码对照验证（关键）

这是 README 校验中最容易被忽视但最重要的环节。**仅检查格式和章节结构是不够的，必须对照源代码验证 README 的内容准确性。**

```bash
# 步骤 1：提取当前包的公开导出列表（值导出 + 类型导出）
# 通过查看入口文件的 export 语句获取完整列表
grep 'export ' packages/<name>/src/index.ts | grep -E '(function|const|class|type |interface )' | sort

# 步骤 2：提取 README 中提到的函数/类型列表
# 搜索代码块中 import 行的导出项
grep -oP '(?<=import \{ )[^}]+' packages/<name>/README.md | tr ',' '\n' | sed 's/^ *//' | sort

# 步骤 3：手动对比两份列表，确认：
# - README 覆盖了所有核心值导出（类型导出可选择性列出，但应指向 API 文档）
# - README 中列出的函数签名与实际代码一致（参数名、是否 async、返回值）
# - README 中不包含已移除或已迁移的过时 API
```

**常见问题（根据历史审计总结）：**

| 问题 | 说明 | 后果 |
|------|------|------|
| **遗漏新导出** | 新增函数/模块未在 README 功能模块中列出 | 埋没功能，用户不知可用 |
| **函数签名不准确** | `sync` 写成 `async`、参数名不一致 | 用户参考 README 写代码报错 |
| **包含已迁移 API** | 已移到 `@cmtx/asset` 的函数仍展示代码示例 | 用户困惑，在错误的包中寻找功能 |
| **描述与实际不符** | "纯文本不涉及文件操作"但实际存在文件 I/O 函数 | 破坏用户信任 |
| **版本写死** | 标题中写入 `v0.3.0` 但实际版本已变 | 徽章已自动显示版本，无需手写 |

### 3.6. 校验清单

- [ ] 内容以中文书写，英文版本同步存在
- [ ] 无大段代码示例（每块不超过 15 行）
- [ ] 无手写 API 文档（引用 `docs/api/`）
- [ ] npm 版本和 License 徽章存在且链接正确
- [ ] 章节遵循标准结构
- [ ] 简介描述与包的最新设计和当前功能集一致
- [ ] **已对照 `src/index.ts` 导出列表验证 README 函数列表完整性**（参考 [第 3.5 节](#35-源码对照验证关键)）
- [ ] **已验证 README 中函数签名与实际代码一致（async/sync、参数、返回值）**
- [ ] **已确认 README 不含已迁移或已移除的过时 API**
- [ ] 标题不含硬编码版本号（由 npm 徽章自动展示）
- [ ] 无表情符号（遵循 ASCII-only 政策）
- [ ] 行长度不超过 120 字符

---

## 4. CHANGELOG 校验

### 4.1. 格式要求

- 遵循 [Keep a Changelog](https://keepachangelog.com/) 格式
- 版本标题使用 Changesets 生成的版本号和日期
- 分类行使用 `- ` 无序列表

### 4.2. 双语要求

每个版本（包括 `[Unreleased]`）的内容采用**先中文后英文**的双语模式：

- 文件第一行标题使用双语命名：`# @cmtx/<name> 更新日志 / Changelog`
- 中文条目写完后，用 `---` 分隔线分隔，再写英文版本
- 中文和英文条目内容应一一对应，保持信息一致
- 示例参见 `packages/cli/CHANGELOG.md` 和 `packages/rule-engine/CHANGELOG.md`

### 4.3. 内容准确性校验（关键）

仅检查格式和双语是不够的。**必须通过 git diff 验证 CHANGELOG 内容与代码变更一致**。

```bash
# 查找上一个发布 tag
LAST_TAG=$(git tag --list '@cmtx/core/*' --sort=-v:refname | head -1)

# 对比 src 和 package.json 的变更
git diff "$LAST_TAG"...HEAD -- packages/core/src/ packages/core/package.json | head -50
```

**常见问题（根据历史审计总结）：**

| 问题 | 说明 | 后果 |
|------|------|------|
| **虚构条目** | CHANGELOG 条目在 git diff 中找不到对应证据 | 读者产生困惑，降低可信度 |
| **遗漏破坏性变更** | 移除公开 API、类型、更改函数签名未记录 | 用户升级时意外 break |
| **描述与事实不符** | 将"移除"写成"重构" | 用户误以为向后兼容 |
| **遗漏新增功能** | 新增的公共导出函数/类型未在 Added 中记录 | 埋没功能，用户不知可用 |
| **内部变更写入** | 仅修改测试、文档、lint 配置、构建配置写入了 CHANGELOG | 违反 Keep a Changelog 原则 |

### 4.4. 校验清单

- [ ] CHANGELOG.md 文件存在
- [ ] 文件标题使用双语命名（`更新日志 / Changelog`）
- [ ] 包含 Unreleased 区块，且 Unreleased 也采用双语模式
- [ ] 本次发布的版本条目已添加（由 Changesets 管理）
- [ ] **CHANGELOG 基于 `main` 分支的上一个已发布版本对比编写**，而非基于最近开发过程中的修改（避免将中间调试或回退的功能计入变更记录）
- [ ] 每个条目指向关联的 PR 或 Issue 编号
- [ ] 使用语义化版本变更类型（Added/Changed/Deprecated/Removed/Fixed/Security）
- [ ] 每个版本的内容采用先中文后英文的双语模式
- [ ] **已验证 Unreleased 条目与 git diff 一致（无虚构、无遗漏、无描述不实）**
- [ ] 新增的公开导出函数/类型在 `### Added` 中记录
- [ ] 移除的公开导出函数/类型在 `### Removed` 中记录
- [ ] 破坏性变更在 `### Breaking Changes` 中记录并附迁移指南
- [ ] 内部变更（测试/文档/配置/构建）未写入 CHANGELOG

---

## 5. TypeDoc 校验

### 5.1. 要求

- 所有导出的公开函数、类、接口必须包含 TypeDoc 注释
- 注释至少包含功能说明和参数描述
- 内部函数和私有成员不要求注释

### 5.2. 校验清单

- [ ] `pnpm run docs` 执行无报错
- [ ] 所有公开导出项有 TypeDoc 注释
- [ ] 无 `@internal` 标记导出到公开类型
- [ ] 生成的 `docs/api/` 目录内容完整

---

## 6. 构建产物校验

### 6.1. 校验清单

- [ ] `pnpm build` 构建成功
- [ ] `dist/index.js`（或入口文件）存在
- [ ] `dist/index.d.ts` 类型定义文件存在
- [ ] `files` 字段中声明的所有文件均已生成
- [ ] `exports` 字段中所有路径指向已存在文件
- [ ] WASM 包（fpe-wasm）确认 `.wasm` 文件已复制到 `dist/`

---

## 7. 综合发布前校验清单

以下为发布前逐一核对的最终清单，按执行顺序排列：

- [ ] TypeDoc 注释覆盖完整，`pnpm run docs:check` 无报错（参考 [第 5 节](#5-typedoc-校验)）
- [ ] 通过 `pnpm build`（编译成功，输出无警告）
- [ ] 通过 `pnpm test`（所有测试通过）
- [ ] 通过 `pnpm lint`（oxlint 和 oxfmt 无报错）
- [ ] 通过 `pnpm typecheck`（TypeScript 类型检查通过）
- [ ] package.json 配置完整（参考 [第 2 节](#2-packagejson-校验)）
- [ ] README 格式合规，且已对照 `src/index.ts` 导出列表验证内容准确性（参考 [第 3 节](#3-readme-校验)）
- [ ] CHANGELOG 已更新，采用先中文后英文的双语模式，且内容经 git diff 验证准确（参考 [第 4 节](#4-changelog-校验)）
- [ ] 构建产物完整（参考 [第 6 节](#6-构建产物校验)）
- [ ] 远程仓库已更新，工作区干净（无未提交更改）
- [ ] 已登录 npm（`npm whoami`）
- [ ] 不是 VS Code 扩展（使用 `packages/vscode-extension/docs/DEV-008-vscode-publish-guide.md`）

---

## 8. 参见

- [NPM 包发布指南](./DEV-009-publish_guide.md) — 完整的发布流程
- [DEV-001: 开发指南](./DEV-001-development_guide.md) — 开发环境与 workflow
- [DEV-002: ESM/CJS/WASM 打包指南](./DEV-002-esm-cjs-wasm-bundling-guide.md) — 构建配置
- [Package Scripts 标准化指南](./DEV-007-package_scripts_guide.md) — scripts 配置
