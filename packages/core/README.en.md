# @cmtx/core

[![npm version](https://img.shields.io/npm/v/@cmtx/core.svg)](https://www.npmjs.com/package/@cmtx/core)
[![License](https://img.shields.io/npm/l/@cmtx/core.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Core markdown document processing library - image parsing/replacement/resize and metadata operations. Operates on plain text only.

> File system operations (batch read/write, deletion) are primarily handled by `@cmtx/asset` (FileService, DeleteService). This package focuses on plain text processing, though some functions like `extractMetadata` read files directly.
>
> Full API documentation: `pnpm run docs` (generated at `docs/api/`)

## 1. Installation

```bash
pnpm add @cmtx/core
```

## 2. Features

### 2.1. Image Parsing & Formatting

```typescript
import { parseImages, parseImagesMdSingleline, parseImagesHtmlSingleline,
         formatMarkdownImage, formatHtmlImage } from "@cmtx/core";

const images = parseImages(markdown);
const mdImg = formatMarkdownImage({ src: "./img.png", alt: "desc", title: "title" });
const htmlImg = formatHtmlImage({ src: "./img.png", alt: "desc", width: "100", height: "100" });
```

### 2.2. Image Filtering

```typescript
import { filterImagesInText } from "@cmtx/core";

const allImages   = filterImagesInText(markdown);
const localImages = filterImagesInText(markdown, { mode: "sourceType", value: "local" });
const webImages   = filterImagesInText(markdown, { mode: "hostname", value: "example.com" });
const pngImages   = filterImagesInText(markdown, { mode: "regex", value: /\.png$/i });
```

### 2.3. Image Replacement

```typescript
import { replaceImagesInText, updateImageAttribute } from "@cmtx/core";

const result = replaceImagesInText(markdown, [
  { field: "src", pattern: /\.png$/, newSrc: (m) => m.replace(/\.png$/, ".webp"),
    newAlt: "updated", newTitle: "new title" },
]);

const newHtml = updateImageAttribute('<img src="a.png" width="100" />', "width", "200");
```

### 2.4. Image Resize

```typescript
import { resizeImageWidth, detectImageWidth, detectCurrentWidth,
         calculateTargetWidth, convertMarkdownImageToHtml,
         convertMarkdownImageToHtmlWithWidth, parseImageElements } from "@cmtx/core";

const adjusted  = resizeImageWidth('<img src="test.png" width="300">', 500);
const current   = detectImageWidth('<img src="test.png" width="300">');
const curWidth  = detectCurrentWidth('![alt](img.png)');
const target    = calculateTargetWidth(300, "in", [200, 400, 600, 800]);
const html      = convertMarkdownImageToHtml("![alt](img.png)");
const htmlW     = convertMarkdownImageToHtmlWithWidth("![alt](img.png)", 800);
const elements  = parseImageElements(markdown);
```

### 2.5. Metadata

```typescript
import { extractMetadata, extractSectionHeadings, extractTitleFromMarkdown,
         extractFrontmatterField, METADATA_REGEX,
         convertHeadingToFrontmatter, upsertFrontmatterFields,
         removeFrontmatter, deleteFrontmatterFields,
         parseFrontmatter, parseYamlFrontmatter, generateFrontmatterYaml } from "@cmtx/core";

const meta     = extractMetadata("./doc.md", { headingLevel: 1 });
const headings = extractSectionHeadings(markdown, { minLevel: 2, maxLevel: 4 });
const title    = extractTitleFromMarkdown(markdown);
const tag      = extractFrontmatterField(markdown, "tags");

const { hasFrontmatter, data } = parseFrontmatter(markdown);
const parsed    = parseYamlFrontmatter(data);

METADATA_REGEX.test("---\ntitle: Hello\n---");        // true (frontmatter boundary)

const wf = convertHeadingToFrontmatter(markdown, { format: "yaml", headingLevel: 1 });
const uf = upsertFrontmatterFields(markdown, { title: "New", tags: ["tech"] }, { createIfMissing: true });
```

### 2.6. Section Numbering

```typescript
import { addSectionNumbers, removeSectionNumbers } from "@cmtx/core";

const numbered = addSectionNumbers(markdown);
const cleaned  = removeSectionNumbers(markdown);
```

### 2.7. Multi-Regex Operations

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

### 2.8. Utilities

```typescript
import { isLocalImage, isLocalImageWithAbsPath, isLocalImageWithRelativePath,
         isWebImage, isWebSource, isLocalAbsolutePath, isPathInside,
         isValidUrl, normalizePath, replaceAltVariables, parseUrlSafe,
         CoreError, ErrorCode } from "@cmtx/core";

isLocalImage("./img.png");                            // true (relative or absolute path)
isLocalImageWithAbsPath("/abs/img.png");              // true (absolute only)
isLocalImageWithRelativePath("./img.png");            // true (relative only)
isWebImage("https://example.com/img.png");            // true
isWebSource("http://cdn.example.com/img.png");        // true
isPathInside("/root", "/root/docs");                  // true
normalizePath("path\\to\\file");                      // path/to/file
parseUrlSafe("https://example.com/path?q=a#h");        // safe URL parsing (no throws)
replaceAltVariables("Page {{n}}", { n: "3" });        // Page 3

// Unified error handling
throw new CoreError(ErrorCode.INVALID_INPUT, "Invalid image URL");
```

### 2.9. Logging & Metrics

```typescript
import { getLogger, initLogger, dummyLogger, consoleLogger,
         MetricsCollector, PerformanceMonitor } from "@cmtx/core";

initLogger({ level: "info" });
const logger = getLogger("core");
logger.info("done");

const monitor = new PerformanceMonitor();
monitor.start("op");
const metric = monitor.end("op");
```

## 3. Package Relationships

```
@cmtx/template  --calls-->  @cmtx/core (plain text processing)
@cmtx/asset     --calls-->  @cmtx/core (plain text processing)
@cmtx/publish   --calls-->  @cmtx/core (plain text processing)
```

- **@cmtx/core** - plain text processing (parse, replace, format, metadata)
- **@cmtx/asset/file** - file system operations (filterImagesFromFile, replaceImagesInFile)
- **@cmtx/asset/delete** - file-level deletion (DeleteService)

## 4. Development

```bash
pnpm build      # Build
pnpm test       # Run tests
pnpm test parser    # Test specific module
pnpm test filter
pnpm test replace
pnpm test metadata
pnpm test utils
pnpm lint       # Lint & format check
pnpm run docs   # Generate API docs
```
