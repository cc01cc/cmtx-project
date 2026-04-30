# Package & Scripts 标准化指南

## 配置模板标准

### 公开发布包模板（npm publish 用）

此模板用于发布到 npm 的公开包：

```jsonc
{
    "name": "@cmtx/package-name",
    "version": "0.1.0",
    "description": "包描述",
    "license": "Apache-2.0",
    "type": "module",
    // CJS 入口
    "main": "./dist/index.cjs",
    // ESM 入口
    "module": "./dist/index.mjs",
    // 类型声明入口
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            // ESM 条件导出
            "import": "./dist/index.mjs",
            // CJS 条件导出
            "require": "./dist/index.cjs"
        }
    },
    "files": ["dist", "README.md", "CHANGELOG.md"],
    "repository": {
        "type": "git",
        "url": "https://github.com/cc01cc/cmtx-project.git",
        "directory": "packages/package-name"
    },
    "bugs": {
        "url": "https://github.com/cc01cc/cmtx-project/issues"
    },
    "homepage": "https://github.com/cc01cc/cmtx-project",
    "author": "cc01cc",
    "keywords": ["关键词1", "关键词2", "cmtx"],
    "publishConfig": {
        // 公开发布
        "access": "public"
    },
    "scripts": {
        // 使用 tsdown 构建（替代 tsc）
        "build": "tsdown",
        // 运行单元测试
        "test": "vitest run",
        // 生成 TypeDoc API 文档
        "docs": "typedoc",
        // 清理构建产物
        "clean": "rm -rf dist"
    }
}
```

### 标准 Library 包模板

基础库包（如 @cmtx/core, @cmtx/asset, @cmtx/publish, @cmtx/storage 等）：

```jsonc
{
    "name": "@cmtx/package-name",
    "version": "0.0.1-dev",
    "private": true,
    "type": "module",
    "main": "./dist/index.cjs",
    "module": "./dist/index.mjs",
    "types": "./dist/index.d.ts",
    "scripts": {
        // 使用 tsdown 打包构建
        "build": "tsdown",
        // 监听模式增量构建
        "build:watch": "tsdown --watch",
        // 清理 dist 目录
        "clean": "rm -rf dist",
        // 源码类型检查
        "typecheck": "tsc --noEmit -p tsconfig.json",
        // 测试代码类型检查
        "typecheck:tests": "tsc --noEmit -p tsconfig.test.json",
        // 运行所有测试
        "test": "vitest run",
        // 监听模式运行测试
        "test:watch": "vitest",
        // 运行测试并生成覆盖率报告（需 @vitest/coverage-v8）
        "test:coverage": "vitest run --coverage",
        // 生成 TypeDoc API 文档
        "docs": "typedoc"
    },
    "devDependencies": {
        "@types/node": "catalog:",
        "typescript": "catalog:",
        "vitest": "catalog:",
        "typedoc": "catalog:",
        "@vitest/coverage-v8": "catalog:"
    }
}
```

### 标准 CLI 包模板

```jsonc
{
    "name": "@cmtx/cli-tool",
    "version": "0.0.1-dev",
    "private": true,
    "type": "module",
    // CLI 入口命令
    "bin": {
        "command-name": "./dist/bin/command.js"
    },
    "scripts": {
        // 使用 tsdown 打包构建
        "build": "tsdown",
        // 开发模式：监听文件变化自动重新构建
        "dev": "tsdown --watch",
        // 源码类型检查
        "typecheck": "tsc --noEmit -p tsconfig.json",
        // 测试代码类型检查
        "typecheck:tests": "tsc --noEmit -p tsconfig.test.json",
        // 运行所有测试
        "test": "vitest run",
        // 监听模式运行测试
        "test:watch": "vitest",
        // 清理 dist 目录
        "clean": "rimraf dist"
    },
    "devDependencies": {
        "@types/node": "catalog:",
        "typescript": "catalog:",
        "vitest": "catalog:",
        "rimraf": "catalog:dev"
    }
}
```

### WASM 包模板（@cmtx/fpe-wasm, @cmtx/autocorrect-wasm）

```jsonc
{
    "name": "@cmtx/wasm-package",
    "version": "0.0.1-dev",
    "private": true,
    "type": "module",
    "scripts": {
        // 编译 Rust WASM 产物
        "build:wasm": "wasm-pack build --target web --out-dir pkg",
        // 先构建 WASM，再打包 TS
        "build": "pnpm run build:wasm && tsdown",
        // 监听模式增量构建（仅 TS）
        "build:watch": "tsdown --watch",
        // 生产构建（WASM 带 --release）
        "build:release": "wasm-pack build --target web --out-dir pkg --release && tsdown",
        // 运行 WASM 原生测试
        "test:wasm": "wasm-pack test --node",
        // 运行 TypeScript 测试
        "test:ts": "vitest run",
        // 全量测试（WASM + TS）
        "test": "pnpm run test:wasm && pnpm run test:ts",
        // 生成 TS API 文档
        "docs": "typedoc",
        // 生成 Rust API 文档
        "docs:rust": "cargo doc --no-deps",
        // 清理 dist 目录
        "clean": "rm -rf dist",
        // 源码类型检查
        "typecheck": "tsc --noEmit -p tsconfig.json",
        // 测试代码类型检查
        "typecheck:tests": "tsc --noEmit -p tsconfig.test.json"
    }
}
```

### markdown-it 插件包模板

```jsonc
{
    "name": "@cmtx/markdown-it-plugin",
    "version": "0.0.1-dev",
    "private": true,
    "type": "module",
    "scripts": {
        // 安装依赖后自动构建（npm lifecycle hook）
        "prepare": "pnpm build",
        // 使用 tsdown 打包构建
        "build": "tsdown",
        // 监听模式增量构建
        "build:watch": "tsdown --watch",
        // 源码类型检查
        "typecheck": "tsc --noEmit -p tsconfig.json",
        // 测试代码类型检查
        "typecheck:tests": "tsc --noEmit -p tsconfig.test.json",
        // 运行所有测试
        "test": "vitest run",
        // 生成 TypeDoc API 文档
        "docs": "typedoc",
        // 清理 dist 目录
        "clean": "rimraf dist"
    }
}
```

### 标准 VS Code 扩展包模板

```jsonc
{
    "name": "my-vscode-extension",
    "version": "0.0.1-dev",
    "private": true,
    "type": "module",
    "scripts": {
        // 使用 tsdown 打包扩展
        "build": "tsdown",
        // 编译测试代码
        "build:test": "tsc -p tsconfig.test.json",
        // 开发模式：监听文件变化自动构建
        "watch": "tsdown --watch",
        // 源码类型检查
        "typecheck": "tsc --noEmit -p tsconfig.json",
        // 测试代码类型检查
        "typecheck:tests": "tsc --noEmit -p tsconfig.test.json",
        // 运行单元测试
        "test": "vitest run",
        // 仅运行单元测试
        "test:unit": "vitest run tests/unit",
        // 运行测试并生成覆盖率报告
        "test:coverage": "vitest run --coverage",
        // 运行集成测试（需先编译测试代码）
        "test:integration": "pnpm build:test && node dist/test/test/runTest.js",
        // 监听模式运行测试
        "test:watch": "vitest",
        // 打包扩展（默认 dev 模式）
        "package": "pnpm run build && node scripts/package.mjs",
        // 打包扩展开发版
        "package:dev": "pnpm run build && node scripts/package.mjs dev",
        // 打包扩展生产版
        "package:prod": "pnpm run build && node scripts/package.mjs prod",
        // 打包稳定版
        "package:stable": "pnpm run build && node scripts/package.mjs stable",
        // 打包预发布版
        "package:pre-release": "pnpm run build && node scripts/package.mjs prerelease",
        // 发布预发布版到 VS Code Marketplace
        "publish:pre-release": "vsce publish --pre-release",
        // 发布稳定版到 VS Code Marketplace
        "publish:stable": "vsce publish"
    }
}
```

## Scripts 命名规范

### 核心构建脚本

```jsonc
{
    "scripts": {
        //
        // 构建与编译
        //
        // 核心构建命令，使用 tsdown 打包
        "build": "tsdown",
        // 监听模式，文件变更时自动重新构建
        "build:watch": "tsdown --watch",
        // 开发模式，同 build:watch
        "dev": "tsdown --watch",
        // 监听模式（VS Code 扩展使用）
        "watch": "tsdown --watch",

        //
        // 类型检查
        //
        // 源码 TypeScript 类型检查
        "typecheck": "tsc --noEmit -p tsconfig.json",
        // 测试代码类型检查（独立 tsconfig）
        "typecheck:tests": "tsc --noEmit -p tsconfig.test.json",

        //
        // 测试
        //
        // 运行所有测试（单次）
        "test": "vitest run",
        // 监听模式运行测试
        "test:watch": "vitest",
        // 运行测试并生成覆盖率报告
        "test:coverage": "vitest run --coverage",
        // 仅运行单元测试
        "test:unit": "vitest run tests/unit",
        // 仅运行集成测试
        "test:integration": "vitest run tests/integration",

        //
        // 文档
        //
        // 生成 TypeDoc API 文档
        "docs": "typedoc",
        // 生成 Rust API 文档（仅 WASM 包）
        "docs:rust": "cargo doc --no-deps",

        //
        // 代码质量
        //
        // 代码检查（oxlint）
        "lint": "oxlint --type-aware -c .oxlintrc.json",
        // 代码检查并自动修复
        "lint:fix": "oxlint -c .oxlintrc.json --fix",

        //
        // 清理
        //
        // 清理构建产物
        "clean": "rm -rf dist"
    }
}
```

### 各包差异化配置

#### Library 包（@cmtx/core, @cmtx/asset, @cmtx/publish, @cmtx/storage, @cmtx/template）

```jsonc
{
    "scripts": {
        // 使用 tsdown 打包构建
        "build": "tsdown",
        // 监听模式增量构建
        "build:watch": "tsdown --watch",
        // 清理 dist 目录
        "clean": "rm -rf dist",
        // 源码类型检查
        "typecheck": "tsc --noEmit -p tsconfig.json",
        // 测试代码类型检查
        "typecheck:tests": "tsc --noEmit -p tsconfig.test.json",
        // 运行所有测试
        "test": "vitest run",
        // 生成 TypeDoc API 文档
        "docs": "typedoc"
    }
}
```

#### CLI 工具包（@cmtx/cli）

```jsonc
{
    "scripts": {
        // 使用 tsdown 打包构建
        "build": "tsdown",
        // 开发模式：监听文件变化自动重新构建
        "dev": "tsdown --watch",
        // 源码类型检查
        "typecheck": "tsc --noEmit -p tsconfig.json",
        // 测试代码类型检查
        "typecheck:tests": "tsc --noEmit -p tsconfig.test.json",
        // 运行所有测试
        "test": "vitest run",
        // 监听模式运行测试
        "test:watch": "vitest",
        // 清理 dist 目录
        "clean": "rimraf dist"
    }
}
```

#### 服务包（@cmtx/mcp-server）

```jsonc
{
    "scripts": {
        // 使用 tsdown 打包构建
        "build": "tsdown",
        // 开发模式：监听文件变化自动重新构建
        "dev": "tsdown --watch",
        // 源码类型检查
        "typecheck": "tsc --noEmit -p tsconfig.json",
        // 测试代码类型检查
        "typecheck:tests": "tsc --noEmit -p tsconfig.test.json",
        // 运行所有测试
        "test": "vitest run",
        // 监听模式运行测试
        "test:watch": "vitest",
        // 清理 dist 目录
        "clean": "rimraf dist"
    }
}
```

#### WASM 包（@cmtx/fpe-wasm, @cmtx/autocorrect-wasm）

```jsonc
{
    "scripts": {
        // 编译 Rust WASM 产物
        "build:wasm": "wasm-pack build --target web --out-dir pkg",
        // 先构建 WASM，再打包 TS
        "build": "pnpm run build:wasm && tsdown",
        // 监听模式增量构建（仅 TS）
        "build:watch": "tsdown --watch",
        // 生产构建（WASM 带 --release）
        "build:release": "wasm-pack build --target web --out-dir pkg --release && tsdown",
        // 运行 WASM 原生测试
        "test:wasm": "wasm-pack test --node",
        // 运行 TypeScript 测试
        "test:ts": "vitest run",
        // 全量测试（WASM + TS）
        "test": "pnpm run test:wasm && pnpm run test:ts",
        // 生成 TS API 文档
        "docs": "typedoc",
        // 生成 Rust API 文档
        "docs:rust": "cargo doc --no-deps",
        // 清理 dist 目录
        "clean": "rm -rf dist",
        // 源码类型检查
        "typecheck": "tsc --noEmit -p tsconfig.json",
        // 测试代码类型检查
        "typecheck:tests": "tsc --noEmit -p tsconfig.test.json"
    }
}
```

#### markdown-it 插件包（@cmtx/markdown-it-presigned-url, @cmtx/markdown-it-presigned-url-adapter-nodejs）

```jsonc
{
    "scripts": {
        // 安装依赖后自动构建（npm lifecycle hook）
        "prepare": "pnpm build",
        // 使用 tsdown 打包构建
        "build": "tsdown",
        // 监听模式增量构建
        "build:watch": "tsdown --watch",
        // 源码类型检查
        "typecheck": "tsc --noEmit -p tsconfig.json",
        // 测试代码类型检查
        "typecheck:tests": "tsc --noEmit -p tsconfig.test.json",
        // 运行所有测试
        "test": "vitest run",
        // 生成 TypeDoc API 文档
        "docs": "typedoc",
        // 清理 dist 目录
        "clean": "rimraf dist"
    }
}
```

#### VS Code 扩展（cmtx-vscode）

```jsonc
{
    "scripts": {
        // 使用 tsdown 打包扩展
        "build": "tsdown",
        // 编译测试代码
        "build:test": "tsc -p tsconfig.test.json",
        // 开发模式：监听文件变化自动构建
        "watch": "tsdown --watch",
        // 源码类型检查
        "typecheck": "tsc --noEmit -p tsconfig.json",
        // 测试代码类型检查
        "typecheck:tests": "tsc --noEmit -p tsconfig.test.json",
        // 运行单元测试
        "test": "vitest run",
        // 仅运行单元测试
        "test:unit": "vitest run tests/unit",
        // 运行测试并生成覆盖率报告
        "test:coverage": "vitest run --coverage",
        // 运行集成测试
        "test:integration": "pnpm build:test && node dist/test/test/runTest.js",
        // 监听模式运行测试
        "test:watch": "vitest",
        // 打包扩展
        "package": "pnpm run build && node scripts/package.mjs",
        // 打包扩展（dev 模式）
        "package:dev": "pnpm run build && node scripts/package.mjs dev",
        // 打包扩展（prod 模式）
        "package:prod": "pnpm run build && node scripts/package.mjs prod",
        // 打包稳定版
        "package:stable": "pnpm run build && node scripts/package.mjs stable",
        // 打包预发布版
        "package:pre-release": "pnpm run build && node scripts/package.mjs prerelease",
        // 发布预发布版
        "publish:pre-release": "vsce publish --pre-release",
        // 发布稳定版
        "publish:stable": "vsce publish"
    }
}
```

## 根目录统一脚本

根目录 package.json 提供了完整的工作区编排脚本：

```jsonc
{
    "scripts": {
        //
        // 构建
        //
        // 在所有子包中并行执行 build 脚本
        "build": "pnpm -r build",

        //
        // 文档
        //
        // 生成 TypeDoc 文档（根配置）
        "docs": "typedoc --options typedoc.json",
        // 检查文档可生成性（不输出文件，用于 CI）
        "docs:check": "typedoc --options typedoc.json --emit none",
        // 将生成的文档上传到服务器
        "docs:upload": "node scripts/upload-docs.js",

        //
        // 代码质量（lint）
        //
        // 全量代码质量检查（lint + 格式 + 类型）
        "lint": "pnpm run lint:oxlint && pnpm run lint:oxfmt && pnpm run typecheck",
        // 运行 oxlint 静态分析（类型感知模式）
        "lint:oxlint": "oxlint --type-aware -c .oxlintrc.json",
        // 检查代码格式是否符合 oxfmt 规范
        "lint:oxfmt": "oxfmt -c .oxfmtrc.jsonc --check .",
        // 自动修复 lint 和格式问题
        "lint:fix": "oxlint -c .oxlintrc.json --fix . && oxfmt -c .oxfmtrc.jsonc .",

        //
        // 类型检查
        //
        // 在所有子包中运行类型检查（有 typecheck 脚本的才执行）
        "typecheck": "pnpm -r --if-present typecheck",

        //
        // Restic 备份（外部 Git 仓库备份工具）
        //
        // 执行 restic 增量备份
        "restic:backup": "node scripts/restic-backup.js",
        // 从 restic 仓库恢复数据
        "restic:restore": "node scripts/restic-restore.js",

        //
        // Changeset 版本管理
        //
        // 创建新的 changeset（交互式）
        "changeset": "changeset",
        // 根据 changeset 更新版本号和 CHANGELOG
        "changeset:version": "changeset version",
        // version 后钩子：生成发布说明
        "postchangeset:version": "node scripts/release-changelog.mjs",
        // 手动生成发布说明
        "changeset:changelog": "node scripts/release-changelog.mjs",
        // 发布已版本化的包到 npm
        "changeset:publish": "changeset publish",

        //
        // Alpha 发布流程
        //
        // 进入 alpha 预发布模式并版本化
        "release:alpha:start": "changeset pre enter alpha && pnpm changeset:version",
        // 继续添加 alpha 版本
        "release:alpha:continue": "pnpm changeset:version",
        // 发布 alpha 版本并推送 git tag
        "release:alpha:publish": "changeset publish && git push --follow-tags",

        //
        // Beta 发布流程
        //
        // 切换到 beta 预发布模式
        "release:beta:start": "changeset pre exit && changeset pre enter beta && pnpm changeset:version",
        // 继续添加 beta 版本
        "release:beta:continue": "pnpm changeset:version",
        // 发布 beta 版本并推送 git tag
        "release:beta:publish": "changeset publish && git push --follow-tags",

        //
        // 正式版发布
        //
        // 退出预发布模式并发布正式版
        "release:latest": "changeset pre exit && pnpm changeset:version && changeset publish && git push --follow-tags",

        //
        // 发布前验证
        //
        // 发布前全量验证
        "prepublish:validate": "pnpm run validate:build && pnpm run validate:tests && pnpm run validate:typecheck",
        // 验证构建是否成功
        "validate:build": "pnpm -r build",
        // 验证测试是否通过
        "validate:tests": "pnpm -r test",
        // 验证类型检查是否通过
        "validate:typecheck": "pnpm -r typecheck"
    }
}
```

## 包目录与模板对照表

| 包名 | 类型 | 对应模板 |
|------|------|----------|
| `@cmtx/core` | Library | 标准 Library 包模板 |
| `@cmtx/storage` | Library | 标准 Library 包模板 |
| `@cmtx/template` | Library | 标准 Library 包模板 |
| `@cmtx/asset` | Library | 标准 Library 包模板 |
| `@cmtx/publish` | Library | 标准 Library 包模板 |
| `@cmtx/fpe-wasm` | WASM | WASM 包模板 |
| `@cmtx/autocorrect-wasm` | WASM | WASM 包模板 |
| `@cmtx/markdown-it-presigned-url` | markdown-it 插件 | markdown-it 插件包模板 |
| `@cmtx/markdown-it-presigned-url-adapter-nodejs` | markdown-it 插件 | markdown-it 插件包模板 |
| `@cmtx/cli` | CLI | 标准 CLI 包模板 |
| `@cmtx/mcp-server` | 服务 | 标准 CLI 包模板 |
| `cmtx-vscode` | VS Code 扩展 | VS Code 扩展包模板 |

## 使用方法

### 1. 统一脚本执行

```bash
# 在根目录执行所有包的操作
pnpm build           # 构建所有包
pnpm test            # 测试所有包
pnpm docs            # 生成根文档
pnpm lint            # 全量代码质量检查
pnpm typecheck       # 全量类型检查

# 在特定包目录执行
cd packages/core && pnpm build
```

### 2. 并行执行优化

```bash
# 并行构建（更快）
pnpm -r --parallel build

# 按顺序执行测试（避免资源竞争）
pnpm -r --stream test
```

### 3. 过滤执行

```bash
# 只对特定包执行
pnpm --filter @cmtx/core build
pnpm --filter "./packages/core" test

# 对多个包执行
pnpm --filter "@cmtx/*" build
```

## 创建新包的标准流程

```bash
# 1. 根据包类型选择合适的模板（参见上表）
#    - Library 包: 使用标准 Library 模板
#    - CLI 工具: 使用 CLI 模板
#    - WASM 包: 使用 WASM 模板
#    - markdown-it 插件: 使用 markdown-it 插件模板
#    - VS Code 扩展: 使用 VS Code 扩展模板

# 2. 复制模板
cp scripts/package-template.json packages/new-package/package.json

# 3. 修改包名和相关信息
# 4. 添加特定依赖
# 5. 运行初始化
cd packages/new-package
pnpm install
```

## 最佳实践

1. **保持包独立性**：每个包都应该能独立构建和测试
2. **统一命名**：使用标准的脚本名称（build, test, typecheck, clean 等）
3. **根目录协调**：通过根目录脚本统一管理工作区
4. **避免过度抽象**：适度的重复比复杂的抽象更好维护
5. **文档同步**：确保 README 中的使用说明与实际脚本一致

### 特点

- **独立性强** - 每个包可以独立发布和版本管理
- **透明度高** - 配置一目了然，无隐藏依赖
- **维护简单** - 不需要复杂的继承逻辑
- **工具友好** - IDE 和工具能正确解析每个包

### 参考实践

- Babel: 完全独立的包配置
- Jest: 核心包适度共享，插件包独立
- React: 各包独立管理
- TypeScript: 官方自身也是独立包配置
