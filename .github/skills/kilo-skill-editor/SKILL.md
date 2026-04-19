---
name: kilo-skill-editor
description: Create, update, and refactor Kilo skills for .kilo/skills and kilo.jsonc. Use when the user asks to scaffold a new Kilo SKILL.md, improve skill activation wording, migrate a third-party skill into Kilo format, or validate skill naming, links, and bundled resources.
license: Complete terms in LICENSE.txt
argument-hint: Goal, scope (project/global), mode (optional), and target skill name
---

## Overview

This skill helps GitHub Copilot create and maintain high-quality Kilo skills.
It is focused on creating or editing files under `.kilo/skills/` and
configuring skills via `kilo.jsonc`.

## When To Use This Skill

Use this skill for requests such as:

- "Create a Kilo skill for XXX."
- "Refactor my existing Kilo SKILL.md to improve activation."
- "Convert this Copilot or Claude skill into Kilo format."
- "Generate scripts to scaffold and validate Kilo skills."

Do not use this skill for unrelated application coding tasks.

## Required Inputs

Collect these inputs first:

1. Goal: what result this target skill should produce.
2. Scope: `project` or `global`.
3. Depth: quick checklist or full multi-step workflow.
4. Resources: whether `scripts/`, `references/`, or `assets/` are needed.
5. Config needs: whether skill requires entries in `kilo.jsonc`.

If information is missing, ask concise clarifying questions before editing files.

## Creation Workflow

1. Determine target path.
2. Enforce naming and frontmatter constraints.
3. Draft `SKILL.md` with concrete triggers in `description`.
4. Add optional `scripts/` and `references/` only when needed.
5. Validate name, description, and placeholders.
6. Provide usage prompts for activation testing.

## Path Rules

For Kilo output, use these paths:

- Project generic: `.kilo/skills/<skill-name>/SKILL.md`
- Global generic: `~/.kilo/skills/<skill-name>/SKILL.md`

Skills can be configured and discovered via `kilo.jsonc` with keys:

- `skills.paths`: array of local skill directories to load
- `skills.urls`: array of remote skill repository URLs

Legacy mode-specific directories (`.kilo/skills-<mode>/`) are deprecated.
Use agent configuration or workflow layers to apply mode-specific behavior instead.

Always enforce:

- frontmatter `name` equals parent folder name
- `name` uses lowercase, digits, and hyphens only
- no leading or trailing hyphen
- no consecutive hyphens

## SKILL.md Minimum Template

```yaml
---
name: my-kilo-skill
description: Explain what the skill does and exactly when to use it.
license: MIT
---
```

Then include sections for:

- purpose summary
- when to use
- required inputs
- step-by-step workflow
- validation and troubleshooting

## Description Quality Rules

The `description` field is the activation key.
Write both:

- capability: what the skill can do
- trigger context: when and how users ask for it

Weak example:

- "Helps with skills"

Strong example:

- "Create and refactor Kilo SKILL.md files. Use when user asks to build
  .kilo skills, migrate third-party skills, or improve skill trigger
  matching."

## Optional Resources

Use optional folders only when they add clear value:

- `scripts/`: deterministic automation
- `references/`: long docs loaded on demand
- `assets/`: static output resources used as-is

Keep file references relative, for example:

- `./scripts/init_kilo_skill.py`
- `./references/kilo_skill_spec.md`

## Validation Checklist

Before handover, verify:

1. `name` and folder match exactly.
2. `description` includes capability and trigger words.
3. no unresolved placeholder markers remain.
4. resource links are valid relative paths.
5. content is concise and actionable.

For quick checks, run:

```bash
python3 ./scripts/quick_validate.py <skill-directory>
```

See detailed checks in
[validation guide](./references/kilo_skill_spec.md).

## Iteration Pattern

After first draft:

1. identify the weakest section
2. ask a targeted follow-up question
3. revise and finalize
4. provide 3 example prompts to test activation

## Included Utilities

- [init_kilo_skill.py](./scripts/init_kilo_skill.py)
- [quick_validate.py](./scripts/quick_validate.py)
- [kilo_skill_spec.md](./references/kilo_skill_spec.md)
