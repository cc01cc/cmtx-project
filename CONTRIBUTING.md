# Contributing

感谢你的贡献意向！本仓库采用 pnpm workspace 的 Monorepo 结构，当前包含 @cmtx/core 与 @cmtx/upload。

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
pnpm docs           # 递归生成 TypeDoc（core 输出至 docs/api）
```

## 提交流程

1. Fork & branch：从 main 分支创建特性分支
2. 开发：保持 ESM、严格类型，遵循现有代码风格
3. 校验：至少运行 `pnpm lint` 与 `pnpm test`
4. 提交信息：建议使用简洁动词开头，明确范围
5. PR：描述改动、测试结果，必要时附截图或日志

## 代码风格

- TypeScript strict 模式，NodeNext 模块解析
- 导入路径在源码中使用 .js 后缀（满足 NodeNext 构建）
- 避免新增运行时依赖，核心包保持零依赖
- Markdown 表格使用空格分隔管道，标题与列表上下保持空行

## 版本与发布

- 开发阶段统一版本 0.1.0
- 正式发布后各包将独立版本号
- 发布范围：@cmtx/*（默认 public 发布）

## 问题反馈

- Issue 列表：<https://github.com/cc01cc/cmtx-project/issues>
- 欢迎提供复现步骤、日志或最小复现示例
