---
title: "@cmtx/core - 工具模块"
category: api
sidebar_order: 3
lang: zh-Hans
package: "@cmtx/core"
module: utils
module_order: 3
status: stable
---

# @cmtx/core - 工具模块

> 提供工具函数、多正则操作、章节编号和日志接口功能。


::: warning
CMTX 仍处于活跃开发阶段，API 可能随版本迭代发生变化。如有疑问或发现文档错误，欢迎通过 [GitHub Issues](https://github.com/cc01cc/cmtx-project/issues) 反馈。
:::

## 安装

```bash
pnpm add @cmtx/core
```

## 快速开始

```typescript
import {
  addSectionNumbers,
  dummyLogger,
  consoleLogger,
} from '@cmtx/core'

// 章节编号
const numbered = addSectionNumbers('# Title\n## Section')

// 日志
dummyLogger.info('静默记录，无输出')
consoleLogger.info('输出到控制台')
```

## 章节编号

### addSectionNumbers

为 Markdown 标题添加数字编号（如 `1.`、`1.1.`、`2.1.1.`）。

```ts
function addSectionNumbers(
  markdown: string,
  options?: SectionNumbersOptions,
): SectionNumbersResult
```

| 参数 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `markdown` | `string` | — | Markdown 文本 |
| `options` | `SectionNumbersOptions` | `{}` | 编号选项（minLevel、maxLevel、startLevel、separator） |

`SectionNumbersResult`：包含 `content`（处理后的文本）、`modified`（是否发生修改）、`headingsCount`（处理的标题数量）属性。

```typescript
const md = `# Title\n## Section 1\n### Subsection\n## Section 2`
const result = addSectionNumbers(md)
// # 1. Title
// ## 1.1. Section 1
// ### 1.1.1. Subsection
// ## 1.2. Section 2
```

### removeSectionNumbers

移除已有章节编号。

```ts
function removeSectionNumbers(
  markdown: string,
  options?: SectionNumbersOptions,
): SectionNumbersResult
```

| 参数 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `markdown` | `string` | — | Markdown 文本 |
| `options` | `SectionNumbersOptions` | `{}` | 编号选项（minLevel、maxLevel、startLevel、separator） |

`SectionNumbersResult`：包含 `content`（处理后的文本）、`modified`（是否发生修改）、`headingsCount`（处理的标题数量）属性。

```typescript
const md = `# 1. Title\n## 1.1. Section`
const result = removeSectionNumbers(md)
// # Title
// ## Section
```

## 日志

### Logger

日志记录器接口，与 `console` 对象形状兼容。

```ts
interface Logger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}
```

| 导出 | 类型 | 说明 |
|:------|:------|:------|
| `consoleLogger` | `Logger` | 基于 `console` 的日志实现，输出到控制台 |
| `dummyLogger` | `Logger` | no-op 实现，所有方法为空函数 |

```typescript
import { type Logger, dummyLogger } from '@cmtx/core'

class MyService {
  constructor(private logger: Logger = dummyLogger) {}
  run() {
    this.logger.info('Service started')
  }
}
```

## generateCounterValue

计数器值格式化函数，将数字转换为指定长度和进制的字符串（补零、进制转换）。

```ts
function generateCounterValue(
  value: number,
  config?: CounterValueConfig,
): string
```

| 参数 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `value` | `number` | — | 计数器值 |
| `config` | `CounterValueConfig` | `{}` | 格式化配置 |

`CounterValueConfig`：

| 属性 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `length` | `number` | `6` | 输出长度（不足补零，超出截断） |
| `radix` | `number` | `36` | 进制（2-36） |

#### 示例

```typescript
import { generateCounterValue } from '@cmtx/core'

generateCounterValue(42, { length: 6, radix: 36 })  // "000042"
generateCounterValue(255, { length: 4, radix: 16 }) // "00FF"
generateCounterValue(5, { length: 3, radix: 10 })   // "005"
generateCounterValue(0, { length: 8, radix: 36 })   // "00000000"
```

## LuhnAlgorithm

卢恩算法（Luhn Algorithm）工具类，支持 radix 2-36 的校验码计算和验证。

```ts
class LuhnAlgorithm {
  static calculateChecksum(str: string, radix?: number, customAlphabet?: string): string
  static validate(strWithChecksum: string, radix?: number, customAlphabet?: string): boolean
  static appendChecksum(str: string, radix?: number, customAlphabet?: string): string
  static stripChecksum(strWithChecksum: string): string
  static validateAndExtract(
    strWithChecksum: string,
    radix?: number,
    customAlphabet?: string,
  ): { valid: boolean; original?: string }
}
```

#### 示例

```typescript
import { LuhnAlgorithm } from '@cmtx/core'

const checksum = LuhnAlgorithm.calculateChecksum('ABC123')
const withCheck = LuhnAlgorithm.appendChecksum('ABC123')
const valid = LuhnAlgorithm.validate(withCheck)  // true
```

## 参考

- 完整类型定义请查阅 [TypeDoc 生成的参考文档](/cmtx/typedoc/)
- 源码：[GitHub - packages/core/src](https://github.com/cc01cc/cmtx-project/tree/main/packages/core/src)
