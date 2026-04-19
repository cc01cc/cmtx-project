<!-- markdownlint-disable-file MD041 -->

## Kilo Customization Decision Matrix

Use this matrix when selecting the most suitable Kilo customization primitive.

| Need | Preferred Primitive | Why |
| --- | --- | --- |
| Always-on team rules | rule (`kilo.jsonc` `instructions`, `.kilo/rules/*.md`) | Global/project constraints with precedence control |
| File-pattern behavior in Copilot | `*.instructions.md` | Scope by `applyTo` and keep always-on guidance concise |
| Repeatable domain workflow | skill (`.github/skills/<name>/SKILL.md`) | On-demand, reusable, can bundle references/scripts |
| Delegated isolated execution | subagent (`.kilo/agents/*.md` or `kilo.jsonc`) | Isolated context and tool permissions per role |
| Explicit user-triggered routine | workflow/slash command (`.kilo/commands/*.md`) | Manual `/command` entry point for common runs |
| Deterministic enforcement | script/CLI/MCP tool | Strong execution guarantees and validation |

## Refactor Heuristics

Use these checks to decide if an existing customization should be migrated.

1. If a rule contains long procedures or branching steps, migrate to skill or workflow.
2. If a skill is always required and broad, move stable constraints into rules or instructions.
3. If a workflow needs strict non-skippable steps, move critical steps into script/CLI and call from workflow.
4. If one customization mixes multiple tool permissions, split into dedicated subagents.
5. If descriptions are vague and not discoverable, rewrite with "Use when..." triggers.

## New Requirement Triage

1. Is the need always-on? If yes, prefer rule or instructions.
2. Is the need explicit and user-triggered? If yes, prefer workflow.
3. Is isolated context or role-specific permission needed? If yes, prefer subagent.
4. Is reusable task knowledge needed with optional assets? If yes, prefer skill.
5. Is deterministic completion required? If yes, implement script/CLI/MCP tool and optionally wrap with workflow.
