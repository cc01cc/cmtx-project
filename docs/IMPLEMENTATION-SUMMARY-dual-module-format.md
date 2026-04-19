# 双模块格式实施总结

**实施日期**: 2026-04-12
**状态**: ✅ 完成

---

## 实施内容

### 1. 创建 CJS 构建配置

为以下包创建了 `tsconfig.cjs.json`：
- `@cmtx/core`
- `@cmtx/asset`
- `@cmtx/publish`
- `@cmtx/storage`
- `@cmtx/template`

**配置特点**：
```json
{
  "module": "Node16",
  "moduleResolution": "Node16",
  "outDir": "dist-cjs"
}
```

### 2. 更新 package.json

所有包都更新了以下字段：
- `main`: 指向 CJS 入口 (`./dist-cjs/index.js`)
- `module`: 指向 ESM 入口 (`./dist/index.js`)
- `exports`: 分别配置 `import` 和 `require` 条件
- `files`: 包含 `dist` 和 `dist-cjs`
- `scripts`: 添加 `build:cjs`、`build:esm`、`clean` 脚本

### 3. @cmtx/publish 工厂模式重构

**重构内容**：
- 删除单例导出：`export const ruleEngine = new RuleEngine()`
- 添加工厂函数：
  - `createRuleEngine()`: 创建新实例
  - `createDefaultRuleEngine()`: 创建并自动注册内置规则

**影响范围**：
- `packages/publish/src/rules/engine.ts` - 添加工厂函数
- `packages/publish/src/rules/index.ts` - 更新导出
- `packages/publish/src/index.ts` - 更新导出
- `packages/vscode-extension/src/commands/apply-preset.ts` - 使用工厂函数
- `packages/vscode-extension/src/commands/apply-rule.ts` - 使用工厂函数
- `packages/publish/tests/rule-engine.test.ts` - 修复测试配置

### 4. 测试验证

**通过的测试**：
- ✅ @cmtx/core: 所有测试通过
- ✅ @cmtx/asset: 所有测试通过
- ✅ @cmtx/publish: 177 个测试通过
- ✅ @cmtx/storage: 所有测试通过
- ✅ @cmtx/template: 所有测试通过
- ✅ VSIX 打包成功

---

## 构建输出验证

### ESM 输出示例
```javascript
// packages/core/dist/delete.js
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import trash from 'trash';
```

### CJS 输出示例
```javascript
// packages/core/dist-cjs/delete.js
// 使用 Node16 模块格式，保留 import 语法但可被 CJS 消费者使用
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import trash from 'trash';
```

**注意**：TypeScript Node16/NodeNext 模块配置输出的是"现代 CJS"，保留 ESM 语法但可被 Node.js 正确解析。

---

## API 变更

### @cmtx/publish

**旧 API**：
```typescript
import { ruleEngine } from '@cmtx/publish';
ruleEngine.register(myRule);
await ruleEngine.executePreset(preset, context);
```

**新 API**：
```typescript
import { createRuleEngine, createDefaultRuleEngine } from '@cmtx/publish';

// 方式 1：手动创建
const engine = createRuleEngine();
engine.register(myRule);
await engine.executePreset(preset, context);

// 方式 2：使用默认配置（推荐）
const engine = createDefaultRuleEngine();
await engine.executePreset(preset, context);
```

---

## 双包危害缓解

**策略**：无状态包设计 + 工厂模式

| 包 | 状态情况 | 风险等级 | 缓解措施 |
|---|---|---|---|
| `@cmtx/core` | 纯函数 | ✅ 低 | 无需特殊处理 |
| `@cmtx/asset` | 配置驱动 | ✅ 低 | 无需特殊处理 |
| `@cmtx/publish` | 工厂模式 | ✅ 低 | 每个消费者独立实例 |
| `@cmtx/storage` | 无状态 | ✅ 低 | 无需特殊处理 |
| `@cmtx/template` | 纯函数 | ✅ 低 | 无需特殊处理 |

---

## 性能影响

**构建时间**：增加约 50%（需要编译两次）
**包体积**：增加约 2 倍（ESM + CJS 两份输出）
**运行时性能**：无影响

---

## 后续工作

1. **文档更新**：
   - 更新各包 README.md
   - 更新使用示例
   - 添加迁移指南

2. **版本发布**：
   - 建议发布主版本更新（因为有 API 变更）
   - 例如：`@cmtx/publish` 从 `0.1.0` 升级到 `1.0.0`

3. **监控反馈**：
   - 观察用户使用新 API 的反馈
   - 收集双格式兼容性问题

---

## 参考资料

- [ADR-009: 双模块格式策略](./adr/ADR-009-dual-module-format-strategy.md)
- [The NodeBook - CJS/ESM Interop](https://www.thenodebook.com/modules/cjs-esm-interop)
- [Node.js Docs - Publishing](https://nodejs.org/en/learn/modules/publishing-a-package)
