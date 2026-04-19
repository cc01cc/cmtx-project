# CMTX Monorepo 项目说明

## 项目概述

CMTX 是一个基于 pnpm workspace 的多包仓库，专注于 Markdown 文档处理和图片管理。该项目提供了一整套工具链，用于处理 Markdown 中的图片引用，包括提取、上传、替换、删除、发布等功能。

### 主要技术栈

- **TypeScript** - 类型安全的开发语言
- **pnpm** - 包管理器，用于 monorepo 管理
- **Vitest** - 测试框架
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化

### 项目架构

CMTX 采用四层架构设计，确保各组件职责清晰、依赖关系明确：

1. **基础层** (`@cmtx/core`, `@cmtx/template`, `@cmtx/storage`)：核心功能、模板渲染和存储适配
2. **业务编排层** (`@cmtx/asset`)：资产管理（上传、转移）
3. **处理层** (`@cmtx/publish`)：Markdown 文档处理与发布（元数据管理、平台适配、渲染）
4. **应用层** (`@cmtx/cli`, `@cmtx/mcp-server`, `@cmtx/vscode-extension`)：面向用户的命令行、MCP 服务和 VS Code 扩展

#### 依赖关系表

| 层级 | 包 | 内部依赖 |
|:---:|---|---|
| 4 | `@cmtx/cli` | `@cmtx/core`, `@cmtx/asset`, `@cmtx/publish` |
| 4 | `@cmtx/mcp-server` | `@cmtx/core`, `@cmtx/asset` |
| 4 | `@cmtx/vscode-extension` | `@cmtx/core`, `@cmtx/asset`, `@cmtx/publish`, `@cmtx/storage` |
| 3 | `@cmtx/publish` | `@cmtx/core`, `@cmtx/asset`, `@cmtx/template`, `@cmtx/fpe-wasm` |
| 2 | `@cmtx/asset` | `@cmtx/core`, `@cmtx/storage`, `@cmtx/template` |
| 1 | `@cmtx/core` | - |
| 1 | `@cmtx/template` | - |
| 1 | `@cmtx/storage` | - |
| 1 | `@cmtx/fpe-wasm` | - |

**循环依赖检查：无循环依赖。** 所有依赖均为单向（从上层指向下层）。

## 核心包介绍

### @cmtx/core

- **功能**：Markdown 图片提取、替换与删除（基于正则表达式的统一架构）
- **特点**：无 AST 解析，纯正则表达式处理，高效性能
- **API**：提供 `filterImagesInText`, `replaceImagesInText`, `deleteLocalImage` 等核心功能

### @cmtx/template

- **功能**：模板引擎，支持变量插值和条件渲染
- **特点**：轻量级，零依赖，Builder 模式设计
- **API**：提供 `renderTemplate`, `BaseTemplateBuilder` 等接口

### @cmtx/storage

- **功能**：对象存储适配器，提供统一的存储服务接口
- **特点**：支持阿里云 OSS、腾讯云 COS，易于扩展，无内部依赖
- **API**：提供 `upload`, `getSignedUrl`, `delete` 等接口

### @cmtx/asset

- **功能**：资产管理，包括本地图片上传和远程图片转移
- **特点**：支持智能重命名、安全回收、智能去重机制
- **API**：提供 `uploadLocalImageInMarkdown`, `transferRemoteImages`, `ConfigBuilder` 等接口

### @cmtx/publish

- **功能**：Markdown 文档处理与发布，包括元数据管理、平台适配、渲染、图片处理
- **特点**：支持元数据提取/查询/ID 生成，wechat/zhihu/csdn 平台适配，Markdown → HTML 渲染
- **API**：提供 `MarkdownMetadataExtractor`, `MarkdownFileQuery`, `IdGenerator`, `adaptMarkdown`, `renderMarkdown`, `validateMarkdown`, `processImagesForPublish`, `formatForPublish` 等功能

### @cmtx/fpe-wasm

- **功能**：NIST SP 800-38G FF1 格式保留加密（WASM）
- **特点**：Rust 实现，符合 NIST 标准，AES-256，零依赖
- **API**：提供 `FF1Cipher`, `encrypt_string`, `decrypt_string` 等接口

### @cmtx/cli

- **功能**：命令行工具用于 Markdown 图片管理
- **特点**：提供 `analyze`, `upload` 等命令
- **用途**：批量处理 Markdown 文件中的图片

### @cmtx/mcp-server

- **功能**：JSON-RPC 2.0 协议的 MCP 服务器，为 AI 代理提供图片管理工具接口
- **特点**：支持与 AI Agent（如 Claude）集成
- **API**：实现 `scan.analyze`, `upload.run`, `delete.safe` 等工具

## 项目命令

### 开发命令

- `pnpm install` - 安装所有依赖
- `pnpm build` - 构建所有包
- `pnpm test` - 运行所有测试
- `pnpm lint` - 代码检查并自动修复
- `pnpm run docs` - 生成 API 文档并创建索引页

### 包管理

- `pnpm -F @cmtx/<package> build` - 构建指定包
- `pnpm -F @cmtx/<package> test` - 测试指定包

## 开发约定

### 代码规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 规范
- 采用严格的类型检查模式

### 测试标准

- 使用 Vitest 编写单元测试
- 为每个公共 API 编写测试用例
- 保持较高的代码覆盖率

### 文档标准

- 每个包都包含详细的 README.md
- API 文档使用 TypeDoc 生成
- 架构决策记录在 ADR 文档中

## 与其他工具的集成

### AI Agent 集成

- 通过 MCP (Model Context Protocol) 服务器与 AI Agent 集成
- 支持 Claude 等 AI 工具自动管理 Markdown 图片资源

### 云存储服务

- 支持阿里云 OSS，可扩展支持其他云存储服务
- 通过适配器模式实现存储服务的灵活切换

## 项目结构

```
cmtx-project/
├── packages/                    # 各功能包
│   ├── core/                   # 核心文档处理功能（图片+元数据）
│   ├── storage/                # 对象存储适配器
│   ├── asset/                  # 资产管理（上传、转移）
│   ├── template/               # 模板渲染引擎
│   ├── fpe-wasm/               # NIST FF1 加密（WASM）
│   ├── publish/                # 文档处理与发布（元数据+平台适配）
│   ├── cli/                    # 命令行工具
│   ├── mcp-server/             # MCP 服务器
│   ├── vscode-extension/      # VS Code 扩展
│   └── markdown-it-presigned-url/  # Markdown-it 插件
├── examples/                   # 使用示例
├── docs/                       # 项目文档
└── scripts/                    # 构建和发布脚本
```

## 贡献指南

参见 CONTRIBUTING.md 文件，包含开发环境设置、代码风格和提交流程。

## 许可证

Apache-2.0 许可证
