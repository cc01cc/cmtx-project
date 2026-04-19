<!-- markdownlint-disable-file MD041 -->

## Kilo Skill Authoring Notes

This reference summarizes practical constraints when generating Kilo skills.

## Folder Placement

- Project generic: `.kilo/skills/<name>/SKILL.md`
- Global generic: `~/.kilo/skills/<name>/SKILL.md`

Skills are discovered via `.kilo/skills/` directories and can be registered in `kilo.jsonc`
using `skills.paths` and `skills.urls` keys. Legacy mode-specific directories are no longer recommended.

## Frontmatter Rules

1. `name` is required.
2. `description` is required.
3. `name` must match folder name exactly.
4. `name` uses lowercase letters, digits, and hyphens only.
5. Avoid vague descriptions that do not indicate trigger conditions.

## Description Formula

A reliable formula:

- capability + trigger scenario + typical user wording

Example:

- "Create and refactor Kilo SKILL.md files. Use when user asks to build
  .kilo skills, migrate third-party skills, or improve skill activation."

## Validation Commands

```bash
python3 ./scripts/quick_validate.py <skill-directory>
```

## Activation Test Prompts

- "Create a Kilo skill that standardizes changelog drafting."
- "Migrate this old skill format into Kilo and fix frontmatter."
- "Improve my Kilo skill description so it activates reliably."
