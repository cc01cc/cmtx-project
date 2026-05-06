# DEV-009: cmtx-vscode 发布前验证清单

## 1. 代码质量门禁

- [ ] `pnpm -F cmtx-vscode build` — 构建成功
- [ ] `pnpm -F cmtx-vscode test` — 所有测试通过
- [ ] `pnpm -F cmtx-vscode lint` — 无 lint 错误
- [ ] `pnpm -F cmtx-vscode typecheck` — 类型检查通过

## 2. 构建产物验证

- [ ] `dist/extension.cjs` 存在
- [ ] `dist/cmtx_fpe_wasm_bg.wasm` 存在
- [ ] `dist/cmtx_autocorrect_wasm_bg.wasm` 存在
- [ ] WASM 文件可在 VSIX 中访问（`vsce package` 后 `unzip -l` 验证）
- [ ] 运行 `node scripts/verify-build.mjs` 校验通过

## 3. package.json 元数据

- [ ] `version` 已手动设置为目标版本
- [ ] `publisher` 为 `cc01cc`
- [ ] `engines.vscode` 版本范围正确
- [ ] `categories` 和 `keywords` 完整

## 4. README 校验

### 4.1. 语言要求

- [ ] 主要语言为**中文**，英文版本同步存在于 `README.en.md`
- [ ] 英文版与中文版内容结构一致，无遗漏章节

### 4.2. 内容限制

- [ ] 无大段代码示例（每块不超过 15 行）
- [ ] 无手写 API 文档（配置说明引用 `docs/CFG-001-config-guide.md`）
- [ ] 无表情符号（遵循 ASCII-only 政策）

### 4.3. 章节完整性

README 应包含以下章节：

- [ ] 标题与徽章（H1 + Marketplace 徽章：Version / Installs / Rating / License）
- [ ] 功能特性（要点列表，无代码块）
- [ ] 命令列表（表格格式）
- [ ] 配置说明（含环境变量用法和快速设置）
- [ ] 快捷键
- [ ] 开发（构建、打包、安装测试）
- [ ] 开发指南（引用 `docs/` 目录下的 DEV- 文档）
- [ ] 文档链接（`README.en.md`）
- [ ] 许可证

### 4.4. 源码对照验证（关键）

仅检查章节结构和格式是不够的。**必须对照源代码验证 README 内容准确性。**

```bash
# 步骤 1：提取 package.json 中注册的所有命令
grep '"command"' packages/vscode-extension/package.json | sed 's/.*"command": "//;s/".*//' | sort

# 步骤 2：提取 README 命令表的命令列表
grep -oP '(?<=`CMTX: )[^`]+' packages/vscode-extension/README.md | sort

# 步骤 3：手动对比两份列表，确认：
# - README 命令表覆盖了所有核心贡献命令
# - README 中不包含已移除或已重命名的过时命令
# - README 配置示例与 @cmtx/asset 当前配置格式一致（storages/upload/presignedUrls/resize）
```

**常见问题（根据历史审计总结）：**

| 问题 | 说明 | 后果 |
|------|------|------|
| **遗漏新命令** | 新增的 contributed command 未在 README 命令表中列出 | 用户不知可用 |
| **命令描述过时** | 命令功能已变更但 README 描述未更新 | 用户预期不符 |
| **配置示例错误** | 配置示例使用旧的 `providerConfig` 格式而非新的 `storages` 格式 | 用户照抄后配置不生效 |
| **环境变量名过时** | README 仍引用旧环境变量名（如 `ALIYUN_OSS_ACCESS_KEY_ID` 而非 `CMTX_ALIYUN_ACCESS_KEY_ID`） | 用户设置不生效 |
| **标题含硬编码版本号** | 标题写死 `v0.3.0` 但实际版本已变 | 徽章已自动显示版本，无需手写 |

- [ ] **已验证 README 命令列表与 `package.json#contributes.commands` 一致**
- [ ] **已验证配置示例与 `@cmtx/asset` 当前配置格式一致（storages/upload/presignedUrls/resize）**
- [ ] **已确认 README 不含已迁移或已移除的过时内容**
- [ ] 标题不含硬编码版本号
- [ ] 引用文档链接均有效（`docs/` 下文件存在）

### 4.5. 格式规范

- [ ] 行长度不超过 120 字符
- [ ] 代码块明确指定了语言
- [ ] 表格格式正确，列之间空格对齐

## 5. CHANGELOG 校验

### 5.1. 格式要求

- [ ] CHANGELOG.md 文件存在
- [ ] 遵循 [Keep a Changelog](https://keepachangelog.com/) 格式
- [ ] 使用语义化版本变更类型（Added/Changed/Deprecated/Removed/Fixed/Security）
- [ ] 文件标题使用双语命名：`更新日志 / Changelog`
- [ ] 包含 Unreleased 区块，且 Unreleased 也采用双语模式
- [ ] 本次发布的版本条目已添加
- [ ] 内部变更（测试/文档/配置/构建）未写入 CHANGELOG

### 5.2. 双语要求

- [ ] 每个版本内容采用**先中文后英文**的双语模式
- [ ] 中文条目与英文条目内容一一对应，信息一致
- [ ] 中文与英文之间使用 `---` 分隔线

### 5.3. 内容准确性校验（关键）

仅检查格式和双语是不够的。**必须通过 git diff 验证 CHANGELOG 内容与代码变更一致。**

```bash
# 查找上一个发布 tag（无 tag 时回退到 main 对比）
LAST_TAG=$(git tag --list 'cmtx-vscode/*' --sort=-v:refname | head -1)
if [ -n "$LAST_TAG" ]; then
    git diff "$LAST_TAG"...HEAD -- packages/vscode-extension/src/ packages/vscode-extension/package.json
else
    git log --oneline HEAD...origin/main -- packages/vscode-extension/src/ packages/vscode-extension/package.json
fi
```

- [ ] **已验证 Unreleased 条目与 git diff 一致**（无虚构、无遗漏、无描述不实）
- [ ] 新增功能在 `### Added` 中记录
- [ ] 移除功能在 `### Removed` 中记录
- [ ] 破坏性变更在 `### Breaking Changes` 中记录并附迁移指南

### 5.4. 常见问题（根据历史审计总结）

| 问题 | 说明 | 后果 |
|------|------|------|
| 虚构条目 | CHANGELOG 条目在 git diff 中找不到对应证据 | 读者产生困惑，降低可信度 |
| 遗漏破坏性变更 | 移除命令、API、功能未记录 | 用户升级时意外 break |
| 描述与事实不符 | 将"移除"写成"重构" | 用户误以为向后兼容 |
| 遗漏新增功能 | 新增的命令/功能未在 Added 中记录 | 埋没功能，用户不知可用 |
| 内部变更写入 | 仅修改测试、文档、lint 配置、构建配置写入了 CHANGELOG | 违反 Keep a Changelog 原则 |

## 6. 发布元数据

- [ ] `CHANGELOG.md` 已更新目标版本条目
- [ ] `DEV-008-vscode-publish-guide.md` 版本策略与本发布类型一致
- [ ] vsce 已登录：`vsce login cc01cc`
- [ ] vsce 为最新版本：`pnpm add -g @vscode/vsce`

## 7. 发布类型专用检查

**预览版发布额外检查**：

- [ ] 版本号为 `奇数.小版本`（如 `0.3.0`）
- [ ] 打包命令使用 `pre-release`：`pnpm -F cmtx-vscode package:pre-release`

**稳定版发布额外检查**：

- [ ] 版本号为 `偶数.小版本`（如 `0.2.0`）
- [ ] 打包命令使用 `stable`：`pnpm -F cmtx-vscode package:stable`
- [ ] 历史预览版版本号不高于当前稳定版

## 8. 打包验证

- [ ] `vsce package --no-dependencies` 成功
- [ ] `.vsix` 文件已生成
- [ ] VSIX 内容验证（`unzip -l *.vsix`）：确认包含 extension.cjs 和 WASM 文件

## 9. 综合发布前校验清单（执行顺序）

- [ ] 通过代码质量门禁（build/test/lint/typecheck）
- [ ] 构建产物完整（dist/ 文件存在）
- [ ] package.json 元数据正确
- [ ] README 格式合规，且已对照 `package.json#contributes.commands` 验证内容准确性（参考 [第 4.4 节](#44-源码对照验证关键)）
- [ ] CHANGELOG 已更新，采用先中文后英文的双语模式，且内容经 git diff 验证准确
- [ ] 发布元数据已验证
- [ ] 发布类型专用检查通过
- [ ] .vsix 打包产物验证通过
- [ ] 远程仓库已更新，工作区干净（无未提交更改）

## 10. 相关文档

- [NPM 包发布前校验与质量门禁指南](../../docs/DOC-003-publish-validation.md) — 库包发布校验标准
- [DEV-008: VS Code 插件发布指南](./DEV-008-vscode-publish-guide.md) — 完整的发布流程
- [VS Code 官方发布文档](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) — vsce 使用参考
