# @cmtx/core v0.3.0

[![npm version](https://img.shields.io/npm/v/@cmtx/core.svg)](https://www.npmjs.com/package/@cmtx/core)
[![License](https://img.shields.io/npm/l/@cmtx/core.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Markdown 文档处理核心库 - 图片筛选/替换/删除与元数据操作。

> **完整 API 文档**：运行 `pnpm run docs` 生成（位于 `docs/api/` 目录）

## 1. 核心理念

- **原子操作**：提供最小粒度的文档处理功能
- **无业务逻辑**：专注于基础操作，不包含具体业务场景
- **高度可组合**：可与其他包灵活组合使用
- **类型安全**：完整的 TypeScript 支持

## 2. 主要功能模块

### 2.1. 图片处理

支持的图片格式：

- **内联图片**：`![alt](url "title")`
- **HTML 图片**：`<img src="url" alt="alt" title="title" />` （部分属性可选）

#### 2.1.1. 图片筛选

从 Markdown 文本、文件或目录中筛选图片。支持按来源类型、主机名、绝对路径或正则表达式进行过滤。

**支持的图片类型**:

- `WebImageMatch` - Web 图片（http/https URL）
- `LocalImageMatch` - 本地图片（相对路径或绝对路径）

```typescript
import { filterImagesInText, filterImagesFromFile, filterImagesFromDirectory } from "@cmtx/core";

// 从文本中获取所有图片（不过滤）
const allImages = filterImagesInText(markdown);

// 从文本中筛选本地图片
const local = filterImagesInText(markdown, {
  mode: 'sourceType',
  value: 'local'
});

// 从文件中筛选特定主机的图片
const webImages = await filterImagesFromFile("./README.md", {
  mode: 'hostname',
  value: 'cc01cc.cn'
});

// 从目录批量筛选 PNG 图片
const pngImages = await filterImagesFromDirectory("./docs", {
  mode: 'regex',
  value: /\.png$/i
});
```

### 2.2. 元数据处理  

处理 Markdown 文档的元数据，包括标题提取、Frontmatter 生成和部分更新。

#### 2.2.1. 元数据提取

从 Markdown 文件中提取元数据（来自 Frontmatter、标题或文件名）：

```typescript
import { 
  extractMetadata,
  extractSectionHeadings,
  convertHeadingToFrontmatter,
  upsertFrontmatterFields,
  removeFrontmatter
} from "@cmtx/core";

// 从文件提取元数据（优先级：Frontmatter > 标题 > 文件名）
const metadata = await extractMetadata("./docs/README.md", {
  headingLevel: 1  // 用于标题提取的标题等级
});
// => { title: "Document Title", ... }

// 提取特定等级范围的所有标题
const headings = extractSectionHeadings(markdown, {
  minLevel: 2,  // 最小等级（默认 2）
  maxLevel: 4   // 最大等级（默认 6）
});
// => [
//   { level: 2, text: "Section 1" },
//   { level: 3, text: "Subsection 1.1" },
//   ...
// ]
```

#### 2.2.2. Frontmatter 转换和操作

将标题转换为 Frontmatter，或更新现有 Frontmatter：

```typescript
// 将一级标题转换为 YAML Frontmatter
const withFrontmatter = convertHeadingToFrontmatter(markdown, {
  format: 'yaml',
  headingLevel: 1
});

// 更新或添加 Frontmatter 字段
const updated = upsertFrontmatterFields(markdown, {
  title: "New Title",
  tags: ["tech", "guide"],
  author: "John Doe"
}, {
  format: 'yaml',
  createIfMissing: true  // 默认为 true；false 时不创建新的 Frontmatter
});

// 移除 Frontmatter
const cleaned = removeFrontmatter(markdown);

// 删除指定字段
const removed = deleteFrontmatterFields(markdown, ['draft', 'date']);

// 从 Markdown 文本提取标题
const title = extractTitleFromMarkdown(markdown);
// 优先级: Frontmatter.title > 一级标题 > undefined

// 解析和生成 YAML Frontmatter
const parsed = parseYamlFrontmatter('title: "Hello"\ntags:\n  - a\n  - b');
// 结果: { title: "Hello", tags: ["a", "b"] }

const yaml = generateFrontmatterYaml({ title: "Hello", tags: ["a", "b"] });
// 结果: "---\ntitle: Hello\ntags:\n  - a\n  - b\n---"
```

**YAML 支持范围：**

@cmtx/core 使用轻量级的自定义 YAML 解析器，支持：
- ✅ 基础类型：string, number, boolean, null
- ✅ 数组：`[a,b,c]` 或多行 `- item` 格式
- ❌ 复杂对象、嵌套结构
- ❌ 多行字符串、日期类型
- ❌ 锚点、别名等高级特性

**如需完整 YAML 支持，推荐使用 `js-yaml`：**

```typescript
import YAML from 'js-yaml';

// 支持复杂嵌套结构
const data = YAML.parse(`
author:
  name: John Doe
  contact:
    email: john@example.com
description: |
  Multiline string
  support
`);
```

详见 [YAML 支持分析文档](../../docs/YAML_FRONTMATTER_ANALYSIS.md)。

### 2.3. 图片替换

使用正则表达式替换图片的 src、alt 或 title 属性。支持多字段模式和目录批量替换。

**注意**: 替换使用正则表达式匹配，会替换所有符合条件的图片。

```typescript
import { replaceImagesInText, replaceImagesInFile, replaceImagesInDirectory } from "@cmtx/core";

// 多字段替换 - 通过 src 匹配，同时替换多个字段
const result = replaceImagesInText(markdown, [
  {
    field: 'src',
    pattern: './old-path/image.png',
    newSrc: 'https://cdn.example.com/image.png',
    newAlt: '新的图片描述',
    newTitle: '新的图片标题'
  }
]);

console.log(result.newText);        // 替换后的文本
console.log(result.replacements);   // 替换详情 [{before: '...', after: '...'}]

// 通过 raw 精确匹配替换
const exactResult = replaceImagesInText(markdown, [
  {
    field: 'raw',
    pattern: '![](./specific-image.png)',
    newSrc: './updated-image.png',
    newAlt: '精确匹配的图片'
  }
]);

// 使用正则表达式批量替换
const regexResult = replaceImagesInText(markdown, [
  {
    field: 'src',
    pattern: /\.png$/,
    newSrc: (match) => match.replace(/\.png$/, '.webp')
  }
]);

// 替换文件中的图片
const fileResult = await replaceImagesInFile("./README.md", [
  {
    field: 'src',
    pattern: './old-image.png',
    newSrc: './new-image.png'
  }
]);

if (fileResult.success) {
  console.log(`已替换 ${fileResult.result?.replacements.length} 张图片`);
}

// 批量替换目录中的图片
const dirResult = await replaceImagesInDirectory("./docs", [
  { field: 'src', pattern: './old/', newSrc: './new/' }
], {
  patterns: ['**/*.md'],
  ignore: ['**/node_modules/**', '**/.git/**']
});

console.log(`处理了 ${dirResult.totalFiles} 个文件`);
console.log(`成功替换 ${dirResult.totalReplacements} 次`);
```

### 2.4. 图片删除  

安全删除本地图片文件，支持多种策略（trash/move/hard-delete）和重试机制。

安全删除本地图片文件，支持多种策略（trash/move/hard-delete）和重试机制。

```typescript
import { deleteLocalImage, deleteLocalImageSafely } from "@cmtx/core";

// 使用系统回收站删除
const result = await deleteLocalImage("/path/to/image.png", {
  strategy: "trash",
  maxRetries: 3
});

// 安全删除（检查使用情况）
const safeResult = await deleteLocalImageSafely(
  "/project/docs/images/logo.png",
  "/project",
  { strategy: "trash" }
);

if (safeResult.status === "success") {
  console.log("图片已删除");
} else if (safeResult.error?.includes("still in use")) {
  console.log("图片仍在使用中");
}
```

## 3. 删除策略

| 策略          | 说明       | 场景            |
| ------------- | ---------- | --------------- |
| `trash`       | 系统回收站 | 推荐，跨平台 |
| `move`        | 移动到目录 | 可选，保留副本   |
| `hard-delete` | 永久删除   | 需要谨慎        |

### 3.1. 图片解析

从 Markdown 文本中解析图片，支持标准 Markdown 语法和 HTML img 标签。

```typescript
import { parseImages, parseImagesMdSingleline, parseImagesHtmlSingleline } from "@cmtx/core";

// 解析所有图片（Markdown + HTML）
const allImages = parseImages(markdown);

// 只解析 Markdown 格式图片
const mdImages = parseImagesMdSingleline(markdown);

// 只解析 HTML 格式图片
const htmlImages = parseImagesHtmlSingleline(markdown);
```

### 3.2. 图片格式化

将图片数据格式化为 Markdown 或 HTML 语法。

```typescript
import { formatMarkdownImage, formatHtmlImage } from "@cmtx/core";

// 格式化为 Markdown
const mdImage = formatMarkdownImage({
  src: './image.png',
  alt: '描述文本',
  title: '标题'
});
// 结果: ![描述文本](./image.png "标题")

// 格式化为 HTML
const htmlImage = formatHtmlImage({
  src: './image.png',
  alt: '描述文本',
  width: '100',
  height: '100'
});
// 结果: <img src="./image.png" alt="描述文本" width="100" height="100" />
```

### 3.3. 图片属性更新

更新 HTML img 标签的属性（src、alt、title、width、height）。

```typescript
import { updateImageAttribute } from "@cmtx/core";

// 更新已存在的属性
const newHtml = updateImageAttribute('<img src="a.png" width="100" />', 'width', '200');
// 结果: '<img src="a.png" width="200" />'

// 添加新属性
const newHtml = updateImageAttribute('<img src="a.png" />', 'width', '100');
// 结果: '<img src="a.png" width="100" />'
```

### 3.4. 多正则操作

使用多组正则表达式进行高级文本匹配和替换。

```typescript
import { findAllMatches, replaceWithMultipleRegex } from "@cmtx/core";

// 查找所有匹配
const matches = findAllMatches(markdown, [
  { name: 'images', pattern: /!\[([^\]]*)\]\(([^)]+)\)/g },
  { name: 'links', pattern: /\[([^\]]+)\]\(([^)]+)\)/g }
]);

// 多正则替换
const result = replaceWithMultipleRegex(markdown, [
  { pattern: /old/g, replacement: 'new' },
  { pattern: /http:\/\//g, replacement: 'https://' }
]);
```

### 3.5. 日志与监控

提供日志记录和性能监控功能。

```typescript
import { getLogger, initLogger, MetricsCollector, PerformanceMonitor } from "@cmtx/core";

// 初始化日志
initLogger({ level: 'info', logDir: './logs' });

// 获取 logger 实例
const logger = getLogger('MyApp');
logger.info('Processing started');
logger.error('Something went wrong', { error });

// 性能监控
const monitor = new PerformanceMonitor();
monitor.start('operation');
// ... 执行操作
const metric = monitor.end('operation');
console.log(`Operation took ${metric.duration}ms`);

// 指标收集
const collector = new MetricsCollector();
collector.record('images_processed', 42);
```

### 3.6. 工具函数

提供常用的辅助函数。

```typescript
import {
  isLocalImage,
  isWebImage,
  isLocalAbsolutePath,
  isValidUrl,
  normalizePath,
  replaceAltVariables
} from "@cmtx/core";

// 判断图片类型
isLocalImage('./image.png');     // true
isWebImage('https://example.com/img.png'); // true

// 路径工具
isLocalAbsolutePath('/home/user/image.png'); // true (Linux/macOS)
normalizePath('path\\to\\file'); // 统一路径分隔符

// URL 验证
isValidUrl('https://example.com'); // true

// 替换 alt 文本中的变量
const alt = replaceAltVariables('Image {{count}} of {{total}}', {
  count: '1',
  total: '10'
});
// 结果: "Image 1 of 10"
```

## 4. 示例脚本

快速演示各功能的使用：

```bash
# 图片筛选
pnpm exec tsx examples/image-find-all.ts

# 删除图片
pnpm exec tsx examples/image-delete.ts

# 替换图片
pnpm exec tsx examples/image-replace.ts

# 多语言测试
pnpm exec tsx examples/image-multilingual.ts

# 正则操作
pnpm exec tsx examples/regex-find.ts
pnpm exec tsx examples/regex-replace.ts
```

详见 [examples/README.md](./examples/README.md)

## 5. 使用

```bash
# 安装
pnpm add @cmtx/core

# 构建
pnpm build

# 测试
pnpm test

# 生成 API 文档（输出到 docs/api/）
pnpm run docs
```

## 6. 编码支持说明

> **重要**：本包默认使用 UTF-8 编码处理所有文件。

### 6.1. 支持的编码

- ✅ **UTF-8**：完全支持（默认）
- ⚠️ **其他编码**：不直接支持（GBK、Latin-1 等）

### 6.2. 处理非 UTF-8 文件的建议

如果需要处理其他编码的 Markdown 文件，请先转换编码：

```bash
# 使用 iconv 转换编码（Linux/macOS）
iconv -f gbk -t utf-8 input.md > output.md

# 使用 PowerShell 转换编码（Windows）
Get-Content input.md -Encoding GBK | Set-Content output.md -Encoding UTF8
```

### 6.3. 为什么不内置编码支持？

1. **保持简洁**：core 包专注于核心文档处理功能（图片与元数据）
2. **性能考虑**：编码检测和转换会增加处理开销
3. **使用场景**：现代 Markdown 项目普遍使用 UTF-8
4. **替代方案**：用户可在预处理阶段处理编码转换

## 7. 与其他包的关系

```
@cmtx/core (本包)
    ↑
    | 被调用，执行具体的文档操作
    |
@cmtx/asset (资产管理)
    ↑
    | 调用，提供文本生成功能
    |
@cmtx/template (模板渲染引擎)
```

## 8. API 设计说明

### 8.1. 架构特点

本包采用**原子操作架构**，专注于提供基础文档处理功能：

- ✅ **极简依赖**：仅依赖 fast-glob（目录扫描）和 trash（回收站支持）
- ✅ **高性能**：纯 JavaScript 正则表达式解析
- ✅ **易维护**：清晰的模块化设计，每个模块职责单一
- ⚠️ **功能聚焦**：不提供精确位置信息，专注于核心文档处理（图片与元数据）
- ⚠️ **基础导向**：作为底层基础库，为上层应用提供可靠支撑
- ⚠️ **编码限制**：默认使用 UTF-8 编码处理文件，不支持其他编码格式

### 8.2. 核心类型

#### 8.2.1. ImageMatch

图片匹配结果的联合类型：

```typescript
type ImageMatch = WebImageMatch | LocalImageMatch;

interface WebImageMatch {
  type: 'web';
  alt: string;
  src: string;           // 完整 URL
  title?: string;
  width?: string;        // 图片宽度（HTML img 标签）
  height?: string;       // 图片高度（HTML img 标签）
  raw: string;           // 原始图片语法
  syntax: 'md' | 'html'; // 语法类型：'md' 为标准 Markdown，'html' 为 HTML 标签
  source: 'text' | 'file';
}

interface LocalImageMatch {
  type: 'local';
  alt: string;
  src: string;           // Markdown 中的原始路径
  absLocalPath?: string; // 绝对路径（仅文件层有）
  title?: string;
  width?: string;        // 图片宽度（HTML img 标签）
  height?: string;       // 图片高度（HTML img 标签）
  raw: string;
  syntax: 'md' | 'html'; // 语法类型：'md' 为标准 Markdown，'html' 为 HTML 标签
  source: 'text' | 'file';
}
```

#### 8.2.2. ReplaceOptions

替换操作的配置：

```typescript
interface ReplaceOptions {
  field: 'src' | 'raw';             // 要匹配的字段（'src' 按图片路径匹配，'raw' 按原始语法精确匹配）
  pattern: string | RegExp;         // 要匹配的值（支持正则）
  newSrc?: string;                  // 新的图片路径
  newAlt?: string;                  // 新的 alt 描述
  newTitle?: string;                // 新的 title 标题
}

interface ReplaceResult {
  newText: string;                  // 替换后的文本
  replacements: ReplacementDetail[]; // 替换详情
}

interface ReplacementDetail {
  before: string;  // 替换前的完整图片语法
  after: string;   // 替换后的完整图片语法
}

interface DirectoryReplaceResult {
  totalFiles: number;              // 总共处理的文件数
  successfulFiles: number;         // 成功处理的文件数
  failedFiles: number;             // 失败的文件数
  totalReplacements: number;       // 总替换次数
  results: FileReplaceResult[];    // 详细结果
}
```

## 9. 测试

运行测试套件：

```bash
# 运行所有测试
pnpm test

# 运行特定模块的测试
pnpm test parser
pnpm test filter
pnpm test replacer
pnpm test replace
pnpm test delete
```

## 10. 文档

生成 API 文档：

```bash
pnpm run docs
```

生成的文档位于 `docs/api/` 目录，包含所有公共 API 的详细说明和示例。

## 11. 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 监听模式构建
pnpm build --watch

# 代码检查
pnpm lint
```
