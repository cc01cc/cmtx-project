---
name: vscode-extension-documentation
description: VS Code extension README specialist. Use when creating Marketplace docs, install guides, config, and contribution sections.
license: MIT
---

# VS Code Extension Documentation Skill

## Overview

Use this skill when writing README files for VS Code extensions. This workflow ensures professional, scan-friendly documentation that meets marketplace standards.

## Key Requirements

**Structure & Content**

- Title with extension name and one-sentence value proposition
- At least one screenshot or GIF demonstrating key functionality
- Installation steps and prerequisites (VS Code version, dependencies)
- Quick Start section with minimal code example
- Configuration options table with defaults and descriptions
- FAQ section for common issues and resolutions
- Contributing guidelines and license information
- Feedback channels (GitHub Issues, Discord, etc.)

**Markdown Quality**

- Use structured Markdown: headers, lists, code blocks; avoid fluff
- Keep formatting clean and scannable for developers
- Include alt text for all images

## Marketplace Readiness Checks

In addition to base README sections, verify extension-specific details:

- Commands list with command IDs and purpose
- Configuration table aligned with contribution points
- Permissions/capabilities disclosure (filesystem, network, workspace access)
- Telemetry statement (whether collected, and opt-out path if applicable)
- Known limitations and compatibility notes (platform/version/web constraints)

## Recommended Structure

````markdown
# Extension Name

Concise description of core value.

## Screenshots

![Alt text for key feature demo]

## Quick Start

1. Install via VSIX or Marketplace.
2. Prerequisites: VS Code >= 1.80.
3. Example usage:
    ```json
    // settings.json
    {
        "extension.setting": "value"
    }
    ```

## Configuration

| Option       | Default | Description        |
| ------------ | ------- | ------------------ |
| `ext.enable` | true    | Toggles feature X. |

## Features

- Bullet 1: Detailed explanation.
- Bullet 2: Command list if applicable.

## FAQ

- **Issue Y?** Solution Z.

## Contributing

- Setup: `npm install && npm run dev`.
- PRs: Follow template in .github.

## License

Apache-2.0 License – see LICENSE file.

## Support

Report issues at [GitHub repo](https://github.com/cc01cc/....).
````

## Checklist

- [ ] Title and value proposition present
- [ ] Screenshot or GIF included (at least one)
- [ ] Installation steps documented with prerequisites
- [ ] Quick Start section with runnable example
- [ ] Configuration table with defaults
- [ ] FAQ section covers common issues
- [ ] License and contributing guidelines specified
- [ ] Feedback channels documented
- [ ] Markdown well-formatted and scannable
- [ ] Commands and configuration entries are explicit and consistent
- [ ] Permissions/capabilities are disclosed clearly
- [ ] Telemetry behavior is documented clearly
- [ ] Known limitations and compatibility notes are included

## Cross-Skill Handoff

- For generic docs standards and linting checks, use `documentation-standards`
- For non-extension long-form drafting workflows, use `doc-coauthoring`
