# DEV-006: tsdown 依赖打包与 vsce 集成指南

## 1. 问题背景

在 pnpm workspace monorepo 环境中，使用 tsdown 构建 VS Code 扩展并通过 vsce 打包时，会遇到依赖打包不完整的问题。

### 1.1 问题现象

- 构建（`pnpm build`）成功
- 打包（`vsce package --no-dependencies`）成功
- 用户安装扩展后运行时出现 `ModuleNotFoundError`

### 1.2 问题根因

在早期版本中，tsdown 的 `alwaysBundle` 仅匹配 `@cmtx/*` 包，导致第三方依赖（如 `tinyglobby`, `trash`, `ali-oss`）被保留为外部 `require` 调用。但 vsce 使用 `--no-dependencies` 时不会收集 `node_modules` 中的依赖，从而在运行时找不到这些模块。

**当前解决方案**：使用 `alwaysBundle: [/.*/]` 打包所有依赖（包括 `@cmtx/*` 和第三方包），通过 tsdown 的 `copy` 配置单独复制 WASM 文件。

## 2. tsdown 依赖打包行为

### 2.1 默认行为

| 依赖类型               | 默认打包行为                   |
| ---------------------- | ------------------------------ |
| `dependencies`         | **不打包**（外部化）           |
| `peerDependencies`     | **不打包**（外部化）           |
| `optionalDependencies` | **不打包**（外部化）           |
| `devDependencies`      | **打包**（如果代码中实际使用） |

### 2.2 deps 配置选项

| 选项                    | 作用                                                                |
| ----------------------- | ------------------------------------------------------------------- |
| `skipNodeModulesBundle` | 如果为 `true`，阻止打包任何 `node_modules` 中的依赖                 |
| `onlyBundle`            | 白名单机制，只允许列出的依赖被打包；`false` 时禁用未授权依赖警告    |
| `neverBundle`           | 显式标记为外部依赖，确保不被打包                                    |
| `alwaysBundle`          | 强制打包指定的依赖，即使它们是 `dependencies` 或 `peerDependencies` |

### 2.3 alwaysBundle 的行为

`alwaysBundle` **只强制打包指定的包本身**，不一定会递归打包其子依赖。

```typescript
deps: {
  alwaysBundle: ['tinyglobby'],  // 只打包 tinyglobby，不打包 fdir, picomatch
}
```

### 2.4 onlyBundle 的行为

`onlyBundle` 是白名单机制，**需要包含所有子依赖**：

> "Include all sub-dependencies in the list, not just top-level imports."

```typescript
deps: {
  onlyBundle: [
    'tinyglobby',
    'fdir',        // 需要显式包含
    'picomatch',   // 需要显式包含
  ],
}
```

## 3. pnpm 和 npm 的 node_modules 结构差异

### 3.1 结构对比

| 特性                  | npm                            | pnpm                                               |
| --------------------- | ------------------------------ | -------------------------------------------------- |
| **安装方式**          | 扁平化安装（所有依赖在根目录） | 硬链接 + symlink                                   |
| **node_modules 结构** | `node_modules/pkg/`            | `node_modules/.pnpm/pkg@version/node_modules/pkg/` |
| **workspace 包**      | 直接复制                       | symlink 链接                                       |
| **磁盘使用**          | 重复安装相同依赖               | 共享依赖，节省空间                                 |

### 3.2 pnpm 的 node_modules 结构示例

```
node_modules/
├── .pnpm/
│   ├── ali-oss@6.23.0/
│   │   └── node_modules/
│   │       ├── ali-oss/  -> 硬链接
│   │       ├── request/  -> 硬链接
│   │       └── ...
│   ├── tinyglobby@0.2.16/
│   │   └── node_modules/
│   │       ├── tinyglobby/  -> 硬链接
│   │       ├── fdir/  -> 硬链接
│   │       └── picomatch/  -> 硬链接
├── @cmtx/
│   ├── asset -> ../../packages/asset/  (symlink)
│   └── core -> ../../packages/core/    (symlink)
├── ali-oss -> .pnpm/ali-oss@6.23.0/node_modules/ali-oss  (symlink)
├── tinyglobby -> .pnpm/tinyglobby@0.2.16/node_modules/tinyglobby  (symlink)
└── ...
```

### 3.3 直接复制的问题

1. **symlink 问题**：
    - pnpm 的 `node_modules/ali-oss` 是指向 `.pnpm/` 的 symlink
    - 直接复制会复制 symlink 本身，而不是实际文件
    - 需要使用 `dereference: true` 解析 symlink

2. **嵌套依赖问题**：
    - pnpm 的依赖在 `.pnpm/pkg@version/node_modules/` 中
    - 复制时需要保留完整的嵌套结构

## 4. vsce --no-dependencies 的作用

### 4.1 vsce 默认行为

vsce 在打包时会执行以下步骤：

1. 执行 `npm list --production --parseable --depth=99999` 收集依赖
2. 遍历依赖目录，将所有依赖文件打包进 VSIX

### 4.2 --no-dependencies 的作用

- 跳过 `getNpmDependencies()` 调用
- 直接返回 `[cwd]`（当前扩展目录）
- 只打包扩展目录中的文件（根据 `.vscodeignore` 过滤）
- **不尝试收集**任何 `node_modules/` 中的依赖

### 4.3 为什么在 pnpm 环境下需要 --no-dependencies

在 pnpm workspace 中：

1. pnpm 使用 **symlink** 链接 workspace 包
2. pnpm 的 `node_modules` 结构是 **扁平化** 的（所有依赖都在根目录）
3. vsce 的 `npm list` 命令在 pnpm 环境下会**误报**缺失依赖

错误示例：

```
npm error missing: delay@^4.1.0, required by p-limit@2.3.0
npm error missing: in-range@^1.0.0, required by p-limit@2.3.0
```

### 4.4 .vscodeignore 的作用

`.vscodeignore` 是 vsce 打包时使用的**文件过滤规则**，类似于 `.gitignore`：

- 默认情况下，vsce 会打包 `package.json` 中 `files` 字段列出的文件
- `.vscodeignore` 可以**排除**某些文件或目录
- 使用 `!` 前缀可以**包含**原本被排除的文件

```
# 示例：排除 .vscodeignore 本身
.vscodeignore

# 示例：包含 node_modules（默认被排除）
!node_modules/**
```

## 5. 当前解决方案：alwaysBundle 全量打包

### 5.1 方案概述

tsdown 使用 `alwaysBundle: [/.*/]` 将包括 `@cmtx/*` 在内的**所有依赖**打包进单个 `extension.cjs` 文件，WASM 文件通过 `copy` 配置单独复制到 `dist/`。由于所有运行时依赖已打包，`vsce package --no-dependencies` 可安全跳过 node_modules 的收集。

### 5.2 tsdown 配置

```typescript
// packages/vscode-extension/tsdown.config.ts
export default defineConfig({
    entry: { extension: "src/extension.ts" },
    format: ["cjs"],
    platform: "node",
    target: "node22",
    deps: {
        onlyBundle: false,
        neverBundle: ["vscode", "node:*"],
        alwaysBundle: [/.*/],   // 打包所有依赖
    },
    copy: [
        "../fpe-wasm/pkg/cmtx_fpe_wasm_bg.wasm",
        "../autocorrect-wasm/pkg/cmtx_autocorrect_wasm_bg.wasm",
    ],
});
```

### 5.3 构建流程

```
src/extension.ts
  + @cmtx/core, @cmtx/asset, @cmtx/rule-engine
  + ali-oss, tinyglobby, trash  (第三方依赖)
  ↓ tsdown (alwaysBundle: [/.*/])
dist/extension.cjs               ← 所有 JS 依赖已打包
dist/cmtx_fpe_wasm_bg.wasm       ← WASM 文件通过 copy 复制
dist/cmtx_autocorrect_wasm_bg.wasm
```

### 5.4 验证方式

```bash
# 1. 确认 extension.cjs 包含所有依赖
grep -c "ali-oss" dist/extension.cjs  # > 0 说明已打包

# 2. 确认 WASM 文件存在
node scripts/verify-build.mjs

# 3. 打包后确认 VSIX 内容
vsce package --no-dependencies
unzip -l *.vsix | grep -E "(extension\.cjs|wasm)"
```

### 5.5 历史方案对比

本文档第 5 节之前的"复制 node_modules"方案是早期实现，现已被 `alwaysBundle: [/.*/]` 全量打包方案取代。当前方案更简洁，不依赖 `fs-extra` 和额外的复制步骤。

## 6. 方案对比总结

| 方案                 | 维护成本 | 可靠性 | 当前状态 |
| -------------------- | -------- | ------ | -------- |
| `alwaysBundle: [/.*/]` | 低       | 高     | **已采用** |
| 复制 node_modules    | 中       | 高     | 历史方案 |
| 移到 devDependencies | 中       | 中     | 未采用   |
| patch-package        | 中       | 高     | 未采用   |

**当前方案**（`alwaysBundle: [/.*/]`）因其配置简单、无需额外脚本、无第三方依赖，成为最终选择。

### 相关补丁说明

ali-oss 包内部存在 TypeScript 类型导入错误：

```typescript
// ali-oss/lib/common/utils/encoder.ts:1
import { THeaderEncoding } from "../../types/experimental"; // 缺少 type 修饰符
```

该问题通过 `pnpm patch` 在项目根目录 `patches/ali-oss.patch` 中修复。详见 [DEV-003-ali-oss-pnpm-patch-guide.md](../../../docs/DEV-003-ali-oss-pnpm-patch-guide.md)。
