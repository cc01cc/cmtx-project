# cmtx Monorepo

基于 pnpm workspace 的多包仓库，当前包含四个包：

- @cmtx/core：Markdown 图片提取与引用分析（零依赖）
- @cmtx/upload：对象存储上传助手（peer: ali-oss）
- @cmtx/cli：命令行工具用于图片管理（基于 @cmtx/core 与 @cmtx/upload）
- @cmtx/mcp-server：JSON-RPC 2.0 MCP 服务器（Model Context Protocol）

## 快速开始

```bash
pnpm install

# 全部构建 / 测试 / Lint / 文档
pnpm build
pnpm test
pnpm lint
pnpm run docs
```

## 包简介

### @cmtx/core

- 功能：从 Markdown 文本 / 文件 / 目录提取图片；检查与查询图片引用；支持递归扫描和位置详情
- 特性：ESM、零依赖、NodeNext、严格类型
- 文档：[packages/core/README.md](packages/core/README.md)

### @cmtx/upload

- 功能：对象存储上传助手，支持阿里云 OSS，可扩展其他存储适配器
- 特性：智能重命名、安全回收、事件回调、日志支持
- 依赖：peer 依赖 ali-oss（可选）
- 文档：[packages/upload/README.md](packages/upload/README.md)

### @cmtx/cli

- 功能：Markdown 图片管理命令行工具
- 支持命令：分析、上传、配置管理等
- 依赖：@cmtx/core、@cmtx/upload
- 文档：[packages/cli/README.md](packages/cli/README.md)

### @cmtx/mcp-server

- 功能：JSON-RPC 2.0 协议的 MCP 服务器，通过 stdio 提供图片管理工具接口
- 支持工具：扫描分析、上传预览、文件操作、查询、安全删除等
- 依赖：@cmtx/core、@cmtx/upload、ali-oss
- 文档：[packages/mcp-server/README.md](packages/mcp-server/README.md)

## Monorepo 开发脚本（根目录）

- `pnpm build`：递归构建各包（输出至 dist 目录）
- `pnpm test`：递归运行 Vitest（core, upload, cli）
- `pnpm lint`：统一 ESLint（ESM/TS/Markdown/JSON），带自动修复
- `pnpm run docs`：递归生成 TypeDoc（core 和 upload 各生成 docs/api）

## 版本与发布

- 当前版本：统一 0.1.0（开发阶段）
- 发布作用域：@cmtx/* （默认 public 发布）
- 包目标：正式发布后各包将独立版本号和更新周期

## 许可证

Apache-2.0（参见 LICENSE）

## 贡献

参见 CONTRIBUTING.md，包含开发环境（pnpm workspace）、代码风格与提交流程。
