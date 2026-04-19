#!/bin/bash
# 代码质量检查脚本
# 用法：./scripts/quality-check.sh

set -e

echo "🔍 运行代码质量检查..."
echo ""

# 设置 Opengrep 所需的环境变量
export PYTHONIOENCODING=utf-8
export LC_ALL=C.UTF-8
export PATH='/home/node/.opengrep/cli/latest':$PATH

# 1. Biome 检查（快速）
echo "📋 运行 Biome 检查..."
if pnpm run lint:format; then
    echo "✅ Biome 检查通过"
else
    echo "❌ Biome 检查失败，请修复以下问题："
    echo "   - 运行 'pnpm run lint:format:write' 自动修复可修复的问题"
    echo "   - 手动修复其他代码质量问题"
    exit 1
fi
echo ""

# 2. TypeScript 类型检查
echo "🔧 运行 TypeScript 类型检查..."
if pnpm run typecheck; then
    echo "✅ TypeScript 类型检查通过"
else
    echo "❌ TypeScript 类型检查失败"
    exit 1
fi
echo ""

# 3. Opengrep 深度扫描
echo "🔬 运行 Opengrep 安全扫描..."
if command -v opengrep &> /dev/null; then
    # 使用 .opengrep.yml 配置文件（如果存在）
    if [ -f ".opengrep.yml" ]; then
        echo "   使用配置文件：.opengrep.yml"
        opengrep scan --config .opengrep.yml --max-target-bytes 10000000 || echo "⚠️  Opengrep 扫描发现了一些问题（非致命）"
    else
        # 自动选择语言规则
        echo "   自动检测项目语言..."
        opengrep scan --config auto --max-target-bytes 10000000 || echo "⚠️  Opengrep 扫描发现了一些问题（非致命）"
    fi
    echo "✅ Opengrep 扫描完成"
else
    echo "⚠️  Opengrep 未安装，跳过深度安全扫描"
    echo ""
    echo "   安装建议："
    echo "   curl -fsSL https://raw.githubusercontent.com/opengrep/opengrep/main/install.sh | bash"
fi
echo ""

echo "==================================="
echo "✅ 代码质量检查完成！"
echo "==================================="
