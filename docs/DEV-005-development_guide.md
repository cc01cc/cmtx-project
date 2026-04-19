# 开发指南

本文档包含 CMTX 项目的开发环境设置、常用命令和开发 workflow。

## 环境要求

- Node.js 18+（建议保持与 CI 一致）
- pnpm 10+（已在 packageManager 字段声明）
- ESM / TypeScript NodeNext

## 安装依赖

```bash
pnpm install
```

## 开发命令

```bash
# 构建所有包
pnpm build

# 运行测试
pnpm test

# 代码检查并自动修复
pnpm lint

# 生成 API 文档
pnpm run docs
```

### 包管理

```bash
# 构建指定包
pnpm -F @cmtx/core build

# 测试指定包
pnpm -F @cmtx/core test
```

## 项目结构

```
cmtx-project/
├── packages/                    # 各功能包
│   ├── core/                   # 核心文档处理（图片+元数据）
│   ├── storage/                # 对象存储适配器
│   ├── asset/                  # 资产管理（上传、转移）
│   ├── template/               # 模板渲染引擎
│   ├── fpe-wasm/               # FF1 格式保留加密（WASM）
│   ├── publish/                # 文章发布与平台适配
│   ├── cli/                    # 命令行工具
│   ├── mcp-server/             # MCP 服务器
│   ├── vscode-extension/       # VS Code 扩展
│   └── markdown-it-presigned-url/  # Markdown-it 插件
├── docs/                       # 项目文档
│   └── adr/                    # 架构决策记录
├── examples/                   # 使用示例
└── scripts/                    # 构建和发布脚本
```

## 开发 Workflow

1. Fork & branch
2. 开发：保持 ESM、严格类型，遵循现有代码风格
3. 校验：至少运行 `pnpm lint` 与 `pnpm test`
4. 提交信息：建议使用简洁动词开头，明确范围（如 feat(core), fix(upload), docs(cli)）
5. PR：描述改动、测试结果，必要时附截图或日志

## 代码风格

- TypeScript strict 模式，NodeNext 模块解析
- 导入路径在源码中使用 .js 后缀（满足 NodeNext 构建）
- Markdown 表格使用空格分隔管道，标题与列表上下保持空行
- 遵循现有项目中的命名和组织方式

## 设计原则

遵循 SOLID 和 DRY 原则：

- **单一职责**：每个函数/模块专注于单一功能（如 parser.ts 只负责解析）
- **开闭原则**：通过配置选项和接口支持扩展（如删除策略 `trash | move | hard-delete`）
- **依赖倒置**：通过回调注入依赖（如 logger 参数），降低模块耦合
- **DRY**：提取公共逻辑（如 `withRetry`），使用 TypeDoc 生成 API 文档，避免在 README 中重复 API 说明

## WASM 打包说明

### @cmtx/fpe-wasm 包

该包使用 Rust 实现 NIST SP 800-38G FF1 格式保留加密算法，通过 WASM 在 Node.js 和浏览器环境中运行。

**打包难点：**

1. **WASM 构建流程**
   - 需要 Rust 工具链（rustc、cargo）
   - 使用 `wasm-pack` 构建 WASM 模块
   - 生成 `pkg-web`（浏览器）和 `pkg-bundler`（bundler）两种目标

2. **多目标输出**
   ```bash
   # 浏览器环境
   wasm-pack build --target web --out-dir pkg-web
   
   # Bundler 环境（webpack/rollup/vite）
   wasm-pack build --target bundler --out-dir pkg-bundler
   ```

3. **TypeScript 类型生成**
   - wasm-pack 自动生成 `.d.ts` 类型定义
   - 需要手动调整以支持双目标（web/bundler）

4. **发布配置**
   - package.json 需要同时包含 `main`（bundler）和 `browser`（web）入口
   - files 字段需要包含 `pkg-web` 和 `pkg-bundler` 目录

**开发注意事项：**

- 修改 Rust 源码后需要重新运行 `wasm-pack build`
- 测试时需要根据环境选择正确的 WASM 模块
- 浏览器环境需要处理 WASM 异步加载

## 版本与发布

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

## 相关文档

- [贡献指南](../CONTRIBUTING.md) - 详细的贡献流程和代码规范
- [架构决策记录](./adr/README.md) - 项目架构决策文档
- [Catalogs 配置说明](./DOC-001-catalogs_configuration.md) - pnpm 依赖版本管理
- [包标准化指南](./DOC-003-package_standard.md) - package.json 配置规范
