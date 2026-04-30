<p align="center">
  <img src="./assets/logo-white-background.png" alt="CMTX Logo" width="120">
</p>

<p align="center">
  <strong>CMTX</strong> — Composable Markdown Toolkit
</p>

<p align="center">
  Composable libraries and tools for Markdown document processing — asset pipeline, content transformation, metadata management, and cross-platform adaptation.<br>
  Available as npm packages, CLI, VS Code extension, and MCP server.
</p>

<p align="center">
  <a href="./README.md">中文 README</a>
</p>

---

[![License](https://img.shields.io/npm/l/@cmtx/core.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

| Package                                        | Version                                                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @cmtx/core                                     | [![npm version](https://img.shields.io/npm/v/@cmtx/core.svg)](https://www.npmjs.com/package/@cmtx/core)                                                                         |
| @cmtx/asset                                    | [![npm version](https://img.shields.io/npm/v/@cmtx/asset.svg)](https://www.npmjs.com/package/@cmtx/asset)                                                                       |
| @cmtx/publish                                  | [![npm version](https://img.shields.io/npm/v/@cmtx/publish.svg)](https://www.npmjs.com/package/@cmtx/publish)                                                                   |
| @cmtx/storage                                  | [![npm version](https://img.shields.io/npm/v/@cmtx/storage.svg)](https://www.npmjs.com/package/@cmtx/storage)                                                                   |
| @cmtx/template                                 | [![npm version](https://img.shields.io/npm/v/@cmtx/template.svg)](https://www.npmjs.com/package/@cmtx/template)                                                                 |
| @cmtx/fpe-wasm                                 | [![npm version](https://img.shields.io/npm/v/@cmtx/fpe-wasm.svg)](https://www.npmjs.com/package/@cmtx/fpe-wasm)                                                                 |
| @cmtx/markdown-it-presigned-url                | [![npm version](https://img.shields.io/npm/v/@cmtx/markdown-it-presigned-url.svg)](https://www.npmjs.com/package/@cmtx/markdown-it-presigned-url)                               |
| @cmtx/markdown-it-presigned-url-adapter-nodejs | [![npm version](https://img.shields.io/npm/v/@cmtx/markdown-it-presigned-url-adapter-nodejs.svg)](https://www.npmjs.com/package/@cmtx/markdown-it-presigned-url-adapter-nodejs) |

---

## 1. What is CMTX?

CMTX is a monorepo of composable TypeScript packages for Markdown document processing. It automates the tedious, permission-heavy operations that both humans and AI agents shouldn't have to deal with.

**Core Capabilities:**

| Capability                    | Description                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| **Asset Pipeline**            | Extract, upload, transfer, download, delete images with dedup and reference replacement |
| **Metadata Management**       | YAML frontmatter parse/update/delete, title extraction, auto ID/date/updated            |
| **Content Transformation**    | Section numbering, heading promotion, text replacement, image format conversion         |
| **Cross-platform Adaptation** | Transform Markdown for different platforms via rule presets                             |
| **Rule Engine**               | Programmable content transformation pipeline with preset orchestration                  |
| **Encrypted Asset ID**        | NIST SP 800-38G FF1 format-preserving encryption with optional Luhn checksum            |
| **Presigned URLs**            | Auto-generate temporary access URLs for private bucket images                           |
| **AI Agent Integration**      | MCP server for Claude, Cursor, and other AI tools to manage Markdown assets             |

**Delivery Channels:**

| Channel               | Best for                                                          |
| --------------------- | ----------------------------------------------------------------- |
| **npm packages**      | Integrate into your own toolchain, consume packages independently |
| **CLI**               | CI/CD batch processing, automation scripts                        |
| **VS Code Extension** | GUI operations, keyboard shortcuts, context menus                 |
| **MCP Server**        | AI Agent integration (Claude Code, Cursor, etc.)                  |

---

## 2. Quick Start

### 2.1. CLI

```bash
# Install globally
npm install -g @cmtx/cli

# Analyze images in a Markdown directory
cmtx analyze ./docs

# Upload local images to cloud storage
cmtx upload ./docs --provider aliyun-oss --region oss-cn-hangzhou --bucket my-bucket

# Adapt content using a preset
cmtx adapt ./article.md --preset my-blog --out ./output/article.md

# Format documents
cmtx format ./article.md --to html --width 800
```

### 2.2. VS Code Extension

Search "CMTX" in the VS Code marketplace. Provides GUI for image upload, download, resize, format conversion, and platform adaptation. Keyboard shortcuts: `Ctrl+Shift+H` (format toggle), `Ctrl+Up`/`Ctrl+Down` (resize).

### 2.3. AI Agent Integration (MCP)

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

After configuration, AI agents can scan Markdown files, upload images to cloud storage, update references, and clean up unused assets.

### 2.4. As npm Libraries

```typescript
import { filterImagesInText, replaceImagesInText } from "@cmtx/core";
import { createAdapter } from "@cmtx/storage";
import { ConfigBuilder } from "@cmtx/asset/upload";
```

---

## 3. Packages

| Package                                        | Description                                                                                | README                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| @cmtx/core                                     | Text-level Markdown processing — image parsing/replacement, frontmatter, section numbering | [README](./packages/core/README.md)                                     |
| @cmtx/asset                                    | Asset management — upload, transfer, download, delete, config                              | [README](./packages/asset/README.md)                                    |
| @cmtx/publish                                  | Rule engine, content transformation, metadata, ID generation, cross-platform adaptation    | [README](./packages/publish/README.md)                                  |
| @cmtx/storage                                  | Cloud storage adapters (Aliyun OSS, Tencent COS)                                           | [README](./packages/storage/README.md)                                  |
| @cmtx/template                                 | Template rendering engine                                                                  | [README](./packages/template/README.md)                                 |
| @cmtx/fpe-wasm                                 | NIST SP 800-38G FF1 format-preserving encryption (WASM)                                    | [README](./packages/fpe-wasm/README.md)                                 |
| @cmtx/markdown-it-presigned-url                | markdown-it plugin for async pre-signed URL generation                                     | [README](./packages/markdown-it-presigned-url/README.md)                |
| @cmtx/markdown-it-presigned-url-adapter-nodejs | Node.js signing adapter (OSS/S3 signer + LRU cache)                                        | [README](./packages/markdown-it-presigned-url-adapter-nodejs/README.md) |
| @cmtx/cli                                      | Command-line tool                                                                          | [README](./packages/cli/README.md)                                      |
| @cmtx/mcp-server                               | MCP server for AI agent integration                                                        | [README](./packages/mcp-server/README.md)                               |
| cmtx-vscode                                    | VS Code extension                                                                          | [README](./packages/vscode-extension/README.md)                         |

---

## 4. Architecture

```
Layer 5: Application (user-facing)
  @cmtx/cli  @cmtx/mcp-server  cmtx-vscode

Layer 4: Document Processing
  @cmtx/publish        — Rule engine, content transformation, metadata, ID generation

Layer 3: Business Orchestration
  @cmtx/asset          — Upload/transfer/download/delete pipeline, config management

Layer 2: Tooling
  @cmtx/markdown-it-presigned-url*  — Pre-signed URL plugin

Layer 1: Foundation (zero internal deps)
  @cmtx/core  @cmtx/template  @cmtx/storage  @cmtx/fpe-wasm
```

Dependencies are strictly unidirectional — no circular dependencies.

---

## 5. Feature Overview

| Area                      | Capabilities                                               | Package                           |
| ------------------------- | ---------------------------------------------------------- | --------------------------------- |
| Image parsing             | Extract Markdown/HTML images, filter by source/domain/path | `@cmtx/core`                      |
| Image replacement         | Replace src/alt/title, support Markdown and HTML syntax    | `@cmtx/core`                      |
| Section numbering         | Add/remove/update hierarchical heading numbers             | `@cmtx/core`                      |
| Frontmatter               | Parse, upsert, delete YAML frontmatter fields              | `@cmtx/core`                      |
| Image upload              | Upload to cloud storage, dedup, template naming            | `@cmtx/asset`                     |
| Image transfer            | Copy/move remote images between storage providers          | `@cmtx/asset`                     |
| Image download            | Download remote images to local, domain filtering          | `@cmtx/asset`                     |
| Safe deletion             | Reference-checked deletion (trash/move/hard-delete)        | `@cmtx/asset`                     |
| Config management         | YAML config loading with env var substitution              | `@cmtx/asset`                     |
| Cloud storage             | Unified adapter (Aliyun OSS, Tencent COS)                  | `@cmtx/storage`                   |
| Template engine           | `{variable}` template rendering, builder pattern           | `@cmtx/template`                  |
| Rule engine               | Extensible preset-based content transformation             | `@cmtx/publish`                   |
| Cross-platform adaptation | Configurable presets for different output formats          | `@cmtx/publish`                   |
| ID generation             | UUID / slug / MD5 / NIST FF1 encryption                    | `@cmtx/publish`                   |
| Presigned URLs            | Async pre-signed URL generation for markdown-it            | `@cmtx/markdown-it-presigned-url` |
| MCP server                | JSON-RPC 2.0 standard for AI agents                        | `@cmtx/mcp-server`                |
| CLI                       | Full command-line interface                                | `@cmtx/cli`                       |
| VS Code extension         | Integrated GUI, commands, keyboard shortcuts               | `cmtx-vscode`                     |

---

## 6. Project Structure

```
cmtx-project/
├── packages/
│   ├── core/              # Markdown text-level processing
│   ├── asset/             # Asset pipeline
│   ├── publish/           # Rule engine + cross-platform adaptation
│   ├── storage/           # Cloud storage adapters
│   ├── template/          # Template rendering
│   ├── fpe-wasm/          # Format-preserving encryption (WASM)
│   ├── cli/               # Command-line tool
│   ├── mcp-server/        # MCP server
│   ├── vscode-extension/  # VS Code extension
│   ├── markdown-it-presigned-url/          # Pre-signed URL plugin
│   └── markdown-it-presigned-url-adapter-nodejs/  # Signing adapter
├── examples/              # Usage examples
├── docs/                  # Documentation
└── scripts/               # Build and release scripts
```

---

## 7. Development

### 7.1. Prerequisites

- Node.js >= 22
- pnpm >= 10

### 7.2. Setup

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

### 7.3. Module System

All packages use strict ESM syntax. Build output includes both ESM (`.mjs`) and CJS (`.cjs`) formats.

---

## 8. License

Apache-2.0
