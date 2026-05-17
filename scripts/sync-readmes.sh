#!/usr/bin/env bash
# 同步各包根目录 README symlink → docs/i18n/{lang}/
# 所有平台统一使用 symlink（Linux/WSL/macOS/Windows Git for ChromeOS all support it）
# npm publish 同样 follow symlink，无需 cp fallback

set -euo pipefail
SRC_DEFAULT="zh-Hans"

declare -A PKG_MAP=(
  [core]="core"
  [cli]="cli"
  [mcp-server]="mcp-server"
  [vscode-extension]="vscode-extension"
  [ai]="ai"
  [asset]="asset"
  [storage]="storage"
  [template]="template"
  [rule-engine]="rule-engine"
  [fpe-wasm]="fpe-wasm"
  [autocorrect-wasm]="autocorrect-wasm"
  [markdown-it-presigned-url]="markdown-it-presigned-url"
  [markdown-it-presigned-url-adapter-nodejs]="markdown-it-presigned-url-adapter-nodejs"
)

ROOT="$(git rev-parse --show-toplevel)"

# 根级别 README.md → docs/i18n/zh-Hans/README.md
ln -sf --relative "$ROOT/docs/i18n/zh-Hans/README.md" "$ROOT/README.md"

for pkg in "${!PKG_MAP[@]}"; do
  dir="$ROOT/packages/$pkg"
  i18n_path="docs/i18n"

  # 默认语言（zh-Hans）→ README.md
  ln -sf --relative "$ROOT/$i18n_path/$SRC_DEFAULT/packages/$pkg/README.md" "$dir/README.md"

  # 英文 → README.en.md（仅目标文件存在时创建）
  if [ -f "$ROOT/$i18n_path/en/packages/$pkg/README.md" ]; then
    ln -sf --relative "$ROOT/$i18n_path/en/packages/$pkg/README.md" "$dir/README.en.md"
  elif [ -L "$dir/README.en.md" ]; then
    rm "$dir/README.en.md"
  fi
done
