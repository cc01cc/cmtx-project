---
title: DEV-002 - ESM/CJS/WASM 打包指南
category: dev-guide
sidebar_order: 2
lang: zh-Hans
---

# DEV-002: ESM/CJS/WASM 打包指南

## 1. ESM 与 CJS 核心区别

### 1.1. 基本对比

| 特性         | CommonJS (CJS)                                 | ES Modules (ESM)                               |
| ------------ | ---------------------------------------------- | ---------------------------------------------- |
| 导入语法     | `require()`                                    | `import`                                       |
| 导出语法     | `module.exports`                               | `export`                                       |
| 文件标识     | `.cjs` 或 `package.json` 无 `"type": "module"` | `.mjs` 或 `package.json` 有 `"type": "module"` |
| 模块变量     | `__dirname`, `__filename`, `require`, `module` | `import.meta`, `import.meta.url`               |
| 加载方式     | 同步                                           | 异步                                           |
| Node.js 版本 | 所有版本                                       | v12.2+ (v14.13+ 稳定)                          |

### 1.2. Node.js 22 中的重要变化

| 特性                    | 状态   | 说明                                        |
| ----------------------- | ------ | ------------------------------------------- |
| `import.meta.dirname`   | Stable | Node.js 20.11+ 支持，获取当前文件所在目录   |
| `import.meta.filename`  | Stable | Node.js 20.11+ 支持，获取当前文件完整路径   |
| `require()` 在 ESM 中   | Stable | Node.js 22 稳定支持，通过 `createRequire()` |
| `import.meta.resolve()` | Stable | 解析模块路径                                |

---

## 2. 模块路径获取方式对比

### 2.1. CJS 中的路径获取

```javascript
// CJS 原生支持
console.log(__dirname); // 当前文件所在目录
console.log(__filename); // 当前文件完整路径
```

### 2.2. ESM 中的路径获取

```javascript
// 方式 1：使用 import.meta.url（所有 Node.js ESM 版本）
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 方式 2：使用 import.meta.dirname（Node.js 20.11+）
import { dirname } from "node:path";
const __dirname = import.meta.dirname; // 直接获取目录
```

### 2.3. 迁移方向对比

| 方向          | 难度   | 说明                                                                          |
| ------------- | ------ | ----------------------------------------------------------------------------- |
| **CJS → ESM** | 低到中 | 用 `import.meta.dirname` 或 `fileURLToPath(import.meta.url)` 替代 `__dirname` |
| **ESM → CJS** | 中到高 | `import.meta` 在 CJS 不可用，需要构建时转换                                   |

### 2.4. 关键结论

> **把 CJS 的 `__dirname` 迁移到 ESM 通常更容易；反向把 ESM 的 `import.meta` 在纯 CJS 里原生可用则不可行，需要构建时转换或把模块改为 ESM。**

---

## 3. tsdown Shims 机制

### 3.1. 什么是 Shims

Shims 是构建工具自动注入的兼容代码，让源码在不同输出格式（CJS/ESM）中都能正确运行。

### 3.2. tsdown `shims: true` 的行为

| 输出格式 | 自动注入的 shim                                                  |
| -------- | ---------------------------------------------------------------- |
| **CJS**  | `import.meta.url`、`import.meta.dirname`、`import.meta.filename` |
| **ESM**  | `__dirname`、`__filename`                                        |

### 3.3. 使用示例

**源码（统一使用 `__dirname`）：**

```typescript
import { join } from "node:path";

function locateWasmFile(): string | null {
    try {
        // shims: true 时，__dirname 在 ESM 和 CJS 中都可用
        // - CJS: 原生 __dirname
        // - ESM: tsdown 自动注入 shim
        return join(__dirname, "../pkg/cmtx_fpe_wasm_bg.wasm");
    } catch {
        return null;
    }
}
```

**tsdown 配置：**

```typescript
import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"], // 双格式输出
    shims: true, // 启用 shims
    platform: "node",
    target: "node22",
});
```

### 3.4. Shims 注意事项

1. **不要手动检测 `import.meta`**：如 `typeof import.meta !== "undefined"`，这会导致构建警告
2. **优先使用 `__dirname`**：因为 CJS 原生支持，ESM 有 shim
3. **shims 会自动 tree-shake**：未使用的 shim 不会增加体积

---

## 4. TypeScript 配置标准化

### 4.1. tsdown 取代 tsc 作为生产构建工具

CMTX 项目中，`tsdown` 已取代 `tsc` 作为生产构建工具。`tsdown` 基于 Rolldown（Rust 实现的打包器），提供更快的构建速度和更完整的打包能力（shims、copy、dts 生成等）。

### 4.2. tsconfig.json 的定位

`tsconfig.json` 在 CMTX 项目中**仅用于类型检查**（`tsc --noEmit`），不参与生产构建。生产构建完全由 `tsdown.config.ts` 控制。

| 用途 | 工具 | 配置文件 |
| --- | --- | --- |
| 类型检查 | `tsc --noEmit` | `tsconfig.json` |
| 生产构建 | `tsdown` | `tsdown.config.ts` |

### 4.3. 关键约束

- `tsconfig.json` 中的 `module`/`moduleResolution` 设置仍需与 ESM/CJS 输出格式保持一致（使用 `NodeNext`）
- `tsdown.config.ts` 中的 `format`、`shims`、`platform`、`target` 等选项决定最终输出
- 不要通过 `tsconfig.json` 的 `outDir`/`declaration` 来控制构建输出，这些由 tsdown 管理

---

## 5. WASM 处理方式

### 5.1. tsdown 中的 WASM 支持

tsdown 本身不内建 WASM 处理，可通过以下两种方式：

1. **copy + 运行时加载**（CMTX 当前采用的方案）：通过 `copy` 配置将 WASM 文件复制到 `dist/`，运行时使用 `readFileSync` 加载
2. **rolldown-plugin-wasm**（CMTX 曾尝试，已弃用）：自动内联或复制 WASM，但不支持自定义输出路径

### 5.2. 两种 WASM 处理方式对比

| 方式 | 优点 | 缺点 | 适用场景 |
| --- | --- | --- | --- |
| **copy + 运行时加载** | 灵活、路径完全可控 | 需手动处理路径 | 所有场景（推荐） |
| **rolldown-plugin-wasm** | 自动处理路径、支持内联 | 不支持自定义输出路径 | 简单场景，无路径定制需求 |

### 5.3. 推荐方案：copy + 运行时加载

**配置示例：**

```typescript
import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    shims: true,
    copy: ["pkg/cmtx_fpe_wasm_bg.wasm"],
});
```

**源码中加载：**

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";

function locateWasmFile(): string | null {
    try {
        return join(__dirname, "../pkg/cmtx_fpe_wasm_bg.wasm");
    } catch {
        return null;
    }
}

export async function loadWASM(): Promise<void> {
    const wasmPath = locateWasmFile();
    if (wasmPath) {
        const wasmBuffer = readFileSync(wasmPath);
        await init({ module_or_path: wasmBuffer });
    }
}
```

### 5.4. WASM 处理决策

| 场景 | 推荐方式 | 原因 |
| --- | --- | --- |
| VS Code 扩展（CJS 单输出） | `copy + 手动加载` | 路径完全可控，避免插件路径解析缺陷 |
| 双格式库（CJS + ESM） | `copy + 运行时加载` | 保持 WASM 文件独立，灵活加载 |
| 浏览器应用 | `copy + 运行时加载` | 使用 `fetch()` 加载 WASM 文件 |

### 5.5. CMTX WASM 架构

CMTX 项目包含两个 WASM 包，均使用 Rust + wasm-pack 构建：

| 包名 | 功能 | 构建工具 | 输出 |
| --- | --- | --- | --- |
| `@cmtx/fpe-wasm` | FF1 格式保留加密 | Rust + wasm-pack | `pkg/cmtx_fpe_wasm_bg.wasm` (~58KB) |
| `@cmtx/autocorrect-wasm` | Autocorrect 拼写检查 | Rust + wasm-pack | `pkg/autocorrect_wasm_bg.wasm` (~2.5MB) |

**tsdown `copy` 配置**：两个包均通过 tsdown 的 `copy` 选项将 WASM 文件复制到 `dist/` 目录：

```typescript
// fpe-wasm/tsdown.config.ts
export default defineConfig({
    copy: ["pkg/cmtx_fpe_wasm_bg.wasm"],
});

// autocorrect-wasm/tsdown.config.ts
export default defineConfig({
    copy: ["pkg/autocorrect_wasm_bg.wasm"],
});
```

**VS Code 扩展特殊处理**：VS Code 扩展不能依赖 WASM 包的自动加载（bundled 代码中 `__dirname` 指向错误路径），必须在 `extension.ts` 中手动检测生产/开发模式路径并加载 WASM 文件（详见第 7.3 节）。

---

## 6. 常见警告与解决方案

### 6.1. EMPTY_IMPORT_META 警告

**警告信息：**

```
Warning: `import.meta` may not be a valid syntax with the `cjs` output format.
This `import.meta` will be replaced with an empty object (`{}`) automatically.
```

**原因：** 源码中直接使用了 `import.meta` 语法，当输出 CJS 时，tsdown 会发出警告。

**错误做法：**

```typescript
// 不要这样写
if (typeof import.meta !== "undefined" && import.meta.url) {
    // ...
}
```

**正确做法：**

```typescript
// 使用 __dirname（tsdown shims 会自动处理）
import { join } from "node:path";

function locateFile(): string | null {
    return join(__dirname, "../path/to/file");
}
```

**配置：**

```typescript
export default defineConfig({
    shims: true, // 启用 shims
});
```

### 6.2. INEFFECTIVE_DYNAMIC_IMPORT 警告

**警告信息：**

```
Warning: X is dynamically imported by Y but also statically imported by Z,
dynamic import will not move module into another chunk.
```

**原因：** 同一个模块同时被静态和动态导入，导致动态导入无法将模块分离到独立 chunk。

**错误做法：**

```typescript
// index.ts - 静态导出
export { builtInRules } from "./rules/built-in/index.js";

// engine.ts - 动态导入
import("./built-in/index.js").then(({ builtInRules }) => {
    // ...
});
```

**正确做法：**

```typescript
// rules/index.ts - 提供异步加载函数
export async function loadBuiltInRules() {
    const { builtInRules } = await import("./built-in/index.js");
    return builtInRules;
}

// engine.ts - 使用异步加载
export async function createDefaultRuleEngine() {
    const engine = createRuleEngine();
    const builtInRules = await loadBuiltInRules();
    engine.registerMany(builtInRules);
    return engine;
}
```

### 6.3. MISSING_EXPORT 警告

**警告信息：**

```
Warning: "builtInRules" is not exported by "src/rules/index.ts".
```

**原因：** 尝试导入一个未导出的成员。

**解决方案：** 确保所有导入的成员都已正确导出，或改为使用异步加载函数。

---

## 7. 项目配置示例

### 7.1. fpe-wasm 包（双格式输出库）

**package.json：**

```json
{
    "name": "@cmtx/fpe-wasm",
    "type": "module",
    "main": "./dist/index.cjs",
    "module": "./dist/index.mjs",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.mjs",
            "require": "./dist/index.cjs"
        }
    },
    "files": ["dist", "README.md", "CHANGELOG.md"]
}
```

**tsdown.config.ts：**

```typescript
import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    platform: "node",
    target: "node22",
    shims: true, // 启用 shims 支持 __dirname
    copy: ["pkg/cmtx_fpe_wasm_bg.wasm"], // 复制 WASM 文件到 dist/pkg/
});
```

**源码（src/index.ts）：**

```typescript
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function locateWasmFile(): string | null {
    try {
        // shims: true 时，__dirname 在 ESM 和 CJS 中都可用
        const wasmPath = join(__dirname, "../pkg/cmtx_fpe_wasm_bg.wasm");
        if (existsSync(wasmPath)) {
            return wasmPath;
        }
        return null;
    } catch {
        return null;
    }
}
```

**输出结构：**

```
packages/fpe-wasm/
├── pkg/                          # wasm-pack 输出
│   ├── cmtx_fpe_wasm.js
│   ├── cmtx_fpe_wasm_bg.wasm
│   └── cmtx_fpe_wasm.d.ts
├── dist/                         # tsdown 输出
│   ├── index.mjs
│   ├── index.cjs
│   ├── index.d.ts
│   └── pkg/                      # 复制的 WASM
│       └── cmtx_fpe_wasm_bg.wasm
```

### 7.2. rule-engine 包（双格式输出库）

**tsdown.config.ts：**

```typescript
import { defineConfig } from "tsdown";

export default defineConfig({
    entry: {
        index: "src/index.ts",
        node: "src/node/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    platform: "node",
    target: "node22",
    shims: true,
});
```

**异步加载模式（避免 INEFFECTIVE_DYNAMIC_IMPORT）：**

```typescript
// rules/index.ts
export async function loadBuiltInRules() {
    const { builtInRules } = await import("./built-in/index.js");
    return builtInRules;
}

// 不静态导出 builtInRules
```

### 7.3. VS Code 扩展（CJS 单输出）

**tsdown.config.ts：**

```typescript
import { defineConfig } from "tsdown";
import { wasm } from "rolldown-plugin-wasm";

export default defineConfig({
    entry: {
        extension: "src/extension.ts",
    },
    plugins: [
        wasm({
            targetEnv: "node",
        }),
    ],
    format: ["cjs"],
    clean: true,
    platform: "node",
    target: "node22",
    shims: false, // VS Code 扩展不使用 shims，手动处理路径
    sourcemap: true,
    fixedExtension: false,
    deps: {
        neverBundle: ["vscode"],
        alwaysBundle: [/^@cmtx\//],
    },
});
```

**WASM 加载（extension.ts）：**

```typescript
import * as fs from "node:fs";
import * as path from "node:path";
import { loadWASM } from "@cmtx/fpe-wasm";

async function loadWasmExtension(context: vscode.ExtensionContext): Promise<void> {
    // 生产模式路径（打包后）
    const productionPath = path.join(
        context.extensionPath,
        "dist/node_modules/@cmtx/fpe-wasm/cmtx_fpe_wasm_bg.wasm",
    );

    // 开发模式路径（F5 调试）
    // context.extensionPath = /workspace/packages/vscode-extension
    // WASM 文件位于 /workspace/packages/fpe-wasm/pkg/
    const developmentPath = path.join(
        context.extensionPath,
        "../fpe-wasm/pkg/cmtx_fpe_wasm_bg.wasm",
    );

    // 选择存在的路径
    const wasmPath = fs.existsSync(productionPath)
        ? productionPath
        : fs.existsSync(developmentPath)
          ? developmentPath
          : null;

    if (wasmPath) {
        const wasmBuffer = fs.readFileSync(wasmPath);
        await loadWASM({ data: wasmBuffer });
    } else {
        console.error("WASM file not found");
    }
}
```

#### 7.3.1. 7.3.1 VS Code 扩展 WASM 路径详解

**问题背景：**

VS Code 扩展在开发模式（F5 调试）和生产模式（vsce package）下，`context.extensionPath` 指向不同的目录，导致 WASM 文件路径需要分别处理。

**路径差异：**

| 模式                 | `context.extensionPath`                | WASM 文件位置                       | 相对路径                            |
| -------------------- | -------------------------------------- | ----------------------------------- | ----------------------------------- |
| **开发模式（F5）**   | `/workspace/packages/vscode-extension` | `/workspace/packages/fpe-wasm/pkg/` | `../fpe-wasm/pkg/`                  |
| **生产模式（vsce）** | `/path/to/installed/extension`         | `dist/node_modules/@cmtx/fpe-wasm/` | `dist/node_modules/@cmtx/fpe-wasm/` |

**关键代码解析：**

```typescript
// 开发模式：从 vscode-extension 目录向上一级到 packages/，再进入 fpe-wasm/pkg/
const developmentPath = path.join(
    context.extensionPath, // /workspace/packages/vscode-extension
    "../fpe-wasm/pkg/cmtx_fpe_wasm_bg.wasm",
);
// 结果：/workspace/packages/fpe-wasm/pkg/cmtx_fpe_wasm_bg.wasm

// 生产模式：WASM 文件被打包到 dist/node_modules/@cmtx/fpe-wasm/
const productionPath = path.join(
    context.extensionPath, // /path/to/installed/extension
    "dist/node_modules/@cmtx/fpe-wasm/cmtx_fpe_wasm_bg.wasm",
);
```

**为什么使用 `../fpe-wasm/pkg/`？**

1. `rolldown-plugin-wasm` 不支持自定义输出路径配置
2. 开发模式下，WASM 文件不会被复制到 `vscode-extension/dist/` 目录
3. 需要通过相对路径从 `vscode-extension/` 导航到 `fpe-wasm/pkg/`
4. `path.join()` 会自动规范化 `..` 路径

**`fpe-wasm` 包的 `locateWasmFile()` 在 bundled 代码中的行为：**

在 VS Code 扩展的 bundled 代码中，`fpe-wasm` 包的 `locateWasmFile()` 函数使用 `__dirname + "../pkg/"` 来定位 WASM 文件。但是：

- `__dirname` 通过 `getDirname$1()` 获取，指向 bundled 文件所在目录（`vscode-extension/dist/`）
- `__dirname + "../pkg/"` 会解析到 `vscode-extension/pkg/`（错误）
- 实际 WASM 文件在 `packages/fpe-wasm/pkg/`

**因此，VS Code 扩展必须在 `extension.ts` 中手动加载 WASM，不能依赖 `fpe-wasm` 包的自动加载。**

**使用异步加载：**

```typescript
import { loadBuiltInRules, createRuleEngine } from "@cmtx/rule-engine";

export async function applyPreset(): Promise<void> {
    const engine = createRuleEngine();
    const builtInRules = await loadBuiltInRules();
    engine.registerMany(builtInRules);
    // ...
}
```

---

## 8. WASM 体积与 VSIX 打包影响

| 考虑因素 | 说明 |
| --- | --- |
| VSIX 包体积 | WASM 文件（fpe-wasm ~58KB + autocorrect-wasm ~2.5MB）会被打包进 VSIX |
| 加载时间 | 大型 WASM 文件加载时间会增加，建议保持懒加载模式 |
| 内存占用 | WASM 加载后会占用内存，需注意 Extension Host 的内存限制 |

---

## 9. 决策流程图

### 9.1. 选择模块路径获取方式

```
你的项目需要输出什么格式？
├── 只输出 CJS
│   └── 使用 __dirname（原生支持）
├── 只输出 ESM（Node ≥ 20.11）
│   └── 使用 import.meta.dirname
├── 只输出 ESM（Node < 20.11）
│   └── 使用 fileURLToPath(import.meta.url)
└── 输出 CJS + ESM（双格式）
    └── 使用 __dirname + tsdown shims: true
```

### 9.2. 选择 WASM 处理方式

```
你的项目类型？
├── VS Code 扩展（CJS 单输出）
│   └── copy + 手动加载（详见第 7.3 节 VS Code 扩展）
├── 双格式库（CJS + ESM）
│   └── copy + 运行时加载（__dirname + shims: true）
└── 浏览器应用
    └── copy + fetch 运行时加载
```

### 9.3. 解决构建警告

```
遇到的警告？
├── EMPTY_IMPORT_META
│   └── 改为使用 __dirname + shims: true
├── INEFFECTIVE_DYNAMIC_IMPORT
│   └── 改为使用异步加载函数（loadXxx）
└── MISSING_EXPORT
    └── 检查导入的成员是否已正确导出
```

---

## 10. 最佳实践总结

### 10.1. 模块路径

1. **双格式输出**：源码使用 `__dirname` + `shims: true`
2. **纯 ESM**：使用 `import.meta.dirname`（Node ≥ 20.11）
3. **纯 CJS**：使用 `__dirname`

### 10.2. WASM 处理

1. **扩展项目**：使用 `copy + 手动加载`，参见第 7.3 节 VS Code 扩展
2. **库项目**：使用 `copy + 运行时加载`

### 10.3. 动态导入

1. **避免同时静态和动态导入同一模块**
2. **使用异步加载函数**（如 `loadBuiltInRules()`）
3. **在异步函数中使用 `await` 加载**

### 10.4. 构建配置

1. **始终设置 `platform: "node"`**（Node.js 项目）
2. **始终设置 `target: "node22"`**（或你的目标版本）
3. **双格式输出时启用 `shims: true`**

---

## 11. 参考资源

- [tsdown 官方文档](https://tsdown.dev/)
- [tsdown Shims 文档](https://tsdown.dev/options/shims)
- [tsdown WASM 支持](https://tsdown.dev/recipes/wasm-support)
- [Node.js ESM 文档](https://nodejs.org/api/esm.html)
- [Node.js module 文档](https://nodejs.org/api/module.html)
