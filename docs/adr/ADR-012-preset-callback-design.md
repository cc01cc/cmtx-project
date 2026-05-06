# ADR-012: Preset 与回调设计分析

- **状态**: Proposed
- **日期**: 2026-04-22
- **作者**: Kilo
- **相关包**: `@cmtx/rule-engine`, `@cmtx/asset`

## 1. 背景

CMTX 项目的 `@cmtx/rule-engine` 包提供了 Preset（预设）机制用于编排多个 Rule 的执行。在设计过程中，关于回调的使用方式存在多种选择：传统回调模式、Service 模式、Hook 系统等。本文档分析当前 Preset 设计中的回调相关决策，记录设计权衡和业界最佳实践。

## 2. 问题陈述

在 Pipeline/Rule 执行系统中，回调设计面临以下挑战：

1. **控制流反转**：回调导致代码书写顺序 ≠ 执行顺序，难以理解和调试
2. **状态管理困难**：回调之间如何共享/传递状态
3. **错误处理分散**：每个回调都需要单独处理错误
4. **执行顺序依赖**：回调注册顺序可能影响执行结果
5. **扩展性与复杂度平衡**：如何在不引入过度复杂性的前提下支持插件扩展

## 3. 设计目标

- **清晰的控制流**：代码执行顺序直观，易于调试
- **状态传递安全**：避免全局状态污染和并发问题
- **错误可追溯**：统一的错误处理和堆栈追踪
- **类型安全**：利用 TypeScript 提供编译时检查
- **适度扩展性**：支持插件扩展但不引入过度抽象

## 4. 考虑的选项

### 4.1. 选项 A：传统回调模式

```typescript
interface PipelineConfig {
    onBeforeStep?: (stepId: string, context: any) => void;
    onAfterStep?: (stepId: string, result: any) => void;
    onError?: (error: Error, stepId: string) => void;
    onComplete?: (finalResult: any) => void;
}
```

**优点**：

- 灵活，可以在任意阶段注入逻辑
- 熟悉，大多数开发者了解回调

**缺点**：

- 回调地狱风险（多层嵌套）
- 控制流不直观
- 错误处理分散
- 状态共享需要闭包或全局变量

### 4.2. 选项 B：Hook 系统（如 Webpack tapable）

```typescript
const hooks = {
    beforeCompile: new AsyncSeriesHook(["compilation"]),
    afterCompile: new AsyncSeriesHook(["compilation"]),
};

hooks.beforeCompile.tapAsync("MyPlugin", (compilation, callback) => {
    // ...
    callback();
});
```

**优点**：

- 高度可扩展，支持插件生态
- 支持同步/异步/并行钩子
- 支持钩子优先级（stage）

**缺点**：

- API 复杂度高（tap/tapAsync/tapPromise）
- 学习曲线陡峭
- 需要理解钩子类型和执行顺序

### 4.3. 选项 C：中间件模式（如 Express/Koa）

```typescript
pipeline.use(async (ctx, next) => {
    // before
    await next();
    // after
});
```

**优点**：

- 洋葱模型，清晰的前后处理
- 可以通过 `next()` 控制流程
- 线性代码，易于理解

**缺点**：

- 难以在中间插入逻辑（需要精确控制 `next()` 调用位置）
- 无法回溯（不能回到上一步）
- 动态配置能力有限

### 4.4. 选项 D：命令式管道 + Service 模式（当前选择）

```typescript
// 定义 Preset
const preset: PresetConfig = {
    id: "wechat-publish",
    steps: [
        { id: "convert-images", enabled: true },
        { id: "upload-images", config: { width: 480 } },
        { id: "frontmatter-title" },
    ],
};

// 执行
const result = await engine.executePreset(preset, {
    document: markdown,
    filePath: "/path/to/article.md",
    services: registry,
});
```

**优点**：

- 控制流清晰：线性执行循环
- 状态管理安全：通过 `RuleContext` 传递
- 错误处理统一：`RuleExecutionError` 包装
- 类型安全：泛型 `services.get<T>()`
- 配置灵活：全局 + 步骤配置合并

**缺点**：

- 插件生态需建设（相比成熟的 Hook 系统）
- 动态扩展能力有限（需要预先注册 Rules）

## 5. 决策

选择**选项 D：命令式管道 + Service 模式**作为 Preset 的核心设计。

### 5.1. 核心设计

#### 类型定义

```typescript
// Preset 的两种形态
type SimplePreset = string[];

interface PresetConfig {
    id: string;
    name: string;
    description?: string;
    steps: RuleStepConfig[];
}

interface RuleStepConfig {
    id: string;
    enabled?: boolean;
    config?: Record<string, unknown>;
}

// Rule 执行上下文
interface RuleContext {
    document: string;
    filePath: string;
    baseDirectory?: string;
    services: ServiceRegistry; // 通过 ServiceRegistry 获取扩展能力
}

// Rule 接口
interface Rule {
    id: string;
    name: string;
    description?: string;
    execute(context: RuleContext, config?: unknown): Promise<RuleResult> | RuleResult;
}
```

#### 执行流程

```typescript
async executePreset(
    preset: PresetConfig | SimplePreset,
    context: RuleContext,
    onProgress?: (ruleId: string, result: RuleResult) => void
): Promise<{ content: string; results: Array<{ ruleId: string; result: RuleResult }> }> {
    const steps = this.normalizePreset(preset);
    const results: Array<{ ruleId: string; result: RuleResult }> = [];

    let currentContent = context.document;

    for (const step of steps) {
        if (!step.enabled) continue;

        // 创建步骤上下文（更新 document）
        const stepContext: RuleContext = {
            ...context,
            document: currentContent,
        };

        // 执行 Rule
        const result = await this.executeRule(step.id, stepContext, step.config);
        results.push({ ruleId: step.id, result });

        // 更新内容
        if (result.modified) {
            currentContent = result.content;
        }

        // 进度回调
        if (onProgress) {
            onProgress(step.id, result);
        }
    }

    return { content: currentContent, results };
}
```

### 5.2. 回调设计策略

#### 回调分类

| 回调类型                       | 位置                 | 调用时机         | 设计评价                     |
| ------------------------------ | -------------------- | ---------------- | ---------------------------- |
| `onProgress`                   | `executePreset` 参数 | 每个 Rule 执行后 | ✅ 合理，用于 UI 反馈        |
| `CallbackService.onFileExists` | Service              | 文件冲突时       | ⚠️ 已升级为 Strategy 模式    |
| `getNextCounterValue`          | Rule 配置            | ID 生成前        | ⚠️ 可选回调，有 Service 回退 |

#### 从 Callback 到 Strategy 的演进

```typescript
// ❌ 旧设计：每次冲突都回调
interface OldUploadConfig {
    onFileExists?: (
        fileName: string,
        remotePath: string,
        remoteUrl: string,
    ) => Promise<"skip" | "replace" | "download">;
}

// ✅ 新设计：一次性选择策略
interface NewUploadConfig {
    conflictStrategy?: ConflictResolutionStrategy;
}

type ConflictResolutionStrategy =
    | { type: "skip-all" }
    | { type: "replace-all" }
    | { type: "download-all"; downloadDir: string; onFileExists: "skip" | "replace" };
```

### 5.3. Service Registry 设计

```typescript
// 服务注册表接口
interface ServiceRegistry {
    register<T>(service: Service<T>): void;
    get<T extends Service>(id: string): T | undefined;
    has(id: string): boolean;
    getAllIds(): string[];
}

// 内置服务类型
type BuiltInServiceId = "storage" | "counter" | "callback" | "presigned-url";

// Rule 通过 services.get() 获取能力
const storage = context.services.get<StorageService>("storage");
const counter = context.services.get<CounterService>("counter");
```

## 6. 数据流

### 6.1. 执行序列图

```
应用层           RuleEngine        ServiceRegistry      Rule          AssetService
  |                  |                    |               |                |
  |--executePreset-->|                    |               |                |
  |                  |--normalizePreset-->|               |                |
  |                  |                    |               |                |
  |                  |--executeRule------>|               |                |
  |                  |                    |               |                |
  |                  |                    |--get('asset')>|                |
  |                  |                    |<--------------|                |
  |                  |                    |               |                |
  |                  |                    |               |--uploadImages->|
  |                  |                    |               |                |
  |                  |<--RuleResult-------|               |                |
  |<--onProgress-----|                    |               |                |
  |                  |                    |               |                |
  |<--最终结果--------|                    |               |                |
```

### 6.2. 上下文数据流转

```typescript
// 初始状态
const initialContext = {
    document: "# 原文档\n\n![img](./local.png)",
    filePath: "/path/to/article.md",
    baseDirectory: "/path/to",
    services: registry,
};

// Step 1: convert-images 执行后
const step1Context = {
    document: '# 原文档\n\n<img src="./local.png" alt="img" />',
    // ↑ document 已更新
    filePath: "/path/to/article.md", // ← 保持不变
    baseDirectory: "/path/to", // ← 保持不变
    services: registry, // ← 保持不变
};

// Step 2: upload-images 执行后
const step2Context = {
    document: '# 原文档\n\n<img src="https://cdn.example.com/..." alt="img" />',
    // ↑ 本地路径已替换为 CDN URL
    filePath: "/path/to/article.md",
    baseDirectory: "/path/to",
    services: registry,
};
```

## 7. 使用示例

### 7.1. 简洁版 Preset

```typescript
import { createDefaultRuleEngine, createServiceRegistry } from "@cmtx/rule-engine";

const registry = createServiceRegistry();
const engine = createDefaultRuleEngine();

const simplePreset = [
    "convert-images",
    "upload-images",
    "frontmatter-title",
    "frontmatter-date",
    "frontmatter-id",
];

const result = await engine.executePreset(simplePreset, {
    document: markdownContent,
    filePath: "/docs/article.md",
    services: registry,
});
```

### 7.2. 带配置的 Preset

```typescript
const advancedPreset: PresetConfig = {
    id: "zhihu-publish",
    name: "知乎发布专用",
    steps: [
        { id: "convert-images", enabled: true },
        {
            id: "upload-images",
            enabled: true,
            config: {
                width: 600,
                conflictStrategy: { type: "skip-all" },
            },
        },
        {
            id: "frontmatter-id",
            enabled: true,
            config: {
                template: "{ff1}",
                fieldName: "id",
                prefix: "zh-",
                ff1: {
                    useCounter: "global",
                    encryptionKey: "my-32-byte-secret-key!",
                    withChecksum: true,
                },
            },
        },
    ],
};

const result = await engine.executePreset(advancedPreset, context, (ruleId, ruleResult) => {
    console.log(`[${ruleId}]`, ruleResult.messages);
});
```

### 7.3. 预览模式（Dry Run）

```typescript
const preview = await engine.previewPreset(advancedPreset, {
    document: markdownContent,
    filePath: "/docs/article.md",
    services: registry,
});

console.log(
    "将会修改:",
    preview.changes.filter((c) => c.willModify),
);
// 输出：
// [
//   { ruleId: 'convert-images', willModify: true },
//   { ruleId: 'upload-images', willModify: true },
//   { ruleId: 'frontmatter-title', willModify: false },
//   { ruleId: 'frontmatter-id', willModify: true },
// ]
```

## 8. 与其他框架对比

| 框架                  | 模式                 | 优点                     | 缺点                 |
| --------------------- | -------------------- | ------------------------ | -------------------- |
| **Webpack (tapable)** | Hook 系统            | 高度可扩展，插件生态丰富 | API 复杂，学习曲线陡 |
| **Express**           | 中间件               | 简单直观，易于调试       | 难以动态配置         |
| **RxJS**              | 响应式管道           | 强大的组合能力           | 过度抽象             |
| **当前项目**          | 命令式管道 + Service | 平衡灵活性和复杂度       | 插件生态需建设       |

## 9. 潜在风险与改进建议

### 9.1. 潜在风险

```typescript
// ⚠️ 风险 1: 回调超时未控制
registry.register(
    createCallbackService({
        onFileExists: async () => {
            // 如果用户回调卡住，整个 pipeline 会挂起
            await someSlowOperation(); // 无超时
        },
    }),
);

// ⚠️ 风险 2: 回调错误导致 pipeline 中断
registry.register(
    createCallbackService({
        onFileExists: async () => {
            throw new Error("Unexpected error"); // 未捕获
        },
    }),
);

// ⚠️ 风险 3: 服务依赖顺序
registry.register(createCounterService());
registry.register(createStorageService());
// 如果 storage 依赖 counter，但 counter 后注册，会出问题
```

### 9.2. 改进建议

```typescript
// 建议 1: 回调超时包装
async function safeExecuteCallback<T>(
    callback: () => Promise<T>,
    timeoutMs: number = 5000,
    defaultValue: T,
): Promise<T> {
    return Promise.race([
        callback(),
        new Promise<T>((resolve) => setTimeout(() => resolve(defaultValue), timeoutMs)),
    ]);
}

// 建议 2: 回调错误隔离
try {
    const action = await callbackService.onFileExists?.(fileName, remotePath, remoteUrl);
} catch (error) {
    console.warn('onFileExists callback failed, using default "skip"', error);
    return "skip"; // 默认行为
}

// 建议 3: 服务生命周期管理
await registry.initializeAll(); // 启动时初始化
// ... 使用服务 ...
await registry.disposeAll(); // 关闭时清理
```

## 10. 后果

### 10.1. 积极后果

- **代码可读性高**：线性执行流，易于理解和调试
- **类型安全**：TypeScript 泛型提供编译时检查
- **状态管理清晰**：通过 `RuleContext` 传递，避免全局污染
- **错误可追溯**：统一的 `RuleExecutionError` 包装
- **配置灵活**：支持全局配置和步骤配置合并

### 10.2. 消极后果

- **插件生态需建设**：相比成熟的 Hook 系统（如 Webpack），需要更多文档和示例
- **动态扩展能力有限**：需要在执行前注册所有 Rules，不支持运行时动态加载
- **学习成本**：新开发者需要理解 `ServiceRegistry` 和 `RuleContext` 模式

## 11. 相关链接

- `packages/publish/src/rules/engine.ts` - Rule 引擎实现
- `packages/publish/src/rules/rule-types.ts` - 类型定义
- `packages/publish/src/rules/service-registry.ts` - Service Registry 接口
- `packages/publish/src/rules/services/service-registry-impl.ts` - Service Registry 实现
- `packages/publish/tests/rule-engine.test.ts` - Rule 引擎测试
- `packages/asset/src/upload/types.ts` - 冲突处理策略类型
- [ADR-011: Service 层设计](./ADR-011-service-layer-design.md) - Service 层设计背景

## 12. 总结

当前 Preset 设计采用了现代化的**Service Locator + 命令式管道模式**，成功避免了传统回调的复杂性，在灵活性和可维护性之间取得了良好平衡。

**核心设计原则**：

1. **控制流优先**：线性执行优于回调嵌套
2. **状态传递安全**：`RuleContext` 优于闭包/全局变量
3. **错误统一处理**：包装错误优于分散处理
4. **类型安全第一**：泛型接口优于 `any` 回调
5. **适度扩展**：Service Registry 支持插件但不引入过度抽象

现存的少量回调（`onProgress`、`getNextCounterValue`）都有合理的回退机制，整体设计符合业界最佳实践。
