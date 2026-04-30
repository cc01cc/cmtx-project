# @cmtx/template

[![npm version](https://img.shields.io/npm/v/@cmtx/template.svg)](https://www.npmjs.com/package/@cmtx/template)
[![License](https://img.shields.io/npm/l/@cmtx/template.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Lightweight template rendering engine with flexible variable management and a
Builder-pattern API. Supports `{variable}` syntax with built-in variables for
date, timestamp, and UUID.

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

Using the Builder pattern:

```typescript
import { BaseTemplateBuilder } from "@cmtx/template";

class MyBuilder extends BaseTemplateBuilder {
    build(): string {
        return this.getContext().date || "";
    }
}

const result = new MyBuilder().withDate().build();
```

## Key Features

- **Pure function design** - Side-effect-free functions that are easy to test
- **Builder pattern** - Chainable API via `BaseTemplateBuilder` with
  `withDate()`, `withTimestamp()`, `withUUID()`, and custom variable methods
- **Context management** - `ContextManager` for adding, merging, and clearing
  template variables
- **Template validation** - `validateTemplate()` checks for mismatched braces
  and empty variables
- **Flexible options** - Configurable empty-string strategy, whitespace
  trimming, and post-processing hooks
- **Extensible** - Subclass `BaseTemplateBuilder` to create domain-specific
  builders
- **Type-safe** - Full TypeScript definitions for all APIs

## API Docs

Generate full API documentation:

```bash
pnpm run docs
```

The generated docs are available at `docs/api/` and cover all functions,
classes, interfaces, and builder APIs.

## Development

```bash
pnpm build      # Build the package
pnpm test       # Run all tests
pnpm lint       # Run code quality checks
```
