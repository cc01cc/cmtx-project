# CMTX WASM 处理方案

## 概述

CMTX 项目使用 WebAssembly (WASM) 提供加密（FF1 格式保留加密）和文本自动纠正功能。本文档描述了当前的 WASM 架构、打包策略以及 VS Code 扩展中的特殊处理。

---

## 1. WASM 包概览

| 包 | 用途 | WASM 文件 | 典型体积 |
| --- | --- | --- | --- |
| `@cmtx/fpe-wasm` | FF1 格式保留加密 | `cmtx_fpe_wasm_bg.wasm` | ~58 KB |
| `@cmtx/autocorrect-wasm` | 文本自动纠正 | `cmtx_autocorrect_wasm_bg.wasm` | ~2.5 MB |

### 1.1. 库包模式（fpe-wasm、autocorrect-wasm）

两个 WASM 库包采用完全相同的构建模式：

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
    shims: true,
    copy: ["pkg/cmtx_fpe_wasm_bg.wasm"],
});
```

**源码中自动加载 WASM（`src/index.ts`）：**
```typescript
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import init from "../pkg/cmtx_fpe_wasm.js";

function locateWasmFile(): string | null {
    try {
        const wasmPath = join(__dirname, "../pkg/cmtx_fpe_wasm_bg.wasm");
        if (existsSync(wasmPath)) return wasmPath;
        return null;
    } catch {
        return null;
    }
}

export async function loadWASM(options?: { data?: InitInput }): Promise<void> {
    if (options?.data) {
        // 手动传入 Buffer（VS Code Extension 场景）
        wasmOutput = await init({ module_or_path: options.data });
    } else {
        // 自动从 ../pkg/ 加载（库使用场景）
        const wasmPath = locateWasmFile();
        if (wasmPath) {
            const wasmBuffer = readFileSync(wasmPath);
            wasmOutput = await init({ module_or_path: wasmBuffer });
        }
    }
}
```

**配置要点：**
- `shims: true` — 为 ESM 注入 `__dirname`，使得源码可以使用 `__dirname` 统一处理路径
- `copy: ["pkg/*.wasm"]` — tsdown 将 WASM 文件复制到 `dist/` 目录
- `format: ["esm", "cjs"]` — 双格式输出

### 1.2. VS Code 扩展模式

VS Code 扩展不使用 `rolldown-plugin-wasm`，通过 tsdown `copy` 直接从源包复制 WASM 到扩展的 `dist/`，再由 `extension.ts` 手动加载。

**tsdown.config.ts：**
```typescript
import { defineConfig } from "tsdown";

export default defineConfig({
    entry: { extension: "src/extension.ts" },
    format: ["cjs"],
    clean: true,
    platform: "node",
    target: "node22",
    shims: false,
    sourcemap: true,
    fixedExtension: false,
    deps: {
        neverBundle: ["vscode", "node:*"],
        alwaysBundle: [/.*/],
    },
    copy: [
        "../fpe-wasm/pkg/cmtx_fpe_wasm_bg.wasm",
        "../autocorrect-wasm/pkg/cmtx_autocorrect_wasm_bg.wasm",
    ],
    outputOptions: {
        manualChunks: () => "extension",
    },
});
```

**运行时加载（`src/extension.ts`）：**
```typescript
async function loadWasmExtension(context: vscode.ExtensionContext): Promise<void> {
    // 生产模式（vsce package）：WASM 复制到 dist/
    const productionPath = path.join(context.extensionPath, "dist/cmtx_fpe_wasm_bg.wasm");

    // 开发模式（F5 调试）：直接从 fpe-wasm/pkg/ 读取
    const developmentPath = path.join(
        context.extensionPath,
        "../fpe-wasm/pkg/cmtx_fpe_wasm_bg.wasm",
    );

    const wasmPath = fs.existsSync(productionPath)
        ? productionPath
        : fs.existsSync(developmentPath)
          ? developmentPath
          : null;

    if (wasmPath) {
        const wasmBuffer = fs.readFileSync(wasmPath);
        await loadWASM({ data: wasmBuffer });
    }
}
```

**路径策略：**

| 模式 | `context.extensionPath` | WASM 来源 |
| --- | --- | --- |
| **F5 调试** | `/workspace/packages/vscode-extension` | `../fpe-wasm/pkg/cmtx_fpe_wasm_bg.wasm` |
| **vsce package** | `/path/to/installed/extension` | `dist/cmtx_fpe_wasm_bg.wasm`（tsdown copy） |

### 1.3. VSIX 打包

`scripts/package.mjs` 使用 `vsce package --no-dependencies`，所有依赖和 WASM 文件已通过 tsdown 打包完成。

---

## 2. ESM/CJS 兼容

### 2.1. tsdown shims 机制

| 输出格式 | shim 行为 |
| --- | --- |
| CJS | `import.meta.url`、`import.meta.dirname` 被注入 |
| ESM | `__dirname`、`__filename` 被注入 |

源码应统一使用 `__dirname`，启用 `shims: true` 即可双格式兼容。

### 2.2. 常见警告及处理

| 警告 | 原因 | 处理 |
| --- | --- | --- |
| `EMPTY_IMPORT_META` | 源码直接使用 `import.meta` | 改用 `__dirname` + `shims: true` |
| `INEFFECTIVE_DYNAMIC_IMPORT` | 同一模块同时被静态和动态导入 | 封装为异步加载函数 |
| `MISSING_EXPORT` | 导入未导出的成员 | 检查导出声明 |

---

## 3. 方案演进

| 阶段 | 方案 | 问题 |
| --- | --- | --- |
| 初始 | `rolldown-plugin-wasm` 插件自动处理 | 不支持自定义输出路径，bundled 代码中 `__dirname` 解析错误 |
| 中期 | 独立 `copy-wasm.mjs` 脚本 | 维护成本高，与 tsdown 构建流程耦合 |
| 当前 | `tsdown copy` 配置 + 手动加载 | 路径完全可控，构建流程简洁 |

---

## 4. 参考：rolldown-plugin-wasm 源码架构

> CMTX 项目**当前未使用** `rolldown-plugin-wasm`。以下内容来自对 `sxzz/rolldown-plugin-wasm` 仓库的分析，其源码设计可作为 WASM 插件实现的参考。

### 4.1. 文件结构

```
reference/sxzz/rolldown-plugin-wasm/
├── src/
│   ├── index.ts         # 插件主逻辑（load、transform、generateBundle 钩子）
│   ├── helper.ts        # 运行时加载代码生成（Node.js / 浏览器）
│   ├── options.ts       # 配置选项定义
│   └── wasm-parser.ts   # WASM 模块解析（提取 imports）
├── package.json
├── tsconfig.json
└── README.md
```

### 4.2. 核心钩子逻辑

```
load:             匹配 ?url 查询参数，读取 WASM 文件
                  根据 maxFileSize 决定内联或复制
                  - 内联：base64 编码嵌入 bundle
                  - 复制：emitFile 到输出目录

generateBundle:   发射 WASM 文件作为资源
```

### 4.3. Node.js 环境加载代码

```typescript
const { readFile } = process.getBuiltinModule('fs/promises')
const path = process.getBuiltinModule('path')

return readFile(path.resolve(import.meta.dirname, filepath)).then(
  (buffer) => instantiate(buffer, imports)
)
```

### 4.4. 关键限制

- **不支持自定义输出路径**：WASM 文件总是复制到构建输出目录
- **文件大小阈值**：默认 14KB 以下内联，以上复制为独立文件

---

## 5. 参考资料

- [tsdown WASM 支持](https://tsdown.dev/recipes/wasm-support)
- [tsdown Shims 文档](https://tsdown.dev/options/shims)
- [VSCE (VS Code Extension CLI)](https://github.com/microsoft/vscode-vsce)
- `packages/fpe-wasm/tsdown.config.ts`
- `packages/autocorrect-wasm/tsdown.config.ts`
- `packages/vscode-extension/tsdown.config.ts`
- `packages/vscode-extension/src/extension.ts`（`loadWasmExtension`）
