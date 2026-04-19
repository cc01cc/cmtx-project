# ADR-009: 双模块格式策略 - ESM + CJS 兼容方案

**状态**：Proposed

**版本**：1.0

**日期**：2026-04-12

**相关 ADR**：ADR-001（包结构）, ADR-007（实施路线图）

---

## 背景

CMTX 项目是一个基于 pnpm workspace 的 monorepo，包含多个 npm 包：
- `@cmtx/core` - 核心 Markdown 处理库
- `@cmtx/asset` - 资产管理（上传、转移）
- `@cmtx/publish` - 发布工具
- `@cmtx/storage` - 存储适配器
- `@cmtx/template` - 模板引擎
- `cmtx-vscode` - VS Code 扩展

### 问题触发

在打包 VS Code 扩展时遇到错误：

```
Error: Cannot find module 'trash'
Require stack:
- extension/dist/extension.js
```

**根本原因**：
1. `@cmtx/core` 使用 `module: "NodeNext"` 编译，输出 ESM 格式
2. `@cmtx/core` 直接依赖 `trash`（CJS 模块）
3. esbuild 打包时将 ESM 的 `import trash from 'trash'` 转换为 CJS 的 `require("trash")`
4. 但 `trash` 模块本身**没有被打包进 bundle**
5. VSIX 使用 `--no-dependencies` 打包，不包含 `node_modules`
6. 运行时 `require("trash")` 失败

### 依赖链问题

```
trash (CJS)
  ↓ @cmtx/core 编译 (TypeScript → ESM)
ESM: import trash from 'trash'
  ↓ esbuild 打包 (ESM → CJS)
CJS: var import_trash = __toESM(require("trash"), 1)
  ↓ 运行时
❌ require("trash") 失败
```

---

## 决策驱动力

### 技术因素

1. **模块格式转换链**
   - 每一次 "CJS → ESM → CJS" 的转换都会增加复杂性
   - 可能导致依赖解析问题

2. **构建工具支持**
   - 现代构建工具（tsup、unbuild）支持双格式输出
   - TypeScript 官方推荐双配置方案

3. **Node.js 版本支持**
   - Node v24 稳定支持 `require(esm)`
   - 但 CJS 消费者仍需兼容

### 业界趋势

| 时期 | 主流策略 | 代表库 |
|------|---------|--------|
| 2020 之前 | 只输出 CJS | `lodash` |
| 2020-2024 | 双格式 (ESM+CJS) | `@babel/runtime`, `vitest` |
| 2024 之后 | 倾向 ESM-only | `chalk@5+`, `execa@6+` |

**参考来源**：
- [The NodeBook - CJS/ESM Interop](https://www.thenodebook.com/modules/cjs-esm-interop)
- [Node.js Docs - Publishing a package](https://nodejs.org/en/learn/modules/publishing-a-package)
- [Snyk Blog - ESM and CJS in 2024](https://snyk.io/blog/building-npm-package-compatible-with-esm-and-cjs-2024/)

### 项目需求

1. **VS Code 扩展兼容性**
   - VS Code 扩展使用 CJS 格式
   - 需要消费 ESM 包

2. **未来扩展性**
   - 可能支持 ESM-only 消费者
   - 需要保持向后兼容

3. **包体积可接受**
   - 双格式增加约 2 倍体积
   - 但对于工具库可接受

---

## 决策内容

### 核心决策

**采用方案 C：所有 `@cmtx/*` 包同时输出 ESM 和 CJS 两种格式**

### 用户决策记录

**决策日期**：2026-04-12

**决策内容**：
1. ✅ 采用方案 C（所有包输出双格式）
2. ✅ `@cmtx/publish` 采用**工厂模式**处理 `ruleEngine` 单例

**决策理由**：
- 从根源彻底解决双包危害问题
- 符合现代 npm 包最佳实践
- 工厂模式 API 变更可接受（项目尚未正式发布）

### 具体实施

#### 1. 构建配置

每个包新增 `tsconfig.cjs.json`：

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "dist-cjs",
    "rootDir": "src",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "types": ["node"],
    "stripInternal": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["tests", "**/*.test.ts", "dist", "dist-cjs"]
}
```

#### 2. package.json 配置

```json
{
  "type": "module",
  "main": "./dist-cjs/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist-cjs/index.js"
    }
  },
  "files": ["dist", "dist-cjs"]
}
```

#### 3. 构建脚本

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json && tsc -p tsconfig.cjs.json",
    "build:esm": "tsc -p tsconfig.build.json",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "clean": "rm -rf dist dist-cjs"
  }
}
```

### 影响范围

**需要修改的包**：

| 包 | 修改内容 | 优先级 | 特殊处理 |
|---|---|---|---|
| `@cmtx/core` | 双格式构建 | 1 | 无 |
| `@cmtx/asset` | 双格式构建 | 2 | 无（无状态） |
| `@cmtx/publish` | 双格式构建 + **工厂模式重构** | 3 | ⚠️ 需要重构 `ruleEngine` |
| `@cmtx/storage` | 双格式构建 | 4 | 无（无状态） |
| `@cmtx/template` | 双格式构建 | 5 | 无（无状态） |

**不需要修改的包**：
- `@cmtx/fpe-wasm` - WASM 包，特殊格式
- `cmtx-vscode` - 应用层，不发布到 npm
- `@cmtx/mcp-server` - 应用层，不发布到 npm

---

## 方案对比

### 方案 A：当前快速修复（已实施）

**修改内容**：
- 复制 `trash` 到 `dist/node_modules`
- 修改打包脚本先执行 build

**优点**：
- ✅ 快速修复，已验证有效
- ✅ 不修改其他包

**缺点**：
- ❌ 运行时解决方案，非根源修复
- ❌ VSIX 体积增加
- ❌ 不符合业界最佳实践

### 方案 B：只修改 @cmtx/core（最小修改）

**优点**：
- ✅ 从根源解决问题
- ✅ 只修改 1 个包

**缺点**：
- ⚠️ 其他包仍为单格式
- ⚠️ 未来可能有类似问题

### 方案 C：修改所有包（完整方案）⭐ 已选

**优点**：
- ✅ 从根源彻底解决问题
- ✅ 所有包符合业界最佳实践
- ✅ 未来兼容性好
- ✅ 支持所有消费者

**缺点**：
- ❌ 工作量大（5+ 个包）
- ❌ 构建输出体积增加约 2 倍

---

## 双包危害 (Dual Package Hazard)

### 问题描述

当包同时提供 CJS 和 ESM 入口时，可能被加载两次：
- CJS 入口：`dist-cjs/index.js`
- ESM 入口：`dist/index.js`

**后果**：
- 两份模块实例，两份状态
- `instanceof` 检查失败
- 单例模式失效

### 缓解策略

**CMTX 采用的策略**：

1. **无状态包设计**
   - `@cmtx/core`、`@cmtx/template`：纯函数
   - `@cmtx/storage`：无状态适配器
   - **无双包危害**

2. **状态管理**
   - `@cmtx/asset`、`@cmtx/publish`：配置驱动
   - 状态通过参数传递，非模块级单例
   - **风险低**

3. **统一入口**
   - 通过 `exports` 字段控制入口
   - 避免深路径导入

---

## 实施计划

### 阶段 1：准备工作（0.5 天）

- [ ] 创建文档 `docs/adr/ADR-009-dual-module-format-strategy.md`
- [ ] 创建构建模板 `packages/template/tsconfig.cjs.json`

### 阶段 2：核心包改造（1-2 天）

**优先级 1：@cmtx/core**
- [ ] 创建 `tsconfig.cjs.json`
- [ ] 修改 `package.json` 的 `exports` 字段
- [ ] 更新构建脚本
- [ ] 测试验证

**优先级 2：@cmtx/asset**
- [ ] 同上

**优先级 3：@cmtx/publish**
- [ ] 同上

**优先级 4：@cmtx/storage**
- [ ] 同上

**优先级 5：@cmtx/template**
- [ ] 同上

### 阶段 3：验证与测试（1 天）

- [ ] 构建所有包：`pnpm build`
- [ ] 验证输出格式
- [ ] 打包 VSIX：`pnpm -F cmtx-vscode package:dev`
- [ ] 安装测试：`code --install-extension ...`

### 阶段 4：文档更新（0.5 天）

- [ ] 更新 `docs/DOC-002-package_scripts_guide.md`
- [ ] 更新 `docs/DOC-003-package_standard.md`
- [ ] 更新 `docs/DEV-005-vsce-pnpm-workspace-integration.md`
- [ ] 更新各包 README

---

## 验证标准

### 构建验证

```bash
# 清理构建
pnpm -r clean

# 构建所有包
pnpm build

# 验证输出
ls -la packages/core/dist/ packages/core/dist-cjs/
```

### 格式验证

```bash
# 验证 ESM 输出（应包含 import）
head -5 packages/core/dist/delete.js

# 验证 CJS 输出（应包含 require）
head -5 packages/core/dist-cjs/delete.js
```

### 打包验证

```bash
# 打包 VSIX
pnpm -F cmtx-vscode package:dev

# 验证 trash 被打包
unzip -p cmtx-vscode-*.vsix extension/dist/extension.js | \
  grep -c "xdg-trashdir"
# 应 > 0
```

### 安装测试

```bash
# 安装 VSIX
code --install-extension cmtx-vscode-*.vsix

# 测试功能
# - 上传图片
# - 删除图片（使用 trash）
# - 格式化文档
```

---

## 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 构建配置错误 | 高 | 中 | 每个包单独测试，逐步推进 |
| 循环依赖暴露 | 高 | 低 | 先运行 `pnpm why` 检查依赖 |
| 类型定义冲突 | 中 | 中 | 确保 `types` 字段指向正确 |
| 包体积翻倍 | 中 | 高 | 可接受，符合业界标准 |
| 消费者兼容问题 | 低 | 低 | `exports` 字段保证向后兼容 |

---

## 参考资料

1. **The NodeBook - CJS/ESM Interop and Dual Packages**
   - URL: https://www.thenodebook.com/modules/cjs-esm-interop
   - 内容：CJS/ESM 互操作机制、双包危害、条件导出

2. **Node.js Docs - Publishing a package**
   - URL: https://nodejs.org/en/learn/modules/publishing-a-package
   - 内容：官方发布指南、exports 字段用法

3. **Snyk Blog - Building an npm package compatible with ESM and CJS in 2024**
   - URL: https://snyk.io/blog/building-npm-package-compatible-with-esm-and-cjs-2024/
   - 内容：2024 年最佳实践、避免 `"type": "module"`

4. **Node.js Issue #52174 - Recommend `node`/`default` conditions**
   - URL: https://github.com/nodejs/node/issues/52174
   - 内容：官方讨论、推荐条件顺序

5. **esbuild Documentation**
   - URL: https://esbuild.github.io/
   - 内容：esbuild 配置、alias 用法

---

## 附录 A：package.json 完整示例

```json
{
  "name": "@cmtx/core",
  "version": "0.3.0",
  "description": "Core markdown document processing library",
  "license": "Apache-2.0",
  "type": "module",
  "main": "./dist-cjs/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist-cjs/index.js"
    }
  },
  "files": ["dist", "dist-cjs"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json && tsc -p tsconfig.cjs.json",
    "build:esm": "tsc -p tsconfig.build.json",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "clean": "rm -rf dist dist-cjs",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "fast-glob": "catalog:",
    "trash": "catalog:",
    "winston": "^3.18.3",
    "winston-daily-rotate-file": "^5.0.0"
  }
}
```

---

## 附录 B：@cmtx/publish 工厂模式重构示例

### 当前代码（需要重构）

```typescript
// packages/publish/src/rules/engine.ts
export class RuleEngine {
  private rules = new Map<string, Rule>();
  
  register(rule: Rule): void {
    this.rules.set(rule.id, rule);
  }
  
  // ... 其他方法
}

// ⚠️ 问题：导出单例
export const ruleEngine = new RuleEngine();
```

### 重构后代码（推荐）

```typescript
// packages/publish/src/rules/engine.ts
export class RuleEngine {
  private rules = new Map<string, Rule>();
  
  register(rule: Rule): void {
    this.rules.set(rule.id, rule);
  }
  
  // ... 其他方法
}

// ✅ 解决方案：导出工厂函数
export function createRuleEngine(): RuleEngine {
  return new RuleEngine();
}

// 可选：导出默认配置的工厂
export function createDefaultRuleEngine(): RuleEngine {
  const engine = createRuleEngine();
  // 自动注册内置规则
  engine.registerMany(builtInRules);
  return engine;
}
```

### 使用示例对比

**旧 API**：
```typescript
import { ruleEngine } from '@cmtx/publish';
ruleEngine.register(myRule);
await ruleEngine.execute(config);
```

**新 API**：
```typescript
import { createRuleEngine, createDefaultRuleEngine } from '@cmtx/publish';

// 方式 1：手动创建和配置
const engine = createRuleEngine();
engine.register(myRule);
await engine.execute(config);

// 方式 2：使用默认配置（推荐）
const engine = createDefaultRuleEngine();
await engine.execute(config);
```

### 迁移指南

**需要修改的文件**：
1. `packages/publish/src/index.ts` - 更新导出
2. `packages/publish/src/rules/index.ts` - 更新导出
3. `packages/publish/tests/` - 更新测试代码
4. `packages/vscode-extension/src/` - 更新使用代码
5. `docs/` - 更新文档示例

**迁移脚本**（可选）：
```bash
# 搜索所有使用 ruleEngine 的地方
grep -r "ruleEngine" packages/ --include="*.ts" | grep -v ".test.ts"
```

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-04-12 | 1.0.0 | 初始版本，决策采用双格式方案 | CMTX Team |
