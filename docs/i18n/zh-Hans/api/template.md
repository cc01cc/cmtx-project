---
title: "@cmtx/template API"
category: api
sidebar_order: 4
lang: zh-Hans
package: "@cmtx/template"
status: stable
---

# @cmtx/template API

> 模板渲染工具包，提供 `{variable}` 语法模板渲染功能。


::: warning
CMTX 仍处于活跃开发阶段，API 可能随版本迭代发生变化。如有疑问或发现文档错误，欢迎通过 [GitHub Issues](https://github.com/cc01cc/cmtx-project/issues) 反馈。
:::

## 安装

```bash
pnpm add @cmtx/template
```

## 快速开始

```typescript
import { renderTemplate } from '@cmtx/template'

// 基础渲染
const result = renderTemplate('Hello, {name}!', { name: 'World' })
console.log(result) // 'Hello, World!'
```

## 模板渲染

### renderTemplate

核心模板渲染函数，使用 `{variable}` 语法进行变量替换。

```ts
function renderTemplate(
  template: string,
  context: TemplateContext,
  options?: RenderTemplateOptions,
): string
```

| 参数 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `template` | `string` | — | 模板字符串，使用 `{variable}` 语法 |
| `context` | `TemplateContext` | — | 上下文变量对象 |
| `options` | `RenderTemplateOptions` | — | 可选配置参数（可选） |

`RenderTemplateOptions`：

| 属性 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `emptyString` | `'replace' \| 'preserve'` | `'replace'` | 空字符串处理策略：替换为空或保留占位符 |
| `trimWhitespace` | `boolean` | `true` | 是否自动 trim 变量名中的空格 |
| `postProcess` | `((result: string) => string)` | — | 后处理函数，用于路径规范化等 |

#### 返回值

`string` — 渲染后的字符串，模板变量被实际值替换。

```typescript
// 基本用法
renderTemplate('Hello {name}!', { name: 'World' })
// => 'Hello World!'

// 多个变量
renderTemplate('{greeting} {name}!', { greeting: 'Hello', name: 'World' })
// => 'Hello World!'

// 未定义变量替换为空字符串
renderTemplate('Hello {name}!', {})
// => 'Hello !'

// 保留空字符串占位符
renderTemplate('{alt}', { alt: '' }, { emptyString: 'preserve' })
// => '{alt}'

// 后处理：路径规范化
renderTemplate('{dir}/{name}', { dir: 'a', name: 'b' }, {
  postProcess: (s) => s.replace(/\/+/g, '/'),
})
// => 'a/b'
```

## 类型定义

### TemplateContext

模板变量上下文类型。

```ts
interface TemplateContext {
  [key: string]: string | number | boolean | undefined
  date?: string
  timestamp?: string
  uuid?: string
}
```

## 参考

- 完整类型定义请查阅 [TypeDoc 生成的参考文档](/cmtx/typedoc/)
- 源码：[GitHub - packages/template](https://github.com/cc01cc/cmtx-project/tree/main/packages/template)
