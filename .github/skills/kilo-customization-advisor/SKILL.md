---
name: kilo-customization-advisor
description: Analyze and refactor Kilo customizations across rules, instructions, skills, subagents, and workflows. Use when you need to organize existing Kilo custom files, choose a more suitable customization type, or design new Kilo customization strategies from requirements.
license: Complete terms in LICENSE.txt
argument-hint: Goal, scope (project/global), and target customizations to analyze
user-invocable: true
---

## Overview

This skill helps GitHub Copilot evaluate existing Kilo customization assets and
recommend the most suitable customization type for both refactoring and new
requirements.

This skill is advisory-first. It should not directly implement file edits unless
the user explicitly asks it to switch into execution mode.

Primary coverage:

- Kilo rules (`kilo.jsonc` `instructions`, `.kilo/rules/*.md`)
- Copilot instructions (`.github/instructions/*.instructions.md`)
- Skills (`.github/skills/<name>/SKILL.md`)
- Subagents (`.kilo/agents/*.md`, `kilo.jsonc` `agent`)
- Workflows/slash commands (`.kilo/commands/*.md`)

Reference docs:

- Kilo customize index: https://kilo.ai/docs/customize
- Kilo workflows: https://kilo.ai/docs/customize/workflows
- Kilo subagents: https://kilo.ai/docs/customize/custom-subagents

## When To Use This Skill

Use this skill when requests include intents like:

- "整理现有 Kilo custom，判断放在 rule/skill/workflow 哪个更合适"
- "把已有 Kilo custom 重构成更清晰的分层"
- "针对新需求建议最合适的 Kilo customization 类型"
- "评估某个 customization 是不是应该迁移为 subagent 或 workflow"

Do not use this skill for generic application coding tasks.

Do not use this skill as the primary implementation tool for rule/skill/workflow
file authoring. Route implementation to specialized skills.

## Non-Goals

- Do not directly edit customization files by default.
- Do not mix planning and implementation in one response unless explicitly requested.
- Do not replace specialist editor skills when a dedicated skill exists.

## Inputs To Collect

Collect or infer these inputs before proposing changes:

1. Goal: expected behavior and quality bar.
2. Scope: project-only or global reuse.
3. Determinism: guidance-oriented vs strict non-skippable execution.
4. Trigger style: always-on, automatic matching, or explicit `/command`.
5. Isolation needs: whether separate context or permission boundaries are needed.

If key inputs are missing, ask concise follow-up questions.

## Workflow A: Audit Existing Kilo Customizations

1. Inventory current custom files across rules, skills, subagents, workflows,
   and instruction files.
2. Classify each item by intent: constraint, guidance, delegation, entrypoint,
   or deterministic execution.
3. Detect mismatches using
   [decision matrix](./references/customization-decision-matrix.md).
4. Flag overlap, ambiguity, and hidden coupling.
5. Propose a migration plan with priority and rollback notes.

## Workflow B: Refactor To Better Customization Types

1. Confirm migration target for each item (rule/instruction/skill/subagent/workflow).
2. Preserve behavior intent first, then simplify placement.
3. Split mixed responsibilities into focused files.
4. Strengthen discovery text (especially `description` fields) with clear
   trigger phrases.
5. Keep legacy compatibility references only when needed and mark them clearly.
6. Provide sample prompts to validate activation after migration.

## Workflow C: Recommend New Customization Strategy

1. Parse the new requirement into capability + trigger + constraints.
2. Choose primary primitive via the decision matrix.
3. Decide if a hybrid is required:
    - `workflow + script/CLI` for stronger execution guarantees
    - `skill + subagent` for reusable guidance plus isolated execution
4. Draft minimal files and frontmatter skeletons.
5. Define acceptance checks and a verification runbook.

## Delegation Policy

After producing recommendations, hand implementation to specialist skills:

- Use `kilo-rule-editor` for rule-location, precedence, and rule authoring updates.
- Use `kilo-skill-editor` for SKILL.md creation/refactor and activation-quality improvements.
- Use workflow/slash-command specific editor flow when command files are the target.

If no specialist exists, provide implementation guidance but still separate
"advice" from "execution" clearly.

## Decision Rules

Use these branching rules:

1. If behavior must always apply, choose rule or instructions.
2. If user-triggered via `/`, choose workflow/slash command.
3. If isolated context or role-based permission is needed, choose subagent.
4. If reusable procedural knowledge is needed, choose skill.
5. If strict step completion is required, use script/CLI/MCP tool and optionally
   wrap with workflow.

## Completion Checks

Before handoff, verify:

- every recommendation maps to one clear primary customization type
- migration plan includes why, not only where
- activation/discovery text is specific and testable
- deterministic needs are handled by script/CLI/MCP, not only prompt guidance
- verification prompts are included for each migrated or newly proposed item
- implementation owner is assigned per recommended change

## Output Template

Return results in this order:

1. current-state findings (by file and type)
2. proposed target mapping (old -> new type/path)
3. recommended implementation owner per item (e.g., `kilo-rule-editor`)
4. migration steps with risk notes
5. validation prompts and acceptance checks
6. optional follow-up customizations

For item 3, use this compact handoff schema for each migration unit:

- `change_id`:
- `target_type`:
- `target_path`:
- `implementation_skill`:
- `acceptance_checks`:
