## Overview

This playbook provides implementation guidance for VS Code extension packaging,
focused on ESM CJS interop, WASM, and runtime-specific constraints.

## Recommended Decision Path

1. Determine runtime targets.
2. Pick entry model (`main`, `browser`, or both).
3. Pick module format (`cjs`, `esm`, or dual).
4. Define WASM loading path and failure fallback.
5. Define packaging scope (`single-vsix` or `--target` matrix).
6. Validate with build, package, and smoke tests.

## Scenario Matrix

| Scenario | Recommended Approach | Notes |
|---|---|---|
| Desktop only, WASM feature | CJS bundle + copied wasm asset | Most stable and simple |
| Desktop + Web support | Dual entry (`main` + `browser`) | Keep strict runtime boundaries |
| Heavy UI compute | Webview WASM | Use webview URI + CSP |
| Language tooling | WASM language server | Use worker/process transport strategy |

## Practical Build Patterns

### Pattern A: esbuild desktop CJS

- `platform: node`
- `format: cjs`
- `external: ['vscode']`
- post-build copy for `.wasm`

### Pattern B: dual build

- Desktop output: `dist/desktop/extension.js`
- Web output: `dist/web/extension.js`
- package manifest includes `main` and `browser`

### Pattern C: packaging

- local check: `vsce package`
- platform matrix: `vsce package --target <platform>`
- web package target when needed: `--target web`

## ESM and CJS Interop Guidance

1. Prefer build-time conversion where possible.
2. Keep dynamic import limited to boundary adapters.
3. Avoid broad runtime hacks in core business code.
4. Validate both dev and packaged VSIX behavior.

## WASM Packaging Guidance

1. Keep wasm as explicit runtime asset.
2. Ensure asset is copied to deterministic path.
3. Ensure VSIX include rules keep wasm file.
4. Add post-build verification script for required files.
5. Provide graceful fallback when load fails.

## Web and Webview Notes

- Web extension host has browser-worker constraints.
- Webview local resources must be mapped via webview URI helper.
- Keep CSP strict and explicit.

## CI Suggestions

1. Build desktop and web outputs.
2. Verify required assets exist.
3. Create VSIX package as CI artifact.
4. Run smoke activation checks in target environments.
