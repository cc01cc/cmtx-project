---
name: vscode-extension-official-api-reference
description: Guide VS Code extension development with official API references. Use when building, modifying, or debugging VS Code extension code.
license: MIT
---

Ensure VS Code extension work is grounded in official documentation and stable API references.

## Purpose Summary

- Keep extension implementation aligned with official VS Code APIs.
- Reduce incorrect API usage from memory-only assumptions.
- Provide repeatable doc-first steps for coding and review tasks.

## When To Use

Use this skill when requests involve:

- Creating a new VS Code extension feature.
- Modifying or refactoring existing extension code.
- Debugging extension behavior related to commands, views, providers, activation, or settings.
- Reviewing extension code for API correctness.
- Writing extension docs that reference official API behavior.

Do not use this skill for non-extension application code.

## Required Inputs

Collect these inputs before implementation:

1. Goal: what extension behavior should be added or changed.
2. Scope: files, modules, or contribution points affected.
3. VS Code API area: command, tree view, webview, language feature, settings, auth, etc.
4. API stability target: stable APIs only, or proposed APIs allowed.
5. Verification target: build, lint, tests, manual validation path.

If an input is missing, ask one focused question before coding.

## Workflow

1. Confirm extension task boundaries and expected behavior.
2. Map the request to specific VS Code API concepts.
3. Open the official API reference URL and locate exact interfaces/events/options.
4. Implement or edit code using documented API contracts only.
5. Verify `package.json` contribution points match implemented behavior.
6. Run build/test checks and fix API misuse or typing issues.
7. Summarize changes and include the official API link used.

## Validation And Troubleshooting

Validation checklist:

1. Official API reference was consulted before code changes.
2. Used API names and signatures match documentation.
3. Contribution points and activation events are consistent.
4. No unresolved placeholders or TODO markers in final output.
5. Notes include URL(s) used for verification.

Common issues and fixes:

| Issue                                             | Likely Cause                                  | Fix                                                          |
| ------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| Runtime command not found                         | Missing or wrong `contributes.commands` entry | Align registration code with `package.json` command ID       |
| View/provider not activated                       | Activation event mismatch                     | Add correct activation event and confirm ID consistency      |
| Type errors on API usage                          | Incorrect interface assumptions               | Re-check signature in official reference and update types    |
| Feature works locally but breaks in publish build | Hidden dependency on proposed API             | Restrict to stable API or explicitly gate proposed API usage |

## References

- [VS Code API Reference](./references/vscode-api-reference.md)

## Activation Test Prompts

1. "给我的 VS Code 扩展新增 TreeView 命令，并按官方 API 做完整实现。"
2. "重构 extension.ts 的激活逻辑，要求先参考 VS Code 官方 API 文档再改。"
3. "检查这个插件的 commands 和 package.json 配置是否符合 VS Code API 规范。"
