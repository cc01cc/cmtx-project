# @cmtx/rule-engine

[![npm version](https://img.shields.io/npm/v/@cmtx/rule-engine.svg)](https://www.npmjs.com/package/@cmtx/rule-engine)
[![License](https://img.shields.io/npm/l/@cmtx/rule-engine.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Markdown 文档处理库 —— 规则引擎、内容变换、元数据管理、跨平台适配。

提供可扩展的内容变换规则集（移除 frontmatter、提升标题层级、添加章节编号、转换图片语法、上传图片等），通过可配置的 Preset 编排执行。适用于 CLI 批量处理、VS Code 集成和 AI Agent（MCP）工作流。

> 完整 API 文档：`pnpm run docs`（生成于 `docs/api/`）

## 1. 安装

```bash
pnpm add @cmtx/rule-engine
```

## 2. Preset 系统

Preset 是按顺序执行的规则集合。通过 Preset 系统实现内容变换和跨平台适配。内置以下预设规则：

| 规则 | 类型 | 说明 |
|------|------|------|
| `fm-validate` | 文本 | 校验 front matter 字段格式 |
| `frontmatter-id` | 文本 | 按 template 生成 ID（{counter_<id>}/{ff1}/{sha256_N}/{uuid}）|
| `frontmatter-map` | 文本 | 字段映射/重命名/新增 |
| `frontmatter-slug` | 文本 | Slug 生成（AI/extract/transform 三种策略）|
| `directory-create` | 文件 | 创建目标目录结构 |
| `file-copy` | 文件 | 写入文件 + 解析 asset + 更新关联 |

完整 publish preset 配置示例参见 `.cmtx/config.yaml`。

```ts
import { registerPreset, adaptMarkdown, getRegisteredPresets } from "@cmtx/rule-engine";

// 注册自定义 Preset（规则名数组）
registerPreset("my-blog", [
    "strip-frontmatter",
    "promote-headings",
    "add-section-numbers",
    "upload-images",
]);

// 应用 Preset
const adapted = await adaptMarkdown("## Section\nContent", "my-blog");
console.log(adapted.content);

// 获取已注册的 Preset 列表
console.log(getRegisteredPresets());
```

## 3. 图片处理

### 3.1. processImagesForPublish

处理 Markdown 文件中的图片以准备发布，支持 Markdown img -> HTML img 转换、调整尺寸、上传本地图片到云端。

```ts
import { processImagesForPublish } from "@cmtx/rule-engine";

const result = await processImagesForPublish("./article.md", {
    convertToHtml: true,
    width: "480",
});

console.log(result.content);
console.log(result.stats); // { converted: 2, resized: 1, uploaded: 3 }
```

### 3.2. formatForPublish

在图片处理基础上增加 frontmatter 处理：将一级标题转换为 title 字段、添加/更新其他字段。

```ts
import { formatForPublish } from "@cmtx/rule-engine";

const result = await formatForPublish("./article.md", {
    convertToHtml: true,
    convertTitle: true,
    frontmatter: { date: "2026-04-05", tags: ["blog", "tech"] },
});
```

**选项：**

| 选项            | 类型                               | 说明                              |
| --------------- | ---------------------------------- | --------------------------------- |
| `convertToHtml` | boolean                            | 是否将 Markdown 图片转为 HTML img |
| `width`         | string                             | HTML img width 属性               |
| `height`        | string                             | HTML img height 属性              |
| `upload`        | UploadConfig                       | 上传配置                          |
| `dryRun`        | boolean                            | 预览模式，不实际执行              |
| `convertTitle`  | boolean                            | 是否将一级标题转为 frontmatter    |
| `frontmatter`   | Record<string, string \| string[]> | 要添加/更新的 frontmatter 字段    |
| `autoMetadata`  | AutoMetadataOptions                | 自动生成 ID/date/updated          |

## 4. Node.js 批处理

### 4.1. 文档渲染与校验

```ts
import { renderDirectory, renderFile, validateFile } from "@cmtx/rule-engine/node";

const html = await renderFile("./article.md", {
    platform: "my-blog",
    outFile: "./output/article.html",
});

const validation = await validateFile("./article.md", {
    platform: "my-blog",
});

const result = await renderDirectory("./docs", {
    outDir: "./output",
    platform: "my-blog",
});
```

### 4.2. 文件级图片上传

```ts
import { publishAndReplaceFile, publishAndReplaceDirectory } from "@cmtx/rule-engine/node";
import { createAdapter } from "@cmtx/storage/adapters/factory";

const adapter = await createAdapter(credentials);

// 单文件：上传图片并替换引用
await publishAndReplaceFile("./article.md", {
    adapter,
    namingTemplate: "{date}/{name}.{ext}",
    prefix: "blog/images",
});

// 目录批量：上传目录内所有 md 的图片
await publishAndReplaceDirectory(["./doc1.md", "./doc2.md"], {
    adapter,
    namingTemplate: "{md5_16}{ext}",
});
```

## 5. 规则引擎

直接使用 RuleEngine 编程式操作：

```ts
import { createRuleEngine, createDefaultRuleEngine, RuleEngine,
         stripFrontmatterRule, promoteHeadingsRule } from "@cmtx/rule-engine";

const engine = createDefaultRuleEngine();
const result = await engine.executePreset(
    [stripFrontmatterRule, promoteHeadingsRule],
    { document: markdown, filePath: "", services: createServiceRegistry() },
);
```

## 6. FF1 格式保留 ID 生成

### 6.1. IdGenerator

```ts
import { IdGenerator } from "@cmtx/rule-engine";

const generator = new IdGenerator();

// 自增计数器 ID（需要 CounterService）
const counterValue = generator.generateCounterValue(42, { length: 6, radix: 36 });
// → "000042"

// body-only hash（自动剥离 frontmatter）
const hash = generator.generateHashFromBody("---\ntitle: Test\n---\n\nBody content", "sha256", 8);
// → "a1b2c3d4"

// template 渲染（集成 counter/hash/ff1/uuid）
const rendered = generator.renderTemplateWithContext("{counter_global}-{sha256_8}", {
    counterService,
    counterConfigs: { global: { length: 6, radix: 36 } },
    document: "---\ntitle: Test\n---\n\nBody content",
});
// → "000001-a1b2c3d4"

// FF1 格式保留加密（需先 ensureWasmLoaded）
await ensureWasmLoaded();
const encrypted = generator.encryptFF1("ABC123", "your-32-byte-secret-key!!");
// → "X7K9M2"

// 解密
const decrypted = generator.decryptFF1("X7K9M2", "your-32-byte-secret-key!!");
// → "ABC123"

// 传统策略（保持兼容）
generator.generate("uuid");
generator.generate("slug", "Title");
generator.generate("md5", "content");
```

### 6.2. formatForPublish 集成

```ts
import { formatForPublish, ensureWasmLoaded } from "@cmtx/rule-engine";

await ensureWasmLoaded();

const result = await formatForPublish("./article.md", {
    autoMetadata: {
        idTemplate: "{sha256_8}",   // 或 "{ff1}", "{uuid}", "post-{sha256_8}"
        idFieldName: "id",
        idPrefix: "",
        idFf1: {                    // 仅 idTemplate 含 {ff1} 时需配置
            useCounter: "global",
            encryptionKey: "your-32-byte-secret-key!!",
        },
        autoDate: true,
        autoUpdated: true,
    },
});
```

## 7. 开发

```bash
pnpm build      # 构建
pnpm test       # 测试
pnpm lint       # 代码检查
pnpm run docs   # 生成 API 文档
```
