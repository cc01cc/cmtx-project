# DEV-001: 开发指南

本文档包含 CMTX 项目的开发环境设置、常用命令和开发 workflow。

## 1. 环境要求

- Node.js 22+（所有包在 `package.json` 中声明 `>=22.0.0`）
- pnpm 10+（已在 packageManager 字段声明）
- ESM / TypeScript NodeNext

## 2. 安装依赖

```bash
pnpm install
```

## 3. 开发命令

```bash
# 构建所有包（构建产物自动验证：package.json 中声明的 dist 文件必须真实存在）
pnpm build

# 运行测试
pnpm test

# 代码检查并自动修复
pnpm lint

# 生成 API 文档
pnpm run docs
```

### 3.1. 包管理

```bash
# 构建指定包
pnpm -F @cmtx/core build

# 测试指定包
pnpm -F @cmtx/core test
```

## 4. pnpm Monorepo 依赖管理

### 4.1. 严格依赖解析

pnpm 默认启用**严格依赖解析**：你只能 import 你**直接声明**的依赖。间接依赖（通过其他包传递的）不会出现在你的 `node_modules` 中。

这意味着在 monorepo 中跨包使用导出时，必须在 `package.json` 中显式声明依赖，即使该包已通过其他 workspace 包间接可用。

### 4.2. 常见问题：跨包导出类型解析失败

**现象**：在包 A 中新增了导出，包 B 直接 import 该导出，但 `pnpm typecheck` 报 `Module '...' has no exported member '...'`。

**根因**：

1. 包 B 的 `package.json` 未声明对包 A 的直接依赖
2. pnpm 未为包 B 创建包 A 的 symlink（因为依赖图未变化）
3. TypeScript 解析到的是 `.pnpm` store 中的旧缓存版本

**解决方案**：

1. 在包 B 的 `package.json` 中添加直接依赖：

   ```json
   "dependencies": {
       "@cmtx/包A": "workspace:*"
   }
   ```

2. 清理 pnpm store 缓存并重新安装：

   ```bash
   rm -rf node_modules/.pnpm/@cmtx+包A*
   pnpm install
   ```

3. 验证类型解析：

   ```bash
   pnpm --filter @cmtx/包B typecheck
   ```

### 4.3. 预防建议

- **始终显式声明依赖**：你用了什么包，就声明什么包
- **新增跨包导出后**：检查所有直接使用该导出的包是否已声明依赖
- **CI 检查**：可运行 `pnpm ls --recursive` 检查是否有未声明的依赖

## 5. 项目结构

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

## 6. 开发 Workflow

1. Fork & branch
2. 开发：保持 ESM、严格类型，遵循现有代码风格
3. 校验：至少运行 `pnpm lint` 与 `pnpm test`
4. 提交信息：建议使用简洁动词开头，明确范围（如 feat(core), fix(upload), docs(cli)）
5. PR：描述改动、测试结果，必要时附截图或日志

## 7. 代码风格

- TypeScript strict 模式，NodeNext 模块解析
- 导入路径在源码中使用 .js 后缀（满足 NodeNext 构建）
- Markdown 表格使用空格分隔管道，标题与列表上下保持空行
- 遵循现有项目中的命名和组织方式

## 8. 设计原则

遵循 SOLID 和 DRY 原则：

- **单一职责**：每个函数/模块专注于单一功能（如 parser.ts 只负责解析）
- **开闭原则**：通过配置选项和接口支持扩展（如删除策略 `trash | move | hard-delete`）
- **依赖倒置**：通过回调注入依赖（如 logger 参数），降低模块耦合
- **DRY**：提取公共逻辑（如 `withRetry`），使用 TypeDoc 生成 API 文档，避免在 README 中重复 API 说明

## 9. 应用层操作模式

应用层（CLI / VS Code / MCP Server）在操作 Markdown 图片时有两种模式。

**核心区别不是"是否传入文件路径"，而是传入的路径指向什么以及工具对路径做什么。**

### 9.1. Text 模式

CLI 和 VS Code 使用 Text 模式。传入的路径指向 **Markdown 文件**，工具读取其文本内容，解析 `![alt](path)` 提取图片路径，完成操作后写回。工作流是"内容转换"：

```
Markdown 文本 → 提取图片路径 → 上传/下载/删除 → 替换文本中的引用 → 写回
```

- 工具需要从文本中**发现**图片引用
- 上传后**替换**为远程 URL
- 写回文件

**具体表现**：

| 工具 | 传入路径指向 | 操作范围 |
|------|-------------|----------|
| CLI `upload <filePath>` | `.md` 文件 | 读取整个文件内容 |
| CLI `download <file>` | `.md` 文件 | 读取整个文件内容 |
| VS Code `uploadSelected` | 编辑器选区 | 读取选区文本 |
| VS Code `rule.upload-images` | 编辑器文件 | 读取整个文件内容 |
| VS Code `delete` | 编辑器光标行 | 读取光标所在行 |

**VS Code 读编辑器文本（含未保存更改）是合理的实现选择**，但不是主要原因。即使文件已保存，仍然需要 Text 模式来完成"发现 → 上传 → 替换"的完整流程。

### 9.2. File Path 模式

MCP Server 的部分工具使用 File Path 模式。传入的路径直接指向 **图片文件本身**，工具直接操作该图片，无需从 Markdown 文本中发现。

**具体表现**：

| 工具 | 传入路径指向 | 说明 |
|------|-------------|------|
| `delete.safe` / `delete.force` | 图片文件 | 直接传入 `imagePath` 参数 |
| `find.filesReferencingImage` / `find.referenceDetails` | 图片文件 | 直接传入 `imagePath` 参数 |

**原因**：AI Agent 已经知道要操作哪个图片，直接传路径即可。

**注意**：MCP Server 的上传/转移工具仍用 Text 模式，因为传入的路径指向 `.md` 文件：

| 工具 | 传入路径指向 | 模式 |
|------|-------------|------|
| `upload.run` / `upload.preview` | 目录（扫描 `.md` 文件） | Text 模式 |
| `transfer.execute` / `transfer.analyze` | `.md` 文件 | Text 模式 |

## 10. WASM 打包说明

### 10.1. @cmtx/fpe-wasm 包

该包使用 Rust 实现 NIST SP 800-38G FF1 格式保留加密算法，通过 WASM 在 Node.js 和浏览器环境中运行。

**构建流程：**

1. **WASM 构建**（需要 Rust 工具链）

    ```bash
    # 进入 fpe-wasm 包目录
    cd packages/fpe-wasm

    # 构建 WASM（生成 pkg/ 目录）
    pnpm run build:wasm
    ```

2. **TypeScript 打包**（使用 tsdown）

    ```bash
    # 构建 TypeScript（复制 WASM 到 dist/）
    pnpm run build
    ```

**输出结构：**

```
packages/fpe-wasm/
├── pkg/                          # wasm-pack 输出（源文件）
│   ├── cmtx_fpe_wasm.js
│   ├── cmtx_fpe_wasm_bg.wasm
│   └── cmtx_fpe_wasm.d.ts
├── dist/                         # tsdown 输出（发布到 npm）
│   ├── index.mjs                 # ESM 入口
│   ├── index.cjs                 # CJS 入口
│   ├── index.d.ts                # 类型定义
│   └── pkg/                      # 复制的 WASM 文件
│       └── cmtx_fpe_wasm_bg.wasm
```

**VS Code 扩展中的 WASM 处理：**

VS Code 扩展使用 `rolldown-plugin-wasm` 自动处理 WASM 文件：

```typescript
// vscode-extension/tsdown.config.ts
import { wasm } from "rolldown-plugin-wasm";

export default defineConfig({
    plugins: [wasm({ targetEnv: "node" })],
    // ...
});
```

打包后 WASM 文件位于：`dist/node_modules/@cmtx/fpe-wasm/cmtx_fpe_wasm_bg.wasm`

**开发注意事项：**

- 修改 Rust 源码后需要重新运行 `pnpm --filter @cmtx/fpe-wasm build`
- 开发模式（F5）直接使用 `packages/fpe-wasm/pkg/` 中的 WASM
- 生产模式（vsce package）使用打包后的 WASM

## 11. 版本与发布

- 正式发布后各包将独立版本号和更新周期
- 发布范围：@cmtx/\*（默认 public 发布）
- Changelog 维护：各包内 CHANGELOG.md，遵循 Keep a Changelog 格式

## 12. 文档要求

- 各包应包含 README.md，描述功能、使用方式、API 接口
- 新增公开 API 需在 README 或 API 文档中说明
- 大功能特性应在 CHANGELOG.md 中记录
- TypeDoc 注释应完整，至少包含功能说明和参数描述

## 13. 问题反馈

- Issue 列表：<https://github.com/cc01cc/cmtx-project/issues>
- 欢迎提供复现步骤、日志或最小复现示例

## 14. 相关文档

- [贡献指南](../CONTRIBUTING.md) - 详细的贡献流程和代码规范
- [架构决策记录](./adr/README.md) - 项目架构决策文档
- [Catalogs 配置说明](./DEV-006-catalogs_configuration.md) - pnpm 依赖版本管理
- [发布前校验与质量门禁指南](./DEV-008-publish-validation.md) - 包发布校验标准
