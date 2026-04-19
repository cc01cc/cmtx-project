# Project Coding Standards

Apply these rules when developing code or writing logic. Prioritize clarity, maintainability, and correctness.

## Dependencies & Versions

- Always check `package.json`, `Cargo.toml`, or equivalent manifest files to confirm current dependency versions.
- Use only declared dependencies; do not add unsupported or EOL versions.
- Verify API compatibility against the versions specified in the manifest before generating code.

## Code Quality

- Reuse existing project code; avoid duplicating logic or reinventing utilities.
- Follow the project's configured code formatters (e.g., Prettier, ESLint, gofmt).
- Use clear, self-documenting names; avoid cryptic or clever patterns.
- If you spot logic errors, architecture flaws, or security risks in existing code, point them out proactively.

## Testing

- Generate tests (unit or integration) for all new or modified functions.
- Cover edge cases, error paths, and assertions.
- Verify tests pass before proposing your changes; halt and alert if tests fail.

## Documentation & Observability

- Update `README.md`, `ARCHITECTURE.md`, or API docs when you add features or change behavior.
- Log errors and external interactions with useful context (timeouts, retries, fallbacks).

## Risk & Compliance

- Security or testing rule violations are non-negotiable; do not proceed without explicit user approval.
- Minor style deviations are acceptable but should be flagged.
- Assume CI/CD is active; ensure all changes pass lint, test, and build checks.

## Skill Routing

- Keep always-on rules short and stable; use skills for task-specific workflows.
- For API/configuration docs workflows, use `documentation-standards` skill.
- For frontend naming/structure workflows, use `frontend-development-standards` skill.
- For VS Code extension README workflows, use `vscode-extension-documentation` skill.
