# GitHub Instructions - CMTX Monorepo AI Agent Guide

Comprehensive development guide for AI agents contributing to CMTX monorepo using pnpm workspace with four interconnected packages.

## Prerequisites

- Node.js >= 18.x
- pnpm >= 10.8.0

## Quick Start

```bash
npm install -g pnpm
pnpm install
```

## Common Development Tasks

### Building

```bash
# Build all packages
pnpm build

# Build a specific package
pnpm -F @cmtx/core build
pnpm -F @cmtx/upload build
pnpm -F @cmtx/cli build
pnpm -F @cmtx/mcp-server build
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm -F @cmtx/core test

# Run tests with coverage
pnpm -F @cmtx/core test -- --coverage

# Watch mode for development
pnpm -F @cmtx/core test -- --watch
```

### Linting & Code Quality

```bash
# Lint and fix all packages
pnpm lint

# Lint specific packages
pnpm lint -- packages/core/src/**/*.ts
pnpm lint -- packages/core/tests/**/*.ts

# ESLint configuration
# - eslint.config.mts (monorepo root)
# - Uses TypeScript support
```

### Documentation

```bash
# Generate documentation for all packages
pnpm run docs

# Generate docs for specific package
pnpm -F @cmtx/core run docs
```

### TypeScript

```bash
# Type checking (if configured in packages)
pnpm -F @cmtx/core exec tsc --noEmit
```

## Project Structure

```text
cmtx-project/
├── packages/
│   ├── core/          # Markdown image extraction, replacement & deletion (regex-based)
│   ├── upload/        # Object storage upload with smart deduplication
│   ├── cli/           # Command-line tool for image management
│   └── mcp-server/    # JSON-RPC 2.0 MCP server
├── .github/           # GitHub specific files
│   └── instructions.md # This file
├── docs/              # Project documentation
├── pnpm-workspace.yaml # Workspace configuration
├── tsconfig.base.json # Shared TypeScript config
└── package.json       # Root package.json with shared scripts
```

## Workflow: Feature Development

1. Create feature branch: `git checkout -b feat/feature-name`
2. Make changes & test:

   ```bash
   cd packages/core
   pnpm test
   pnpm lint
   ```

3. Build verification: `pnpm build` or `pnpm -F @cmtx/core build`
4. Commit: `git commit -m "feat: description"` & push

## Workflow: Bug Fix

1. Identify affected package
2. Write test case: `pnpm -F @cmtx/core test -- --watch`
3. Implement fix
4. Verify: `pnpm -F @cmtx/core test && pnpm lint`

## Workflow: Testing Multi-line HTML Image Support

```bash
cd packages/core
# Add test cases to examples/demo-data/docs/README.md
pnpm test -- tests/markdownImages.test.ts
```

## Package-Specific Commands

### @cmtx/core

Markdown image extraction, replacement & deletion library.

**Architecture**: Pure regex-based. Uses regular expressions to parse and manipulate:

- Markdown inline images with alt text and URL
- HTML img tags with src and alt attributes

```bash
cd packages/core
pnpm build      # Build distribution
pnpm test       # Comprehensive test suite
pnpm lint       # Code quality check
tsc -p tsconfig.build.json  # Type checking
```

**Dependencies**: fast-glob, magic-string, rehype-parse, rehype-raw, remark

### @cmtx/upload

Object storage uploader with smart deduplication, batch processing, adapters.

```bash
cd packages/upload
pnpm build
pnpm test
pnpm lint
```

**Key Features**:

- Single-file & global cross-file deduplication
- Template-based file naming & field replacement
- Event-driven progress tracking
- Multiple storage adapters (Aliyun OSS)
- Safe deletion strategies
- Peer dependency: ali-oss

### @cmtx/cli

Command-line tool for image management.

```bash
cd packages/cli
pnpm build
pnpm test
pnpm lint
```

### @cmtx/mcp-server

JSON-RPC 2.0 MCP server implementation.

```bash
cd packages/mcp-server
pnpm build
pnpm test
pnpm lint
```

## Debugging

VS Code debugging configuration (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Test",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["test", "--"],
      "console": "integratedTerminal",
      "cwd": "${workspaceFolder}/packages/core"
    }
  ]
}
```

## Troubleshooting

### Cache Issues

```bash
pnpm store prune               # Clear pnpm cache
rm -rf node_modules pnpm-lock.yaml
pnpm install                   # Clean install
```

### Build Errors

```bash
pnpm -r --parallel clean       # Clean all packages
pnpm build                     # Full rebuild
```

### Test Failures

```bash
pnpm -F @cmtx/core test -- --reporter=verbose
pnpm -F @cmtx/core test -- tests/parser.test.ts  # Specific file
pnpm -F @cmtx/core test -- -t "test name"        # Specific test
```

### Lint Issues

```bash
pnpm lint -- --format=stylish   # Show errors
pnpm lint                       # Auto-fix
```

## Code Style Guidelines

### TypeScript & General

- Strict mode, NodeNext module resolution
- Import paths use `.js` suffix in source (NodeNext requirement)
- Follow existing project structure and naming conventions

### Markdown & Comments

- **No Emoji or Unicode Symbols**: Use ASCII only (7-bit)
- **ASCII Symbols**: `[OK] [FAIL] [WARN] [INFO] [x] [ ] -> <- /\ \/`
- **Never Use**: Unicode (✓ ✗ → ↑), Emoji (✅ ❌ 📋), box-drawing (┌ ─ └)
- **Reference**: See [SYMBOL_TABLE.md](./SYMBOL_TABLE.md)

### Formatting

- printWidth: 120 characters (see `.prettierrc.yaml`)
- tabWidth: 4 spaces
- Markdown tables: space-separated pipes, blank lines around content

## Design Principles

### Architecture & Function Design

Follow core principles to maintain code quality and maintainability:

- **SOLID**
  - Single Responsibility: Each module has one reason to change (core: filter/replace/delete are separate)
  - Open/Closed: Extensible via adapters without modifying existing code
  - Liskov Substitution: Adapter interfaces are interchangeable
  - Interface Segregation: Small focused interfaces, not bloated ones
  - Dependency Inversion: Depend on abstractions, not concrete implementations

- **DRY** (Don't Repeat Yourself): Shared logic in utils, constants in `constants/` dirs

- **YAGNI** (You Aren't Gonna Need It): Add features only when required, not speculatively

- **KISS** (Keep It Simple, Stupid): Prefer regex-based parsing over complex AST traversal; avoid over-engineering

### Practical Guidelines

- Use typed functions with clear input/output contracts
- Regex-based parsing is preferred over AST when simpler and sufficient
- Leverage existing utilities; don't reinvent error handling or file operations
- Test-driven: write tests before implementation when possible

## Architecture & Integration

### Big Picture

**Data Flow**: `@cmtx/core` (image extraction) → `@cmtx/upload` (cloud storage) → `@cmtx/cli` & `@cmtx/mcp-server` (interfaces)

### @cmtx/core - Image Processing Engine

**Purpose**: Pure regex-based Markdown image parsing and manipulation

**Key Exports**:
- `filterImagesInText / fromFile / fromDirectory` - Extract images (Markdown inline, HTML tags)
- `replaceImagesInText / inFile / inDirectory` - Regex-based replacement with multi-field support
- `deleteLocalImage` / `deleteLocalImageSafely` - Safe deletion with retry & strategy support

**Critical Pattern**: Uses `magic-string` for efficient position tracking in replacements

### @cmtx/upload - Storage Abstraction Layer

**Purpose**: Adapter-based cloud storage integration with ConfigBuilder pattern

**Architecture**:
```
ConfigBuilder (fluent API)
    ↓
UploadConfig (storage, replace, delete, events)
    ↓
uploadLocalImageInMarkdown() → uploadService → replaceService → deleteService
    ↓
IStorageAdapter (AliOSSAdapter, etc)
```

**Key Classes**:
- `ConfigBuilder` - Fluent config construction with chainable methods
- `AliOSSAdapter` - OSS client wrapper (peer dependency: ali-oss)
- `UploadContext` - Maintains upload state & deduplication map

**Default Behaviors**:
- **Delete is OFF by default** - Only execute when `.delete()` is called on ConfigBuilder
- **Replace fields default to**: `{ src: '{cloudSrc}', alt: '{originalAlt}' }`
- **Deduplication**: Always enabled; tracks uploaded files by hash to prevent re-uploads

**Template Variables**: `{cloudSrc}`, `{originalAlt}`, `{date}`, `{md5_8}`, `{ext}`, `{name}`

### @cmtx/cli - Command-line Interface

**Entry Point**: `packages/cli/bin/cmtx.ts`

**Command Structure**:
- `analyze` - Scan Markdown for images
- `upload` - Execute upload workflow
- `delete` - Safe image deletion
- `config` - Manage settings

**UI Pattern**: Uses `chalk` for colors, `ora` for spinners; supports `--verbose` / `--quiet` flags

### @cmtx/mcp-server - AI Integration

**Protocol**: JSON-RPC 2.0 over stdio

**Tools Exposed**: Image analysis, upload preview, deduplication check, safe delete

**Entry Point**: `packages/mcp-server/bin/cmtx-mcp.ts`

## Common Workflows for AI Agents

### Adding a New Feature to @cmtx/core

1. Add test in `packages/core/tests/` first (TDD)
2. Implement function in appropriate module (filter/replace/delete)
3. Export from `packages/core/src/index.ts`
4. Update README.md with example
5. Run `pnpm -F @cmtx/core test && pnpm lint`

### Adding Storage Adapter

1. Create new file in `packages/upload/src/adapters/`
2. Implement `IStorageAdapter` interface (`.upload()` method)
3. Add export to `packages/upload/src/index.ts`
4. Update package.json exports map
5. Add example in `packages/upload/examples/`

### Debugging Upload Flow

```bash
# See execution with debug logs
pnpm -F @cmtx/upload exec tsx examples/03-aliyun-oss.ts

# Watch mode for iterative development
pnpm -F @cmtx/upload test -- --watch

# Type check specific file
pnpm -F @cmtx/upload exec tsc --noEmit src/uploader.ts
```

## Important Implementation Details

### Deduplication Logic

Located in `packages/upload/src/upload-context.ts`:
- Tracks uploaded files by absolute path
- Prevents duplicate uploads of same file
- Returns existing cloud URL for duplicates

### Deletion Strategy

Supports three modes (from @cmtx/core):
- `trash` - Move to system recycle bin (default, cross-platform)
- `move` - Move to `.cmtx-trash/` directory
- `hard-delete` - Permanent deletion (use with caution)

### Field Replacement Templates

Renderer in `packages/upload/src/template-renderer.ts` handles:
- Built-in vars: `{cloudSrc}`, `{originalAlt}`, `{date}`, `{md5_8}`, `{ext}`
- Custom context variables: Pass via `replace.context`
- Conditional replacement: Future feature (see test stubs)

## Contributing Checklist

Before submitting a pull request:

- [OK] Tests pass: `pnpm test`
- [OK] Linting: `pnpm lint`
- [OK] TypeScript: `pnpm build`
- [OK] Documentation: `pnpm run docs` (if needed)
- [OK] Pure ASCII: no emoji, no Unicode (see [SYMBOL_TABLE.md](./SYMBOL_TABLE.md))

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

## Performance Notes

@cmtx/core 架构特点：

- 正则表达式统一架构，无 AST 解析开销
- 直接字符串匹配，执行快速
- 依赖最小化（仅 fast-glob 和 trash）

## References

- [pnpm Documentation](https://pnpm.io/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [TypeScript Config](../tsconfig.base.json)
- [ESLint Config](../eslint.config.mts)
- [SYMBOL_TABLE.md](./SYMBOL_TABLE.md)
