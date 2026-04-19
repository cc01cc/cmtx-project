# Plan Mode Reference

Complete reference for Plan Mode metadata requirements.

**Note**: File naming is auto-managed by kilocode. This document focuses on metadata standardization only.

## File Location

All plan files must be in:

```
.kilo/plans/
```

Examples of kilocode-generated file names:

- `.kilo/plans/1776264273233-neon-garden.md`
- `.kilo/plans/1776264273234-arctic-wolf.md`
- `.kilo/plans/1776264273235-cosmic-sage.md`

## YAML Frontmatter

### Required Structure

Every plan file MUST start with:

```yaml
---
title: "Plan Title Here"
date: 2026-04-15T21:51:16+08:00
---
```

### Required Fields

1. **title** (string, required)
   - Non-empty text
   - Describes the plan subject
   - Examples:
     - "API Rate Limiting Feature Design"
     - "Database Migration Strategy"
     - "Performance Optimization Plan"

2. **date** (ISO 8601 with timezone, required)
   - Format: `YYYY-MM-DDTHH:MM:SS±HH:MM`
   - Time zone required (not optional)
   - Examples:
     - `2026-04-15T21:51:16+08:00` (UTC+8)
     - `2026-04-15T10:30:00-07:00` (UTC-7)
     - `2026-04-15T14:20:30+00:00` (UTC)

### Optional Fields

```yaml
---
title: "Feature Design"
date: 2026-04-15T21:51:16+08:00
description: "Comprehensive design for X feature"
tags: [feature, design, high-priority]
status: draft
---
```

Optional field suggestions:

- `description`: Longer summary
- `tags`: Related topics or categories
- `status`: draft | active | completed | archived
- `author`: Person who created the plan
- `priority`: high | medium | low

## Date Format

### ISO 8601 with Timezone

Plan dates MUST include timezone information.

### Examples (Valid)

```
2026-04-15T21:51:16+08:00    (UTC+8, China)
2026-04-15T15:51:16+02:00    (UTC+2, Eastern Europe)
2026-04-15T10:30:00-07:00    (UTC-7, California)
2026-04-15T14:20:30+00:00    (UTC, London)
2026-04-15T09:00:00-05:00    (UTC-5, Eastern US)
```

### Examples (Invalid)

```
2026-04-15T21:51:16              ❌ No timezone
2026-04-15 21:51:16+08:00        ❌ Space instead of T
2026-04-15T21:51:16+8:00         ❌ Hour timezone not zero-padded
2026-04-15T21:51:16 +08:00       ❌ Space before timezone
```

### How to Get Current ISO 8601 Date

**Linux/macOS**:

```bash
date -Iseconds
# Output: 2026-04-15T21:51:16+08:00
```

**Python**:

```python
from datetime import datetime, timezone
import pytz

tz = pytz.timezone('Asia/Shanghai')  # or your timezone
now = datetime.now(tz)
iso_date = now.isoformat()
print(iso_date)
# Output: 2026-04-15T21:51:16+08:00
```

**JavaScript**:

```javascript
const now = new Date();
console.log(now.toISOString());
// Output: 2026-04-15T15:51:16.123Z (UTC)
```

## Complete Example

File: `.kilo/plans/1776264273233-neon-garden.md`

```yaml
---
title: "API Rate Limiting Feature Design"
date: 2026-04-15T21:51:16+08:00
description: "Design and implementation strategy for distributed rate limiting"
tags: [feature, api, performance, high-priority]
status: active
---

## Problem Statement

Current API lacks rate limiting mechanism, causing service degradation under load.

## Recommended Approach

### Option A: Token Bucket Algorithm
- Pros: Fair distribution, permits burst traffic
- Cons: More memory overhead
- Implementation: Redis-backed counter

### Option B: Sliding Window
- Pros: Simpler logic, accurate counting
- Cons: Can't burst
- Implementation: Database with TTL

**Decision: Option A** - Better for our use case with B2B API clients needing occasional bursts.

## Critical Files to Modify

- `src/middleware/rateLimit.ts` - Add middleware
- `src/config/limits.config.ts` - Configuration
- `tests/rateLimit.test.ts` - Test suite
- `docs/api/RATE_LIMITING.md` - Documentation

## Verification

1. Unit tests pass: `pnpm -F @api test`
2. Integration test: Verify limits enforced at 100 req/min
3. Load test: Monitor performance under 1000+ concurrent requests
4. Documentation: Update API docs with rate limit headers
```

## Troubleshooting

### Issue: "Invalid file name format"

Check:

- ID is 3 digits (001-999)
- NAME contains only lowercase a-z, digits 0-9, hyphens
- No leading/trailing/consecutive hyphens
- Extension is `.md`

**Fix Example**:

```
❌ PLAN-1-Feature Design.md (wrong ID format, spaces, capitals)
✅ PLAN-001-feature-design.md
```

### Issue: "Missing required frontmatter"

Ensure file starts with:

```yaml
---
title: "Your Title"
date: YYYY-MM-DDTHH:MM:SS±HH:MM
---
```

### Issue: "Invalid date format"

Use ISO 8601 with timezone:

```
❌ 04/15/2026
❌ 2026-04-15 21:51:16
❌ 2026-04-15T21:51:16
✅ 2026-04-15T21:51:16+08:00
```

## Validation Script

Run to validate a plan file:

```bash
python3 .kilo/skills/plan-mode/scripts/validate-plan.py \
  .kilo/plans/PLAN-001-your-plan.md
```

Output examples:

**Valid**:

```
✅ File location valid (.kilo/plans/)
✅ File name valid: PLAN-001-feature-design
✅ YAML frontmatter valid (title, date present)

============================================================
✅ Plan file is VALID
```

**Invalid**:

```
✅ File location valid (.kilo/plans/)
❌ Invalid file name format
   Got: PLAN-1-Feature Design.md
   Expected: PLAN-<ID>-<NAME>.md
   Example: PLAN-001-feature-design.md

============================================================
❌ Plan file has ISSUES
```

## Best Practices

1. **Use descriptive names** - `PLAN-001-rate-limiting` is better than `PLAN-001-task`
2. **Keep titles clear** - "API Rate Limiting Feature" better than "Work on features"
3. **Include date with timezone** - Helps track plan age across timezones
4. **Start numbering from 001** - Makes finding gaps easy
5. **One plan per feature/task** - Easier to review and track

## Related

- `.kilo/skills/plan-mode/SKILL.md` - Skill documentation
- `.kilo/skills/plan-mode/scripts/validate-plan.py` - Validation script
- `.kilo/rules/plan-mode-strict.md` - Optional tool restrictions
