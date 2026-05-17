#!/bin/bash
# api-surface.sh — 检查各包的公开导出是否有包外消费者
#
# 用法: bash scripts/api-surface.sh [package-name]
#   - 不传参数: 扫描所有包
#   - 传包名: 只扫描指定包 (如 rule-engine)
#
# 原理: 解析各包 src/index.ts 的 export 语句提取公开导出名，
#       在 packages/ 中搜索该符号在 import 语句中的出现，
#       排除自身包目录，以确定是否有外部消费者。
#
# 注意: 仅检查 packages/ 内的跨包引用，无法检测包外（npm）消费者。

set -euo pipefail

cd "$(dirname "$0")/.."
PACKAGES_DIR="packages"
TARGET="${1:-}"

# 包名映射: 目录名 → npm scope
declare -A PKG_MAP
PKG_MAP["core"]="@cmtx/core"
PKG_MAP["asset"]="@cmtx/asset"
PKG_MAP["storage"]="@cmtx/storage"
PKG_MAP["template"]="@cmtx/template"
PKG_MAP["rule-engine"]="@cmtx/rule-engine"
PKG_MAP["ai"]="@cmtx/ai"
PKG_MAP["cli"]="@cmtx/cli"
PKG_MAP["mcp-server"]="@cmtx/mcp-server"
PKG_MAP["vscode-extension"]="cmtx-vscode"
PKG_MAP["fpe-wasm"]="@cmtx/fpe-wasm"
PKG_MAP["autocorrect-wasm"]="@cmtx/autocorrect-wasm"
PKG_MAP["markdown-it-presigned-url"]="@cmtx/markdown-it-presigned-url"
PKG_MAP["markdown-it-presigned-url-adapter-nodejs"]="@cmtx/markdown-it-presigned-url-adapter-nodejs"

total_zero=0

for dir in "$PACKAGES_DIR"/*/; do
    pkg_name=$(basename "$dir")
    [ -n "$TARGET" ] && [ "$pkg_name" != "$TARGET" ] && continue

    scoped_name="${PKG_MAP[$pkg_name]:-$pkg_name}"
    index_file="$dir/src/index.ts"

    [ ! -f "$index_file" ] && continue

    echo "=== $scoped_name ==="
    pkg_zero=0

    # 提取所有公开导出名
    # 使用 perl 替代 grep -oP（跨平台兼容性更好）
    exports=$(
        # export function Foo, export class Foo, export type Foo, export const Foo, etc.
        perl -ne 'print "$1\n" while /^export\s+(?:default\s+)?(?:function|class|interface|type|const|enum)\s+(\w+)/g' "$index_file"
        # export { Foo, Bar } 和 export type { Foo, Bar }
        perl -ne 'while (/export\s+(?:type\s+)?\{\s*([^}]+)\}/g) {
            my $inner = $1;
            $inner =~ s/\s+//g;
            my @names = split /,/, $inner;
            print "$_\n" for @names;
        }' "$index_file"
    )

    for exp in $exports; do
        # 跳过非 API 的关键词
        [[ "$exp" =~ ^(type|default|as|from)$ ]] && continue

        # 统计包外消费者: 搜索其他包中 import { ..., Foo, ... } from "@cmtx/xxx" 格式
        count=0
        while IFS= read -r line; do
            # 跳过自身包目录
            case "$line" in
                "$PACKAGES_DIR/$pkg_name/"*) ;;
                *) count=$((count + 1)) ;;
            esac
        done < <(grep -rl --include='*.ts' "import[^;]*\b$exp\b[^;]*from\s*['\"]$scoped_name['\"]" "$PACKAGES_DIR" 2>/dev/null || true)

        if [ "$count" -eq 0 ]; then
            echo "  [零消费者] $exp"
            pkg_zero=$((pkg_zero + 1))
        fi
    done

    if [ "$pkg_zero" -eq 0 ]; then
        echo "  (无零消费者导出)"
    fi
    total_zero=$((total_zero + pkg_zero))
done

echo "---"
echo "总计: $total_zero 个零消费者导出"
[ "$total_zero" -gt 0 ] && exit 1 || exit 0
