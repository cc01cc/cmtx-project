---
title: TypeDoc Standards For CMTX
---

## Scope

This document stores TypeDoc standards used by this repository for release-time
documentation and comment review.

Why this lives in `npm-prepublish-check`:

- the skill already checks docs and comments before release
- TypeDoc quality is part of publish readiness for public APIs
- this repository already uses TypeDoc-style public/internal/category tagging

## Local Baseline

The workspace currently depends on:

- `typedoc` `^0.28.16` in `package.json`

TypeDoc 0.28 officially documents support for TypeScript 5.0 through 5.8.

## Official Source Index

- Overview: <https://typedoc.org/documents/Overview.html>
- Doc comments: <https://typedoc.org/documents/Doc_Comments.html>
- Tags overview: <https://typedoc.org/documents/Tags.html>
- `@category`: <https://typedoc.org/documents/Tags._category.html>
- `@public`: <https://typedoc.org/documents/Tags._public.html>
- `@internal`: <https://typedoc.org/documents/Tags._internal.html>
- `@packageDocumentation`: <https://typedoc.org/documents/Tags._packageDocumentation.html>
- Input options: <https://typedoc.org/documents/Options.Input.html>
- `excludeInternal`: <https://typedoc.org/documents/Options.Input.html#excludeinternal>
- Output options: <https://typedoc.org/documents/Options.Output.html>
- `visibilityFilters`: <https://typedoc.org/documents/Options.Output.html#visibilityfilters>
- TSDoc reference: <https://tsdoc.org/>
- TSDoc `@public`: <https://tsdoc.org/pages/tags/public/>
- TSDoc `@internal`: <https://tsdoc.org/pages/tags/internal/>
- TSDoc `@packageDocumentation`: <https://tsdoc.org/pages/tags/packagedocumentation/>

## Core Rules From TypeDoc

1. TypeDoc parses TSDoc/JSDoc-style comments and then renders them through
   markdown-it.
2. Markdown in comments is supported.
3. Code examples should use fenced code blocks, not indentation-based blocks.
4. Unknown tags produce warnings unless configured via `tsdoc.json` or TypeDoc
   tag options.
5. File-level comments should use `@packageDocumentation` or `@module`.
6. A comment using `@packageDocumentation` must be the first comment in the file
   and should be placed before imports.
7. `@internal` is the official way to mark non-consumer API items.
8. `@internal` can be hidden from generated docs with `--excludeInternal`.
9. `@category` groups related API items under shared headings.
10. `visibilityFilters` can expose UI filters for tags and member visibility.

## Recommended Tag Set For This Repository

Use these tags consistently where applicable:

- `@packageDocumentation`: package or file-level overview blocks
- `@module`: module-level naming when clearer than package documentation
- `@remarks`: longer details beyond the summary paragraph
- `@example`: executable or realistic usage snippets
- `@param`: parameter docs for functions and methods
- `@returns`: return value behavior
- `@throws`: thrown error conditions when part of contract
- `@see`: related APIs and cross-links
- `@category`: categorized barrel exports in `src/index.ts`
- `@public`: repository convention for explicit public API markers
- `@internal`: internal-only helpers and non-public implementation

## Important Nuance About `@public`

TypeDoc's official guidance says `@public` should generally not be used because
exported members are usually treated as public unless marked otherwise.

Repository decision:

- this repository already uses explicit `@public` tags in several packages
- `core` establishes the working convention
- for consistency, keep explicit `@public` on intentionally public APIs when
  touching code that already follows this style
- do not mix implicit-public and explicit-public styles randomly within the same
  package surface

This is a repository convention layered on top of TypeDoc, not a claim that
TypeDoc requires `@public` everywhere.

## Repository Conventions

### 1. Package Entry Documentation

`src/index.ts` may contain a package-level doc block with:

- `@packageDocumentation`
- `@module`
- overview text
- `@remarks`
- quick-start example
- `@see` links

Reference pattern:

- `/workspace/packages/core/src/index.ts`

### 2. Public API Comments

Public exported functions, classes, interfaces, and types should prefer:

- one summary sentence or paragraph
- `@param` for meaningful inputs
- `@returns` where return semantics need explanation
- `@throws` when error behavior is part of the API contract
- `@example` for representative use
- `@public` when the package already uses explicit visibility tags

Reference pattern:

- `/workspace/packages/core/src/metadata.ts`

### 3. Internal API Comments

Internal helpers that are intentionally non-public should use `@internal`.

This matters because:

- it signals design intent to maintainers
- it supports future `excludeInternal` filtering
- it distinguishes implementation details from supported API surface

### 4. Export Classification

Barrel exports should use `@category` when the package organizes exports by
feature area.

Reference pattern:

- `/workspace/packages/core/src/index.ts`

Suggested category style:

- use stable user-facing feature names
- keep names consistent across releases
- avoid mixing technical layers and user features in the same category list

## Review Checklist

When reviewing TypeDoc quality for a package:

1. Check that package or module overview comments exist where expected.
2. Check that exported public symbols have TypeDoc blocks.
3. Check that internal helpers exposed in source are marked with `@internal`
   where appropriate.
4. Check that examples use fenced code blocks with language identifiers.
5. Check that barrel exports use `@category` if the package follows categorized
   exports.
6. Check that comments do not use unsupported tags without configuration.
7. Check that public/internal marking is consistent within the package.

## Optional TypeDoc Config Ideas

These are useful if the repository later enforces TypeDoc generation more
strictly:

```json
{
  "entryPoints": ["src/index.ts"],
  "excludeInternal": false,
  "visibilityFilters": {
    "protected": false,
    "private": false,
    "inherited": true,
    "external": false,
    "@internal": false
  }
}
```

For stricter public API hygiene, evaluate:

- `excludeNotDocumented`
- `excludeNotDocumentedKinds`
- `excludeInternal`

Do not enable these globally without checking current package coverage first.

## Notes For Future Automation

Heuristic checks can verify the presence of tags, but cannot prove comment
quality. For deeper enforcement, a future script should inspect:

- exported declarations from `src/index.ts`
- whether each exported symbol has a nearby TypeDoc block
- whether internal helpers are tagged consistently
- whether categories in barrel files map cleanly to exported API areas

This file is the local TypeDoc reference for repository comment reviews.
