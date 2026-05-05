# @cmtx/core

[![npm version](https://img.shields.io/npm/v/@cmtx/core.svg)](https://www.npmjs.com/package/@cmtx/core)
[![License](https://img.shields.io/npm/l/@cmtx/core.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Markdown 纯文本处理核心库 - 图片解析/替换/尺寸调整与元数据操作。

> 文件系统操作（批量读写、删除）主要由 `@cmtx/asset` 负责（FileService、DeleteService）。本包侧重于纯文本处理，但部分函数（如 extractMetadata）直接操作文件。
>
> 完整 API 文档：`pnpm run docs`（生成于 `docs/api/`）

## 1. 安装

```bash
pnpm add @cmtx/core
```

## 2. 功能模块

### 2.1. 图片解析与格式化

```typescript
import { parseImages, parseImagesMdSingleline, parseImagesHtmlSingleline,
         formatMarkdownImage, formatHtmlImage } from "@cmtx/core";

const images = parseImages(markdown); // 解析 Markdown + HTML 图片
const mdImg = formatMarkdownImage({ src: "./img.png", alt: "desc", title: "标题" });
const htmlImg = formatHtmlImage({ src: "./img.png", alt: "desc", width: "100", height: "100" });
```

### 2.2. 图片筛选

```typescript
import { filterImagesInText } from "@cmtx/core";

const allImages   = filterImagesInText(markdown);
const localImages = filterImagesInText(markdown, { mode: "sourceType", value: "local" });
const webImages   = filterImagesInText(markdown, { mode: "hostname", value: "example.com" });
const pngImages   = filterImagesInText(markdown, { mode: "regex", value: /\.png$/i });
```

### 2.3. 图片替换

```typescript
import { replaceImagesInText, updateImageAttribute } from "@cmtx/core";

const result = replaceImagesInText(markdown, [
  { field: "src", pattern: /\.png$/, newSrc: (m) => m.replace(/\.png$/, ".webp"),
    newAlt: "updated", newTitle: "new title" },
]);

const newHtml = updateImageAttribute('<img src="a.png" width="100" />', "width", "200");
```

### 2.4. 图片尺寸调整

```typescript
import { resizeImageWidth, detectImageWidth, detectCurrentWidth,
         calculateTargetWidth, convertMarkdownImageToHtml,
         convertMarkdownImageToHtmlWithWidth, parseImageElements } from "@cmtx/core";

const adjusted  = resizeImageWidth('<img src="test.png" width="300">', 500);  // width="500"
const current   = detectImageWidth('<img src="test.png" width="300">');       // 300
const curWidth  = detectCurrentWidth('![alt](img.png)');                      // 0 (markdown has no width attr)
const target    = calculateTargetWidth(300, "in", [200, 400, 600, 800]);      // 400
const html      = convertMarkdownImageToHtml("![alt](img.png)");              // <img src="img.png" alt="alt">
const htmlW     = convertMarkdownImageToHtmlWithWidth("![alt](img.png)", 800);
const elements  = parseImageElements(markdown);  // ImageElement[] with type, src, alt, currentWidth
```

### 2.5. 元数据处理

```typescript
import { extractMetadata, extractSectionHeadings, extractTitleFromMarkdown,
         extractFrontmatterField, METADATA_REGEX,
         convertHeadingToFrontmatter, upsertFrontmatterFields,
         removeFrontmatter, deleteFrontmatterFields,
         parseFrontmatter, parseYamlFrontmatter, generateFrontmatterYaml } from "@cmtx/core";

const meta     = extractMetadata("./doc.md", { headingLevel: 1 });
const headings = extractSectionHeadings(markdown, { minLevel: 2, maxLevel: 4 });
const title    = extractTitleFromMarkdown(markdown); // Frontmatter.title > H1 > undefined
const tag      = extractFrontmatterField(markdown, "tags"); // 提取指定字段

const { hasFrontmatter, data } = parseFrontmatter(markdown); // 解析 frontmatter 边界
const parsed    = parseYamlFrontmatter(data);

METADATA_REGEX.test("---\ntitle: Hello\n---");        // true (frontmatter 边界匹配)

const wf = convertHeadingToFrontmatter(markdown, { format: "yaml", headingLevel: 1 });
const uf = upsertFrontmatterFields(markdown, { title: "New", tags: ["tech"] }, { createIfMissing: true });
```

### 2.6. 章节编号

```typescript
import { addSectionNumbers, removeSectionNumbers } from "@cmtx/core";

const numbered = addSectionNumbers(markdown);   // 添加编号 (## 1. 标题)
const cleaned  = removeSectionNumbers(markdown); // 移除编号
```

### 2.7. 多正则操作

```typescript
import { findAllMatches, replaceWithMultipleRegex } from "@cmtx/core";

const matches = findAllMatches(markdown, [
  { name: "images", pattern: /!\[([^\]]*)\]\(([^)]+)\)/g },
  { name: "links",  pattern: /\[([^\]]+)\]\(([^)]+)\)/g },
]);

const result = replaceWithMultipleRegex(markdown, [
  { pattern: /old/g, replacement: "new" },
  { pattern: /http:\/\//g, replacement: "https://" },
]);
```

### 2.8. 工具函数

```typescript
import { isLocalImage, isLocalImageWithAbsPath, isLocalImageWithRelativePath,
         isWebImage, isWebSource, isLocalAbsolutePath, isPathInside,
         isValidUrl, normalizePath, replaceAltVariables, parseUrlSafe,
         CoreError, ErrorCode } from "@cmtx/core";

isLocalImage("./img.png");                            // true (相对路径或绝对路径)
isLocalImageWithAbsPath("/abs/img.png");              // true (仅绝对路径)
isLocalImageWithRelativePath("./img.png");            // true (仅相对路径)
isWebImage("https://example.com/img.png");            // true
isWebSource("http://cdn.example.com/img.png");        // true
isPathInside("/root", "/root/docs");                  // true
normalizePath("path\\to\\file");                      // path/to/file
parseUrlSafe("https://example.com/path?q=a#h");        // URL 安全解析（不抛异常）
replaceAltVariables("Page {{n}}", { n: "3" });        // Page 3

// 统一错误类型与错误码
throw new CoreError(ErrorCode.INVALID_INPUT, "Invalid image URL");
```

### 2.9. 日志与监控

```typescript
import { getLogger, initLogger, dummyLogger, consoleLogger,
         MetricsCollector, PerformanceMonitor } from "@cmtx/core";

initLogger({ level: "info" });
const logger = getLogger("core");
logger.info("done");

const monitor = new PerformanceMonitor();
monitor.start("op");
const metric = monitor.end("op"); // { duration: number, ... }
```

## 3. 与其他包的关系

```
@cmtx/template  --调用-->  @cmtx/core (纯文本处理)
@cmtx/asset     --调用-->  @cmtx/core (纯文本处理)
@cmtx/rule-engine   --调用-->  @cmtx/core (纯文本处理)
```

- **@cmtx/core**：纯文本处理（解析、替换、格式化、元数据）
- **@cmtx/asset/file**：文件系统读写（filterImagesFromFile、replaceImagesInFile）
- **@cmtx/asset/delete**：文件级删除（DeleteService）

## 4. 开发

```bash
pnpm build      # 构建
pnpm test       # 测试
pnpm test parser    # 特定模块测试
pnpm test filter
pnpm test replace
pnpm test metadata
pnpm test utils
pnpm lint       # 代码检查
pnpm run docs   # 生成 API 文档
```
