# cmtx Monorepo

基于 pnpm workspace 的多包仓库，当前包含四个包：

- @cmtx/core：Markdown 图片提取、替换与删除（基于正则表达式的统一架构）
- @cmtx/upload：对象存储上传助手，支持智能重命名和安全回收（peer: ali-oss）
- @cmtx/cli：命令行工具用于 Markdown 图片管理
- @cmtx/mcp-server：JSON-RPC 2.0 MCP 服务器，为 AI 代理提供图片管理工具接口

## 快速开始

```bash
pnpm install

# 全部构建 / 测试 / Lint / 文档
pnpm build
pnpm test
pnpm lint
pnpm run docs        # 生成 API 文档并创建索引页
pnpm run docs:index  # 仅生成文档索引页
pnpm run docs:upload # 上传文档到 OSS（需配置）
```

## 包简介

### @cmtx/core

- 功能：图片筛选（4 种模式）、图片替换、图片删除（3 种策略）
- 架构：正则表达式统一架构，无需 AST 解析
- 特性：ESM、NodeNext、严格类型、完整错误处理、高效正则匹配
- 文档：[packages/core/README.md](packages/core/README.md)

### @cmtx/upload

- 功能：对象存储上传助手，支持智能重命名、安全回收、事件回调、进度跟踪
- 架构：配置构建器模式 + 适配器模式（支持阿里云 OSS，可扩展）
- 特性：全局和单文件去重、指数退避重试、降级策略、详细日志
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
- `pnpm run docs`：递归生成 TypeDoc 并创建文档索引页（输出至各包的 docs/api 和根目录的 docs-index.html）
- `pnpm run docs:index`：仅生成文档索引页（docs-index.html）
- `pnpm run docs:upload`：上传文档到 OSS（需要配置 aliyun ossutil）

## 版本与发布

- @cmtx/core 当前版本：0.2.0（breaking changes）
- 各包将独立版本号和更新周期（正式发布后）
- 发布作用域：@cmtx/* （默认 public 发布）

## 许可证

Apache-2.0（参见 LICENSE）

## 贡献

参见 CONTRIBUTING.md，包含开发环境（pnpm workspace）、代码风格与提交流程。
