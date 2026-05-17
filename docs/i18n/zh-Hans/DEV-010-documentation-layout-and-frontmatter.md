---
title: DEV-010 - 文档布局与 Frontmatter 要求
category: dev-guide
sidebar_order: 10
lang: zh-Hans
---

# DEV-010: 文档布局与 Frontmatter 要求

## 1. 文档位置概览

所有公开文档集中在 `docs/i18n/{lang}/` 下。`packages/*/README.md` 必须通过 symlink 指向 `docs/i18n/` 下的源文件，
禁止直接存放独立副本。

```bash
# 有英文版时 symlink 到英文版（npm/GitHub 默认显示）
packages/core/README.md → ../../docs/i18n/en/packages/core/README.md

# 无英文版时 symlink 到中文版
packages/ai/README.md → ../../docs/i18n/zh-Hans/packages/ai/README.md
```

| 位置                                   | 文件类型                            | lang 值      |
| -------------------------------------- | ----------------------------------- | ------------ |
| `docs/i18n/{lang}/*.md`                | DEV-NNN, CFG-001（根文档）          | zh-Hans / en |
| `docs/i18n/{lang}/packages/{pkg}/*.md` | 包子文档（README, USR, DEV, INDEX） | zh-Hans / en |
| `docs/i18n/{lang}/api/*.md`            | 手写 API 文档（按包组织）           | zh-Hans / en |

**非公开目录**（不纳入 frontmatter 标准化，但有独立 metadata 规范）：

| 目录                      | 原因                                              |
| ------------------------- | ------------------------------------------------- |
| `plans/`                  | 计划文档，有自身 PLAN metadata 规范               |
| `internal/`               | 内部开发产出                                      |
| `.github/`、`.kilo/`      | Agent 配置                                        |
| `packages/*/AGENTS.md`    | AI Agent 指引                                     |
| `packages/*/CHANGELOG.md` | 变更日志，有自身格式                              |
| `.changeset/`             | Changeset 文件                                    |
| `docs/typedoc/`           | TypeDoc 自动生成的 API 参考（临时保留，非主文档） |

## 2. 统一 Frontmatter Schema

所有公开文档必须使用以下统一的 frontmatter schema：

```yaml
---
title: "文档标题"                    # text, 必填。文档显示标题
category: guide                      # text, 必填。枚举值见下方
sidebar_order: 1                      # number, 可选。同 category 内排序
lang: zh-Hans                         # text, 必填。BCP 47 语言标签
tags:                                 # list, 可选。标签列表
    - getting-started
status: active                        # text, 可选。active|deprecated|draft
updated: 2026-05-07              # date, 可选。ISO 8601
skip_doc_render: true                 # boolean, 可选。默认 false（渲染）. true 时跳过 VitePress 页面生成
---
```

### 2.1. category 枚举值

| 值       | 适用范围                                | LYJ sidebar 分区       |
| -------- | --------------------------------------- | ---------------------- |
| `guide`  | USR-* 用户指南、README.md 包介绍        | Guide                  |
| `api`    | 手写 API 文档、INDEX.md、TypeDoc 生成页 | API Reference          |
| `dev`    | DEV-* 开发者文档                        | Development            |
| `config` | CFG-* 配置参考                          | Configuration          |
| `adr`    | 架构决策记录                            | Architecture Decisions |

### 2.2. lang 字段

BCP 47 语言标签，使用 script-based 而非 region-based：

| 标签      | 含义                 | 适用场景           |
| --------- | -------------------- | ------------------ |
| `zh-Hans` | 简体中文（书写系统） | 默认语言，地域中立 |
| `en`      | 英语                 | 英文翻译           |

### 2.3. skip_doc_render 字段

控制 LYJ VitePress 站点是否跳过该文档（不生成侧边栏/导航条目）。默认 absent = false（正常渲染）。INDEX.md 等纯导航类文档标记为 `true`。

### 2.4. 各位置字段要求

| 位置                                        | 必填字段                               | 可选字段                                              |
| ------------------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| `docs/i18n/{lang}/*.md` (DEV/CFG 根文档)    | title, category, lang                  | sidebar_order, tags, status, updated, skip_doc_render |
| `docs/i18n/{lang}/packages/{pkg}/INDEX.md`  | title, category, lang, skip_doc_render | sidebar_order                                         |
| `docs/i18n/{lang}/packages/{pkg}/README.md` | title, category, lang                  | sidebar_order, skip_doc_render                        |
| `docs/i18n/{lang}/api/*.md`                 | title, category, lang                  | sidebar_order, package, skip_doc_render               |

### 2.5. sidebar_order 分配策略

| 文件模式                                         | 策略                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `docs/i18n/{lang}/DEV-NNN`                       | 按编号：DEV-001=1, ..., DEV-013=13                                                                        |
| `docs/i18n/{lang}/CFG-001`                       | =1                                                                                                        |
| `docs/i18n/{lang}/VSCODE-EXTENSION-CHUNKING-FIX` | =99                                                                                                       |
| `docs/i18n/{lang}/api/README.md`                 | =0                                                                                                        |
| `docs/i18n/{lang}/api/{pkg}.md`                  | 按架构层次：foundation(1-10), tooling(11-20), orchestration(21-30), processing(31-40), application(41-50) |
| `docs/i18n/{lang}/packages/*/README.md`          | 按架构层次：foundation(1-10), tooling(11-20), orchestration(21-30), processing(31-40), application(41-50) |
| `docs/i18n/{lang}/packages/*/USR-NNN`            | 按编号：USR-001=1, ..., USR-005=5                                                                         |
| `docs/i18n/{lang}/packages/*/DEV-NNN`            | 按编号升序                                                                                                |
| `docs/i18n/{lang}/packages/*/CFG-NNN`            | =1                                                                                                        |
| `docs/i18n/{lang}/packages/*/TODO-NNN`           | =99                                                                                                       |

### 2.6. 目录对应关系

| 原位置                    | 新位置                                                |
| ------------------------- | ----------------------------------------------------- |
| `docs/*.md`               | `docs/i18n/{lang}/*.md`                               |
| `packages/*/docs/*.md`    | `docs/i18n/{lang}/packages/{pkg}/*.md`                |
| `packages/*/README.md`    | `docs/i18n/{lang}/packages/{pkg}/README.md` (symlink) |
| `packages/*/README.en.md` | `docs/i18n/en/packages/{pkg}/README.md` (symlink)     |

## 3. 新增文档检查清单

### 3.1. 通用公开文档（`docs/i18n/{lang}/`）

新增公开文档时，请确保：

1. [ ] 文件位于 `docs/i18n/{lang}/` 下对应的子目录
2. [ ] 包含统一 frontmatter：`title`、`category`、`lang` 必填
3. [ ] `sidebar_order` 不与该 category 内现有文档冲突
4. [ ] INDEX.md 必须设置 `skip_doc_render: true`
5. [ ] README 的 `category` 为 `guide`（非 `api`）
6. [ ] `lang` 值必须与所在目录的语言一致
7. [ ] 文件命名符合 `[CATEGORY-]NUMBER-name.md` 格式（详见 `DOC-001`）

## 4. 参考

- `docs/.frontmatter-schema.yaml` — schema 定义文件
- `scripts/sync-readmes.sh` — 管理包根目录 README symlink
- `PLAN-063` — docs/i18n/ 多语言架构实施计划
- `PLAN-061` — frontmatter 标准化实施计划
- `PLAN-060` — `FrontmatterValue` 类型扩展（number/boolean 支持）
