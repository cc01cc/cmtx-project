---
title: USR-002 - 命令参考
---

# USR-002: 命令参考

## image analyze - 扫描和分析

扫描目录中的 Markdown 文件，提取图片引用并按图片聚合。

输出以**图片为聚合单位**：每张图片汇总它的总引用次数、引用文件列表、本地文件大小。
同一图片在同一文件中的多次引用会分别记录，不按文件去重。

```bash
cmtx image analyze <searchDir> [options]
```

| 选项 | 别名 | 类型 | 说明 |
|------|------|------|------|
| `--depth` | `-d` | number | 递归深度（all \| 0-N） |
| `--extensions` | `-e` | string | 允许的扩展名，逗号分隔 |
| `--maxSize` | `-m` | number | 最大文件大小（字节） |
| `--output` | `-o` | string | 输出格式：json \| table \| plain |

输出示例（table 格式）：

```
Analyze Result

  Image                            Size      Refs  Files
  ------------------------------ ---------- ------ ------
  assets/photo.png                100.0 KB      3      2
  images/diagram.jpg              140.0 KB      2      1

Summary: 2 images, 0 skipped, 240.0 KB total, 5 references, 3 md files

Reference Details:
  assets/photo.png
    docs/intro.md  (1)
    docs/guide.md  (2)
  images/diagram.jpg
    docs/guide.md  (2)
```

输出格式说明：

- `Refs`：该图片在所有 md 文件中出现的总引用次数（0 = 孤立图片）
- `Files`：引用了该图片的 md 文件数（去重后）
- `Status`：`[orphan]` 标记表示该图片未被任何 md 文件引用
- Reference Details 中 `[orphan]` 标记表示孤立图片，无引用详情
- `fileSize` 仅对本地存在的图片有效，无本地文件时显示为 `-`
- `--extensions` 控制扫描的图片文件类型，默认 `png,jpg,jpeg,gif,svg,webp`
- `--maxSize` 过滤超过指定大小的图片（对引用图片和孤立图片均生效）

## image download - 下载远程图片

从 Markdown 文件中提取远程图片并下载到本地。

```bash
cmtx image download <input> --output <dir> [options]
```

| 选项 | 别名 | 类型 | 说明 |
|------|------|------|------|
| `--output` | `-o` | string | 输出目录（必填） |
| `--domain` | `-d` | string | 只下载指定域名的图片 |
| `--naming` | `-n` | string | 文件命名模板 |
| `--concurrency` | `-c` | number | 并发数 |
| `--overwrite` | | boolean | 覆盖已存在的文件 |
| `--dry-run` | | boolean | 预览模式 |
| `--verbose` | `-v` | boolean | 详细输出 |

## image upload - 上传图片

上传 Markdown 文件中的本地图片到对象存储并替换引用。

```bash
cmtx image upload <filePath> [options]
```

| 选项 | 别名 | 类型 | 说明 |
|------|------|------|------|
| `--config` | `-c` | string | 配置文件路径 |
| `--provider` | `-p` | string | 云存储提供商（aliyun-oss \| tencent-cos） |
| `--prefix` | | string | 远程路径前缀 |
| `--naming-pattern` | `-n` | string | 命名模板，如 `{date}_{hash}{ext}` |
| `--enable-delete` | | boolean | 启用本地文件删除（暂未实现，待后续版本） |
| `--delete-strategy` | | string | 删除策略（trash \| move \| hard-delete） |
| `--trash-dir` | | string | 回收站目录（当 strategy=move 时使用） |
| `--root-path` | | string | 安全删除根路径 |
| `--verbose` | `-v` | boolean | 详细输出 |

## format - 图片格式转换与尺寸调整

在 Markdown 图片和 HTML 图片语法之间转换。

```bash
cmtx format <filePath> --to <markdown|html> [options]
```

| 选项 | 别名 | 类型 | 说明 |
|------|------|------|------|
| `--to` | `-t` | string | 目标格式：markdown \| html（必填） |
| `--output` | `-o` | string | 输出文件路径 |
| `--width` | | string | 设置 HTML img 的 width |
| `--height` | | string | 设置 HTML img 的 height |
| `--in-place` | `-i` | boolean | 直接修改原文件 |
| `--dry-run` | `-d` | boolean | 预览模式 |
| `--verbose` | `-v` | boolean | 详细输出 |

## image copy - 复制远程图片

将远程图片从一个对象存储复制到另一个，并更新 Markdown 引用。

```bash
cmtx image copy <filePath> [options]
```

| 选项 | 别名 | 类型 | 说明 |
|------|------|------|------|
| `--config` | `-c` | string | 配置文件路径 |
| `--dry-run` | `-d` | boolean | 预览模式 |
| `--concurrency` | `-n` | number | 并发数 |
| `--verbose` | `-v` | boolean | 详细输出 |
| `--provider` | | string | 目标云存储提供商 |
| `--source-access-key-id` | | string | 源 accessKeyId |
| `--source-access-key-secret` | | string | 源 accessKeySecret |
| `--target-access-key-id` | | string | 目标 accessKeyId |
| `--target-access-key-secret` | | string | 目标 accessKeySecret |
| `--prefix` | `-p` | string | 目标路径前缀 |
| `--naming-template` | `-t` | string | 命名模板 |
| `--overwrite` | | boolean | 覆盖已存在文件 |
| `--temp-dir` | | string | 临时目录 |
| `--format` | `-f` | string | 输出格式：json \| table \| plain |

## image move - 移动远程图片

类似 `image copy`，但默认删除源文件。

```bash
cmtx image move <filePath> [options]
```

继承 `image copy` 所有选项，额外：

| 选项 | 说明 |
|------|------|
| `--keep-source` | 保留源文件（等同于 copy） |
| `--delete-source` | 删除源文件（默认 true） |

## image prune - 清理未引用图片

清理目录下所有未被 Markdown 文件引用的图片。先扫描目录识别 orphan 图片，再逐个删除。

```bash
cmtx image prune <searchDir> [options]
```

| 选项 | 别名 | 类型 | 默认值 | 说明 |
|------|------|------|--------|------|
| `<searchDir>` | | string | | 要清理的图片目录 |
| `--strategy` | `-s` | string | `trash` | 删除策略：trash \| move \| hard-delete |
| `--dry-run` | | boolean | `false` | 预览模式，不实际删除 |
| `--force` | `-f` | boolean | `false` | 强制删除（跳过确认） |
| `--yes` | `-y` | boolean | `false` | 自动确认 |
| `--move-dir` | | string | | move 策略的目标目录 |
| `--extensions` | `-e` | string | | 图片扩展名过滤，逗号分隔 |
| `--max-size` | `-m` | number | | 最大文件大小（字节），超出跳过 |
| `--output` | `-o` | string | `table` | 输出格式：json \| table \| plain |

## image presign - 生成预签名 URL

为云存储中的图片生成预签名 URL。

```bash
cmtx image presign [input] [options]
```

| 选项 | 别名 | 类型 | 说明 |
|------|------|------|------|
| `--url` | `-u` | string | 单个图片 URL |
| `--expire` | `-e` | number | 过期时间（秒） |
| `--provider` | `-p` | string | 云存储提供商 |
| `--config` | `-c` | string | 配置文件路径 |
| `--verbose` | `-v` | boolean | 详细输出 |

## publish - 执行 preset 处理文档

按 preset 配置处理文档，支持发布（prototype 创建）、平台适配（wechat/zhihu 等预设）等场景。

```bash
cmtx publish <input> --preset wechat --to-dir ./output
```

### publish 预设（文档发布）

创建目录、适配 front matter、复制 asset、更新关联：

```bash
cmtx publish <input> --to-dir <dir> [options]
```

| 选项 | 别名 | 类型 | 说明 |
|------|------|------|------|
| `<input>` | | string | 文件/目录/glob 路径 |
| `--to-dir` | `-t` | string | 目标目录 |
| `--preset` | | string | preset 名称（默认：publish） |
| `--dry-run` | `-d` | boolean | 预览不写入 |
| `--verbose` | `-v` | boolean | 详细输出 |
| `--force` | | boolean | 覆盖已存在 |

## config - 配置管理

查看和管理 CLI 配置。

```bash
cmtx config [options]
```
