# ADR-013: Rule 级别回调的复杂度影响分析

- **状态**: Proposed
- **日期**: 2026-04-22
- **作者**: Kilo
- **相关问题**: Rule 内部回调是否会导致 Preset 设计过度复杂

## 1. 背景

当前 `@cmtx/rule-engine` 的 Preset 设计中，已经存在 Rule 级别的回调（如 `frontmatter-id` Rule 的 `getNextCounterValue`）。这引发了一个架构问题：

> 如果每个 Rule 都可以有自己的回调，是否会导致 Preset 设计变得非常复杂？

## 2. 现状：当前已有的 Rule 回调

### 2.1. `frontmatter-id` Rule 的回调

```typescript
interface GenerateIdConfig {
    // ... 其他配置

    /** 获取下一个计数器值的回调（可选） */
    getNextCounterValue?: () => Promise<number>;
}

export const frontmatterIdRule: Rule = {
    async execute(context: RuleContext, config?: GenerateIdConfig): Promise<RuleResult> {
        // 优先使用回调（在验证后递增）
        if (config?.getNextCounterValue) {
            nextCounterValue = await config.getNextCounterValue();
        }
        // 回退到 counterService（旧方式）
        else {
            const counterService = services.get<CounterService>("counter");
            if (counterService) {
                nextCounterValue = counterService.next();
            }
        }
    },
};
```

### 2.2. 设计意图

这个回调的设计目的是：

1. **控制计数器递增时机**：在验证成功后再递增，避免失败时浪费计数器
2. **应用层控制**：让应用层决定计数器的行为（如持久化、分布式锁等）
3. **回退机制**：有 `CounterService` 作为回退，不是强制回调

## 3. 复杂度影响分析

### 3.1. 复杂度层次

```
┌─────────────────────────────────────────────────────────────┐
│ 层次 1: Preset 级别回调                                      │
│ executePreset(preset, context, onProgress)                  │
│ - onProgress: 每个 Rule 执行后调用                           │
├─────────────────────────────────────────────────────────────┤
│ 层次 2: Rule 级别回调                                        │
│ config.getNextCounterValue?: () => Promise<number>          │
│ - 仅特定 Rule 需要，有回退机制                               │
├─────────────────────────────────────────────────────────────┤
│ 层次 3: Service 级别回调                                     │
│ CallbackService.onFileExists?: (...) => Promise<...>        │
│ - 已升级为 Strategy 模式，减少回调使用                       │
└─────────────────────────────────────────────────────────────┘
```

### 3.2. 如果每个 Rule 都有回调会怎样？

#### 场景：假设每个 Rule 都添加回调

```typescript
// ❌ 过度复杂的示例
interface TextReplaceRuleConfig {
    match: string;
    replace: string;
    onBeforeReplace?: (content: string) => void;
    onAfterReplace?: (content: string) => void;
}

interface ConvertImagesRuleConfig {
    convertToHtml?: boolean;
    onBeforeConvert?: (images: Image[]) => void;
    onAfterConvert?: (html: string) => void;
}

interface FrontmatterTitleRuleConfig {
    headingLevel?: number;
    onBeforeExtract?: (title: string) => void;
    onAfterExtract?: (frontmatter: Frontmatter) => void;
}
```

**问题**：

1. **配置爆炸**：每个 Rule 的配置接口膨胀 3-5 倍
2. **Preset 配置复杂**：用户需要为每个 Step 配置多个回调
3. **调试困难**：回调嵌套导致堆栈追踪困难
4. **类型推断变差**：泛型嵌套过深
5. **测试成本高**：每个回调都需要 mock

#### 实际复杂度对比

| 设计                   | Preset 配置复杂度   | Rule 配置复杂度            | 总体评价    |
| ---------------------- | ------------------- | -------------------------- | ----------- |
| **当前设计**           | 低（仅 onProgress） | 低（仅 1 个 Rule 有回调）  | ✅ 合理     |
| **每个 Rule 都有回调** | 低                  | 高（每个 Rule 3-5 个回调） | ❌ 过度复杂 |
| **混合设计**           | 中                  | 中（仅复杂 Rule 有回调）   | ⚠️ 需谨慎   |

### 3.3. 复杂度计算公式

```
总复杂度 = Preset 回调数 + Σ(Rule_i 回调数 × Rule_i 被使用频率)

当前设计：
= 1 (onProgress) + 1 (getNextCounterValue) × 0.3 (使用频率)
= 1.3  ← 低复杂度

如果每个 Rule 都有 3 个回调：
= 1 + 15 (内置 Rules) × 3 × 0.5 (平均使用频率)
= 23.5  ← 高复杂度（爆炸）
```

## 4. 设计原则

### 4.1. 何时使用 Rule 级别回调？

**✅ 适合使用回调的场景**：

1. **需要外部控制时机**：如 `getNextCounterValue` 需要在验证后调用
2. **有合理的回退机制**：如 `CounterService` 可作为回退
3. **调用频率低**：如 ID 生成只在初始化时调用
4. **业务逻辑需要**：如应用层需要记录审计日志

**❌ 不适合使用回调的场景**：

1. **纯文本转换**：如 `text-replace` 不需要回调
2. **高频调用**：如每个图片都调用的回调
3. **可以用 Strategy 替代**：如冲突处理已升级为 Strategy
4. **可以通过 Service 实现**：如日志记录用 `LoggerService`

### 4.2. 回调设计的三层模型

```
┌───────────────────────────────────────────────────────────┐
│ Layer 1: Preset 层                                         │
│ 职责：编排多个 Rule 的执行                                  │
│ 回调：onProgress (仅用于 UI 反馈)                          │
│ 特点：简单、统一、无业务逻辑                              │
├───────────────────────────────────────────────────────────┤
│ Layer 2: Rule 层                                           │
│ 职责：执行特定处理逻辑                                     │
│ 回调：极少（仅当前端需要控制时机时）                       │
│ 特点：有回退、低频、业务相关                              │
├───────────────────────────────────────────────────────────┤
│ Layer 3: Service 层                                        │
│ 职责：提供扩展能力（存储、计数器等）                        │
│ 回调：已升级为 Strategy 模式                               │
│ 特点：可预测、类型安全、无回调地狱                        │
└───────────────────────────────────────────────────────────┘
```

## 5. 对比：其他框架的回调设计

### 5.1. Webpack (tapable Hook 系统)

```javascript
// Webpack 中每个 Hook 都可以有回调
compiler.hooks.compile.tapAsync("MyPlugin", (params, callback) => {
    // ...
    callback();
});

compiler.hooks.done.tapAsync("MyPlugin", (stats, callback) => {
    // ...
    callback();
});

// 问题：需要理解 tap/tapAsync/tapPromise 的区别
// 问题：回调地狱风险
```

**评价**：高度灵活但复杂度高，适合插件生态丰富的场景

### 5.2. ESLint (Rule 配置模式)

```javascript
// ESLint 的 Rule 配置
rules: {
    'no-console': 'error',
    'prefer-const': ['warn', { ignoreReadBeforeAssign: true }]
}

// 没有回调，只有配置参数
```

**评价**：简单但扩展性有限，适合静态分析场景

### 5.3. 当前项目 (混合模式)

```typescript
// Preset 层：简单回调
await engine.executePreset(preset, context, onProgress);

// Rule 层：极少回调（仅 frontmatter-id 有）
{
    id: 'frontmatter-id',
    config: { getNextCounterValue: async () => { ... } }
}

// Service 层：Strategy 模式
{
    id: 'upload-images',
    config: { conflictStrategy: { type: 'skip-all' } }
}
```

**评价**：平衡灵活性和复杂度，适合当前项目规模

## 6. 决策与建议

### 6.1. 核心决策

**维持当前设计**：仅允许极少数 Rule 有回调，且必须满足以下条件：

1. **必要性证明**：为什么不能用 Service 或 Strategy 替代？
2. **回退机制**：必须有默认行为或回退服务
3. **低频调用**：不是高频路径
4. **类型安全**：明确的 TypeScript 类型定义

### 6.2. 回调使用 checklist

在添加新的 Rule 回调前，必须回答：

- [ ] 这个回调是否可以用 Service 替代？
- [ ] 是否可以用 Strategy 模式替代？
- [ ] 是否可以通过上下文传递数据而不需要回调？
- [ ] 回调失败时是否有默认行为？
- [ ] 回调是否会被频繁调用（>10 次/文档）？
- [ ] 是否有清晰的类型定义？

如果超过 2 个问题的答案是"是"，则**不应该添加回调**。

### 6.3. 替代方案优先级

```
1. ✅ Service Registry 模式（首选）
   - 通过 context.services.get<T>() 获取能力
   - 类型安全，易于测试

2. ✅ Strategy 模式（次选）
   - 一次性选择策略，避免多次回调
   - 可预测，类型安全

3. ✅ Context 数据传递（简单场景）
   - 通过 context.xxx 传递数据
   - 无回调，线性流程

4. ⚠️ Rule 级别回调（谨慎使用）
   - 仅在必要时使用
   - 必须有回退机制

5. ❌ Preset 级别业务回调（禁止）
   - 不应在 Preset 层注入业务逻辑
   - 业务逻辑应在 Rule 或 Service 层
```

## 7. 示例：正确 vs 错误

### 7.1. 正确示例（当前设计）

```typescript
// ✅ 仅 frontmatter-id 有回调，且有回退
const preset: PresetConfig = {
    steps: [
        {
            id: "frontmatter-id",
            config: {
                encryptionKey: "my-key",
                getNextCounterValue: async () => {
                    // 应用层控制计数器递增时机
                    return await db.incrementCounter();
                },
            },
        },
    ],
};
```

### 7.2. 错误示例（过度复杂）

```typescript
// ❌ 每个 Rule 都有回调，配置爆炸
const preset: PresetConfig = {
    steps: [
        {
            id: 'text-replace',
            config: {
                match: 'foo',
                replace: 'bar',
                onBeforeReplace: (content) => { ... },  // ❌ 不需要
                onAfterReplace: (content) => { ... },   // ❌ 不需要
                onError: (error) => { ... }             // ❌ 统一错误处理即可
            }
        },
        {
            id: 'convert-images',
            config: {
                convertToHtml: true,
                onBeforeConvert: (images) => { ... },   // ❌ 不需要
                onAfterConvert: (html) => { ... }       // ❌ 不需要
            }
        }
    ]
};
```

### 7.3. 改进方案（使用 Service）

```typescript
// ✅ 使用 Service 替代回调
class LoggingTextReplaceRule implements Rule {
    id = "text-replace-with-logging";

    async execute(context: RuleContext, config: TextReplaceConfig): Promise<RuleResult> {
        const logger = context.services.get<LoggerService>("logger");

        logger?.log("Before replace", { match: config.match });

        const result = doReplace(context.document, config);

        logger?.log("After replace", { modified: result.modified });

        return result;
    }
}
```

## 8. 后果

### 8.1. 积极后果

- **保持设计简洁**：Preset 配置易于理解和使用
- **类型安全**：明确的类型定义，IDE 友好
- **易于调试**：线性执行流，堆栈清晰
- **可维护性高**：新增 Rule 不需要修改 Preset 层

### 8.2. 消极后果

- **灵活性有限**：某些极端场景需要自定义 Rule
- **学习成本**：需要理解 Service Registry 模式
- **Rule 开发成本**：复杂 Rule 需要实现 Service 接口

## 9. 总结

**回答原问题**：

> 如果给每个 Rule 自身都添加回调，是不是会导致 Preset 设计非常复杂？

**答案**：是的，会导致配置爆炸和复杂度失控。

**当前设计评价**：

- ✅ Preset 层：仅 `onProgress` 回调（用于 UI 反馈）
- ✅ Rule 层：仅 1 个 Rule 有回调（`frontmatter-id` 的 `getNextCounterValue`）
- ✅ Service 层：已升级为 Strategy 模式，避免回调

**设计原则**：

1. **能不用就不用**：优先使用 Service/Strategy 模式
2. **必须有回退**：回调失败时有默认行为
3. **低频调用**：不是高频路径
4. **类型安全**：明确的 TypeScript 类型

**未来约束**：

- 新增 Rule 回调需要 ADR 级别的讨论
- 必须通过 checklist 审核
- 必须有充分的必要性证明

## 10. 相关链接

- [ADR-012: Preset 与回调设计](./ADR-012-preset-callback-design.md)
- `packages/publish/src/rules/built-in/metadata-rules.ts` - frontmatter-id Rule 实现
- `packages/publish/src/rules/engine.ts` - RuleEngine 实现
- `packages/publish/src/rules/service-registry.ts` - Service Registry 接口
