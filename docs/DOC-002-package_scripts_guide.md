# Package & Scripts 标准化指南

## 配置模板标准

### 标准 Library 包模板

```json
{
  "name": "@cmtx/package-name",
  "version": "0.0.1-dev",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest run",
    "docs": "typedoc",
    "lint": "eslint src tests --fix"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:",
    "typedoc": "catalog:",
    "eslint": "catalog:",
    "@vitest/coverage-v8": "catalog:"
  }
}
```

### 标准 CLI 包模板

```json
{
  "name": "@cmtx/cli-tool",
  "version": "0.0.1-dev",
  "private": true,
  "type": "module",
  "bin": {
    "command-name": "./dist/bin/command.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc -p tsconfig.json --watch",
    "test": "vitest run",
    "test:watch": "vitest",
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

### 标准服务包模板

```json
{
  "name": "@cmtx/service-name",
  "version": "0.0.1-dev",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc -w -p tsconfig.build.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

## Scripts 命名规范

### 核心构建脚本

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "dev": "tsc -w -p tsconfig.build.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "docs": "typedoc",
    "lint": "eslint src tests --fix",
    "clean": "rimraf dist"
  }
}
```

### 各包差异化配置

#### Library 包 (@cmtx/core, @cmtx/upload, @cmtx/metadata, @cmtx/template)

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest run",
    "docs": "typedoc",
    "lint": "eslint src tests --fix"
  }
}
```

#### CLI 工具包 (@cmtx/cli)

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc -p tsconfig.json --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rimraf dist"
  }
}
```

#### 服务包 (@cmtx/mcp-server)

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc -w -p tsconfig.build.json",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

## 根目录统一脚本

根目录 package.json 已经提供了很好的工作区脚本：

```json
{
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "docs": "pnpm -r docs && node scripts/generate-docs-index.js",
    "lint": "sh -c 'pnpm run lint:format:write; f=$?; pnpm run typecheck; t=$?; [ $f -eq 0 ] && [ $t -eq 0 ]'",
    "lint:check": "sh -c 'pnpm run lint:format; f=$?; pnpm run typecheck; t=$?; [ $f -eq 0 ] && [ $t -eq 0 ]'",
    "lint:format": "biome check .",
    "lint:format:write": "biome check --write .",
    "typecheck": "pnpm run typecheck:packages",
    "typecheck:packages": "pnpm -r --if-present typecheck"
  }
}
```

## 使用方法

### 1. 统一脚本执行

```bash
# 在根目录执行所有包的操作
pnpm build    # 构建所有包
pnpm test     # 测试所有包
pnpm docs     # 生成所有文档
pnpm lint     # 检查所有代码

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
# 1. 选择合适的模板
# Library包: 使用标准Library模板
# CLI工具: 使用CLI模板
# 服务包: 使用服务模板

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
2. **统一命名**：使用标准的脚本名称
3. **根目录协调**：通过根目录脚本统一管理工作区
4. **避免过度抽象**：适度的重复比复杂的抽象更好维护
5. **文档同步**：确保 README 中的使用说明与实际脚本一致

### 特点

✅ **独立性强** - 每个包可以独立发布和版本管理
✅ **透明度高** - 配置一目了然，无隐藏依赖
✅ **维护简单** - 不需要复杂的继承逻辑
✅ **工具友好** - IDE 和工具能正确解析每个包

### 参考实践

- Babel: 完全独立的包配置
- Jest: 核心包适度共享，插件包独立
- React: 各包独立管理
- TypeScript: 官方自身也是独立包配置
