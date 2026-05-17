#!/bin/bash
# validate-docs-links.sh — 检查包内文档是否为 symlink（而非独立副本）
#
# 规则: packages/<pkg>/README.md 和 packages/<pkg>/docs/*.md
# 必须通过 symlink 指向 docs/i18n/<lang>/packages/<pkg>/ 下的源文件。
#
# 例外: CHANGELOG.md, AGENTS.md, 测试 fixture, 构建产物
#
# 用法: bash scripts/validate-docs-links.sh

set -euo pipefail

cd "$(dirname "$0")/.."

errors=0

# ── 1. 检查 packages/*/README.md ──────────────────────────────────
for f in packages/*/README.md; do
    [ -f "$f" ] || continue
    pkg=$(echo "$f" | cut -d/ -f2)
    if [ ! -L "$f" ]; then
        echo "[ILLEGAL] $f — 应为 symlink (指向 docs/i18n/.../packages/$pkg/README.md)"
        errors=$((errors + 1))
    fi
done

# ── 2. 检查 packages/*/docs/*.md（排除构建产物目录）────────────────
find packages/*/docs -name '*.md' -type f 2>/dev/null | while read -r f; do
    # 排除构建产物
    case "$f" in
        */node_modules/*|*/.vscode-test/*|*/dist/*|*/target/*) continue ;;
    esac
    if [ ! -L "$f" ]; then
        pkg=$(echo "$f" | cut -d/ -f2)
        echo "[ILLEGAL] $f — 应为 symlink (指向 docs/i18n/.../packages/$pkg/)"
        errors=$((errors + 1))
    fi
done

# ── 3. 扫描 docs/i18n/*/packages/ 下有但在 packages/ 下缺失的 symlink 目标 ─
for src in docs/i18n/*/packages/*/README.md; do
    [ -f "$src" ] || continue
    pkg=$(echo "$src" | cut -d/ -f5)
    link="packages/$pkg/README.md"
    if [ ! -e "$link" ]; then
        echo "[MISSING] $link — 源文件 $src 存在但包内 symlink 缺失"
        errors=$((errors + 1))
    fi
done

if [ "$errors" -gt 0 ]; then
    echo "---"
    echo "总计: $errors 个问题"
    exit 1
else
    echo "[OK] 所有文档链接合规"
fi
