# Logger 重构计划：统一日志输出

## 问题描述（已解决）

~~当前 CMTX 扩展的日志输出存在格式不一致的问题：~~

~~1. **OUTPUT 面板**（CMTX 通道）- 有 `[CMTX]` 前缀~~
~~2. **Debug Console** - 没有 `[CMTX]` 前缀~~

~~这导致两个输出目标的内容和格式不一致。~~

---

## 解决方案（已实施）

### UnifiedLogger 设计

创建了 [`UnifiedLogger`](../src/infra/unified-logger.ts) 类，统一输出到 Output Channel 和 DEBUG CONSOLE：

```typescript
// 统一日志格式：[CMTX] [module] LEVEL: message
[CMTX] [cmtx-config] INFO: Loaded config from: /path/to/config
```

### 核心特性

1. **统一格式**：Output Channel 和 DEBUG CONSOLE 输出完全相同的内容
2. **简单 API**：调用一个方法即可同时输出到两个目标
3. **解耦**：不依赖 `@cmtx/core` 的 winston logger
4. **易测试**：可以 mock `outputChannel` 和 `console` 方法进行单元测试
5. **模块支持**：通过 `ModuleLogger` 支持模块特定日志

### 使用方式

```typescript
// 获取模块 logger
import { getModuleLogger } from "./infra/unified-logger";

const logger = getModuleLogger("my-module");
logger.info("Starting operation");
logger.debug("Debug details", someData);
logger.warn("Warning message");
logger.error("Error occurred", error);
```

### 初始化

在 `extension.ts` 中初始化：

```typescript
import { getUnifiedLogger } from "./infra/unified-logger";

export function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel("CMTX");
    getUnifiedLogger().setOutputChannel(outputChannel);
    // ...
}
```

---

## 迁移状态

| 步骤                     | 状态 |
| ------------------------ | ---- |
| 创建 UnifiedLogger 类    | 完成 |
| 创建单元测试             | 完成 |
| 更新 index.ts 导出       | 完成 |
| 更新 extension.ts 初始化 | 完成 |
| 全量迁移业务代码         | 完成 |
| 删除旧 logger.ts 文件    | 完成 |
| LINT 检查                | 通过 |
| BUILD                    | 通过 |
| TEST                     | 通过 |
| TYPECHECK                | 通过 |

---

## 相关文件

- [`packages/vscode-extension/src/infra/unified-logger.ts`](../src/infra/unified-logger.ts) - UnifiedLogger 实现
- [`packages/vscode-extension/tests/unit/infra/unified-logger.test.ts`](../tests/unit/infra/unified-logger.test.ts) - 单元测试
- [`plans/PLAN-021-unify-debug-console-log-prefix.md`](../../../plans/PLAN-021-unify-debug-console-log-prefix.md) - 实施计划
