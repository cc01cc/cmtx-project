# Document Naming Convention — Full Specification

## Applicable Scope

This convention applies to:

1. Directories named `adr`, `plans`, or similar decision/plan directories (e.g., `docs/adr`, `.kilo/plans`)
2. **Any directory containing 2 or more documents**

Single-file directories have no naming requirement.

## Mandatory Format

`[OPTIONAL_UPPERCASE_CATEGORY]-[NUMBER]-[document_name].md`

### Component Breakdown

| Component | Rule | Examples |
|-----------|------|----------|
| **Category** (optional) | Uppercase letters only; place as prefix before first hyphen | `ADR`, `PLAN`, `API`, or omitted |
| **Separator 1** | Hyphen (`-`) between category and number | `-` |
| **Number** | 2+ Arabic digits; left-padded with zeros | `01`, `002`, `123`, not `1` or `1st` |
| **Separator 2** | Hyphen (`-`) between number and name | `-` |
| **Name** | Alphanumeric, CJK characters, and underscores | `architecture_decision_record`, `架构设计_v2` |
| **Extension** | Always `.md` | `.md` |

### Character Restrictions

The file name (excluding `.md` extension) may contain **only**:

- **CJK characters** (Chinese, Japanese, Korean): U+4E00–U+9FFF
- **English letters** (A–Z, a–z): category must be uppercase
- **Digits** (0–9)
- **Underscore** (_): recommended for connecting words in the name portion only
- **Hyphen** (-): reserved for structural separators only (category-number-name)

**Forbidden**: spaces, dots, commas, parentheses, brackets, `@`, `#`, `&`, `+`, `!`, `?`, etc.

### Validation Regex (PCRE)

```regexp
^(?:[A-Z]+-)?[0-9]+-[A-Za-z0-9\u4e00-\u9fa5_]+\.md$
```

Breakdown:

- `^` — start of string
- `(?:[A-Z]+-)?` — optional non-capturing group: uppercase letters followed by hyphen
- `[0-9]+` — one or more digits
- `-` — literal hyphen
- `[A-Za-z0-9\u4e00-\u9fa5_]+` — one or more of: letters, digits, CJK, underscore
- `\.md$` — literal `.md` and end of string

## Numeric Incrementing Rule

When creating a new document, **the number must be strictly incremented** based on existing files in the same directory:

1. **Identify the category** (if any): e.g., `ADR`, `PLAN`, or none
2. **Find the maximum number** for that category:
   - If category exists: scan only files with that prefix (e.g., `ADR-*`)
   - If no category: scan entire directory for max number
3. **Increment by 1**: new number = max + 1
4. **Preserve width**: if max is `01`, next is `02` (not `2`)

### Examples of Incrementing

**Directory state**: `ADR-001-xxx.md`, `ADR-002-yyy.md`, `PLAN-001-zzz.md`

- New ADR: next is `ADR-003-...`
- New PLAN: next is `PLAN-002-...`
- New category (e.g., `API`): first is `API-001-...`
- No-category doc: check all files; if max is `003`, next is `004`

## Compliant Examples

1. `ADR-001-architecture_decision_record.md` — uppercase category, 3-digit number, underscore-connected name
2. `PLAN-02-upload_refactor.md` — uppercase category, 2-digit number with leading zero
3. `001-第一阶段_迭代计划.md` — no category, mixed CJK and Latin, underscores
4. `API-010-对象存储_签名_url.md` — mixed Latin and CJK
5. `RFC-005-http2_protocol_proposal.md` — standard RFC format with category

## Non-Compliant Examples

| File Name | Issue | Correction |
|-----------|-------|-----------|
| `adr-001-architecture.md` | Category not uppercase | `ADR-001-architecture.md` |
| `ADR_001_architecture.md` | Uses underscores as separators (not hyphens) | `ADR-001-architecture.md` |
| `ADR-01-architecture.v2.md` | Dot in name + only 2-digit number | `ADR-001-architecture_v2.md` |
| `PLAN-1-架构设计(草案).md` | Single digit + parentheses in name | `PLAN-001-架构设计_草案.md` |
| `roadmap.md` | No prefix/number in multi-doc directory | `001-roadmap.md` or `ROADMAP-001-roadmap.md` |
| `ADR 002 xxx.md` | Spaces instead of hyphens | `ADR-002-xxx.md` |
| `ADR-002-@legacy-design.md` | Special character `@` | `ADR-002-legacy_design.md` |

## Priority Rules

When this convention conflicts with other naming suggestions:

1. This convention takes priority
2. System-level constraints (OS file name limits, etc.) may override
3. Existing established patterns in a project may apply exemptions with explicit documentation

## Edge Cases

### Gaps in Numbering

Gap example: `ADR-001-...md`, `ADR-003-...md` (missing 002)

- **Status**: Allowed (gaps don't break the convention)
- **Note**: Suggests previous docs may have been deleted; no action required
- **New doc**: Next is still `ADR-004-...`, not filled-in gap

### Multi-Category Directory

Example: `ADR-001-...md`, `PLAN-001-...md`, `RFC-001-...md`

- **Status**: Fine; each category has independent numbering
- **New doc**: Check only same-category files for max number

### Renaming Requirements

If a file needs renaming:

- Preserve content; only update file name
- Log old → new mapping
- Update any internal doc references if applicable

## Cross-Directory Considerations

Different directories are independent:

- `.kilo/plans/` may have `PLAN-001`, `PLAN-002`, ...
- `docs/adr/` may have `ADR-001`, `ADR-002`, ...
- No coordination needed between directories

## Frequency of Use

This convention is typically reviewed/updated when:

- Creating new decision or planning documents
- Bulk-renaming legacy docs for consistency
- Onboarding new team members
- Auditing existing directories for compliance
