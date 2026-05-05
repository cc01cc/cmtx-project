# Lint Warning Analysis Methodology

## Overview

This document captures the systematic methodology for analyzing, classifying, and prioritizing lint warnings in the CMTX monorepo. It distills hands-on experience from two rounds of oxlint warning reduction (137 -> 93 warnings) into a repeatable decision framework.

The methodology applies to any lint tool (oxlint, ESLint, Biome) but the specific commands target oxlint, the project's configured linter.

---

## 1. Analysis Framework

### 1.1. Three-Axis Classification

Every lint warning is classified along three independent axes:

| Axis | Values | Decision Impact |
|------|--------|----------------|
| Risk | High / Medium / Low | Fix severity: High first |
| Fix Cost | Low / Medium / High | Quick wins first |
| Certainty | True Positive / False Positive / Debatable | Suppress vs fix vs skip |

**Critical nuance — `any` is not a monolith**: `no-explicit-any` violations come in two fundamentally different flavors that must be evaluated separately:

| Flavor | Origin | Fix Cost | Strategy |
|--------|--------|----------|----------|
| Own code: `any` used as generic container | Internal fields, utility functions | Low | Replace `any` with `unknown`, or with a concrete type if the actual usage is narrower |
| SDK interop: `as any` to satisfy externals | Third-party SDK constructor return types, incomplete `.d.ts` | Medium-High | Suppress inline; writing proper type declarations for the SDK may be significant work |

### 1.2. Decision Matrix

```
              | Low Cost  | Medium Cost | High Cost
High Risk     | FIX NOW   | FIX NOW     | PLAN
Medium Risk   | FIX NOW   | PLAN        | SKIP
Low Risk      | FIX       | SKIP        | SKIP
```

- **FIX NOW**: Immediate fix, no planning needed
- **FIX**: Fix when convenient (same session)
- **PLAN**: Needs design/refactoring plan
- **SKIP**: Not worth the effort or risk

### 1.3. Rule-Level Classification Heuristics

| Heuristic | Description | Examples |
|-----------|-------------|----------|
| **Type Safety** | Warnings that weaken TypeScript type checking | `no-explicit-any`, `no-unsafe-*` |
| **Correctness** | Warnings that indicate likely bugs | `no-floating-promises`, `no-misused-spread` |
| **Style** | Warnings about code structure and readability | `max-params`, `max-depth` |
| **Pedantic** | Warnings about code organization | `max-lines-per-function`, `max-statements` |
| **Noise** | False positives from tool limitations | `unbound-method` in test files, `no-redundant-type-constituents` from SDK types |

---

## 2. Step-by-Step Analysis Workflow

### 2.1. Get the Baseline

```bash
# Full lint run
pnpm lint:oxlint

# Count warnings by rule (most useful command)
pnpm lint:oxlint 2>&1 | grep -E '^\s*!' | sed 's/.*eslint(\([^)]*\)).*/\1/' | sort | uniq -c | sort -rn

# Count errors vs warnings
pnpm lint:oxlint 2>&1 | grep -cE '^\s*!'
pnpm lint:oxlint 2>&1 | grep -cE '^\s*Error'
```

### 2.2. Understand Each Warning's Context

```bash
# View all instances of a specific rule with surrounding context
pnpm lint:oxlint 2>&1 | grep -B5 -A2 'no-explicit-any'

# Extract file:line:col for a rule
pnpm lint:oxlint 2>&1 | grep -A2 'no-explicit-any' | grep '-->'
```

### 2.3. Assess Fix Viability

For each warning instance, ask:

1. **Does this represent a real bug?** -> High risk, fix immediately
2. **Does this weaken type safety?** -> Medium risk, fix if low cost
3. **Is this a style preference?** -> Low risk, skip unless trivial fix
4. **Is this a tool limitation?** -> Suppress with inline comment or config override
5. **Does fixing this change the public API?** -> Needs planning, skip if high cost

### 2.4. Batch Workflow

```bash
# Step 1: Get the full picture
pnpm lint:oxlint 2>&1 > /tmp/lint-full.txt

# Step 2: Classification summary
pnpm lint:oxlint 2>&1 | grep -E '^\s*!' | sed 's/.*eslint(\([^)]*\)).*/\1/' | sort | uniq -c | sort -rn

# Step 3: Investigate a specific rule
pnpm lint:oxlint 2>&1 | grep -A3 -E 'no-explicit-any|no-console'

# Step 4: Fix and re-verify (per package to save time)
pnpm -F @cmtx/core exec oxlint
pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

---

## 3. Categorization Reference

### 3.1. Type Safety Rules

| Rule | Typical Count | Ease of Fix | Strategy |
|------|-------------|-------------|----------|
| `no-explicit-any` (own code) | 3-15 | Easy | Replace `any` with `unknown` or a concrete type |
| `no-explicit-any` (SDK interop) | 1-5 | Medium-Hard | Suppress inline; SDK type declarations are out of your control |
| `no-unsafe-argument` | varies | Medium | Add proper types, use type guards |
| `no-unsafe-assignment` | varies | Medium | Narrow types or add runtime validation |
| `no-unsafe-member-access` | varies | Medium | Same as above |
| `no-unsafe-return` | varies | Medium | Same as above |
| `no-unsafe-call` | varies | Medium | Same as above |

**Decision**: Fix own-code `any` always. Suppress SDK-interop `any` unless you are willing to write supplemental type declarations. Do not conflate the two — they have different costs and different fix strategies.

**Warning sign that an `any` is complex**: If the `any` is preceded by a `// biome-ignore` or `// eslint-disable-next-line` comment from a previous migration, it was likely already evaluated and deemed unfixable without SDK type work.

### 3.2. Correctness Rules

| Rule | Typical Count | Ease of Fix | Strategy |
|------|-------------|-------------|----------|
| `no-floating-promises` | 5-20 | Easy | Add `void` prefix for intentional fire-and-forget, `await` for others |
| `no-misused-spread` | 1-5 | Easy | Use `Object.assign()` instead of spread on class instances |
| `await-thenable` | 1-5 | Easy | Remove unnecessary `await` |
| `restrict-template-expressions` | 10-30 | Easy | Wrap with `String()` or `JSON.stringify()` |

**Decision**: Always fix all of these. They are easy and prevent real bugs.

### 3.3. Style Rules

| Rule | Typical Count | Ease of Fix | Strategy |
|------|-------------|-------------|----------|
| `max-params` | 5-20 | Easy-Medium | Merge parameters into options object |
| `no-unused-vars` | 10-50 | Easy | Remove unused variables, add `_` prefix for intentionally unused params |
| `no-useless-default-assignment` | 1-10 | Easy | Remove default or make property optional |
| `no-var` | varies | Easy | Replace with `const` or `let` |

**Decision**: Fix if count is manageable and changes are localized. Skip if touching many files.

### 3.4. Pedantic Structural Rules

| Rule | Typical Count | Ease of Fix | Strategy |
|------|-------------|-------------|----------|
| `max-depth` | 30-80 | Hard | Restructure logic, extract functions, early returns |
| `max-statements` | 10-40 | Hard | Extract helper functions |
| `max-lines-per-function` | 10-30 | Hard | Break into smaller functions |
| `complexity` | 5-20 | Hard | Reduce branching, extract conditions |

**Decision**: Skip unless specifically requested. These require significant refactoring with risk of regression.

### 3.5. Tool Limitation (False Positives)

| Rule | Typical Count | Strategy |
|------|-------------|----------|
| `unbound-method` | 30-60+ | Configure override for test files, or suppress per instance |
| `no-redundant-type-constituents` | 1-5 | Suppress with `// oxlint-disable-next-line` when caused by SDK type limitations |

**Decision**: Suppress via config or inline comment. Do not modify code for false positives.

### 3.6. Project-Specific Rules

| Rule | Count | Strategy |
|------|-------|----------|
| `no-console` | 4-10 | For CLI tools, consider intentional. Suppress with inline comments rather than removing |
| `max-lines` | varies | Usually OK for monorepo packages. Adjust config threshold if needed |

---

## 4. Suppression Strategies

### 4.1. Inline Suppression

```typescript
// oxlint-disable-next-line @typescript-eslint/no-explicit-any
const result = something as any;
```

### 4.2. File-Level Suppression

```typescript
// oxlint-disable-file @typescript-eslint/no-explicit-any
```

### 4.3. Config Override

In `.oxlintrc.json`:

```json
{
    "rules": {
        "typescript-eslint/unbound-method": "off"
    },
    "overrides": [
        {
            "files": ["**/*.test.ts", "**/tests/**/*.ts"],
            "rules": {
                "typescript-eslint/unbound-method": "off"
            }
        }
    ]
}
```

### 4.4. Ignore Pattern

```json
{
    "ignorePatterns": [
        "internal/",
        "**/node_modules/",
        "**/dist/"
    ]
}
```

---

## 5. Real-World Findings (CMTX Case Study)

### 5.1. Phase 1: 137 -> 59 Warnings

| Category | Rules | Count Fixable | Approach |
|----------|-------|--------------|----------|
| High Risk | `no-floating-promises`, `no-misused-spread`, `await-thenable` | 12 | Fix all, low cost |
| Medium Risk | `restrict-template-expressions`, `no-unused-vars`, `no-useless-default-assignment` | ~58 | Fix all, low cost |
| Low Risk | `unbound-method` | 59 | Suppress via config (test file false positives) |

### 5.2. Phase 2: Remaining 93 Analysis

| Category | Rules | Count | Verdict |
|----------|-------|-------|---------|
| Strongly Recommended | `no-explicit-any` (own code) | 6 | Fix: own internal code, trivial `any` -> `unknown` |
| Recom. (Debatable) | `no-explicit-any` (SDK interop) | 1 | Suppress: COS SDK type declarations are incomplete, fix would be non-trivial |
| Recommended (with caveat) | `no-console` | 4 | Fix or suppress: intentional in CLI |
| Skip (needs refactoring) | `max-depth`, `max-statements`, `max-lines-per-function`, `complexity` | 82 | Skip: structural changes, high risk |

The 6 own-code instances are all in `packages/core/src/monitoring.ts` — internal class fields where `any` acts as a generic container. Replacing with `unknown` is safe and mechanical.

The 1 SDK-interop instance is in `packages/storage/src/adapters/factory.ts` — `new COS(...) as any`. The `cos-nodejs-sdk-v5` package ships incomplete type declarations. This was already annotated with `// biome-ignore` from a previous linter migration, confirming it was previously evaluated as unfixable without SDK-level type work.

### 5.3. Surprises and Lessons

1. **`no-explicit-any` is not a monolith**: Grouping all `any` under one "easy fix" label is misleading. Own-code `any` (generic containers, internal fields) is trivial to fix. SDK-interop `any` (cast to satisfy incomplete `.d.ts`) is often unfixable without writing type declarations for third-party packages. Always check for preceding suppression comments (`// biome-ignore`, `// eslint-disable`) — they signal prior evaluation.

2. **Ignore patterns matter**: `.oxlintrc.json`'s `ignorePatterns` must be kept in sync with `pnpm-workspace.yaml`. `internal/` directories removed from the workspace still get scanned by oxlint if not listed in `ignorePatterns`.

2. **SDK types can cause false positives**: `better-sqlite3`'s namespace-based type declarations cause oxlint's `no-redundant-type-constituents` to fire. Suppress inline, don't fight the SDK.

3. **Biome-ignore comments are not removed**: The project migrated from Biome to oxlint, but `// biome-ignore` comments remain. oxlint currently ignores these comments (does not recognize them), so they are harmless dead comments.

4. **Type-aware lint adds more signal**: oxlint's TypeScript type-aware rules (`no-floating-promises`, `no-misused-spread`) catch real bugs that surface-only linters miss. But they also add ~500ms startup time for type checking.

5. **Package-selective linting speeds iteration**:
   ```bash
   pnpm -F @cmtx/core exec oxlint
   # vs full run:
   pnpm lint:oxlint
   ```

---

## 6. Commands Quick Reference

### Category Count

```bash
pnpm lint:oxlint 2>&1 | grep -E '^\s*!' | sed 's/.*eslint(\([^)]*\)).*/\1/' | sort | uniq -c | sort -rn
```

### Rule Details with Context

```bash
pnpm lint:oxlint 2>&1 | grep -B5 -A2 'no-floating-promises'
```

### Extract File Locations

```bash
pnpm lint:oxlint 2>&1 | grep -E 'no-explicit-any' --context 8 | grep -E '(packages/|--> )'
```

### Total Warning Count

```bash
pnpm lint:oxlint 2>&1 | grep -cE '^\s*!'
```

### Total Error Count

```bash
pnpm lint:oxlint 2>&1 | grep -cE '^\s*Error'
```

### Per-Package Lint

```bash
pnpm -F @cmtx/core exec oxlint
pnpm -F @cmtx/cli exec oxlint
pnpm -F @cmtx/rule-engine exec oxlint
```

### Full Verification After Fix

```bash
pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

---

## 7. References

- [DOC-006: Lint Warning Fix Guide](./DOC-006-lint-warning-fix-guide.md) — First-round fix details
- [DOC-008: Oxlint Complexity Analysis](./DOC-008-opengrep-oxlint-complexity-analysis.md) — Oxlint vs Opengrep comparison
- [PLAN-018: Fix Oxlint Warnings Part 1](../plans/PLAN-018-fix-oxlint-warnings-part1.md) — Implementation plan
- [Oxlint Rules Documentation](https://oxc.rs/docs/guide/usage/linter/rules)
- [Oxlint Configuration Reference](https://oxc.rs/docs/guide/usage/linter/config-file-reference)
- [Skill: Lint Warning Analyzer](../.kilo/skills-repo/develop/lint-warning-analyzer/SKILL.md) — Agent skill version
