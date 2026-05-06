<p align="center">
  <img src="./assets/logo-white-background.png" alt="CMTX Logo - 「文」字篆书" width="120">
</p>

<p align="center">
  <strong>CMTX</strong> — 可组合的 Markdown 工具包
</p>

<p align="center">
  可组合的 Markdown 文档处理工具包：资产管道、内容变换、元数据管理、跨平台适配。<br>
  可作为 npm 库集成、CLI 批量处理、VS Code 扩展操作，或通过 MCP Server 接入 AI Agent。
</p>

<p align="center">
  <a href="./README.en.md">English README</a>
</p>

---

[![License](https://img.shields.io/npm/l/@cmtx/core.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

| Package                                        | Version                                                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @cmtx/core                                     | [![npm version](https://img.shields.io/npm/v/@cmtx/core.svg)](https://www.npmjs.com/package/@cmtx/core)                                                                         |
| @cmtx/asset                                    | [![npm version](https://img.shields.io/npm/v/@cmtx/asset.svg)](https://www.npmjs.com/package/@cmtx/asset)                                                                       |
| @cmtx/rule-engine                              | [![npm version](https://img.shields.io/npm/v/@cmtx/rule-engine.svg)](https://www.npmjs.com/package/@cmtx/rule-engine)                                                           |
| @cmtx/ai                                       | [![npm version](https://img.shields.io/npm/v/@cmtx/ai.svg)](https://www.npmjs.com/package/@cmtx/ai)                                                                             |
| @cmtx/autocorrect-wasm                         | [![npm version](https://img.shields.io/npm/v/@cmtx/autocorrect-wasm.svg)](https://www.npmjs.com/package/@cmtx/autocorrect-wasm)                                                 |
| @cmtx/storage                                  | [![npm version](https://img.shields.io/npm/v/@cmtx/storage.svg)](https://www.npmjs.com/package/@cmtx/storage)                                                                   |
| @cmtx/template                                 | [![npm version](https://img.shields.io/npm/v/@cmtx/template.svg)](https://www.npmjs.com/package/@cmtx/template)                                                                 |
| @cmtx/fpe-wasm                                 | [![npm version](https://img.shields.io/npm/v/@cmtx/fpe-wasm.svg)](https://www.npmjs.com/package/@cmtx/fpe-wasm)                                                                 |
| @cmtx/markdown-it-presigned-url                | [![npm version](https://img.shields.io/npm/v/@cmtx/markdown-it-presigned-url.svg)](https://www.npmjs.com/package/@cmtx/markdown-it-presigned-url)                               |
| @cmtx/markdown-it-presigned-url-adapter-nodejs | [![npm version](https://img.shields.io/npm/v/@cmtx/markdown-it-presigned-url-adapter-nodejs.svg)](https://www.npmjs.com/package/@cmtx/markdown-it-presigned-url-adapter-nodejs) |

---

## 1. 这是什么？

CMTX 是一个基于 pnpm workspace 的多包仓库，为 Markdown 文档编辑提供一系列开箱即用的能力。

**核心能力：**

| 能力              | 说明                                                                |
| ----------------- | ------------------------------------------------------------------- |
| **资产管道**      | 图片提取、上传、转移、下载、删除 + 智能去重 + 引用替换              |
| **元数据管理**    | YAML Frontmatter 解析/更新/删除、标题提取、ID/date/updated 自动生成 |
| **内容变换**      | 章节编号、标题提升、文本替换、图片格式转换（Markdown <-> HTML）     |
| **跨平台适配**    | 通过规则引擎 + Preset 将 Markdown 适配到不同平台格式                |
| **规则引擎**      | 可编程的内容变换管道，支持 Preset 编排                              |
| **加密资产 ID**   | NIST SP 800-38G FF1 格式保留加密，可选 Luhn 校验码                  |
| **预签名 URL**    | 私有存储桶图片在编辑器中自动生成临时访问链接                        |
| **AI Agent 集成** | MCP Server，让 Claude、Cursor 等 AI 直接管理 Markdown 资产          |

**交付渠道：**

| 渠道             | 适合场景                                 |
| ---------------- | ---------------------------------------- |
| **npm 库**       | 集成到你的项目或工具链中，按需引入独立包 |
| **CLI**          | CI/CD 批量处理、自动化脚本               |
| **VS Code 扩展** | GUI 操作、快捷键、右键菜单、代码操作     |
| **MCP Server**   | 接入 AI Agent（Claude Code / Cursor 等） |

---

## 2. 快速开始

### 2.1. CLI

```bash
# 全局安装
npm install -g @cmtx/cli

# 分析文档中的图片
cmtx analyze ./docs

# 上传本地图片到云存储
cmtx upload ./docs --provider aliyun-oss --region oss-cn-hangzhou --bucket my-bucket

# 使用 Preset 适配内容
cmtx adapt ./article.md --preset my-blog --out ./output/article.md

# 格式化文档
cmtx format ./article.md --to html --width 800
```

### 2.2. VS Code 扩展

在 VS Code 扩展市场搜索 "CMTX"。提供图片上传/下载、尺寸调整、格式转换、平台适配等 GUI 操作，支持快捷键（`Ctrl+Shift+H` 格式切换、`Ctrl+Up`/`Ctrl+Down` 缩放）。

### 2.3. AI Agent 集成（MCP）

```json
{
    "mcpServers": {
        "cmtx": {
            "command": "npx",
            "args": ["-y", "@cmtx/mcp-server"]
        }
    }
}
```

配置后，AI Agent 可以直接扫描 Markdown 文件、上传图片到云存储、更新引用、清理未使用资产。

### 2.4. 作为 npm 库使用

```typescript
import { filterImagesInText, replaceImagesInText } from "@cmtx/core";
import { createAdapter } from "@cmtx/storage";
import { ConfigBuilder } from "@cmtx/asset/upload";
```

---

## 3. 包概览

| 包                                             | 说明                                                          | 文档                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| @cmtx/core                                     | Markdown 纯文本处理核心：图片解析/替换、frontmatter、章节编号 | [README](./packages/core/README.md)                                     |
| @cmtx/asset                                    | 资产管理：上传、转移、下载、删除、配置加载                    | [README](./packages/asset/README.md)                                    |
| @cmtx/rule-engine                              | 规则引擎、内容变换、元数据、ID 生成、跨平台适配               | [README](./packages/rule-engine/README.md)                              |
| @cmtx/ai                                       | AI 能力包：Slug 生成、内容校验、Agent 编排                    | [README](./packages/ai/README.md)                                       |
| @cmtx/autocorrect-wasm                         | 文本自动纠正 WebAssembly 实现                                 | [README](./packages/autocorrect-wasm/README.md)                         |
| @cmtx/storage                                  | 云存储适配器（阿里云 OSS、腾讯云 COS）                        | [README](./packages/storage/README.md)                                  |
| @cmtx/template                                 | 模板渲染引擎                                                  | [README](./packages/template/README.md)                                 |
| @cmtx/fpe-wasm                                 | NIST SP 800-38G FF1 格式保留加密（WASM）                      | [README](./packages/fpe-wasm/README.md)                                 |
| @cmtx/markdown-it-presigned-url                | Markdown-it 预签名 URL 插件（异步签名 + 缓存回调）            | [README](./packages/markdown-it-presigned-url/README.md)                |
| @cmtx/markdown-it-presigned-url-adapter-nodejs | Node.js 签名适配器（OSS/S3 签名器 + LRU 缓存）                | [README](./packages/markdown-it-presigned-url-adapter-nodejs/README.md) |
| @cmtx/cli                                      | 命令行工具                                                    | [README](./packages/cli/README.md)                                      |
| @cmtx/mcp-server                               | MCP 服务器（AI Agent 集成）                                   | [README](./packages/mcp-server/README.md)                               |
| cmtx-vscode                                    | VS Code 扩展                                                  | [README](./packages/vscode-extension/README.md)                         |

---

## 4. 架构设计

```
第六层：应用层（面向用户）
  @cmtx/cli  @cmtx/mcp-server  cmtx-vscode

第五层：处理层（文档处理）
  @cmtx/rule-engine        — 规则引擎、内容变换、元数据、ID 生成

第四层：AI 能力层
  @cmtx/ai                 — Slug 生成、内容校验、Agent 编排

第三层：业务编排层（文件操作 + 业务流程）
  @cmtx/asset          — 上传/转移/下载/删除管道、配置管理

第二层：工具层
  @cmtx/markdown-it-presigned-url*  — 预签名 URL 插件

第一层：基础层（无内部依赖）
  @cmtx/core  @cmtx/template  @cmtx/storage  @cmtx/fpe-wasm  @cmtx/autocorrect-wasm
```

依赖关系严格单向，无循环依赖。

---

## 5. 功能一览

| 领域         | 能力                                           | 对应包                            |
| ------------ | ---------------------------------------------- | --------------------------------- |
| 图片解析     | 提取 Markdown/HTML 图片、按来源/域名/路径筛选  | `@cmtx/core`                      |
| 图片替换     | 替换 src/alt/title、支持 Markdown 和 HTML 语法 | `@cmtx/core`                      |
| 章节编号     | 添加/删除/更新标题层级编号                     | `@cmtx/core`                      |
| Frontmatter  | 解析、注入、删除 YAML frontmatter 字段         | `@cmtx/core`                      |
| 图片上传     | 上传到云存储、去重、模板命名                   | `@cmtx/asset`                     |
| 图片转移     | 在存储服务间复制/移动远程图片                  | `@cmtx/asset`                     |
| 图片下载     | 下载远程图片到本地、域名过滤                   | `@cmtx/asset`                     |
| 安全删除     | 引用检查后删除（trash/move/hard-delete）       | `@cmtx/asset`                     |
| 配置管理     | YAML 配置加载、环境变量替换                    | `@cmtx/asset`                     |
| 云存储       | 统一适配器（阿里云 OSS、腾讯云 COS）           | `@cmtx/storage`                   |
| 模板引擎     | `{variable}` 模板渲染、Builder 模式            | `@cmtx/template`                  |
| 规则引擎     | 可扩展的 Preset 内容变换系统                   | `@cmtx/rule-engine`               |
| Slug 生成    | 基于 AI 的语义 Slug 生成                       | `@cmtx/ai`                        |
| 内容校验     | AI 驱动的 Markdown 内容质量校验                | `@cmtx/ai`                        |
| 文本纠正     | CJK 文案自动纠正（WASM）                       | `@cmtx/autocorrect-wasm`          |
| 跨平台适配   | 通过可配置 Preset 将 Markdown 适配不同格式     | `@cmtx/rule-engine`               |
| ID 生成      | UUID / slug / MD5 / NIST FF1 格式保留加密      | `@cmtx/rule-engine`               |
| 预签名 URL   | markdown-it 异步预签名 URL 生成                | `@cmtx/markdown-it-presigned-url` |
| MCP 服务器   | JSON-RPC 2.0 标准，AI Agent 直接调用           | `@cmtx/mcp-server`                |
| CLI          | 完整的命令行接口                               | `@cmtx/cli`                       |
| VS Code 扩展 | 集成 GUI、命令面板、快捷键                     | `cmtx-vscode`                     |

---

## 6. 项目结构

```
cmtx-project/
├── packages/
│   ├── core/              # Markdown 纯文本处理
│   ├── asset/             # 资产管道（上传/转移/下载/删除）
│   ├── rule-engine/       # 规则引擎 + 跨平台适配
│   ├── ai/                # AI 能力：Slug 生成、内容校验、Agent 编排
│   ├── storage/           # 云存储适配器
│   ├── template/          # 模板渲染
│   ├── fpe-wasm/          # 格式保留加密（WASM）
│   ├── autocorrect-wasm/  # 文本自动纠正（WASM）
│   ├── cli/               # 命令行工具
│   ├── mcp-server/        # MCP 服务器
│   ├── vscode-extension/  # VS Code 扩展
│   ├── markdown-it-presigned-url/          # 预签名 URL 插件
│   └── markdown-it-presigned-url-adapter-nodejs/  # 签名适配器
├── examples/              # 使用示例
├── docs/                  # 文档
└── scripts/               # 构建和发布脚本
```

---

## 7. 开发指南

### 7.1. 环境要求

- Node.js >= 22
- pnpm >= 10

### 7.2. 本地开发

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

### 7.3. 模块系统

所有包使用严格 ESM 编写，构建输出 ESM（`.mjs`）和 CJS（`.cjs`）双格式。

---

## 8. 致谢

本项目在设计和实现过程中参考了以下优秀的开源项目：

| 项目名称                        | 仓库                                           | 版本    | License     | 备注                                                            |
| ------------------------------- | ---------------------------------------------- | ------- | ----------- | --------------------------------------------------------------- |
| Markdown All in One             | <https://github.com/yzhang-gh/vscode-markdown> | v3.6.3  | MIT License | 参考章节编号功能（Add/Update/Remove Section Numbers）的算法设计 |
| 微信 Markdown 编辑器 (doocs/md) | <https://github.com/doocs/md>                  | v2.1.0  | WTFPL       | 参考微信 Markdown 渲染策略                                      |
| gray-matter                     | <https://github.com/jonschlinkert/gray-matter> | latest  | MIT License | 参考 frontmatter 解析约定（文件首行、空 frontmatter 处理）      |
| AutoCorrect                     | <https://github.com/huacnlee/autocorrect>      | v2.16.2 | MIT License | 引用实现 CJK 文案自动纠正                                       |

感谢以上项目的作者和贡献者！

项目 Logo 采用「文」字篆书，取自崇羲篆體（CC-BY-ND-3.0-TW-or-later），官方页面参考 <https://xiaoxue.iis.sinica.edu.tw/chongxi/copyright.htm>

## 9. 许可证

Apache-2.0
