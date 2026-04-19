---
name: documentation-standards
description: Audit documentation quality and compliance. Use for standards checks, official links verification, and markdown validation.
license: MIT
---

# Documentation Standards Skill

## Overview

Use this skill when authoring API documentation, configuration examples, markdown files, or technical guides. This workflow ensures consistency, accuracy, and proper sourcing.

## Scope Boundary

- Use this skill for standards enforcement and quality checks
- Do not use this skill as the primary drafting workflow for long-form docs
- For iterative co-authoring, use `doc-coauthoring`
- For VS Code extension README writing, use `vscode-extension-documentation`

## General Rules

- Avoid emoji symbols; use ASCII text or symbols instead
- Header depth: maximum 4 levels (`####`); no `#####` or deeper
- Split excessively long documents into separate files (follow `ADR-*`, `PLAN-*` naming patterns)
- Writing style: formal, rigorous, concise, clear; reference existing project docs

## Minimum Structures

## README Minimum

A compliant README should answer in order:

1. What this project is
2. Why users should care
3. How to start quickly
4. Where to find deeper docs

Minimum sections:

- `# Project Name`
- `## Quick Start`
- `## Documentation`
- `## License`

## API Docs Minimum

For each endpoint/tool/interface, include:

1. Purpose summary
2. Request/inputs with required flags
3. Response/outputs with examples
4. Error cases and constraints

If OpenAPI/TypeDoc exists, keep hand-written docs brief and link to generated source of truth.

## ADR Minimum

Every ADR should include:

1. `Status`
2. `Context`
3. `Decision`
4. `Consequences`

Use stable numbering and keep an index in `docs/adr/README.md` when ADR count grows.

## API Documentation & Sourcing

**TypeDoc Integration**

- If project has TypeDoc-generated API docs, DO NOT duplicate detailed API sections in hand-written docs
- Preserve high-level summaries and explicitly link to TypeDoc (e.g., "See API reference section on [TypeDoc](...)")
- When documenting API capabilities, provide brief explanation + link to TypeDoc entry

**Official URL Requirements**

- All platform/service configuration, account setup, key/token requests, permission changes MUST include official documentation URL
- For console operations, prioritize direct URLs to console pages (e.g., where to retrieve `key`, `secret`, `token`)
- Non-official sources (blogs, secondary sources) are supplements only; never replace official URLs

## Configuration Examples & Comments

**Required Annotations**

- Configuration examples (JSON, YAML, ENV, INI) must include clear comments for key fields
- Comments should cover: field purpose, required/optional, example value meaning, value source

**Sensitive Fields**

- Mark credential/sensitive fields (e.g., `accessKeyId`, `accessKeySecret`, `token`) with "How to obtain" guidance
- Attach official docs URL or console URL showing where to retrieve credentials
- For formats that don't support comments (standard JSON), provide field explanations before/after code block + official URLs

## Markdown Format & Validation

**Linting Standards**

- Must conform to [markdownlint rules](https://github.com/DavidAnson/markdownlint?tab=readme-ov-file#rules--aliases)
- Inline HTML allowed (MD033 disabled): `<img>`, `<br>` are permitted
- Chinese text must follow [autoCorrect style guide](https://github.com/huacnlee/autocorrect)

**Consistent Style**

- Unified formatting for quotes, emphasis, lists (reference existing project docs)
- Header numbering format: `3.2.1. Description` (period at end)
- Run validation before committing

## Validation Commands

```bash
# Check markdown format compliance
markdownlint <file-path>

# Check Chinese formatting (if applicable)
autocorrect --lint <file-path>

# Auto-fix formatting issues
markdownlint --fix <file-path>
autocorrect --fix <file-path>
```

## AutoCorrect Configuration (Chinese)

```txt
rules:
  space-word: 1
  space-punctuation: 1
  space-bracket: 1
  space-backticks: 1
  space-dash: 0
  space-dollar: 0
  fullwidth: 1
  no-space-fullwidth: 1
  halfwidth-word: 1
  halfwidth-punctuation: 1
  spellcheck: 2
```

## Markdownlint Configuration

```txt
# Enable all rules, disable MD033 (allow inline HTML)
MD033: false
```

## Documentation Anti-Patterns

- One document trying to be tutorial + reference + rationale at once
- Duplicate definitions spread across multiple docs with no source-of-truth link
- Missing prerequisites and assumption gaps for new contributors
- Outdated examples that are not runnable or do not match current behavior
- Marketing-heavy language that hides actionable steps

## Checklist

- [ ] Official URLs provided for all platform/service references
- [ ] Configuration examples include clear comments for key fields
- [ ] Sensitive fields marked with "How to obtain" + URL guidance
- [ ] API docs reference TypeDoc instead of duplicating
- [ ] No emoji; using text or ASCII symbols only
- [ ] Header depth ≤ 4 levels
- [ ] Markdown passes `markdownlint` validation
- [ ] Chinese text (if present) passes `autocorrect` validation
- [ ] Writing style is formal, rigorous, concise
- [ ] README/API/ADR minimum structures are satisfied for the doc type
- [ ] No anti-patterns (mixed content type, duplicate source, stale examples)
