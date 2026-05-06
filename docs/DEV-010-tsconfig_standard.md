# TypeScript 配置标准化指南

> [INFO] 本文档已从 tsc 构建模式迁移为 tsdown 构建模式。
> 项目不再使用 `tsc` 进行生产构建，`tsconfig.build.json` 已被移除。
> 所有包统一使用 `tsdown` 打包，tsconfig.json 仅用于类型检查。

## 标准配置模板

### 类型检查配置 (tsconfig.json)

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "noEmit": true,
        "types": ["node"],
        "baseUrl": "./"
    },
    "include": ["src", "bin"],
    "exclude": ["dist"]
}
```

### 测试类型检查配置 (tsconfig.test.json)

部分包为测试代码维护独立的 tsconfig：

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "types": ["node", "vitest/globals"]
    },
    "include": ["src", "bin", "tests"]
}
```

## 配置原则

1. **类型检查与构建分离**：tsconfig 仅用于 `pnpm typecheck`，构建使用 `tsdown`
2. **最小化配置**：只包含必要的选项，避免过度配置
3. **一致性**：所有包使用相同的配置模式

## 构建配置 (tsdown)

所有包统一使用 tsdown 构建，配置示例：

```typescript
import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    platform: "node",
    target: "node22",
    shims: true,
});
```

详见 [DEV-002: ESM/CJS/WASM 打包指南](./DEV-002-esm-cjs-wasm-bundling-guide.md)。

## 各包特殊考虑

- 包有额外 `bin` 目录时，在 tsconfig 的 `include` 中添加 `"bin"`
- WASM 包的 tsdown 配置增加 `copy` 字段处理 `.wasm` 文件
- VS Code 扩展使用 CJS 单输出格式 + `alwaysBundle`

详见 [DEV-012: CMTX WASM 处理方案](./DEV-012-rolldown-plugin-wasm-reference.md)。
