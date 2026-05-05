# VSCE 与 pnpm Workspace 集成指南

**文档编号**: DEV-005 \
**创建日期**: 2026-04-12 \
**最后更新**: 2026-04-28 \
**状态**: 已完成

---

## 1. 概述

本文档详细说明在 pnpm workspace monorepo 环境中打包和发布 VS Code 扩展的最佳实践，解决 vsce 依赖检查与 pnpm 不兼容的问题。

### 1.1. 问题背景

在 monorepo 环境中使用 `vsce package` 打包 VS Code 扩展时，会遇到以下错误：

```bash
npm error missing: tsd-check@^0.3.0, required by p-limit@2.3.0
npm error missing: xo@^0.24.0, required by p-limit@2.3.0
...
ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  cmtx-vscode@0.1.0 package: `vsce package`
Exit status 1
```

这些错误是**误报**，原因是 vsce 的依赖检查机制与 pnpm workspace 的依赖结构不兼容。

### 1.2. 解决方案

使用 `--no-dependencies` 标志跳过 vsce 的依赖检查：

```json
{
    "scripts": {
        "package": "vsce package --no-dependencies"
    }
}
```

---

## 2. 技术原理分析

### 2.1. vsce 依赖检查机制

vsce 在打包时会执行以下步骤来收集和打包依赖：

#### 步骤 1：检测包管理器

```typescript
// vsce/src/npm.ts
export async function detectYarn(cwd: string): Promise<boolean> {
    for (const name of ["yarn.lock", ".yarnrc", ".yarnrc.yaml", ".pnp.cjs", ".yarn"]) {
        if (await exists(path.join(cwd, name))) {
            return true;
        }
    }
    return false;
}
```

vsce 检测 `yarn.lock` 等文件来决定使用 yarn 还是 npm。

#### 步骤 2：执行 npm list 命令

```typescript
// vsce/src/npm.ts
function getNpmDependencies(cwd: string): Promise<string[]> {
    return checkNPM()
        .then(() =>
            exec("npm list --production --parseable --depth=99999 --loglevel=error", {
                cwd,
                maxBuffer: 5000 * 1024,
            }),
        )
        .then(({ stdout }) => stdout.split(/[\r\n]/).filter((dir) => path.isAbsolute(dir)));
}
```

vsce 执行 `npm list --production --parseable --depth=99999` 来获取所有生产依赖的绝对路径列表。

#### 步骤 3：收集依赖文件

```typescript
// vsce/src/package.ts
const files = await getDependencies(cwd, dependencies, packagedDependencies);
// files 是一个包含所有依赖目录绝对路径的数组
```

vsce 会遍历这些目录，将所有依赖文件打包进 VSIX。

### 2.2. pnpm workspace 的依赖结构

pnpm 使用**硬链接 + 符号链接**的存储机制：

```
workspace/
├── node_modules/
│   ├── .pnpm/              # 实际存储位置（内容寻址存储）
│   │   ├── lodash@4.17.21/
│   │   └── typescript@5.9.3/
│   └── lodash -> .pnpm/lodash@4.17.21/node_modules/lodash  # 符号链接
└── packages/
    └── vscode-extension/
        └── node_modules/
            ├── @cmtx/core -> ../../../../node_modules/.pnpm/...
            └── ali-oss -> ../../../../node_modules/.pnpm/...
```

**关键特点**：

- 依赖存储在 `.pnpm/` 目录的内容寻址存储中
- `node_modules/` 中是符号链接（symlinks）
- workspace 包之间通过相对路径的 symlink 连接

### 2.3. 不兼容的根本原因

#### 问题 1：npm list 无法解析 pnpm 的 symlink 结构

当 vsce 执行 `npm list --production --parseable` 时：

```bash
# npm 期望的输出（扁平结构）：
/workspace/packages/vscode-extension/node_modules/ali-oss
/workspace/node_modules/.pnpm/lodash@4.17.21/node_modules/lodash

# 实际 pnpm 的输出（符号链接）：
/workspace/packages/vscode-extension/node_modules/@cmtx/core
# ↑ 这是一个 symlink，指向 ../../../node_modules/.pnpm/...
```

npm 的 list 命令会尝试解析这些 symlink，但在 monorepo 环境中：

- workspace 依赖（如 `@cmtx/core`）指向其他包目录
- 这些包本身也有自己的 `node_modules/`
- 形成复杂的依赖图，npm 无法正确解析

#### 问题 2：依赖缺失误报

```bash
npm error missing: tsd-check@^0.3.0, required by p-limit@2.3.0
npm error missing: xo@^0.24.0, required by p-limit@2.3.0
```

这些错误是因为：

- `p-limit` 是某些依赖的**开发依赖**（devDependency）
- `tsd-check` 是 `p-limit` 的开发工具链依赖
- 在 pnpm 中，devDependencies 不会被链接到生产环境
- 但 `npm list --production` 仍然会尝试解析这些开发依赖树
- 发现缺失时报错

#### 问题 3：vsce 的依赖收集逻辑

vsce 的 `getDependencies()` 函数返回的是**依赖的物理路径列表**：

```typescript
// vsce/src/npm.ts
export async function getDependencies(
  cwd: string,
  dependencies: 'npm' | 'yarn' | 'none' | undefined,
  packagedDependencies?: string[]
): Promise<string[]> {
  if (dependencies === 'none') {
    return [cwd];  // 只打包当前目录
  } else if (dependencies === 'yarn' || ...) {
    return await getYarnDependencies(cwd, packagedDependencies);
  } else {
    return await getNpmDependencies(cwd);  // ← 这里会失败
  }
}
```

在 pnpm workspace 中：

- `getNpmDependencies()` 返回的路径包含大量 symlink
- vsce 尝试遍历这些路径时遇到符号链接循环或权限问题
- 导致打包失败或打包了错误的文件

### 2.4. `--no-dependencies` 标志的作用

```typescript
// vsce/src/package.ts
if (dependencies === "none") {
    return [cwd]; // 只打包当前目录，不检查依赖
}
```

当使用 `--no-dependencies` 时：

- vsce **跳过** `getNpmDependencies()` 调用
- **直接返回** `[cwd]`（当前扩展目录）
- 只打包扩展目录中的文件（根据 `.vscodeignore` 过滤）
- **不尝试收集**任何 `node_modules/` 中的依赖

---

## 3. 为什么 `--no-dependencies` 是安全的？

### 3.1. 构建流程分析

在 monorepo 环境中，扩展代码已经通过 tsdown 打包：

```
src/extension.ts
  + @cmtx/core
  + @cmtx/asset
  + @cmtx/storage
  + ali-oss (依赖)
  ↓ tsdown (bundle: true)
dist/extension.cjs  ← 所有依赖已打包进单个文件
```

### 3.2. tsdown 配置

tsdown 使用 `alwaysBundle: [/.*/]` 将所有依赖打包进单个文件，并通过 `copy` 配置复制 WASM 文件：

```typescript
// tsdown.config.ts
import { defineConfig } from "tsdown";

export default defineConfig({
    entry: {
        extension: "src/extension.ts",
    },
    format: ["cjs"],
    clean: true,
    platform: "node",
    target: "node22",
    shims: false,
    sourcemap: true,
    deps: {
        onlyBundle: false,
        neverBundle: ["vscode", "node:*"],
        alwaysBundle: [/.*/],
    },
    copy: [
        "../fpe-wasm/pkg/cmtx_fpe_wasm_bg.wasm",
        "../autocorrect-wasm/pkg/cmtx_autocorrect_wasm_bg.wasm",
    ],
});
```

### 3.3. 验证依赖打包

**验证 `ali-oss` 是否被打包**：

```bash
# 1. 构建后检查 dist/extension.js
grep -c "ali-oss" dist/extension.js
# 输出 > 0 说明已打包

# 2. 打包后检查 VSIX 内容
unzip -l cmtx-vscode-0.1.0.vsix | grep extension.js
# 应该显示 extension.js 的大小（包含所有依赖）

# 3. 解压后反编译验证（可选）
unzip cmtx-vscode-0.1.0.vsix -d temp/
cat temp/extension/dist/extension.js | grep "ali-oss"
```

### 3.4. WASM 文件打包验证

WASM 文件通过 tsdown 的 `copy` 配置自动复制到 `dist/` 目录：

```bash
# 构建脚本会自动复制 WASM 文件
pnpm run build
# 执行: tsdown（其中 copy 配置自动复制 WASM 文件到 dist/）
```

**验证 WASM 文件**：

```bash
# 检查 dist/ 目录
ls -la dist/cmtx_fpe_wasm_bg.wasm
ls -la dist/cmtx_autocorrect_wasm_bg.wasm

# 运行构建校验脚本
node scripts/verify-build.mjs

# 检查 VSIX 内容
unzip -l cmtx-vscode-0.1.0.vsix | grep wasm
```

---

## 4. 配置指南

### 4.1. package.json 配置

```json
{
    "name": "cmtx-vscode",
    "version": "0.1.0",
    "publisher": "cc01cc",
    "scripts": {
        "build": "tsdown",
        "package": "pnpm run build && node scripts/package.mjs",
        "package:stable": "pnpm run build && node scripts/package.mjs stable",
        "package:pre-release": "pnpm run build && node scripts/package.mjs prerelease",
        "publish:pre-release": "vsce publish --pre-release",
        "publish:stable": "vsce publish"
    },
    "dependencies": {
        "@cmtx/asset": "workspace:*",
        "@cmtx/core": "workspace:*",
        "@cmtx/rule-engine": "workspace:*",
        "@cmtx/storage": "workspace:*",
        "ali-oss": "catalog:"
    }
}
```

### 4.2. .vscodeignore 配置

当前 `.vscodeignore` 配置已排除 `docs/`（开发文档不进入 VSIX），参见实际文件：

```
# 排除测试和源码
src/**
test/**
tests/**
**/.vscode-test/**

# 排除文档
**/docs/**

# 排除配置文件
scripts/**
patches/**
*.json
pnpm-lock.yaml

# 排除类型定义
**/*.d.ts
**/*.d.cts
**/*.d.mts
```

### 4.3. pnpm workspace 配置

```yaml
# pnpm-workspace.yaml
packages:
    - "packages/*"
    - "private-workspace"
```

---

## 5. 常见问题解答

### 5.1. proxy-agent 是 VS Code 提供的依赖吗？

**不是**。`proxy-agent` 是一个独立的 npm 包，用于处理 HTTP/HTTPS 代理连接。

**为什么在 esbuild 配置中标记为 external？**

1. vsce 工具本身依赖 `proxy-agent` 来处理网络请求（如发布扩展、获取版本信息等）
2. VS Code 扩展主机环境已经包含了这些底层网络模块
3. 避免重复打包，减少包体积

**结论**：`proxy-agent` 不是 VS Code 提供的，而是在以下场景中被使用：

- vsce 工具本身的依赖（用于发布扩展）
- 扩展运行时的网络代理处理（由 VS Code 扩展主机环境提供）

### 5.2. 使用 `--no-dependencies` 时，peerDependencies 能否被打包？

**可以**。peerDependencies 会被 esbuild 正常打包。

**原因**：

1. esbuild 的 `bundle: true` 会将所有非 `external` 的依赖打包进 `extension.js`
2. peerDependencies 只是 npm 的依赖解析提示，不影响打包
3. 只有在运行时，peerDependencies 才需要由宿主环境提供

**验证方法**：

```bash
grep -c "ali-oss" dist/extension.js  # 应该 > 0
```

### 5.3. 是否需要添加 yarn 构建方式？

**不推荐**。

| 方案                         | 优点                                                                                                  | 缺点              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------- |
| **使用 `--no-dependencies`** | ✅ 简单，无需额外配置<br>✅ 与现有 pnpm 工作流兼容<br>✅ 打包速度快<br>✅ 社区最佳实践                | ⚠️ 需要理解原理   |
| **添加 yarn 构建**           | ❌ 增加维护成本<br>❌ 需要维护两套锁文件<br>❌ pnpm 和 yarn 依赖解析可能不一致<br>❌ CI/CD 复杂度翻倍 | ❌ 不解决根本问题 |

**为什么 `--no-dependencies` 是最佳实践？**

1. **monorepo 标准做法**：所有现代 monorepo 工具（pnpm, turborepo, nx）都推荐这种方式
2. **vsce 官方支持**：`--no-dependencies` 是 vsce 官方标志，专门用于处理 monorepo 场景
3. **业界案例**：ESLint 扩展、Prettier 扩展、GitHub Copilot 均使用此方式

---

## 6. 命令参考

### 6.1. 构建和打包

```bash
# 使用 pnpm filter（推荐）
pnpm -F cmtx-vscode build
pnpm -F cmtx-vscode package

# 使用目录 filter（备选）
pnpm --dir packages/vscode-extension build
pnpm --dir packages/vscode-extension package

# 一步打包（构建 + 打包）
pnpm -F cmtx-vscode build && pnpm -F cmtx-vscode package
```

### 6.2. 验证打包结果

```bash
# 检查 VSIX 文件
ls -lh cmtx-vscode-*.vsix

# 查看 VSIX 内容
unzip -l cmtx-vscode-0.1.0.vsix

# 验证 WASM 文件
unzip -l cmtx-vscode-0.1.0.vsix | grep wasm

# 验证 extension.js 大小（应该包含所有依赖）
unzip -l cmtx-vscode-0.1.0.vsix | grep extension.js
```

### 6.3. 安装和测试

```bash
# 从 VSIX 安装
code --install-extension cmtx-vscode-0.1.0.vsix

# 卸载
code --uninstall-extension cc01cc.cmtx-vscode
```

---

## 7. 参考资料

- [vsce 官方文档](https://github.com/microsoft/vscode-vsce/blob/main/README.md)
- [vsce 源代码 - npm.ts](https://github.com/microsoft/vscode-vsce/blob/main/src/npm.ts)
- [vsce 源代码 - package.ts](https://github.com/microsoft/vscode-vsce/blob/main/src/package.ts)
- [pnpm workspace 文档](https://pnpm.io/workspaces)
- [esbuild 打包配置](https://esbuild.github.io/api/#bundle)

---

## 8. 变更历史

| 日期       | 版本  | 变更内容 | 作者      |
| ---------- | ----- | -------- | --------- |
| 2026-04-12 | 1.0.0 | 初始版本 | CMTX Team |
