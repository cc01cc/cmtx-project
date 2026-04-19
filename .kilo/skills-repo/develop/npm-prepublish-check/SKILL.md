---
name: npm-prepublish-check
description: Pre-publish checklist for npm packages: code quality, docs, dependencies, and security. Use before npm publish or when preparing release readiness.
license: MIT
metadata:
    category: release-engineering
    references:
        - https://docs.npmjs.com/cli/v10/commands/npm-publish
        - https://docs.npmjs.com/cli/v10/commands/npm-pack
        - https://docs.npmjs.com/cli/v10/commands/npm-audit
        - https://docs.npmjs.com/about-semantic-versioning
        - https://semver.org/
        - https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html
---

Run production-grade release checks before publishing npm packages.

## When to Use This Skill

Use this skill when the user asks to:

- prepare an npm package/plugin for publishing
- run pre-publish checks or release gates
- verify code quality and test health before release
- verify README, changelog, API docs, and comment quality
- check for secret leaks and dependency vulnerabilities
- verify package tarball contents before npm publish
- reduce supply-chain risks using provenance and trusted publishing

## Required Inputs

Collect these inputs first:

1. Package path: repository root or workspace package path.
2. Package manager and workspace mode: npm, pnpm, yarn; single package or monorepo.
3. Release target: public npm, private registry, or scoped package.
4. Risk profile: strict or standard release gate.
5. CI context: local-only validation or CI-ready commands.

## Workflow

1. Identify package metadata and release intent.

- Verify package name, version, private flag, and publishConfig.
- Confirm semantic version bump intent based on API changes.

2. Run code health checks.

- Run install with lockfile enforcement.
- Run lint, typecheck, unit tests, and build scripts if present.
- Fail on critical test/build failures.

3. Run documentation and comment checks.

- Ensure README uses Chinese as the primary document and ships an independent English version such as README.en.md.
- Ensure README documents install, usage, and API basics, and links to the English document when appropriate.
- Ensure changelog exists and each release entry is written in Chinese first, then English.
- Check public API comments use TypeDoc-style blocks for exported symbols when project policy requires it.
- Check TypeDoc comments distinguish public API and internal implementation using tags such as @public and @internal.
- Check exported API surfaces are categorized, typically via @category on barrel exports such as src/index.ts.
- Verify examples compile or execute when feasible.

4. Run API surface governance checks.

- Build an exported symbol inventory for functions, methods, interfaces, and types from barrel exports and generated declaration files.
- Detect redundant or duplicated API surface, including aliases with overlapping semantics and repeated type definitions with only naming differences.
- Separate public API and internal API responsibilities; keep internal-only abstractions out of the public contract when not required.
- Enforce naming consistency for exposed methods, interfaces, and types using a project-wide convention (for example: verb-first functions, PascalCase types/interfaces, and consistent suffixes such as Options/Config/Result/Error).
- Validate API design against community conventions before publish (TypeScript declaration guidance, semantic versioning compatibility rules, and established API design patterns used by mainstream npm packages).
- Require a migration note when renaming or removing exposed symbols.

5. Run security and supply-chain checks.

- Run dependency audit at configured threshold.
- Check tarball file list for accidental secrets and large unexpected artifacts.
- Ensure no credential files, private keys, or local environment files are included.
- Prefer trusted publishing and provenance for CI publish workflows.

6. Validate publish artifact.

- Run npm pack dry run and inspect included files.
- Confirm expected files are present and unnecessary files are excluded.
- Confirm LICENSE and README are included.

7. Publish readiness report.

- Output PASS, WARN, FAIL by category.
- Block release on FAIL items.
- Provide exact remediation commands.

## Available Resources

- Checklist and standards: [release checklist](./references/npm-prepublish-checklist.md)
- TypeDoc comment standards: [typedoc standards](./references/typedoc-standards.md)
- Automation script: [prepublish checker](./scripts/npm-prepublish-check.sh)

## Execution Pattern

1. Build a TODO list with categories:

- code quality
- docs and comments
- api surface governance
- package artifact
- security and supply-chain
- release metadata

2. Execute checks from the script first.
3. Add project-specific checks not covered by the script.
4. Return a concise release gate summary with remediation steps.

## Validation Checklist

- name in frontmatter matches parent directory
- description contains clear triggers and release keywords
- references and scripts use valid relative paths
- script is non-interactive and exits non-zero on failures

## Activation Test Prompts

- Run npm pre-publish checks for this package and give me a release gate report.
- Before publishing, check code, docs, comments, and security risks for this npm plugin.
- Build a strict publish checklist for this monorepo package and block release on failures.
