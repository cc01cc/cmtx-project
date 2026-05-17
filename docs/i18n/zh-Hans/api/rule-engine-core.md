---
title: "@cmtx/rule-engine - 核心引擎"
category: api
sidebar_order: 31
lang: zh-Hans
package: "@cmtx/rule-engine"
module: core
status: stable
---

# @cmtx/rule-engine - 核心引擎

> 规则引擎核心模块，提供 Rule 注册、执行和 Preset 管理功能。


::: warning
CMTX 仍处于活跃开发阶段，API 可能随版本迭代发生变化。如有疑问或发现文档错误，欢迎通过 [GitHub Issues](https://github.com/cc01cc/cmtx-project/issues) 反馈。
:::

## 安装

```bash
pnpm add @cmtx/rule-engine
```

## 快速开始

```typescript
import { createRuleEngineContext, createDefaultRuleEngine } from '@cmtx/rule-engine'

// 1. 创建引擎 + 服务注册表
const { engine, registry } = createRuleEngineContext()

// 2. 使用内置 Preset
const context = {
  document: '# Hello\n\n![img](./local.png)',
  filePath: '/path/to/doc.md',
  baseDirectory: '/path/to',
  services: registry,
}

// 3. 执行 Preset
const result = await engine.executePreset(
  ['strip-frontmatter', 'upload-images'],
  context,
)
```

## 规则引擎

规则引擎模块提供 Rule 的注册、执行和 Preset 管理功能。

### RuleEngine

Rule 引擎类，管理和执行所有 Rule。

```ts
class RuleEngine {
  register(rule: Rule): void
  registerMany(rules: Rule[]): void
  getRule(id: string): Rule | undefined
  getAllRuleIds(): string[]
  setGlobalConfig(config: GlobalRulesConfig): void
  executeRule(
    ruleId: string,
    context: RuleContext,
    ruleConfig?: Record<string, unknown>,
  ): Promise<RuleResult>
  executePreset(
    preset: PresetConfig | SimplePreset,
    context: RuleContext,
    onProgress?: (ruleId: string, result: RuleResult) => void,
  ): Promise<{ content: string; results: Array<{ ruleId: string; result: RuleResult }> }>
  previewPreset(
    preset: PresetConfig | SimplePreset,
    context: RuleContext,
  ): Promise<{ content: string; changes: Array<{ ruleId: string; willModify: boolean }> }>
}
```

| 方法 | 说明 |
|------|------|
| `register` | 注册单个 Rule |
| `registerMany` | 批量注册 Rules |
| `getRule` | 获取指定 ID 的 Rule |
| `getAllRuleIds` | 获取所有已注册的 Rule ID |
| `setGlobalConfig` | 设置全局 Rules 配置 |
| `executeRule` | 执行单个 Rule |
| `executePreset` | 按顺序执行 Preset 中的所有 Rule |
| `previewPreset` | 预览 Preset 效果（不实际修改） |

#### 示例

```typescript
const engine = createDefaultRuleEngine()

const result = await engine.executePreset(
  ['strip-frontmatter', 'promote-headings'],
  { document: content, filePath: '', services: registry },
)
```

### createRuleEngine

创建空的 Rule 引擎实例。

```ts
function createRuleEngine(): RuleEngine
```

### createDefaultRuleEngine

创建默认配置的 Rule 引擎实例（自动注册所有内置规则）。

```ts
function createDefaultRuleEngine(): RuleEngine
```

### createRuleEngineContext

创建 Rule 引擎上下文，封装引擎创建、服务注册、上下文构建的标准流程。

```ts
function createRuleEngineContext(
  options?: CreateRuleEngineContextOptions,
): RuleEngineContextResult
```

| 参数 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `options` | `CreateRuleEngineContextOptions` | `undefined` | 创建选项（可选） |

`CreateRuleEngineContextOptions`：

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `upload` | `UploadServiceConfig` | 上传服务配置 |
| `download` | `DownloadServiceConfig` | 下载服务配置 |
| `transfer` | `TransferServiceConfig` | 转移服务配置 |

#### 返回值

`RuleEngineContextResult`：

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `engine` | `RuleEngine` | Rule 引擎实例（已注册内置规则） |
| `registry` | `ServiceRegistry` | 服务注册表（内部类型，通过 `createRuleEngineContext()` 创建） |

## Preset（预设）

预设是一组按顺序执行的 Rule ID 列表。通过 `engine.executePreset()` 执行。

### SimplePreset

简洁版预设，仅包含 Rule ID 列表。

```ts
type SimplePreset = string[]
```

```typescript
const preset: SimplePreset = [
  'strip-frontmatter',
  'promote-headings',
  'frontmatter-title',
]
```

### PresetConfig

完整版预设配置。

```ts
interface PresetConfig {
  id: string
  name: string
  description?: string
  steps: RuleStepConfig[]
}
```

## 参考

- 完整类型定义请查阅 [TypeDoc 参考](/cmtx/typedoc/)
- 内置规则文档：[rule-engine-rules](./rule-engine-rules.md)
- 源码：[GitHub - packages/rule-engine](https://github.com/cc01cc/cmtx-project/tree/main/packages/rule-engine)
