---
name: agent-builder
description: Guides creating OpenCode agents following best practices and configuration standards
license: MIT
---

# Create OpenCode Agents

## Overview

OpenCode agents are specialized AI assistants configured for specific tasks and workflows. This guide covers:

- Agent types and modes
- Configuration structure
- Permission system
- Best practices

## Agent Types

### Primary Agents

Main assistants you interact with directly. Switch between them using Tab key or configured keybind.

**Characteristics**:

- Users engage directly
- Handle main conversation flow
- Can invoke subagents via Task tool
- Configurable models, prompts, and permissions

**When to create**:

- Different workflows (build, plan, debug, etc.)
- Specialized primary roles needed in your project

### Subagents

Specialized assistants invoked by primary agents or manually via @ mention.

**Characteristics**:

- Focused on specific tasks
- Can be invoked automatically by model
- Can be manually invoked with @mention
- Can be hidden from autocomplete
- Inherit primary agent's model unless overridden

**When to create**:

- Specialized domains (code review, documentation, security audit)
- Internal helpers for complex workflows
- Read-only assistants for analysis

## Configuration Structure

### File Location

Place agent definitions in:

- Project: `.opencode/agents/{name}.md`
- Global: `~/.config/opencode/agents/{name}.md`

### Front Matter Fields

**Required**:

- `description` (1-1024 chars) - Brief description of agent's purpose
- `mode` - `primary`, `subagent`, or `all` (defaults to `all`)

**Optional**:

- `model` - Override global model (format: `provider/model-id`)
- `temperature` - Control randomness (0.0-1.0, defaults per model)
- `steps` - Max agentic iterations before text-only response
- `hidden` - Hide subagent from @ autocomplete (subagents only)
- `color` - UI color (hex or theme: primary, secondary, accent, success, warning, error, info)
- `top_p` - Alternative to temperature (0.0-1.0)
- `permission` - Granular permission overrides

### System Prompt

Content after front matter becomes the agent's system prompt. Write clear instructions for the agent's role and behavior.

```markdown
---
description: Your agent description
mode: subagent
---

# Your Agent Name

You are a specialized assistant for [domain]. Focus on:

- [Key responsibility 1]
- [Key responsibility 2]
- [Key responsibility 3]
```

## Permission System

Use `permission` field to control what actions an agent can perform. Permissions override global config.

### Permission Values

- `allow` - Run without approval
- `ask` - Prompt for approval
- `deny` - Block the action

### Available Permission Types

```markdown
---
description: Example agent
mode: subagent
permission:
    read: allow # Reading files
    edit: deny # File modifications
    bash: ask # Shell commands
    webfetch: deny # Web requests
    websearch: deny # Web search
    grep: allow # Content search
    glob: allow # File globbing
    task: ask # Invoking subagents
    skill: allow # Loading skills
    lsp: ask # LSP queries
    todoread: allow # Reading todos
    todowrite: deny # Updating todos
---

Your prompt here.
```

### Granular Bash Rules

Control specific commands with patterns:

```markdown
permission:
bash:
"_": ask # Default: ask for all
"git status _": allow # Whitelist safe commands
"git diff": allow
"grep _": allow
"git push": deny # Block dangerous operations
"rm _": deny
```

Rules are evaluated in order; last match wins. Patterns support wildcards: `*` (0+ chars), `?` (1 char).

## Temperature Guide

Control response creativity and focus:

| Temperature | Use Case                                | Example Agent        |
| ----------- | --------------------------------------- | -------------------- |
| 0.0-0.2     | Focused analysis, planning, code review | plan, code-reviewer  |
| 0.3-0.5     | General development, balanced           | build, general       |
| 0.6-0.8     | Creative, exploration, brainstorming    | brainstorm, creative |

## Naming Conventions

**Valid names** (1-64 chars, lowercase alphanumeric with hyphens):

- `code-reviewer` ✓
- `security-auditor` ✓
- `docs-writer` ✓

**Avoid**:

- Mixed case: CamelCase
- Generic: `agent`, `helper`
- Consecutive hyphens: `code--reviewer`
- Leading/trailing hyphens: `-code-reviewer`

## Example Agents

### Code Review Agent (Subagent)

```markdown
---
description: Reviews code for best practices and potential issues
mode: subagent
model: bailian-coding-plan/kimi-k2.5
temperature: 0.1
permission:
    edit: deny
    bash: deny
    webfetch: deny
---

# Code Reviewer

You are a senior code reviewer. Analyze code for:

- Code quality and best practices
- Potential bugs and edge cases
- Performance implications
- Security vulnerabilities
- Maintainability and clarity

Provide constructive feedback without making direct changes.
```

### Documentation Agent (Subagent)

```markdown
---
description: Writes and maintains project documentation
mode: subagent
temperature: 0.5
permission:
    bash: deny
---

# Documentation Writer

You are a technical writer. Create clear, comprehensive documentation.

Focus on:

- Clear explanations
- Proper structure and hierarchy
- Code examples
- User-friendly language
- Consistency with existing docs
```

### Security Auditor (Subagent)

```markdown
---
description: Performs security audits and identifies vulnerabilities
mode: subagent
temperature: 0.1
permission:
    edit: deny
    write: deny
    bash: deny
---

# Security Auditor

You are a security expert. Identify potential security issues.

Look for:

- Input validation vulnerabilities
- Authentication and authorization flaws
- Data exposure risks
- Dependency vulnerabilities
- Configuration security issues
```

### Planning Agent (Primary)

```markdown
---
description: Analysis and planning without making code changes
mode: primary
model: bailian-coding-plan/kimi-k2.5
temperature: 0.2
permission:
    edit:
        "*": deny
    write:
        "*": deny
    bash:
        "*": ask
        "git status *": allow
        "git diff": allow
        "grep *": allow
---

# Planner

You are a planning specialist focused on analysis and strategy.

Your role:

- Analyze code and architecture
- Suggest improvements
- Create implementation plans
- Never modify code directly
- Prompt user before any execution
```

## Best Practices

### Permission Defaults

If not specified:

- Most permissions default to `allow`
- `doom_loop` and `external_directory` default to `ask`
- `.env` files default to `deny`

### Permission Strategy

1. **Principle of Least Privilege**: Start restrictive, add permissions as needed
2. **Tool-Specific**: Use granular permission rules, not blanket allow/deny
3. **Dangerous Operations**: Keep `task`, `bash`, `edit` as `ask` or `deny` for read-only agents
4. **Safe Operations**: Mark safe reads and commands as `allow`

### Prompt Guidelines

- Be explicit about agent's role and authority
- List specific responsibilities
- Include quality standards and constraints
- Provide output format expectations
- Add safety guidelines where needed

### Creating Agents

Use OpenCode CLI for interactive setup:

```bash
opencode agent create
```

This will:

1. Ask for agent name and location
2. Collect description and role details
3. Configure tool permissions
4. Generate markdown file

## Related Resources

- [OpenCode Agents Documentation](https://opencode.ai/docs/agents/)
- [Permission System Documentation](https://opencode.ai/docs/permissions/)
- [Agent Skills Documentation](https://opencode.ai/docs/skills/)
- [Configuration Guide](https://opencode.ai/docs/config/)
