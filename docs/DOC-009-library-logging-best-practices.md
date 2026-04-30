# 库包日志设计最佳实践（TypeScript/Node.js）

> 本文档记录了在 CMTX monorepo 项目中处理库包日志输出时的调研结果和设计决策。
>
> **调研日期：** 2026-04-27

## 1. 核心原则

| 原则 | 说明 |
|---|---|
| **库包不写 console** | console 是应用层的 UI（CLI 输出、VS Code OutputChannel），库包无权直接"画到屏幕上"。调用者无法控制库包的 console 行为，会引发日志混淆 |
| **默认静默（no-op）** | 调用者不提供 logger 时，库包不应输出任何内容。no-op 实现是空函数体，而非 console |
| **零依赖** | Logger 接口应该由库包自己定义（几行代码的事），不引入第三方日志库作为依赖 |
| **接口与 console 兼容** | 接口设计应让 `console` 对象本身可以直接作为 Logger 传入，无需适配层 |
| **致命错误 throw** | 调用者理应 catch 处理，不靠 console 传播错误 |
| **非致命错误静默或回调** | catch 中的非关键性错误，通过可选 logger 传递或直接静默 |

## 2. 三大主流模式

### 2.1. Optional Logger Interface（最主流，推荐）

定义一个轻量接口，构造函数/函数参数接受可选的 logger，默认 no-op：

```typescript
export interface Logger {
  trace?(message: string, ...args: unknown[]): void;
  debug?(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export const dummyLogger: Logger = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
```

**库包使用：**

```typescript
export class TransferService {
  constructor(
    private config: TransferConfig,
    private logger: Logger = dummyLogger,
  ) {}

  private async deleteSourceFile(path: string): Promise<void> {
    if (!this.config.source.adapter.delete) {
      this.logger.warn(`delete not supported: ${path}`);
      return;
    }
  }
}
```

**调用者自由选择：**

```typescript
// 静默（默认）
const svc = new TransferService(config);

// console
const svc = new TransferService(config, console);

// pino / winston / bunyan 等都兼容
const svc = new TransferService(config, pino());
```

**参考资料：**

- `ts-log` — 24 行代码，零依赖，专门为此场景设计：<https://www.npmjs.com/package/ts-log>
- `ts-log` GitHub 仓库（接口定义 + 使用示例）：<https://github.com/kallaspriit/ts-log>
- StackOverflow 讨论 "How to log from an NPM package without forcing a logging library"（最高赞答案推荐 EventEmitter 或可选 logger）：<https://stackoverflow.com/questions/53284918/how-to-log-from-a-npm-package-without-forcing-a-logging-library>
- `abstract-logging` — 另一个 no-op logger 实现：<https://www.npmjs.com/package/abstract-logging>

### 2.2. 事件发射器（EventEmitter）

适用多消费者场景。库包 emit 事件，调用者决定是否监听：

```typescript
import { EventEmitter } from "node:events";

export class MetadataRegistry extends EventEmitter {
  async save(): Promise<void> {
    try {
      await writeFile(/* ... */);
    } catch (error) {
      this.emit("log:warn", `Failed to save: ${error}`);
    }
  }
}
```

**参考资料：**

- Node.js EventEmitter 官方文档：<https://nodejs.org/api/events.html>
- Basarat 的 TypeScript 类型安全事件实践：<https://basarat.gitbook.io/typescript/main-1/typed-event>

### 2.3. Callback 函数参数（最简单）

适合纯函数工具：

```typescript
export async function ensureWasmLoaded(
  logger?: (level: string, message: string) => void,
): Promise<void> {
  logger?.("debug", "loading WASM...");
  await loadWASM();
}
```

## 3. 常见反模式

| 反模式 | 问题 | 替代方案 |
|---|---|---|
| `console.log/warn/error` 直接写入 | 调用者无法控制，测试中需要 mock/spy | Optional Logger 接口 |
| 库包 `throw` 的同时也 `console.error` | 双倍输出，调用者 catch 后无法抑制 | 只 throw，让调用者自己处理 |
| 依赖具体的日志库（winston/pino） | 强制调用者使用同一日志库，增加依赖冲突风险 | 自己定义 Logger 接口，零依赖 |
| `debug` 包作为生产日志 | `debug` 专为开发调试设计，通过 `DEBUG` 环境变量控制 | Optional Logger 接口 |

## 4. 信息来源

### 库包日志设计

| 来源 | URL | 说明 |
|---|---|---|
| ts-log (npm) | <https://www.npmjs.com/package/ts-log> | 零依赖 TypeScript Logger 接口，专为库包设计 |
| ts-log (GitHub) | <https://github.com/kallaspriit/ts-log> | 源码，24 行实现，含 dummyLogger |
| StackOverflow 讨论 | <https://stackoverflow.com/questions/53284918/how-to-log-from-a-npm-package-without-forcing-a-logging-library> | "How to log from an NPM package without forcing a logging library" — 核心问答 |
| abstract-logging | <https://www.npmjs.com/package/abstract-logging> | Fastify 生态的 no-op logger，与 pino 兼容 |
| Node.js EventEmitter | <https://nodejs.org/api/events.html> | 事件发射器模式官方文档 |

### 通用 Node.js 日志最佳实践

| 来源 | URL | 说明 |
|---|---|---|
| BetterStack - 11 Best Practices | <https://betterstack.com/community/guides/logging/nodejs-logging-best-practices/> | Node.js 日志最佳实践 11 条 |
| LogRocket - Node.js logging best practices | <https://blog.logrocket.com/node-js-logging-best-practices-essential-guide/> | 日志级别、结构化日志、日志管理 |
| Dash0 - Top 7 Logging Libraries | <https://www.dash0.com/guides/nodejs-logging-libraries> | Pino、Winston、Bunyan 等对比 |
| Node.js Best Practices (GitHub) | <https://github.com/goldbergyoni/nodebestpractices> | 100k+ star 的 Node.js 最佳实践清单 |

### 日志库比较

| 库 | GitHub Stars | 特点 | 官网 |
|---|---|---|---|
| Pino | 15.3k | 性能最优，JSON 格式，低开销 | <https://getpino.io/> |
| Winston | 23k | 最流行，多 transports，可自定义 | <https://github.com/winstonjs/winston> |
| Bunyan | 7.5k | JSON 日志，child logger，CLI 格式化 | <https://github.com/trentm/node-bunyan> |
| tslog | 1.3k | TypeScript 原生，类型安全 | <https://tslog.js.org/> |

## 5. 设计决策记录

### 决策 1：接受 Logger 接口而非抛出事件（2026-04-27）

- **选择**：Optional Logger Interface（构造函数注入 + dummyLogger 默认）
- **理由**：
  - EventEmitter 需要 `extends` 或组合，污染类继承
  - Callback 参数不适合类中有多处需要日志的场景
  - 接口注入与 DI 模式一致，便于测试
- **影响范围**：`@cmtx/publish`、`@cmtx/asset`、`@cmtx/storage` 的类

### 决策 2：接口与 `console` 兼容（2026-04-27）

- **选择**：接口方法签名匹配 `console.log/warn/error`，而非自定义名称
- **理由**：`console` 可以直接作为 Logger 传入，无需适配层。Pino、Winston 等也天然兼容
