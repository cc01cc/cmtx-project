---
title: NPM Pre-Publish Checklist
---

## Scope

This checklist is for npm packages and plugins before release.

Use two levels:

- Standard gate: practical checks for most packages.
- Strict gate: adds deeper supply-chain and governance checks.

## A. Code Quality Gate

1. Install from lockfile only.

```bash
npm ci
```

1. Run static checks.

```bash
npm run lint
npm run typecheck
```

1. Run tests and build.

```bash
npm test
npm run build
```

1. Optional compatibility smoke test.

```bash
npm pack --dry-run
```

## B. Documentation And Comments Gate

1. Required docs exist:

- README.md
- README.en.md
- LICENSE
- CHANGELOG.md or release notes source

1. README contains minimum release-facing info:

- package purpose
- install command
- usage example
- API basics and options

1. README language policy matches repository convention:

- README.md is the Chinese primary document
- README.en.md is a standalone English document, not a partial appendix
- Chinese README links to the English version when appropriate

1. Public API comments and examples are present where project policy requires.

1. Versioned breaking changes are documented for consumers.

1. CHANGELOG follows the repository bilingual pattern:

- file title uses bilingual naming such as `更新日志 / Changelog`
- each release section is written in Chinese first
- English version follows the Chinese section for the same release

1. TypeScript API comments follow TypeDoc conventions where applicable:

- exported public API uses TypeDoc blocks
- public symbols are marked with `@public`
- internal implementation details are marked with `@internal`
- exported barrel entries are grouped with `@category` where the package uses categorized exports
- examples use `@example` and non-trivial behavior uses `@remarks` when useful

See also:

- [TypeDoc standards](./typedoc-standards.md)

## C. API Surface Governance Gate

1. Build an exported API inventory from barrel exports and declaration output.

1. Check for redundant and duplicated definitions across exposed symbols:

- duplicated method signatures with equivalent behavior
- duplicated interfaces or types with only minor naming differences
- parallel aliases that expose the same semantics without clear migration intent

1. Check public and internal boundary discipline:

- public surface contains only symbols intended for consumers
- internal-only helpers and implementation types are not exported by accident
- public and internal symbols are documented with appropriate tags when policy requires

1. Check exposed naming consistency:

- method/function names follow one verb pattern for the same action family
- type/interface names use consistent format and suffixes where applicable (`Options`, `Config`, `Result`, `Error`)
- avoid mixed naming styles for equivalent concepts (for example `getX` and `fetchX` used inconsistently)

1. Check public API design against community conventions before publish:

- TypeScript declaration design guidance: avoid over-broad `any`, unstable overloads, and ambiguous optionality
- semver compatibility discipline: renamed or removed exports require major bump or deprecation bridge
- API shape remains predictable for ecosystem users (stable options objects, explicit return contracts, narrow error surface)

1. If exposed symbols changed, include migration notes:

- renamed symbols and replacement mapping
- deprecated symbols with removal timeline
- call-site update examples for common usage

## Repository Examples

1. README bilingual pattern:

- `packages/markdown-it-presigned-url/README.md`
- `packages/markdown-it-presigned-url/README.en.md`
- `packages/vscode-extension/README.md`
- `packages/vscode-extension/README.en.md`

1. CHANGELOG bilingual pattern:

- `packages/cli/CHANGELOG.md`
- `packages/mcp-server/CHANGELOG.md`
- `packages/publish/CHANGELOG.md`
- `packages/vscode-extension/CHANGELOG.md`

1. TypeDoc public/internal/category pattern:

- `packages/core/src/index.ts`
- `packages/core/src/metadata.ts`

## D. Package Artifact Gate

1. Inspect files that will be published.

```bash
npm pack --dry-run --json
```

1. Confirm that only intended files are included.

1. Prevent accidental publication of:

- .env and credential files
- private keys and certificates
- local logs and debug dumps
- large temporary artifacts

1. Use package.json files allowlist where possible.

## E. Security Gate

1. Audit dependencies.

```bash
npm audit --audit-level=high
```

1. Optional signature and provenance verification for installed packages.

```bash
npm audit signatures
```

1. Check for secret leakage risk in publishable files.

1. Review dependency freshness and suspicious newly introduced packages.

1. Prefer CI trusted publishing and short-lived credentials.

## F. Release Metadata Gate

1. Verify semantic version bump intent:

- patch: backward-compatible bug fix
- minor: backward-compatible features
- major: backward-incompatible change

1. Verify package metadata:

- name
- version
- license
- repository
- engines if enforced

1. Verify scoped package access level for first public release.

```bash
npm publish --access public
```

1. Use dry-run first when release flow supports it.

```bash
npm publish --dry-run
```

## G. Optional Strict Gate

1. Generate and retain SBOM.
2. Attach provenance attestation in CI.
3. Restrict and rotate publisher tokens.
4. Enforce branch and tag policy for release commits.
5. Require two-person review for release PR.

## Suggested PASS/WARN/FAIL Rules

- FAIL:
  - tests fail
  - build fails
  - high/critical vulnerabilities above threshold
  - secret-like file included in tarball
  - duplicate or conflicting public API symbols without migration plan
  - exposed API naming/design inconsistency that violates declared project conventions
- WARN:
  - missing changelog
  - stale dependencies without immediate exploit path
  - oversized publish artifact
  - minor naming inconsistencies with clear compatibility-safe follow-up plan
- PASS:
  - all mandatory checks green

## Primary References

- npm publish docs <https://docs.npmjs.com/cli/v10/commands/npm-publish>
- npm pack docs <https://docs.npmjs.com/cli/v10/commands/npm-pack>
- npm audit docs <https://docs.npmjs.com/cli/v10/commands/npm-audit>
- npm scoped package publishing <https://docs.npmjs.com/creating-and-publishing-scoped-public-packages>
- npm semantic versioning guide <https://docs.npmjs.com/about-semantic-versioning>
- SemVer 2.0.0 spec <https://semver.org/>
- TypeScript declaration file do's and don'ts <https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html>
- TypeScript declaration deep dive <https://www.typescriptlang.org/docs/handbook/declaration-files/deep-dive.html>
- OWASP npm security cheat sheet <https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html>
- SLSA levels overview <https://slsa.dev/spec/v1.0/levels>
