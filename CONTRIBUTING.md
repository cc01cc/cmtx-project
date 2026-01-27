# Contributing

感谢你的贡献意向！本仓库采用 pnpm workspace 的 Monorepo 结构，当前包含 @cmtx/core、@cmtx/upload、@cmtx/cli 与 @cmtx/mcp-server。

## 开发环境

- Node.js 18+（建议保持与 CI 一致）
- pnpm 10+（已在 packageManager 字段声明）
- ESM / TypeScript NodeNext

## 安装与常用命令

```bash
pnpm install        # 安装依赖
pnpm build          # 递归构建所有包
pnpm test           # 递归运行 Vitest
pnpm lint           # 统一 ESLint（ESM/TS/Markdown/JSON）
pnpm run docs       # 递归生成 TypeDoc（core、upload 输出至各自 docs/api）
```

## 提交流程

1. Fork & branch
2. 开发：保持 ESM、严格类型，遵循现有代码风格
3. 校验：至少运行 `pnpm lint` 与 `pnpm test`
4. 提交信息：建议使用简洁动词开头，明确范围（如 feat(core), fix(upload), docs(cli)）
5. PR：描述改动、测试结果，必要时附截图或日志

## 代码风格

- TypeScript strict 模式，NodeNext 模块解析
- 导入路径在源码中使用 .js 后缀（满足 NodeNext 构建）
- 避免新增运行时依赖，核心包（@cmtx/core）保持零依赖
- Markdown 表格使用空格分隔管道，标题与列表上下保持空行
- 遵循现有项目中的命名和组织方式

## 版本与发布

- 开发阶段统一版本 0.1.0
- 正式发布后各包将独立版本号和更新周期
- 发布范围：@cmtx/*（默认 public 发布）
- Changelog 维护：各包内 CHANGELOG.md，遵循 Keep a Changelog 格式

## 文档要求

- 各包应包含 README.md，描述功能、使用方式、API 接口
- 新增公开 API 需在 README 或 API 文档中说明
- 大功能特性应在 CHANGELOG.md 中记录
- TypeDoc 注释应完整，至少包含功能说明和参数描述

## 问题反馈

- Issue 列表：<https://github.com/cc01cc/cmtx-project/issues>
- 欢迎提供复现步骤、日志或最小复现示例

## 包结构简介

### @cmtx/core

- 核心库：Markdown 图片提取、引用分析、替换删除
- 特性：零依赖、递归扫描、位置详情、类型安全
- 输出：dist 目录、docs/api 文档

### @cmtx/upload

- 上传工具：对象存储集成、批量操作、事件回调
- 特性：智能重命名、安全回收、进度跟踪
- 依赖：ali-oss peer
- 输出：dist 目录、docs/api 文档

### @cmtx/cli

- 命令行工具：扫描、上传、配置管理
- 特性：友好 UI（ora 动画、chalk 着色）、参数验证、环境变量支持
- 依赖：@cmtx/core、@cmtx/upload、yargs、chalk、ora、ali-oss
- 输出：dist 目录、bin/cmtx 可执行文件

### @cmtx/mcp-server

- JSON-RPC 2.0 MCP 服务器：为 AI 代理提供工具接口
- 特性：stdio 通信、完整工具集、error handling
- 依赖：@cmtx/core、@cmtx/upload、ali-oss
- 输出：dist 目录、bin/cmtx-mcp 可执行文件
