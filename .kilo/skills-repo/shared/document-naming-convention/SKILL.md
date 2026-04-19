---
name: document-naming-convention
description: Establish consistent document naming conventions. Use when creating or renaming docs in adr/, plans/, or similar directories, or validating names against patterns.
license: MIT
---

## Purpose

This skill provides comprehensive guidance on document naming standards for `adr/`, `plans/`, and similar decision/planning directories. It ensures:

- Consistent, machine-parseable file names
- Automatic sequential numbering to prevent conflicts
- Clear classification and categorization
- Easy discovery and sorting

## When To Use This Skill

Activate this skill when:

1. **Creating new document**: "What should I name this new ADR?" or "Create PLAN-XXX for..."
2. **Renaming existing docs**: "Rename all docs in this directory to follow standards"
3. **Validating names**: "Check if these file names comply with the convention"
4. **Finding next number**: "What's the next available number for a PLAN doc?"
5. **Fixing non-compliant names**: "Fix naming errors in this directory"

## Required Inputs

Before starting, collect:

- **Target directory**: e.g., `docs/adr/`, `.kilo/plans/`
- **Document classification** (optional): e.g., `ADR`, `PLAN`, `API`
- **Scope of operation**: single file, full directory, or cross-directory check
- **Existing files**: list of current files to determine next number and check for conflicts

## Step-by-Step Workflow

### Step 1: Determine Applicable Scope

Check if the directory meets criteria:

- Named `adr`, `plans`, or similar decision/plan directory
- Contains 2+ documents (single files have no naming requirement)

✓ If yes → proceed to Step 2  
✗ If no → naming convention does not apply to this directory

### Step 2: Identify Classification & Numbering

1. **Has classification prefix?** (e.g., `ADR-`, `PLAN-`, `API-`)
    - Yes → Extract all docs with same prefix; find max number
    - No → Check entire directory; find max number across all docs

2. **Calculate next number**:
    - If max is `ADR-003`, next is `ADR-004`
    - If max is `05`, next is `06`
    - Preserve digit width (e.g., `01` → `02` not `1` → `2`)

3. **Document name** (the part after number):
    - Use lowercase when possible, uppercase only for acronyms
    - Connect words with underscores: `architecture_decision_record`
    - Avoid spaces, dots, parentheses, or special chars

### Step 3: Construct and Validate File Name

Format: `[CATEGORY-]NUMBER-name.md`

**Validation criteria**:

| Element   | Rule                             | Example                 |
| --------- | -------------------------------- | ----------------------- |
| Category  | Uppercase letters only; optional | `ADR`, `PLAN`, or none  |
| Separator | Hyphens between parts            | `-` (not `_`, not `.`)  |
| Number    | 2+ digits; left-padded zeros     | `01`, `002`, `123`      |
| Name      | Alphanumeric + underscores + CJK | `architecture_decision` |
| Extension | Always `.md`                     | `.md`                   |

**Regex**: `^(?:[A-Z]+-)?[0-9]+-[A-Za-z0-9\u4e00-\u9fa5_]+\.md$`

### Step 4: Check for Conflicts

- Is this name already in the directory? → Adjust number
- Is this number assigned to another category? → OK (categories are independent)
- Does the name clearly reflect content? → If unclear, revise

### Step 5: Apply and Document

- Rename or create file with validated name
- If bulk renaming, list old → new mappings
- Verify no duplicates or regressions

## Validation Checklist

Before handover:

- [ ] File name matches regex: `^(?:[A-Z]+-)?[0-9]+-[A-Za-z0-9\u4e00-\u9fa5_]+\.md$`
- [ ] No duplicate numbers within same category
- [ ] Number is strictly increasing (no gaps okay, but no duplicates)
- [ ] Name contains no forbidden chars (spaces, dots, parens, etc.)
- [ ] Classification prefix (if used) is uppercase
- [ ] Directory actually needs naming convention (2+ files)

## Common Scenarios

### Scenario 1: Create a New ADR

**Input**: Directory has `ADR-001-xxx.md`, `ADR-002-yyy.md`

**Decision**: What number for new ADR about authentication?

**Process**:

1. Max ADR number is 002
2. Next number: 003
3. File name: `ADR-003-authentication_strategy.md`
4. ✓ Validate: matches regex, no conflict

**Output**: `ADR-003-authentication_strategy.md`

---

### Scenario 2: Add a New PLAN (Different Category)

**Input**: Same directory, also has `PLAN-001-zzz.md`

**Decision**: Create new plan for refactoring

**Process**:

1. Max PLAN number is 001 (independent from ADR)
2. Next number: 002
3. File name: `PLAN-002-refactor_upload_layer.md`
4. ✓ Validate: matches regex, no conflict with ADR series

**Output**: `PLAN-002-refactor_upload_layer.md`

---

### Scenario 3: Rename Non-Compliant Files

**Input**: Directory has `adr-001-architecture.md`, `adr_002_design.md`

**Issues**:

- `adr-001-` has lowercase category (must be uppercase)
- `adr_002_` uses underscores as separators (must be hyphens)

**Process**:

1. Correct to `ADR-001-architecture.md` (uppercase + hyphens)
2. Correct to `ADR-002-design.md`
3. Re-validate both

**Output**:

- `adr-001-architecture.md` → `ADR-001-architecture.md`
- `adr_002_design.md` → `ADR-002-design.md`

---

### Scenario 4: Bulk Directory Audit

**Input**: 10 files in `.kilo/plans/`, mixed naming styles

**Process**:

1. Scan all files; identify category prefixes and max numbers
2. For each non-compliant file:
    - Fix case, separators, char set
    - Reassign number based on existing max
3. Verify no number collisions post-rename

**Output**:

- Report: Old name → New name for each file
- Summary: X files renamed, Y already compliant

## Troubleshooting

| Issue              | Cause                          | Solution                              |
| ------------------ | ------------------------------ | ------------------------------------- |
| Number collision   | Two files assigned same number | Re-number one; ensure strict ordering |
| Unclear name       | Name doesn't reflect content   | Revise to be more descriptive         |
| Invalid characters | Spaces, dots, parens in name   | Remove or replace with underscore     |
| Wrong separator    | Using `_` or `.` between parts | Change to `-`                         |
| Category lowercase | `adr-001` instead of `ADR-001` | Uppercase the category                |

## References

For detailed specifications, validation scripts, and edge cases:

- Full specification: [./references/docs_naming_spec.md](./references/docs_naming_spec.md)
- Automated validator: [./scripts/validate_doc_naming.py](./scripts/validate_doc_naming.py)

## Example Activation Prompts

Test this skill with:

1. **"Use the document-naming-convention skill to determine the next number for a new PLAN in `.kilo/plans/`."**
2. **"I have these files in `.kilo/adr/`: ADR-001-xxx.md, adr-002-yyy.md, ADR-004-zzz.md. Which names violate the standard?"**
3. **"Validate this file name against the document naming regex: `Plan_001_architecture review.md`"**
