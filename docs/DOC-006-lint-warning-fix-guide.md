# Lint 警告修复指南

## 概述

本文档记录了 CMTX monorepo 项目中 lint 警告的分析、分类和修复过程。项目使用 oxlint 进行代码检查，包含类型感知（type-aware）规则。

## 警告分类与优先级

### 高优先级（必须修复）

| 规则                   | 数量 | 风险等级 | 说明                                  |
| ---------------------- | ---- | -------- | ------------------------------------- |
| `no-floating-promises` | 8    | 高       | 未等待的 Promise 可能导致未捕获的错误 |
| `no-misused-spread`    | 3    | 中       | 在类实例上使用 spread 会丢失原型链    |
| `await-thenable`       | 1    | 中       | 对非 Promise 值使用 await 是冗余的    |

### 中优先级（建议修复）

| 规则                            | 数量 | 风险等级 | 说明                                               |
| ------------------------------- | ---- | -------- | -------------------------------------------------- |
| `no-unused-vars`                | ~40  | 低       | 未使用的变量增加代码噪音                           |
| `restrict-template-expressions` | ~15  | 中       | 在模板字符串中使用 unknown/never 类型不安全        |
| `no-useless-default-assignment` | 3    | 低       | 无用的默认值永远不会被使用                         |
| `no-base-to-string`             | 1    | 低       | 使用 Object 默认字符串化可能输出 `[object Object]` |

### 低优先级（可配置忽略）

| 规则             | 数量 | 风险等级 | 说明                            |
| ---------------- | ---- | -------- | ------------------------------- |
| `unbound-method` | 59   | 低       | 测试文件中 `vi.mocked()` 的误报 |

## 修复策略

### 1. no-floating-promises

**问题**: Promise 未被 await 或显式忽略，可能导致未捕获的 rejection。

**修复方案**: 对于 intentionally 不等待的 Promise，使用 `void` 前缀显式忽略。

```typescript
// 修复前
main();

// 修复后
void main();
```

**适用场景**:

- 入口函数（如 `main()`）在文件顶层调用
- 事件处理器中不关心返回值的异步操作
- 状态更新等 fire-and-forget 操作

### 2. no-misused-spread

**问题**: 在类实例上使用 spread 操作符会丢失原型链和方法。

**修复方案**: 使用 `Object.assign()` 替代 spread。

```typescript
// 修复前
const mockClientWithOptions = {
    ...mockClient,
    options: { bucket: "my-bucket", region: "oss-cn-beijing" },
} as unknown as AliOSSClient;

// 修复后
const mockClientWithOptions = Object.assign({}, mockClient, {
    options: { bucket: "my-bucket", region: "oss-cn-beijing" },
}) as unknown as AliOSSClient;
```

### 3. restrict-template-expressions

**问题**: 在模板字符串中使用 `unknown` 或 `never` 类型不安全。

**修复方案**:

**对于 `unknown` 类型**: 使用 `String()` 显式转换。

```typescript
// 修复前
console.error(`Error: ${err}`);

// 修复后
console.error(`Error: ${String(err)}`);
```

**对于 `never` 类型**: 直接使用 `String()` 转换（不需要 `_never` 变量）。

```typescript
// 修复前
default: {
  const _never: never = provider;
  throw new Error(`Unsupported provider: ${_never}`);
}

// 修复后
default:
  throw new Error(`Unsupported provider: ${String(provider)}`);
```

**对于 winston logger 中的 `{}` 类型**: 使用 `JSON.stringify()`。

```typescript
// 修复前
const mod = module ? `[${String(module)}]` : "";

// 修复后
const mod = module ? `[${JSON.stringify(module)}]` : "";
```

### 4. no-unused-vars

**修复方案**:

- 移除未使用的导入
- 对 intentionally 未使用的参数添加 `_` 前缀
- 移除未使用的变量

```typescript
// 修复前
import { vi } from "vitest";
const { data, unused } = config;

// 修复后
const { data } = config;
```

### 5. no-useless-default-assignment

**问题**: 为必需属性设置默认值永远不会被使用。

**修复方案**:

- 如果属性应该是可选的，修改接口定义
- 如果属性是必需的，移除默认值

```typescript
// 修复前 - 接口中 strategy 是必需的
interface DeleteFileOptions {
    strategy: DeletionStrategy;
}

// 代码中的默认值永远不会被使用
const { strategy = "trash" } = options;

// 修复后 - 移除默认值
const { strategy } = options;
```

```typescript
// 修复前 - replace 是必需的 string 类型
interface TextReplaceConfig {
    replace: string;
}

// 修复后 - 改为可选类型
interface TextReplaceConfig {
    replace?: string;
}
```

### 6. await-thenable

**问题**: 对非 Promise 值使用 await。

**修复方案**: 移除不必要的 await。

```typescript
// 修复前
const signedUrl = await this.client.signatureUrl(remotePath, signOptions);

// 修复后
const signedUrl = this.client.signatureUrl(remotePath, signOptions);
```

## 修复过程经验

### 1. 批量修复策略

- **按类别分组**: 先修复同一类别的所有警告，减少上下文切换
- **先高后低**: 优先修复高风险警告
- **验证后再继续**: 每修复完一个类别，运行 lint 验证

### 2. 常见陷阱

**陷阱 1: 误删实际使用的导入**

```typescript
// 错误 - existsSync 实际上在第 80 行使用
import { existsSync } from "fs";

// 正确 - 检查所有使用位置后再决定
```

**陷阱 2: \_never 变量仍然触发警告**

```typescript
// 仍然会触发 restrict-template-expressions
const _never: never = format;
throw new Error(`Unsupported: ${_never}`);

// 正确 - 直接使用 String() 转换
throw new Error(`Unsupported: ${String(format)}`);
```

**陷阱 3: 修改接口定义影响下游**

```typescript
// 修改接口前需要检查所有使用位置
interface TextReplaceConfig {
    replace?: string; // 从必需改为可选
}
```

### 3. 工具使用技巧

**查看特定规则的所有警告**:

```bash
pnpm run lint:oxlint 2>&1 | grep -A5 "restrict-template-expressions"
```

**统计各类警告数量**:

```bash
pnpm run lint:oxlint 2>&1 | grep -E "^\s*!" | sort | uniq -c | sort -rn
```

**查看完整 lint 输出**:

```bash
pnpm run lint:check 2>&1 | head -100
```

## 测试文件中的 unbound-method 警告

### 问题分析

`unbound-method` 警告在测试文件中大量出现（59个），主要原因是：

1. `vi.mocked()` 返回的是方法引用
2. 这些方法不依赖 `this` 上下文
3. 这是 oxlint 的误报

### 建议配置

在 `oxlint.config.json` 中为测试文件配置忽略：

```json
{
    "overrides": [
        {
            "files": ["**/*.test.ts", "**/tests/**/*.ts"],
            "rules": {
                "typescript-eslint/unbound-method": "off"
            }
        }
    ]
}
```

## 修复结果

### 修复前后对比

| 指标       | 修复前 | 修复后              |
| ---------- | ------ | ------------------- |
| 总警告数   | 137    | 59                  |
| 高风险警告 | 12     | 0                   |
| 中风险警告 | ~58    | 0                   |
| 低风险警告 | ~67    | 59 (unbound-method) |

### 最终状态

- 所有高风险和中风险警告已修复
- 剩余 59 个 `unbound-method` 警告均为测试文件中的误报
- 类型检查（typecheck）全部通过
- 代码质量显著提升

## 相关文件

修复涉及的文件列表：

### 核心包

- `packages/core/src/metadata.ts`
- `packages/core/src/logger.ts`
- `packages/core/examples/image-replace.ts`
- `packages/core/examples/image-find-all.ts`
- `packages/core/examples/image-delete.ts`

### 资产包

- `packages/asset/src/upload/pipeline.ts`
- `packages/asset/src/file/file-service.ts`

### CLI 包

- `packages/cli/src/commands/presign.ts`
- `packages/cli/src/commands/upload.ts`

### MCP 服务器

- `packages/mcp-server/src/server.ts`

### 发布包

- `packages/publish/src/rules/built-in/metadata-rules.ts`
- `packages/publish/src/rules/built-in/text-rules.ts`

### 存储包

- `packages/storage/src/adapters/ali-oss.ts`
- `packages/storage/tests/adapters/ali-oss.test.ts`

### VS Code 扩展

- `packages/vscode-extension/src/providers/status-bar.ts`
- `packages/vscode-extension/src/extension.ts`
- `packages/vscode-extension/src/test/runTest.ts`
- `packages/vscode-extension/src/presigned-url/create-vscode-adapter.ts`

### 其他

- `packages/kilo-exporter/src/cli/index.ts`
- `packages/markdown-it-presigned-url-adapter-nodejs/src/url-signer.ts`
- `packages/markdown-it-presigned-url/src/utils/domain-matcher.ts`
- `scripts/restic-backup.js`

## 参考资源

- [TypeScript ESLint 文档](https://typescript-eslint.io/rules/)
- [Oxlint 文档](https://oxc.rs/docs/guide/usage/linter/)
- [AGENTS.md](../AGENTS.md) - 项目代码规范
