---
name: devcontainer-manager
description: Skill for creating and updating Dev Containers configuration in the current project. Automates setup, update, and troubleshooting of VS Code dev containers using best practices from official documentation.
---

# DevContainer Manager Skill

## Purpose

Automate creation, update, and maintenance of [Dev Containers](https://containers.dev/) configuration for this project. Supports:

- Initializing `.devcontainer/` folder and files
- Updating `devcontainer.json` and Dockerfile
- Adding recommended extensions and settings
- Applying [Dev Container Features](https://containers.dev/features) and [Templates](https://containers.dev/templates)
- Troubleshooting common issues
- Applying best practices for Node.js, Python, and multi-service setups

## Workflow

### 1. Initialization

- Detect if `.devcontainer/` exists
- If not, scaffold `.devcontainer/devcontainer.json` and (optionally) Dockerfile
- Prompt for base image, language, and required tools
- Recommend and apply relevant [Dev Container Templates](https://containers.dev/templates) for quick setup

### 2. Update

- Add or update recommended extensions, settings, and postCreateCommand
- Support updating Dockerfile for new dependencies
- Apply [Dev Container Features](https://containers.dev/features) for additional tools (e.g., Docker-in-Docker, language runtimes)
- Validate configuration against [official schema](https://containers.dev/implementors/spec/)

### 3. Troubleshooting

- Diagnose build/start errors
- Suggest fixes for common issues (permissions, missing tools, network)
- Link to relevant docs and logs
- Provide guidance on Docker and Docker Compose integration for multi-service setups

## Decision Points

- Language/runtime selection (Node, Python, etc.)
- Single vs multi-container setup (using Docker Compose)
- Custom vs default Dockerfile
- Feature selection from [Dev Container Features](https://containers.dev/features)
- Template selection from [Dev Container Templates](https://containers.dev/templates)
- Extension and tool recommendations

## Quality Criteria

- Valid `devcontainer.json` (schema-compliant)
- Dockerfile builds successfully (if present)
- Extensions and settings match project needs
- Features and templates are appropriately applied
- Docker Compose configuration is correct for multi-service setups
- Troubleshooting steps are actionable

## Image Selection & Configuration

### Image Selection Guidance

- Always reference the official [Dev Container Images](https://github.com/devcontainers/images) repository to determine the latest and most suitable image for the required language/runtime.
- For multi-service setups, use Docker Compose with [Dev Container Templates](https://containers.dev/templates) that include database services.

### Docker and Docker Compose Integration

- Dev Containers run on Docker; ensure Docker is installed and running
- For multi-container applications, use `dockerComposeFile` in `devcontainer.json` to define services
- Reference [Docker Compose documentation](https://docs.docker.com/compose/) for complex setups
- Use [Docker-in-Docker features](https://containers.dev/features#docker-in-docker) when containers need to build/run other containers

## Example Prompts

- "Create a dev container for Node.js"
- "Update devcontainer.json to add Python"
- "Add VS Code extensions to devcontainer"
- "Apply Docker-in-Docker feature to devcontainer"
- "Set up multi-service devcontainer with PostgreSQL"
- "Troubleshoot devcontainer build error"

## Related Customizations

- Skill for managing GitHub Codespaces
- Skill for Docker Compose integration
- Skill for project-specific environment setup

---
