#!/usr/bin/env python3
"""
Markdown to Zhihu Format Converter

将标准 Markdown 文章转换为知乎适配格式：
1. 删除 YAML Front Matter
2. 将标题层级整体提升一级（## -> #, ### -> ##, etc.）

Usage:
    python convert.py <input-file> [output-file]

Examples:
    python convert.py article.md
    python convert.py article.md article-zhihu.md
"""

import re
import sys
import argparse
from pathlib import Path


def remove_yaml_front_matter(content: str) -> str:
    """删除 YAML Front Matter"""
    # 匹配以 --- 开头和结尾的 YAML Front Matter
    pattern = r'^---\s*\n.*?\n---\s*\n'
    result = re.sub(pattern, '', content, flags=re.DOTALL | re.MULTILINE)
    return result.lstrip('\n')


def promote_headings(content: str) -> str:
    """将标题层级整体提升一级"""
    lines = content.split('\n')
    result = []

    for line in lines:
        # 匹配 Markdown 标题: ##, ###, ####, #####, ######
        heading_match = re.match(r'^(#{2,6})\s+(.+)$', line)
        if heading_match:
            hashes = heading_match.group(1)
            title = heading_match.group(2)
            # 减少一个 #，即提升一级
            new_hashes = '#' * (len(hashes) - 1)
            result.append(f'{new_hashes} {title}')
        else:
            result.append(line)

    return '\n'.join(result)


def convert_to_zhihu_format(content: str) -> str:
    """执行完整的知乎格式转换"""
    # 第一步：删除 YAML Front Matter
    content = remove_yaml_front_matter(content)

    # 第二步：提升标题层级
    content = promote_headings(content)

    return content


def main():
    parser = argparse.ArgumentParser(
        description='Convert Markdown to Zhihu-compatible format'
    )
    parser.add_argument('input', help='Input Markdown file path')
    parser.add_argument(
        'output',
        nargs='?',
        help='Output file path (default: <input>-zhihu.md)'
    )

    args = parser.parse_args()

    input_path = Path(args.input)

    # 验证输入文件
    if not input_path.exists():
        print(f'[FAIL] Input file not found: {input_path}', file=sys.stderr)
        sys.exit(1)

    if not input_path.is_file():
        print(f'[FAIL] Input path is not a file: {input_path}', file=sys.stderr)
        sys.exit(1)

    # 确定输出路径
    if args.output:
        output_path = Path(args.output)
    else:
        # 默认输出：<原文件名>-zhihu.md
        stem = input_path.stem
        suffix = input_path.suffix
        output_path = input_path.parent / f'{stem}-zhihu{suffix}'

    # 读取输入文件
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f'[FAIL] Failed to read input file: {e}', file=sys.stderr)
        sys.exit(1)

    # 执行转换
    converted_content = convert_to_zhihu_format(content)

    # 写入输出文件
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(converted_content)
    except Exception as e:
        print(f'[FAIL] Failed to write output file: {e}', file=sys.stderr)
        sys.exit(1)

    print(f'[OK] Converted: {input_path} -> {output_path}')


if __name__ == '__main__':
    main()
