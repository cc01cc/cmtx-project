# cmtx Monorepo

基于 pnpm workspace 的多包仓库，当前包含两个包：

- @cmtx/core：Markdown 图片提取与引用分析（零依赖）
- @cmtx/upload：对象存储上传助手（peer: ali-oss，现为占位开发中）

## 快速开始

```bash
pnpm install

# 全部构建 / 测试 / Lint / 文档
pnpm build
pnpm test
pnpm lint
pnpm docs
```

## 包简介

### @cmtx/core

- 功能：从 Markdown 文本 / 文件 / 目录提取图片；检查与查询图片引用；支持递归扫描和位置详情
- 特性：ESM、零依赖、NodeNext、严格类型
- 文档：packages/core/docs/markdown-image-extractor.md

### @cmtx/upload

- 功能：对象存储上传助手（规划中），peer 依赖云 SDK（如 ali-oss）
- 状态：🚧 占位开发，接口将与 @cmtx/core 协同

## Monorepo 开发脚本（根目录）

- pnpm build：递归构建各包
- pnpm test：递归运行 Vitest
- pnpm lint：统一 ESLint（ESM/TS/Markdown/JSON）
- pnpm docs：递归生成 TypeDoc（当前 core 生成 docs/api）

## 版本与发布

- 当前版本：统一 0.1.0（开发阶段）
- 正式发布后：各包独立版本号
- 作用域：cmtx（@cmtx/core, @cmtx/upload）

## 许可证

Apache-2.0（参见 LICENSE）

## 贡献

参见 CONTRIBUTING.md，包含开发环境（pnpm workspace）、代码风格与提交流程。
