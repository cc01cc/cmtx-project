---
name: vscode-extension-packaging
description: Build and package VS Code extensions. Use for bundler setup, ESM/CJS interop, WASM assets, or multi-target release strategy.
license: MIT
---

## Purpose Summary

Use this skill to help with VS Code extension packaging and release decisions,
with emphasis on ESM, CJS, WASM, desktop, remote, and web runtime differences.

## When To Use

- User asks how to bundle a VS Code extension with esbuild or webpack.
- User asks how to handle ESM dependencies in a CJS extension bundle.
- User asks how to package WASM files in VSIX and load them safely.
- User asks how to support both desktop and web extension hosts.
- User asks for proven community patterns and reference repos.

## Required Inputs

Collect these before proposing changes:

1. Runtime target:
    - `desktop-node`
    - `web-worker`
    - `hybrid-main-browser`
2. Module target:
    - `cjs`
    - `esm`
    - `dual`
3. WASM usage:
    - `none`
    - `extension-host`
    - `webview`
    - `language-server`
4. Release target:
    - `single-vsix`
    - `platform-specific-vsix`
5. Constraints:
    - startup performance requirements
    - remote/codespaces requirements
    - browser support requirement

If any item is missing, ask concise follow-up questions.

## Packaging Design Workflow

1. Classify runtime and entry strategy.
    - `desktop-node`: use `main` entry.
    - `web-worker`: use `browser` entry and web bundle rules.
    - `hybrid-main-browser`: provide both `main` and `browser` entries.

2. Choose a build strategy.
    - Strategy A: Desktop-first CJS bundle with WASM as copied asset.
    - Strategy B: Dual output for desktop and web (`dist/desktop`, `dist/web`).
    - Strategy C: Webview-side WASM for UI-intensive workloads.
    - Strategy D: WASM language server architecture.

3. Handle ESM CJS compatibility.
    - Prefer build-time bundling/transpilation first.
    - Use dynamic import at narrow integration points when needed.
    - Keep `vscode` external in extension bundles.

4. Handle WASM packaging.
    - Ensure `.wasm` is copied to runtime path during build.
    - Ensure VSIX includes `.wasm` in package files.
    - Add post-build verification for required runtime assets.
    - Implement graceful fallback if WASM load fails.

5. Validate environment constraints.
    - Web extension host cannot rely on Node APIs.
    - Web extension bundle should satisfy single-file loader constraints for main script.
    - Webview resources must use `asWebviewUri` and strict CSP.

6. Release strategy and CI.
    - Use `vsce package` for local validation.
    - Use `vsce publish` for marketplace releases.
    - For native or platform-tied dependencies, consider `vsce --target` matrix.

## Mature Solution Patterns

### Pattern 1: Desktop CJS + WASM Asset Copy (Most Stable)

- Bundle extension host code as CJS.
- Copy `.wasm` into `dist/` during build.
- Load WASM by explicit path at runtime.
- Keep feature-level fallback when WASM missing.

Use when:

- primary target is desktop and remote extension host
- web support is not mandatory

### Pattern 2: Hybrid Main + Browser (Recommended for Broad Support)

- Keep `main` for desktop/remote and `browser` for web.
- Build two outputs with runtime-specific shims/fallbacks.
- Reuse shared logic with strict runtime boundary.

Use when:

- extension must run in desktop and vscode.dev/github.dev

### Pattern 3: Webview WASM

- Run WASM in webview script or webview worker.
- Use `asWebviewUri` for all local assets.
- Apply strict CSP and allow only required script sources.

Use when:

- computation is UI-focused or requires browser APIs

### Pattern 4: WASM Language Server

- Client extension loads wasm server binary/module.
- Use worker/process abstraction based on runtime.
- Keep transport and lifecycle robust for remote scenarios.

Use when:

- language tooling and analysis are core feature

## Validation Checklist

- [ ] Entry points match target runtime (`main`, `browser`, or both).
- [ ] Bundle format matches runtime constraints (`cjs`, `esm`, or dual).
- [ ] `.wasm` files are present in build output.
- [ ] VSIX contains all runtime-required assets.
- [ ] Fallback behavior documented and tested for WASM load failure.
- [ ] Web target avoids Node-only APIs.
- [ ] Webview target uses `asWebviewUri` and CSP policy.
- [ ] CI includes build + package + smoke checks.

## Troubleshooting

- Symptom: "WASM file not found" at runtime.
    - Check build copy step and package include list.
    - Verify runtime path uses extension install location.

- Symptom: works on desktop but fails on web.
    - Remove Node APIs from browser path.
    - Add browser-compatible fallbacks and aliases.

- Symptom: ESM dependency fails in CJS output.
    - Bundle or transpile dependency at build time first.
    - If needed, isolate with dynamic import and adapter layer.

- Symptom: webview cannot load local wasm/js.
    - Convert paths with `asWebviewUri`.
    - Tighten CSP and add required source directives.

## References

- [Packaging Playbook](./references/vscode-extension-packaging-playbook.md)
- [Reference URL Index](./references/reference-urls.md)

## Activation Test Prompts

1. "Design a VS Code extension packaging plan for desktop first, CJS main, and one Rust WASM dependency."
2. "Refactor my extension to support both main and browser entries with separate bundle outputs and CI checks."
3. "I have ESM dependencies and WASM in a VS Code plugin; recommend a proven packaging architecture with examples."
