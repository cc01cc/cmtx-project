# Logger 重构计划：消除重复输出

## 问题描述

当前 CMTX 扩展的日志输出会同时出现在两个地方：
1. **OUTPUT 面板**（CMTX 通道）- 预期位置
2. **Debug Console** - 非预期位置

这导致日志输出重复，且 Debug Console 中混杂了所有扩展的输出。

---

## 根本原因分析

### 代码流程

```
用户代码
    │
    └── logger.info('message')
            │
            ├── appendToOutputChannel() ──> OUTPUT 面板
            │
            └── logMethod.apply()
                    │
                    └── winston logger
                            │
                            └── Console transport ──> Debug Console
```

### 源码分析

**`packages/vscode-extension/src/infra/logger.ts`**:

```typescript
export function getLogger(moduleName?: string): CmtxLogger {
    const baseLogger = getBaseLogger(moduleName);

    return new Proxy(baseLogger, {
        get(target, prop, receiver) {
            if (typeof prop === 'string' && isLogMethod(prop)) {
                const method = Reflect.get(target, prop, receiver);
                if (typeof method === 'function') {
                    const logMethod = method as (...args: unknown[]) => unknown;
                    return (...args: unknown[]) => {
                        appendToOutputChannel(prop, moduleName, args);  // 1. 输出到 OutputChannel
                        return logMethod.apply(target, args);           // 2. 调用 winston → Console
                    };
                }
            }

            return Reflect.get(target, prop, receiver);
        },
    });
}
```

**`packages/core/src/logger.ts`**:

```typescript
if (!silent) {
    transports.push(new winston.transports.Console());  // 默认启用 Console 输出
}
```

---

## 解决方案

### 方案 1：在 VS Code 扩展层设置 silent（推荐）

**修改文件**: `packages/vscode-extension/src/extension.ts`

**修改内容**:

```typescript
import { initLogger } from '@cmtx/core';

export function activate(context: vscode.ExtensionContext) {
    // 初始化 logger，禁用 Console 输出
    initLogger({
        level: 'debug',
        silent: true,  // 禁用 Console 输出，只使用 OutputChannel
    });
    
    // ...
}
```

**优点**:
- 最小改动
- 只影响 VS Code 扩展环境
- `@cmtx/core` 在其他环境（CLI、MCP Server）仍可使用 Console 输出

**缺点**:
- 需要确保 `initLogger` 在 `getLogger` 之前调用

---

### 方案 2：修改 VS Code 扩展层的 Proxy 逻辑

**修改文件**: `packages/vscode-extension/src/infra/logger.ts`

**修改内容**:

```typescript
return (...args: unknown[]) => {
    appendToOutputChannel(prop, moduleName, args);
    // 移除这行，不再调用原始的 winston logger
    // return logMethod.apply(target, args);
};
```

**优点**:
- 完全控制输出
- 不依赖 `@cmtx/core` 的配置

**缺点**:
- 失去了 winston 的文件日志功能
- 需要重新实现日志级别控制等特性

---

### 方案 3：在 VS Code 扩展层创建独立的 Logger

**修改文件**: `packages/vscode-extension/src/infra/logger.ts`

**修改内容**:

不使用 `@cmtx/core` 的 logger，直接实现：

```typescript
class VSCodeLogger {
    private channel: vscode.OutputChannel;
    
    constructor(channel: vscode.OutputChannel) {
        this.channel = channel;
    }
    
    info(message: string, ...args: unknown[]): void {
        this.channel.appendLine(`[INFO] ${message}`);
    }
    
    error(message: string, ...args: unknown[]): void {
        this.channel.appendLine(`[ERROR] ${message}`);
    }
    
    // ...
}
```

**优点**:
- 完全解耦
- 可以针对 VS Code 环境优化

**缺点**:
- 失去 `@cmtx/core` 的统一日志功能
- 代码重复

---

## 推荐方案

**方案 1**：在 VS Code 扩展层设置 `silent: true`

**理由**:
1. 最小改动
2. 保持 `@cmtx/core` 的统一性
3. 其他环境（CLI、MCP Server）不受影响
4. 实现简单

---

## 实施步骤

1. 在 `packages/vscode-extension/src/extension.ts` 中调用 `initLogger({ silent: true })`
2. 确保 `initLogger` 在任何 `getLogger` 调用之前执行
3. 测试验证：
   - OUTPUT 面板有输出
   - Debug Console 无 CMTX 相关输出（只有其他扩展的输出）

---

## 注意事项

1. **初始化顺序**：必须确保 `initLogger` 在 `getLogger` 之前调用
2. **测试环境**：测试文件 (`src/test/runTest.ts`) 中仍有 `console.log`，这是正常的
3. **其他包**：`@cmtx/cli` 和 `@cmtx/mcp-server` 可能需要 Console 输出，不应设置 `silent`

---

## 相关文件

- `packages/vscode-extension/src/extension.ts`
- `packages/vscode-extension/src/infra/logger.ts`
- `packages/core/src/logger.ts`

---

## 创建日期

2026-04-08