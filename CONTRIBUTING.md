# Contributing

感谢你的贡献意向！本仓库采用 pnpm workspace 的 Monorepo 结构，当前包含 @cmtx/core、@cmtx/asset、@cmtx/cli 与 @cmtx/mcp-server。

## 开发环境

- Node.js 22+（建议保持与 CI 一致）
- pnpm 10+（已在 packageManager 字段声明）
- ESM / TypeScript NodeNext

## 安装与常用命令

```bash
pnpm install        # 安装依赖
pnpm build          # 递归构建所有包
pnpm test           # 递归运行 Vitest
pnpm lint           # 代码检查（oxlint & oxfmt）
pnpm run docs       # 生成 TypeDoc API 文档
```

## 代码变更工作流程

### 三个固定阶段

#### 阶段 1: 代码设计与实现

- 在 PLAN 中设计变更方案
- 同步编写/更新相关测试
- 更新受影响的注释（代码内注释）

#### 阶段 2: 验收检查（缺一不可）

所有代码变更必须通过以下四项检查：

1. `pnpm build` - 构建成功
2. `pnpm test` - 测试通过
3. `pnpm lint` - 代码风格检查（oxlint & oxfmt）
4. `pnpm typecheck` - TypeScript 类型检查

**验收通过条件：四项全部 PASS，缺一不可**

#### 阶段 3: 文档更新（验收后立即执行）

验收通过后，需要更新所有涉及的文档：

- API 文档（对应包的 README.md）
- 架构文档（如涉及包设计或依赖关系变更）
- 使用指南（如改变公开 API）
- 历史 PLAN 除外，仅记录最新状态

### PLAN 设计清单

设计代码变更的 PLAN 时，应包含以下固定段落：

- [OK] 测试更新策略（新增、修改或删除的测试）
- [OK] 四项检查验收标准（build/test/lint/typecheck）
- [OK] 文档更新清单（受影响的文件）
- [OK] 预期的代码行数变化（构建产物大小变化）

## 提交流程

1. Fork & branch
2. 开发：保持 ESM、严格类型，遵循现有代码风格
3. 校验：运行 `pnpm build`、`pnpm test`、`pnpm lint`、`pnpm typecheck`（四项都需通过）
4. 更新文档：确保所有受影响的 README 与架构文档已更新
5. 提交信息：建议使用简洁动词开头，明确范围（如 feat(core), fix(upload), docs(cli)）
6. PR：描述改动、测试结果、文档更新情况，必要时附截图或日志

## 代码风格

- TypeScript strict 模式，NodeNext 模块解析
- 导入路径在源码中使用 .js 后缀（满足 NodeNext 构建）
- Markdown 表格使用空格分隔管道，标题与列表上下保持空行
- 遵循现有项目中的命名和组织方式
- 非必要不使用 `import()` 动态导入。如使用，必须在代码注释中说明必要性。对 `node:*` 内置模块禁止动态导入（无实际收益，增加异步复杂度）。TypeScript 类型引用语法（`import("./types").SomeType`）不受此限制

## 设计原则

遵循 SOLID 和 DRY 原则：

- **单一职责**：每个函数/模块专注于单一功能（如 parser.ts 只负责解析）
- **开闭原则**：通过配置选项和接口支持扩展（如删除策略 `trash | move | hard-delete`）
- **依赖倒置**：通过回调注入依赖（如 logger 参数），降低模块耦合
- **DRY**：提取公共逻辑（如 `withRetry`），使用 TypeDoc 生成 API 文档，避免在 README 中重复 API 说明

## 日志规范

- **库包只接接口**：从 `@cmtx/core` 导入 `Logger` 类型与 `dummyLogger`，通过可选参数注入（`logger: Logger = dummyLogger`），默认静默
- **应用层负责实现**：CLI 用 `createCliLogger()`（winston），VS Code 用 `UnifiedLogger`（OutputChannel + 文件日志），`console` 本身也是合法实现
- **禁止 `console.*`**：库包代码不得直接调用 `console.log/warn/error`，必须通过 Logger 接口
- **日志格式**：消息加 `[ModuleName]` 前缀，如 `this.logger.info("[UploadPipeline] Starting")`

## 版本与发布

- 当前版本处于 `0.x` 开发阶段，**禁止使用 major bump**
- 破坏性变更（API 删除、签名变更）使用 minor（如 `0.1.0` → `0.2.0`）
- 常规更新（新功能、bug 修复、内部优化）使用 patch（如 `0.1.0` → `0.1.1`）
- 正式发布 `1.0.0` 的时机由维护者决定，通常在 API 稳定且需要对外承诺兼容性时
- 发布范围：@cmtx/\*（默认 public 发布）
- Changelog 维护：各包内 CHANGELOG.md，遵循 Keep a Changelog 格式

## 文档要求

- 各包应包含 README.md，描述功能、使用方式、API 接口
- 新增公开 API 需在 README 或 API 文档中说明
- 大功能特性应在 CHANGELOG.md 中记录
- TypeDoc 注释应完整，至少包含功能说明和参数描述

## 问题反馈

- Issue 列表：<https://github.com/cc01cc/cmtx-project/issues>
- 欢迎提供复现步骤、日志或最小复现示例

## 核验清单

- [ ] 代码必须通过 eslint 等 lint 检测
- [ ] API 签名设计合理、一致，仅暴露必要的接口与类型（含子类型）
- [ ] TypeDoc 注释完整（含功能说明和参数描述）
- [ ] 相关文档同步更新（包内文档、根目录文档）
- [ ] 测试用例完善，删除过时用例
- [ ] 代码示例完善，删除过时示例
- [ ] CHANGELOG.md 仅在版本发布前统一更新

## 包结构简介

### @cmtx/core

- 核心库：Markdown 图片处理与元数据操作
- 架构：正则表达式统一架构，专注于基础原子操作
- 特性：多种筛选模式（sourceType/hostname/absolutePath/regex）、多种删除策略（trash/move/hard-delete）、全面的错误处理
- 输出：dist 目录、docs/api 文档

### @cmtx/asset

- 资产管理：本地图片上传和远程图片转移
- 架构：配置构建器模式 + 适配器模式
- 特性：全局和单文件去重、智能重命名、安全回收、指数退避重试、降级策略
- 依赖：@cmtx/core、@cmtx/storage、@cmtx/template
- 输出：dist 目录、docs/api 文档

### @cmtx/cli

- 命令行工具：Markdown 图片管理工具
- 架构：基于 @cmtx/core 和 @cmtx/asset
- 特性：友好 UI（ora 动画、chalk 着色）、参数验证、环境变量支持
- 依赖：@cmtx/core、@cmtx/asset、@cmtx/rule-engine、@cmtx/storage、yargs、chalk、ora
- 输出：dist 目录、bin/cmtx 可执行文件

### @cmtx/mcp-server

- JSON-RPC 2.0 MCP 服务器：为 AI 代理提供工具接口
- 特性：stdio 通信、完整工具集、error handling
- 依赖：@cmtx/core、@cmtx/asset
- 输出：dist 目录、bin/cmtx-mcp 可执行文件

### @cmtx/fpe-wasm

- NIST SP 800-38G FF1 格式保留加密（WASM）
- 实现：Rust + wasm-pack，符合 NIST 标准，AES-256
- 难点：WASM 多目标构建（web/bundler）、TypeScript 类型适配
- 详见：[开发指南 - WASM 打包说明](./docs/DEV-001-development_guide.md#wasm-打包说明)

## 相关文档

- [开发指南](./docs/DEV-001-development_guide.md) - 开发环境、常用命令、WASM 打包说明
