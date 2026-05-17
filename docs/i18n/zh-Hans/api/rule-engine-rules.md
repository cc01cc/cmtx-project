---
title: "@cmtx/rule-engine - 内置规则"
category: api
sidebar_order: 32
lang: zh-Hans
package: "@cmtx/rule-engine"
module: rules
status: stable
---

# @cmtx/rule-engine - 内置规则

> 规则引擎内置规则模块，提供 Rule 接口定义和所有内置 Rule 实现。


::: warning
CMTX 仍处于活跃开发阶段，API 可能随版本迭代发生变化。如有疑问或发现文档错误，欢迎通过 [GitHub Issues](https://github.com/cc01cc/cmtx-project/issues) 反馈。
:::

## 安装

```bash
pnpm add @cmtx/rule-engine
```

## 使用规则

内置规则通过字符串 ID 调用，不直接 import 规则常量：

```typescript
import { createDefaultRuleEngine } from '@cmtx/rule-engine'

const engine = createDefaultRuleEngine()
const result = await engine.executeRule('convert-images', {
  document: markdown,
  filePath: '/path/to/doc.md',
  services: registry,
})
```

或通过 preset 批量执行：

```typescript
const result = await engine.executePreset(
  ['strip-frontmatter', 'promote-headings'],
  { document: markdown, filePath: '', services: registry },
)
```

## 类型定义

### Rule

Rule 接口，所有 Rule 必须实现。

```ts
interface Rule {
  id: string
  name: string
  description?: string
  execute(context: RuleContext, config?: unknown): Promise<RuleResult> | RuleResult
}
```

### RuleContext

Rule 执行上下文。

```ts
interface RuleContext {
  document: string
  filePath: string
  baseDirectory?: string
  services: ServiceRegistry
  dryRun?: boolean
  input?: Record<string, FrontmatterValue>
}
```

### RuleResult

Rule 执行结果。

```ts
interface RuleResult {
  content: string
  modified: boolean
  messages?: string[]
}
```

## 图片处理规则

| Rule ID | 说明 |
|---------|------|
| `convert-images` | 将 Markdown 图片引用转换为 HTML img 标签 |
| `upload-images` | 上传本地图片到云存储，替换 Markdown 中的引用 |
| `download-images` | 下载远程图片到本地，替换 Markdown 中的引用 |
| `transfer-images` | 在云存储之间转移图片 |
| `delete-image` | 安全删除本地图片（含引用检查） |
| `cleanup-images` | 清理未被引用给孤儿图片 |
| `resize-image` | 调整 HTML img 的 width/height 属性 |

## 元数据规则

| Rule ID | 说明 |
|---------|------|
| `frontmatter-title` | 将 Markdown 一级标题转换为 frontmatter title |
| `frontmatter-id` | 生成并写入 frontmatter id 字段 |
| `frontmatter-date` | 添加 frontmatter date 字段 |
| `frontmatter-updated` | 更新 frontmatter updated 字段 |
| `frontmatter-slug` | 根据标题生成 URL slug |
| `strip-frontmatter` | 移除文档开头的 YAML frontmatter |
| `frontmatter-map` | 根据映射表转换 frontmatter 字段 |
| `fm-validate` | 校验 frontmatter 字段的完整性和格式 |

## 章节规则

| Rule ID | 说明 |
|---------|------|
| `add-section-numbers` | 为标题添加数字编号（如 1.1、1.2） |
| `remove-section-numbers` | 移除已添加的数字编号 |
| `promote-headings` | 提升标题层级（h2→h1, h3→h2） |

## 其他规则

| Rule ID | 说明 |
|---------|------|
| `autocorrect` | AutoCorrect 文案纠正（中英文混排空格、标点符号） |
| `text-replace` | 正则表达式文本替换 |
| `directory-create` | 创建输出目录 |
| `file-copy` | 复制文件到目标目录 |

## 参考

- 完整类型定义请查阅 [TypeDoc 参考](/cmtx/typedoc/)
- 核心引擎文档：[rule-engine-core](./rule-engine-core.md)
- 源码：[GitHub - packages/rule-engine](https://github.com/cc01cc/cmtx-project/tree/main/packages/rule-engine)
