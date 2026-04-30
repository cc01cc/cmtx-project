# @cmtx/cli

[![npm version](https://img.shields.io/npm/v/@cmtx/cli.svg)](https://www.npmjs.com/package/@cmtx/cli)
[![License](https://img.shields.io/npm/l/@cmtx/cli.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Markdown 图片管理命令行工具。提供扫描分析、上传、格式转换等功能，集成 `@cmtx/core`、`@cmtx/asset` 与 `@cmtx/publish`。

## 1. 快速开始

```bash
pnpm add -g @cmtx/cli
```

### 基本用法

```bash
cmtx <command> [options]
```

### 查看帮助

```bash
cmtx --help
cmtx analyze --help
cmtx download --help
cmtx upload --help
cmtx format --help
cmtx copy --help
cmtx move --help
cmtx presign --help
cmtx config --help
cmtx adapt --help
```

## 2. 命令列表

### 2.1. analyze - 扫描和分析

扫描目录中的 Markdown 文件，提取并列出图片引用。

```bash
cmtx analyze <searchDir> [options]
```

| 选项 | 别名 | 类型 | 说明 |
|------|------|------|------|
| `--depth` | `-d` | number | 递归深度（all \| 0-N） |
| `--extensions` | `-e` | string | 允许的扩展名，逗号分隔 |
| `--maxSize` | `-m` | number | 最大文件大小（字节） |
| `--output` | `-o` | string | 输出格式：json \| table \| plain |

### 2.2. download - 下载远程图片

从 Markdown 文件中提取远程图片并下载到本地。

```bash
cmtx download <input> --output <dir> [options]
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

### 2.3. upload - 上传图片

上传 Markdown 文件中的本地图片到对象存储并替换引用。

```bash
cmtx upload <filePath> [options]
```

| 选项 | 别名 | 类型 | 说明 |
|------|------|------|------|
| `--config` | `-c` | string | 配置文件路径 |
| `--provider` | `-p` | string | 云存储提供商（aliyun-oss \| tencent-cos） |
| `--prefix` | | string | 远程路径前缀 |
| `--naming-pattern` | `-n` | string | 命名模板，如 `{date}_{hash}{ext}` |
| `--enable-delete` | | boolean | 启用本地文件删除 |
| `--delete-strategy` | | string | 删除策略（trash \| move \| hard-delete） |
| `--trash-dir` | | string | 回收站目录（当 strategy=move 时使用） |
| `--root-path` | | string | 安全删除根路径 |
| `--verbose` | `-v` | boolean | 详细输出 |

```bash
# 上传到阿里云 OSS
cmtx upload ./article.md --provider aliyun-oss --prefix blog/images

# 通过环境变量认证
ALIYUN_OSS_ACCESS_KEY_ID=your_key \
ALIYUN_OSS_ACCESS_KEY_SECRET=your_secret \
ALIYUN_OSS_BUCKET=my-bucket \
cmtx upload ./article.md --prefix blog/images
```

### 2.4. format - 图片格式转换与尺寸调整

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

### 2.5. copy - 复制远程图片

将远程图片从一个对象存储复制到另一个，并更新 Markdown 引用。

```bash
cmtx copy <filePath> [options]
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

### 2.6. move - 移动远程图片

类似 `copy`，但默认删除源文件。

```bash
cmtx move <filePath> [options]
```

继承 `copy` 所有选项，额外：

| 选项 | 说明 |
|------|------|
| `--keep-source` | 保留源文件（等同于 copy） |
| `--delete-source` | 删除源文件（默认 true） |

### 2.7. adapt - 内容变换

按 Preset 批量改写 Markdown 内容。

```bash
cmtx adapt <input> --platform <name> [options]
```

| 选项 | 别名 | 类型 | 说明 |
|------|------|------|------|
| `--platform` | `-p` | string | 预设名称（必填，如 wechat、zhihu） |
| `--check` | | boolean | 校验输入是否符合要求 |
| `--render` | | string | 渲染输出格式（html） |
| `--out` | `-o` | string | 输出文件路径 |
| `--out-dir` | | string | 输出目录 |
| `--dry-run` | `-d` | boolean | 预览模式 |
| `--verbose` | `-v` | boolean | 详细输出 |

```bash
# 单文件处理
cmtx adapt ./article.md --platform wechat --out ./output/article.md

# 目录批量处理
cmtx adapt ./docs/ --platform wechat --out-dir ./output

# 渲染为 HTML
cmtx adapt ./article.md --platform wechat --render html

# 校验兼容性
cmtx adapt ./article.md --platform wechat --check
```

### 2.8. presign - 生成预签名 URL

为云存储中的图片生成预签名 URL。

```bash
cmtx presign [input] [options]
```

| 选项 | 别名 | 类型 | 说明 |
|------|------|------|------|
| `--url` | `-u` | string | 单个图片 URL |
| `--expire` | `-e` | number | 过期时间（秒） |
| `--provider` | `-p` | string | 云存储提供商 |
| `--config` | `-c` | string | 配置文件路径 |
| `--verbose` | `-v` | boolean | 详细输出 |

```bash
# 单个 URL
cmtx presign --url "https://bucket.oss-cn-hangzhou.aliyuncs.com/path/image.png"

# Markdown 文件中的所有图片
cmtx presign ./article.md --expire 3600
```

### 2.9. config - 配置管理

查看和管理 CLI 配置。

```bash
cmtx config [options]
```

## 3. 依赖

- `@cmtx/core`：Markdown 图片处理与元数据操作
- `@cmtx/asset`：文件操作与对象存储上传
- `@cmtx/publish`：内容变换规则引擎
- `yargs`：命令行参数解析

## 4. 许可证

Apache-2.0
