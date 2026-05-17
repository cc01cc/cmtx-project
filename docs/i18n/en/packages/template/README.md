---
title: "@cmtx/template"
category: guide
sidebar_order: 3
lang: en
---

# @cmtx/template

[![npm version](https://img.shields.io/npm/v/@cmtx/template.svg)](https://www.npmjs.com/package/@cmtx/template)
[![License](https://img.shields.io/npm/l/@cmtx/template.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Lightweight template rendering engine using `{variable}` syntax.

## Quick Start

```bash
pnpm add @cmtx/template
```

```typescript
import { renderTemplate } from "@cmtx/template";

const result = renderTemplate(
    "Hello {name}! Today is {date}.",
    { name: "World", date: "2024-01-01" },
);
console.log(result); // "Hello World! Today is 2024-01-01."
```


## Key Features

- **Pure function design** - Side-effect-free, easy to test
- **Flexible options** - Configurable empty-string strategy, whitespace
  trimming, and post-processing hooks
- **Type-safe** - Full TypeScript definitions

## API Docs

Generate full API documentation:

```bash
pnpm run docs
```

The generated docs are available at `docs/api/` and cover all functions
and types.

## Development

```bash
pnpm build      # Build the package
pnpm test       # Run all tests
pnpm lint       # Run code quality checks
```
