---
title: DEV-011 - API 文档编写规范
category: dev-guide
sidebar_order: 11
lang: zh-Hans
---

# DEV-011: API 文档编写规范

> 定义 CMTX 手写 API 文档的统一编写规范、Frontmatter schema、包拆分方案和 Markdown 语法约定。

## 1. Frontmatter 规范

### 1.1. 基础字段（继承 DEV-010）

| 字段              | 必填 | 值                        | 说明              |
| ----------------- | ---- | ------------------------- | ----------------- |
| `title`           | 是   | `"@cmtx/core - 图片模块"` | 页面标题          |
| `category`        | 是   | `api`                     | 固定为 `api`      |
| `lang`            | 是   | `zh-Hans`                 | BCP 47 语言标签   |
| `sidebar_order`   | 是   | 见分配表                  | 排序权重          |
| `skip_doc_render` | 否   | `false`                   | 索引页设为 `true` |

### 1.2. API 文档专用字段

| 字段           | 必填 | 类型   | 示例           | 说明                                   |
| -------------- | ---- | ------ | -------------- | -------------------------------------- |
| `package`      | 是   | string | `"@cmtx/core"` | 所属包名                               |
| `module`       | 推荐 | string | `"image"`      | 功能模块标识，多文件拆分时标明范围     |
| `module_order` | 否   | number | `1`            | 同包内模块排序，仅多文件时使用         |
| `status`       | 否   | string | `"stable"`     | `stable \| experimental \| deprecated` |
| `since`        | 否   | string | `"0.1.0"`      | 首次引入版本                           |

### 1.3. Frontmatter 示例

单文件包：

```yaml
---
title: "@cmtx/template API"
category: api
sidebar_order: 4
lang: zh-Hans
package: "@cmtx/template"
status: stable
since: "0.1.0"
---
```

多文件拆分包：

```yaml
---
title: "@cmtx/core - 图片模块"
category: api
sidebar_order: 1
lang: zh-Hans
package: "@cmtx/core"
module: image
module_order: 1
status: stable
---
```

### 1.4. sidebar_order 分配表

| order | 文件                                                     | 说明                    |
| :---: | -------------------------------------------------------- | ----------------------- |
|   0   | `README.md`                                              | 索引（skip_doc_render） |
|  1-3  | `core-image.md` / `core-metadata.md` / `core-utils.md`   | @cmtx/core              |
|   4   | `template.md`                                            | @cmtx/template          |
|  5-6  | `storage.md` / `storage-adapters.md`                     | @cmtx/storage           |
|  7-8  | `fpe-wasm.md` / `autocorrect-wasm.md`                    | WASM 包                 |
|  11   | `markdown-it-plugins.md`                                 | presigned-url 系列      |
| 21-23 | `asset-services.md` / `asset-config.md` | @cmtx/asset             |
| 31-32 | `rule-engine-core.md` / `rule-engine-rules.md`           | @cmtx/rule-engine       |
|  50   | `ai.md`                                                  | @cmtx/ai                |

## 2. 文档结构模板

每个包的 API 文档应遵循以下骨架：

```markdown
# @cmtx/{package} API

> 一句话描述包的用途。

## 安装

\`\`\`bash
pnpm add @cmtx/{package}
\`\`\`

## 快速开始

一个完整的导入 + 使用示例。

## {模块名}

### {函数/类/接口名}

\`\`\`ts
函数签名
\`\`\`

描述段落。

#### 参数

| 参数 | 类型 | 默认值 | 说明 |

#### 返回值

类型 + 描述。

#### 示例

\`\`\`typescript
代码示例
\`\`\`

## {下一个模块}
...
```

### 2.1. 标题层次约定

> 通用 heading 层级规则见 `DOC-001 §2`。以下是 API 文档特有的标题层级：

| 元素       | 标题级别 | 说明                    |
| ---------- | -------- | ----------------------- |
| 页面主标题 | `#`      | `@cmtx/{package} API`   |
| 功能模块   | `##`     | 对应 `@category` 分组名 |
| 具体 API   | `###`    | 函数/类/接口/类型别名名 |
| 子元素     | `####`   | 参数、返回值、示例      |

## 3. Markdown 语法约定

### 3.1. 函数签名

使用 ` ```ts ` 代码块包裹 TypeScript 签名，紧随标题之后：

```markdown
### filterImagesInText

\`\`\`ts
function filterImagesInText(
  text: string,
  options: ImageFilterOptions,
): ImageMatch[]
\`\`\`
```

规则：

- 去掉 `export`、`default`、`async` 等修饰符，保持签名简洁
- 多重重载用多个连续签名块展示
- 类签名展示构造函数和关键方法

### 3.2. 参数表格

使用 4 列标准表格：

```markdown
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `text` | `string` | — | 要处理的 Markdown 文本 |
| `options` | `ImageFilterOptions` | — | 筛选选项 |
| `mode` | `'sourceType' \| 'hostname'` | `'sourceType'` | 筛选模式 |
```

规则：

- 第 1 列：参数名，反引号包裹
- 第 2 列：TypeScript 类型，反引号包裹
- 第 3 列：默认值，没有则用 `—`（em dash）
- 第 4 列：中文说明
- 可选参数标记：末尾加 `（可选）` 标注
- 参数 <= 2 个且类型简单时，可用列表代替表格

### 3.3. 类型参数（泛型）

```markdown
| 参数 | 约束 | 说明 |
|------|------|------|
| `T` | `extends Record<string, any>` | 数据类型 |
```

### 3.4. 返回值

单值返回值用行内代码 + 段落：

```markdown
#### 返回值

`Promise<ImageMatch[]>`

解析后的图片匹配结果数组。
```

多属性返回值用 3 列表格：

```markdown
| 属性 | 类型 | 说明 |
|------|------|------|
| `text` | `Ref<string>` | 剪贴板当前内容 |
| `copy` | `(text?: string) => Promise<void>` | 复制文本到剪贴板 |
| `copied` | `Ref<boolean>` | 最近是否复制成功 |
```

### 3.5. 代码示例

单示例用 ` ```typescript ` 块（推荐全称 `typescript` 而非 `ts`，VitePress 语法高亮更完整）：

````markdown
```typescript
import { filterImagesInText } from '@cmtx/core'

const images = filterImagesInText(markdown, { mode: 'sourceType', value: 'local' })
```
````

多框架/API 风格对比用 `::: code-group`：

```markdown
::: code-group

\`\`\`typescript [CLI 用法]
cmtx image analyze --input README.md
\`\`\`

\`\`\`typescript [API 用法]
import { analyzeImages } from '@cmtx/core'
\`\`\`

:::
```

### 3.6. 行内代码高亮

```markdown
\`\`\`typescript{4}
function process(text: string) {
  const result = transform(text)
  if (!result) throw new Error('Failed')
  return result
}
\`\`\`
```

差异标记（展示变更）：

```markdown
\`\`\`typescript
const old = 'removed' // [!code --]
const young = 'added'  // [!code ++]
\`\`\`
```

### 3.7. 自定义容器

| 容器           | 用途       | 示例场景                 |
| -------------- | ---------- | ------------------------ |
| `::: tip`      | 正向建议   | 推荐使用的替代 API       |
| `::: warning`  | 注意事项   | 实验性 API、签名可能变化 |
| `::: info`     | 补充信息   | 实现说明、性能提示       |
| `::: danger`   | 警告       | 破坏性操作、数据丢失风险 |
| `::: details`  | 可折叠内容 | 长类型定义、多示例       |
| `> [!NOTE]`    | 简短标注   | 用户须知                 |
| `> [!TIP]`     | 简短建议   | 最佳实践                 |
| `> [!WARNING]` | 简短警告   | 潜在问题                 |
| `> [!CAUTION]` | 简短危险   | 负面后果                 |

完整示例：

```markdown
::: tip
使用 `filterImagesInText` 替代 `parseImages` 以获得更好的过滤能力。
:::

::: warning
此 API 在当前版本中仍处于实验阶段，签名可能发生变化。
:::

::: details 点击查看详细类型定义
\`\`\`typescript
interface ImageFilterOptions {
  mode: 'sourceType' | 'hostname' | 'absolutePath' | 'regex'
  value: string
}
\`\`\`
:::

> [!NOTE]
> 所有函数均为纯同步操作，不会触发异步行为。
```

### 3.8. 跨包引用

同一包内用锚点：

```markdown
详见 [filterImagesInText](#filterimagesintext)
```

跨包用 Markdown 文件链接：

```markdown
图片上传功能由 [@cmtx/asset](./asset.md) 提供。
```

引用 TypeDoc 类型参考：

```markdown
完整类型定义请查阅 [TypeDoc 参考](/cmtx/typedoc/)
```

## 4. 内容编写规范

### 4.1. 必写内容

| 内容          | 形式                                                       | 说明                        |
| ------------- | ---------------------------------------------------------- | --------------------------- |
| 包说明        | H1 下引用块                                                | 一句话说清包的职责          |
| 安装命令      | ` ```bash ` 代码块 | `pnpm add @cmtx/{pkg}`                |                             |
| 快速开始      | ` ```typescript ` 代码块 | 一个完整、可运行的导入→使用示例 |                             |
| 核心函数      | 签名 + 参数表 + 返回值 + 示例                              | 每个 `@category` 的主要函数 |
| 核心接口/类型 | ` ```typescript ` 定义 + 属性表 | 公共接口类型             |                             |

### 4.2. 推荐内容

| 内容          | 形式             | 何时使用                  |
| ------------- | ---------------- | ------------------------- |
| 工具函数汇总  | 3+ 列表格        | 有 3 个以上同类工具函数时 |
| 错误码表      | 2 列表格         | API 显式抛出错误时        |
| 边界情况说明  | 自然段落         | 特殊输入需要额外说明时    |
| 对比示例      | `::: code-group` | 有不同 API 风格时         |
| 相关 API 索引 | 链接列表         | 包内功能间关系复杂时      |

### 4.3. 不写内容

- `@internal` 标记的符号
- `@deprecated` 标记的符号
- 测试辅助函数和测试工具
- 临时性、实验性的导出
- TypeDoc 已生成且足够清晰的细粒度类型定义

### 4.4. 命名约定

| 元素                   | 约定                                                                        |
| ---------------------- | --------------------------------------------------------------------------- |
| 页面 frontmatter title | 单文件：`@cmtx/{package} API`；多文件：`@cmtx/{package} - {模块}`           |
| H1 标题                | 同上                                                                        |
| 文件名                 | 单文件：`{package}.md`；多文件：`{package}-{module}.md`，如 `core-image.md` |
| 文件目录               | 扁平结构，全部在 `docs/i18n/{lang}/api/` 下，无子目录                       |
| H2 标题                | 中文功能模块名（对应 `@category`）                                          |
| H3 标题                | 源码中的函数/类/接口名（使用原始 camelCase）                                |

### 4.5. 包拆分方案

按包的 public API 数量和 `@category` 分组数量决定文件拆分：

| 包                         | 文件数 | 文件清单                                                                                    |
| -------------------------- | :----: | ------------------------------------------------------------------------------------------- |
| `@cmtx/core`               |   3    | `core-image.md`(图片 26)、`core-metadata.md`(元数据 22)、`core-utils.md`(工具/日志/监控 17) |
| `@cmtx/asset`              |   2    | `asset-services.md`(服务层)、`asset-config.md`(配置) |
| `@cmtx/storage`            |   2    | `storage.md`(核心接口)、`storage-adapters.md`(适配器实现)                                   |
| `@cmtx/template`           |   1    | `template.md`                                                                               |
| `@cmtx/rule-engine`        |   2    | `rule-engine-core.md`(引擎与发布格式化)、`rule-engine-rules.md`(内置规则)                   |
| `@cmtx/fpe-wasm`           |   1    | `fpe-wasm.md`                                                                               |
| `@cmtx/autocorrect-wasm`   |   1    | `autocorrect-wasm.md`                                                                       |
| presigned-url 系列（合并） |   1    | `markdown-it-plugins.md`                                                                    |
| `@cmtx/ai`                 |   1    | `ai.md`                                                                                     |

**拆分原则**：单个 `@category` 组的 export >= 15 → 拆独立文件；整个包 export <= 20 → 单文件；两个包功能耦合（plugin + adapter）→ 合并；WASM 包装器 → 单文件。

## 5. 编写流程

### 5.1. 初始编写

1. 阅读包的 `index.ts`，按 `@category` 分组整理公共导出
2. 参考第 3.5 节确定文件拆分（单文件或多文件）
3. 在 `docs/i18n/zh-Hans/api/` 下创建 `{pkg}-{module}.md`，写入 frontmatter
4. 按照第 1 节的模板骨架填充：安装 → 快速开始 → 模块分组
5. 对每个核心函数：写签名 → 参数表 → 返回值 → 示例
6. 同类工具函数合并为汇总表格
7. 查阅 TypeDoc 输出验证签名精确性
8. 在 LYJ VitePress 开发服务器中预览渲染效果
9. 对照第 3 节的内容清单完成自查

### 5.2. 维护流程

API 文档随代码变更动态更新：

| 触发条件 | 操作 | 验证方式 |
|----------|------|----------|
| 新增 public export | 在对应 `api/*.md` 中添加签名+参数表+返回值+示例 | `pnpm docs:sync` 验证 |
| public export 签名变更 | 更新参数表和返回值描述 | `pnpm docs:sync` 验证 |
| public export 已删除 | 从 `api/*.md` 中移除对应条目 | `pnpm docs:sync` 验证 |
| 函数标记 `@deprecated` | 在 API 文档中标注 deprecated 并注明替代方案 | `api-review checklist` |
| 包内 `@category` 重组 | 重新审核文件拆分方案 | — |

**README 不要求同步 API 细节**—README 只展示代表性 API 和快速开始示例，完整的 API 参考以 `docs/api/` 下手写文档为准。

## 6. LYJ 兼容性

手写 API 文档通过 `category: api` 字段集成到 LYJ `generate-config.ts` 的 sidebar 生成链路：

- `generate-config.ts` 的 `CAT_ORDER` 需新增 `api: 5`
- `LABELS` 需新增 `api: "API 参考"` / `api: "API Reference"`
- 导航栏 `API` 链接从 `/cmtx/typedoc/` 改为 `/cmtx/api/`

当前 LYJ `generate-config.ts` 只处理 `guide/config/dev/adr` 四个 category，不包含 `api`。上述修改在 LYJ SPRINT-009 中配合执行。

## 7. 参考

- 本规范的示例实现：`docs/i18n/zh-Hans/api/core-image.md`
- 文档目录与 frontmatter 要求：`DEV-010-documentation-layout-and-frontmatter.md`
- 包拆分方案详细设计：`SPRINTS/SPRINT-002-api-docs-writing-standards/design.md`
- LYJ 兼容修改：`LYJ SPRINT-009`
- 类型定义参考：TypeDoc 生成的 `docs/typedoc/`
- 业界参考：VueUse (<https://vueuse.org/>)、Pinia (<https://pinia.vuejs.org/>)、Vitest (<https://vitest.dev/>)
