---
name: md-to-zhihu
description: 转换 Markdown 文章为知乎适配格式。用于文章发布到知乎平台。
license: MIT
metadata:
    category: content
    references:
        - https://zhuanlan.zhihu.com/
---

将标准 Markdown 文章转换为知乎平台适配格式。

## When to Use This Skill

在以下场景使用本 skill：

- 需要将博客文章发布到知乎平台
- 原始 Markdown 使用 `##` 作为一级标题（符合 KiloCode 规范）
- 需要删除 YAML Front Matter 中的元数据
- 需要将标题层级整体提升一级以适配知乎规范

## Conversion Rules

转换过程遵循以下规则：

1. **删除 YAML Front Matter**
    - 删除文档开头的 `---` 包裹的元数据块
    - 保留文档正文内容

2. **标题层级提升**
    - `##` -> `#`（二级变一级）
    - `###` -> `##`（三级变二级）
    - `####` -> `###`（四级变三级）
    - 以此类推

3. **保留内容**
    - 正文段落
    - 代码块
    - 列表（有序/无序）
    - 链接和图片
    - 引用块
    - 表格
    - 分隔线

## Usage

### Method 1: Use the Conversion Script

运行转换脚本处理指定文件：

```bash
python .kilocode/skills/md-to-zhihu/scripts/convert.py <input-file> [output-file]
```

参数说明：

- `input-file`: 输入的 Markdown 文件路径（必需）
- `output-file`: 输出的文件路径（可选，默认为 `<input>-zhihu.md`）

示例：

```bash
# 基本用法
python .kilocode/skills/md-to-zhihu/scripts/convert.py article.md

# 指定输出文件
python .kilocode/skills/md-to-zhihu/scripts/convert.py article.md article-zhihu.md
```

### Method 2: Manual Conversion

如需手动转换，按以下步骤操作：

1. 删除 YAML Front Matter（`---` 包裹的头部元数据）
2. 将 `##` 替换为 `#`
3. 将 `###` 替换为 `##`
4. 将 `####` 替换为 `###`
5. 以此类推调整更深层的标题

## Example

### Before (Standard Markdown)

```markdown
---
title: 文章标题
author: Author
date: 2024-01-01
---

## 1. 背景介绍

这是正文内容。

### 1.1. 问题定义

具体问题描述。

### 1.2. 解决方案

解决方案说明。

## 2. 实现步骤

步骤详情。
```

### After (Zhihu Format)

```markdown
# 1. 背景介绍

这是正文内容。

## 1.1. 问题定义

具体问题描述。

## 1.2. 解决方案

解决方案说明。

# 2. 实现步骤

步骤详情。
```

## Scripts

| Script               | Purpose                      | Usage                                            |
| -------------------- | ---------------------------- | ------------------------------------------------ |
| `scripts/convert.py` | 自动转换 Markdown 为知乎格式 | `python scripts/convert.py input.md [output.md]` |

## References

- `references/zhihu-markdown-guide.md`: 知乎 Markdown 格式规范说明

## Troubleshooting

| Problem                      | Cause                       | Solution                                       |
| ---------------------------- | --------------------------- | ---------------------------------------------- |
| 标题层级错乱                 | 原始文档使用了 `#` 作为标题 | 确保原始文档遵循 KiloCode 规范，使用 `##` 开始 |
| YAML Front Matter 未完全删除 | 格式不规范                  | 检查 `---` 是否单独成行                        |
| 脚本运行失败                 | Python 版本过低             | 确保 Python >= 3.6                             |

## Notes

- 知乎平台的一级标题对应 Markdown 的 `#`
- 知乎平台的二级标题对应 Markdown 的 `##`
- 转换后的文档可直接复制到知乎编辑器中使用
- 建议在转换前备份原始文件
