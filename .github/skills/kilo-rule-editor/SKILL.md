---
name: kilo-rule-editor
description: Create, update, and refactor Kilo custom rules via kilo.jsonc and .kilo/rules. Use when the user asks to configure rules, define global rules, manage rule precedence, migrate legacy .kilocoderules files, troubleshoot rule behavior, or improve rule clarity and enforceability.
license: Complete terms in LICENSE.txt
argument-hint: Goal, scope (project/global), and preferred strictness
---

## Overview

This skill helps GitHub Copilot create and maintain Kilo custom rules with a
predictable structure, clear precedence, and practical validation.

Before creating or updating any Kilo skill or rule, fetch the latest guidance
from the official Kilo documentation URLs listed in this file.

## When To Use This Skill

Use this skill when a request includes any of these intents:

- create new Kilo rules for a repository
- update existing rules to match team conventions
- split one large rule file into focused rule files
- configure global rules for all projects
- configure mode-specific rules for a workflow mode
- migrate legacy rule files to folder-based layout
- debug why rules are not being respected

Do not use this skill for general application coding work.

## Live Documentation Sources

Always fetch these URLs before creating or updating Kilo skills or rules:

- Custom Rules: https://kilo.ai/docs/customize/custom-rules
- Custom Instructions: https://kilo.ai/docs/customize/custom-instructions
- Custom Modes: https://kilo.ai/docs/customize/custom-modes
- Custom Subagents: https://kilo.ai/docs/customize/custom-subagents
- Skills: https://kilo.ai/docs/customize/skills
- Workflows: https://kilo.ai/docs/customize/workflows
- agents.md: https://kilo.ai/docs/customize/agents-md

Recommended secondary references when rule behavior depends on context loading or
execution policy:

- Settings: https://kilo.ai/docs/getting-started/settings
- Auto-Approval: https://kilo.ai/docs/getting-started/settings/auto-approving-actions
- .kilocodeignore: https://kilo.ai/docs/customize/context/kilocodeignore
- Large Projects: https://kilo.ai/docs/customize/context/large-projects

## Mandatory Refresh Step

For every create/update/refactor request, do this first:

1. Fetch the primary URLs in "Live Documentation Sources".
2. Extract current rule locations, loading order, deprecated paths, and UI notes.
3. Compare with existing local skill content.
4. Apply edits based on latest official behavior.

If any source is temporarily unavailable, proceed with cached knowledge but report
which URL failed and mark the output as "needs doc recheck".

## Inputs To Collect

Collect or infer these inputs before editing files:

1. Goal: what behavior the rules must enforce.
2. Scope: `project` or `global`.
3. Style: strict guardrails or lightweight guidance.
4. Safety constraints: restricted files, forbidden operations, or policy needs.
5. Config location: prefer `kilo.jsonc` instructions array or `.kilo/rules/` folder.

If key inputs are missing, ask concise follow-up questions.

## Rule Locations

Use these canonical locations:

**Primary (recommended):**

- Rules in `kilo.jsonc` under `instructions` array (project and global)
- Markdown files in `.kilo/rules/*.md` (project)
- Markdown files in `~/.kilo/rules/*.md` (global)

**Legacy compatibility locations:**

- `.roorules`
- `.clinerules`
- `.kilocoderules` (deprecated)
- `.kilocoderules-<mode>` (deprecated)
- `.kilocode/rules/` (legacy folder, no longer recommended)

Prefer `kilo.jsonc` instructions for centralized rule management. Use `.kilo/rules/` folder for modular, topic-based rule organization when rules are numerous.

## Precedence Model

Apply this priority model when merging or troubleshooting directives:

1. Global generic rules load first (from `~/.kilo/rules/` or global `kilo.jsonc`).
2. Project generic rules load next and override conflicting global directives (from `.kilo/rules/` or project `kilo.jsonc`).
3. Legacy files are fallback sources.
4. Agent-scoped or workflow-layer overrides have final priority.

When two rules conflict, keep the more specific one and remove ambiguity.

## Authoring Standards

Write rules in Markdown and keep each file focused on one concern.

Recommended file split:

- `coding-style.md`
- `testing.md`
- `docs.md`
- `security.md`
- `restricted-files.md`

Quality requirements:

- use direct and testable language
- avoid vague terms like "best effort" or "as appropriate"
- provide short examples for non-obvious constraints
- keep rules concise and maintainable

## Workflow: Create Or Update Rules

1. Fetch latest official Kilo docs from the required URL list.
2. Discover existing rule sources in both modern and legacy locations.
3. Decide target scope and storage (kilo.jsonc vs. .kilo/rules/ folder).
4. Create or refactor entries in `kilo.jsonc` instructions or modular `.kilo/rules/` files.
5. Merge duplicates and resolve directive conflicts by precedence.
6. Add explicit restricted-file rules when security constraints are required.
7. Validate readability, ambiguity, and configuration syntax.
8. Summarize what changed and why.

## Workflow: Migrate Legacy Rules

1. Fetch latest official Kilo docs from the required URL list.
2. Read legacy files and classify directives by topic.
3. Migrate to `kilo.jsonc` instructions array or create topic-based files under `.kilo/rules/`.
4. Preserve intent while tightening ambiguous wording.
5. Keep a short migration note in the final response.
6. Recommend removing or freezing legacy files after migration.

## Troubleshooting Checklist

If rules do not appear to apply:

1. confirm files are in supported directories
2. verify rules are enabled in the Kilo settings UI
3. ensure Markdown structure is valid and clear
4. check mode-specific files for overrides
5. restart VS Code if load state appears stale

## Completion Checks

Before handoff, verify all items:

- target files are in the expected scope and mode directories
- conflicting directives are resolved with precedence explained
- no deprecated location is introduced for new rules
- sensitive file restrictions exist when requested
- latest docs were fetched from required URLs in this run
- final output includes example prompts to test behavior

## Response Template

Use this structure when returning results:

1. files created or updated
2. precedence and conflict notes
3. sample prompts to test the new rules
4. optional next improvements

## Example Prompts

- "Create project rules to enforce TypeScript naming and mandatory unit tests."
- "Migrate our .kilocoderules into kilo.jsonc instructions with separate rule topics."
- "Add workflow-specific rules and keep general coding rules unchanged."
- "Harden rules to block reading .env, credentials.json, and private keys."
