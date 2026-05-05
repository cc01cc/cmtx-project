# @cmtx/rule-engine

[![npm version](https://img.shields.io/npm/v/@cmtx/rule-engine.svg)](https://www.npmjs.com/package/@cmtx/rule-engine)
[![License](https://img.shields.io/npm/l/@cmtx/rule-engine.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Markdown document processing library -- rule engine, content transformation,
metadata management, and cross-platform adaptation.

> Full API documentation: `pnpm run docs` (generated at `docs/api/`)

## 1. Installation

```bash
pnpm add @cmtx/rule-engine
```

## 2. Preset system

```typescript
import { registerPreset, adaptMarkdown } from "@cmtx/rule-engine";

registerPreset("my-blog", [
    "strip-frontmatter",
    "promote-headings",
    "add-section-numbers",
    "upload-images",
]);

const adapted = await adaptMarkdown("## Section\nContent", "my-blog");
console.log(adapted.content);
```

## 3. Key features

- **Rule engine** -- composable transformation pipeline with Preset orchestration
- **Content transformation** -- heading promotion, section numbering, text
  replacement, image format conversion
- **Metadata management** -- YAML frontmatter parsing/injection/removal with
  auto-generated ID, date, and updated fields
- **Image processing** -- Markdown img to HTML img conversion, sizing, cloud upload
- **ID generation** -- UUID, slug, MD5 hash, NIST FF1 encryption with Luhn checksum
- **Markdown-to-HTML rendering** -- inline-styled output with custom theme support
- **Node.js batch API** -- `renderDirectory`, `renderFile`, `validateFile`
- **Programmatic rule engine** -- `createRuleEngine`, `createDefaultRuleEngine`,
  individual rules

## 4. Development

```bash
pnpm build      # Build
pnpm test       # Run tests
pnpm lint       # Code quality check
pnpm run docs   # Generate API docs
```

## 5. License

Apache-2.0
