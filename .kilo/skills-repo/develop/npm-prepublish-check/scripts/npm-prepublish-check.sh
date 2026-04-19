#!/usr/bin/env bash
set -euo pipefail

# npm pre-publish quality gate helper
# Usage:
#   ./scripts/npm-prepublish-check.sh [package_dir] [--strict] [--skip-audit]

PACKAGE_DIR="."
STRICT="false"
SKIP_AUDIT="false"
AUDIT_LEVEL="high"

for arg in "$@"; do
    case "$arg" in
        --strict)
            STRICT="true"
            ;;
        --skip-audit)
            SKIP_AUDIT="true"
            ;;
        --audit-level=*)
            AUDIT_LEVEL="${arg#*=}"
            ;;
        *)
            PACKAGE_DIR="$arg"
            ;;
    esac
done

if [[ ! -d "$PACKAGE_DIR" ]]; then
    echo "[FAIL] Package directory not found: $PACKAGE_DIR"
    exit 1
fi

cd "$PACKAGE_DIR"

if [[ ! -f package.json ]]; then
    echo "[FAIL] package.json not found in: $PWD"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "[FAIL] npm command not found"
    exit 1
fi

echo "[INFO] Running checks in: $PWD"

run_if_script_exists() {
    local script_name="$1"
    if node -e '
const fs = require("node:fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
process.exit(pkg.scripts && pkg.scripts[process.argv[1]] ? 0 : 1);
' "$script_name"; then
        echo "[INFO] Running npm script: $script_name"
        npm run "$script_name"
    else
        echo "[WARN] Script not found, skipped: $script_name"
    fi
}

echo "[INFO] Checking required files"
[[ -f README.md ]] || echo "[WARN] README.md is missing"
[[ -f README.en.md ]] || echo "[WARN] README.en.md is missing"
[[ -f LICENSE || -f LICENSE.md ]] || echo "[WARN] LICENSE file is missing"
[[ -f CHANGELOG.md ]] || echo "[WARN] CHANGELOG.md is missing"

echo "[INFO] Validating package metadata"
node -e '
const fs = require("node:fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const required = ["name", "version", "license", "description"];
const missing = required.filter((k) => !pkg[k]);
if (missing.length) {
  console.error(`[FAIL] Missing package.json fields: ${missing.join(", ")}`);
  process.exit(1);
}
if (pkg.private === true) {
  console.error("[FAIL] package.json has private=true, cannot publish");
  process.exit(1);
}
console.log("[PASS] package.json metadata checks passed");
'

echo "[INFO] Running code quality checks"
run_if_script_exists lint
run_if_script_exists typecheck
run_if_script_exists test
run_if_script_exists build

echo "[INFO] Running documentation and comment checks"
if [[ -f README.md ]]; then
    if grep -Eq 'README\.en\.md|English Documentation|英文' README.md; then
        echo "[PASS] README.md references English documentation"
    else
        echo "[WARN] README.md does not reference an English document"
    fi
fi

if [[ -f README.md && ! -f README.en.md ]]; then
    echo "[FAIL] README.en.md is required by repository convention"
    exit 1
fi

if [[ -f CHANGELOG.md ]]; then
    if grep -q '更新日志 / Changelog' CHANGELOG.md; then
        echo "[PASS] CHANGELOG title is bilingual"
    else
        echo "[WARN] CHANGELOG title is not using the expected bilingual format"
    fi

    if grep -q '^---$' CHANGELOG.md && grep -Eq '^### .*' CHANGELOG.md; then
        if grep -Eq 'Initial Release|Features|Bug Fix|Breaking|Changed|Added|Removed' CHANGELOG.md; then
            echo "[PASS] CHANGELOG appears to include an English section"
        else
            echo "[WARN] CHANGELOG English section was not detected by heuristic"
        fi
    else
        echo "[WARN] CHANGELOG bilingual section split was not detected"
    fi
fi

if [[ -d src ]]; then
    TS_FILE_COUNT="$(find src -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l | tr -d ' ')"
    if [[ "$TS_FILE_COUNT" != "0" ]]; then
        if grep -R -Eq '@public|@internal' src --include='*.ts' --include='*.tsx'; then
            echo "[PASS] TypeDoc visibility tags detected in source"
        else
            echo "[WARN] No @public or @internal tags detected in source files"
        fi

        if grep -R -Eq '@example|@remarks' src --include='*.ts' --include='*.tsx'; then
            echo "[PASS] TypeDoc detail tags detected in source"
        else
            echo "[WARN] No @example or @remarks tags detected in source files"
        fi

        if [[ -f src/index.ts ]]; then
            if grep -q '@category' src/index.ts; then
                echo "[PASS] Export categories detected in src/index.ts"
            else
                echo "[WARN] No @category tags detected in src/index.ts"
            fi
        fi
    fi
fi

echo "[INFO] Inspecting publish artifact with npm pack dry-run"
PACK_JSON_FILE="$(mktemp)"
npm pack --dry-run --json > "$PACK_JSON_FILE"

node -e '
const fs = require("node:fs");
const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const files = (data[0] && data[0].files) ? data[0].files.map((x) => x.path) : [];
const banned = [
  /(^|\/)\.env(\.|$)/,
  /(^|\/)\.npmrc$/,
  /(^|\/)id_rsa(\.|$)/,
  /\.pem$/,
  /\.key$/,
  /\.p12$/,
  /\.log$/
];
const suspicious = files.filter((f) => banned.some((re) => re.test(f)));
if (suspicious.length) {
  console.error("[FAIL] Suspicious files included in tarball:");
  for (const f of suspicious) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`[PASS] Tarball file scan passed (${files.length} files)`);
' "$PACK_JSON_FILE"

if [[ "$SKIP_AUDIT" != "true" ]]; then
    echo "[INFO] Running dependency audit with level: $AUDIT_LEVEL"
    npm audit --audit-level="$AUDIT_LEVEL"
else
    echo "[WARN] Audit skipped by flag"
fi

if [[ "$STRICT" == "true" ]]; then
    echo "[INFO] Running strict checks"
    if command -v git >/dev/null 2>&1; then
        if [[ -n "$(git status --porcelain 2>/dev/null || true)" ]]; then
            echo "[WARN] Working tree is dirty"
        else
            echo "[PASS] Working tree is clean"
        fi
    fi
fi

rm -f "$PACK_JSON_FILE"
echo "[PASS] Pre-publish checks completed"