# @cmtx/cli

Markdown 图片管理命令行工具。提供扫描分析、批量上传等功能，集成 @cmtx/core 与 @cmtx/upload。

## 1. 快速开始

### 1.1. 安装

```bash
npm install -g @cmtx/cli
# 或通过 pnpm
pnpm add -g @cmtx/cli
```

### 1.2. 基本用法

```bash
cmtx <command> [options]
```

### 1.3. 查看帮助

```bash
cmtx --help
cmtx analyze --help
cmtx download --help
cmtx upload --help
cmtx format --help
cmtx copy --help
cmtx move --help
cmtx adapt --help
```

## 2. 开发模式运行

如果你在开发本工具或需要调试未发布的版本，可以使用以下方式快速运行 CLI：

### 2.1. 构建后直接运行

```bash
# 在 monorepo 根目录构建 CLI 包
pnpm -F @cmtx/cli build

# 直接运行构建产物
node ./packages/cli/dist/bin/cmtx.js <command>
```

### 2.2. 监听模式（推荐用于调试）

```bash
# 启动 TypeScript 监听编译
pnpm -F @cmtx/cli dev

# 在另一个终端运行命令
node ./packages/cli/dist/bin/cmtx.js analyze ./docs
```

### 2.3. 使用 pnpm workspace 命令

```bash
# 构建后在 workspace 内执行
pnpm -F @cmtx/cli exec cmtx <command>
```

### 2.4. 调试技巧

- 添加 `--verbose` 选项查看详细日志
- 使用 `console.log` 或 Node.js debugger 进行断点调试
- 测试文件位于 `packages/cli/tests/` 目录

## 3. 命令列表

### 3.1. analyze - 扫描和分析

扫描指定目录中的所有 Markdown 文件，提取并列出其中的图片引用。

```bash
cmtx analyze <searchDir> [options]
```

**选项：**

| 选项 | 别名 | 类型 | 说明 |
| --- | --- | --- | --- |
| `--depth` | `-d` | number | 递归深度（all \| 0-N） |
| `--extensions` | `-e` | string | 允许的扩展名，逗号分隔（如 .jpg,.png,.gif） |
| `--maxSize` | `-m` | number | 最大文件大小（字节） |
| `--output` | `-o` | string | 输出格式：json \| table \| plain（默认 table） |

**示例：**

```bash
# 分析当前目录的所有 Markdown 文件
cmtx analyze ./docs

# 递归深度为 2，输出为 JSON
cmtx analyze ./docs --depth 2 --output json

# 指定文件大小限制和扩展名
cmtx analyze ./docs --maxSize 5242880 --extensions .jpg,.png,.webp
```

### 3.2. download - 下载远程图片

从 Markdown 文件中提取远程图片 URL 并下载到本地目录。

```bash
cmtx download <input> --output <dir> [options]
```

**选项：**

| 选项 | 别名 | 类型 | 说明 |
| --- | --- | --- | --- |
| `--output` | `-o` | string | 输出目录（必填） |
| `--domain` | `-d` | string | 只下载指定域名的图片 |
| `--naming` | `-n` | string | 文件命名模板（默认 `{original}{ext}`） |
| `--concurrency` | `-c` | number | 并发数（默认 5） |
| `--overwrite` | | boolean | 覆盖已存在的文件 |
| `--dry-run` | | boolean | 预览模式，不实际下载 |
| `--verbose` | `-v` | boolean | 显示详细信息 |

**命名模板变量：**

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `{name}` | 文件名（不含扩展名） | `photo` |
| `{ext}` | 文件扩展名 | `.png` |
| `{date}` | 日期（YYYY-MM-DD） | `2026-04-02` |
| `{timestamp}` | 时间戳 | `1712060123456` |
| `{md5}` | 完整 MD5 哈希 | `a1b2c3d4e5f6...` |
| `{md5_8}` | MD5 前 8 位 | `a1b2c3d4` |
| `{md5_16}` | MD5 前 16 位 | `a1b2c3d4e5f6g7h8` |
| `{sequence}` | 序号（自动递增） | `001` |

**示例：**

```bash
# 下载 Markdown 中的所有远程图片
cmtx download ./article.md --output ./images/

# 只下载指定域名的图片
cmtx download ./article.md --output ./images/ --domain cdn.example.com

# 使用自定义命名模板（按日期归档）
cmtx download ./article.md --output ./images/ --naming "{date}/{name}{ext}"

# 使用 MD5 防止重名
cmtx download ./article.md --output ./images/ --naming "{name}_{md5_8}{ext}"

# 预览模式
cmtx download ./article.md --output ./images/ --dry-run
```

### 3.3. upload - 上传图片

批量上传所有本地图片到对象存储（如阿里云 OSS），并自动更新 Markdown 引用。

```bash
cmtx upload <searchDir> [options]
```

**选项：**

| 选项 | 别名 | 类型 | 说明 |
| --- | --- | --- | --- |
| `--adapter` | `-a` | string | 存储适配器：ali-oss（必填） |
| `--region` | | string | OSS 地区（如 oss-cn-hangzhou） |
| `--bucket` | | string | OSS 存储桶名称 |
| `--accessKeyId` | | string | 访问密钥 ID（或从环境变量读取） |
| `--accessKeySecret` | | string | 访问密钥（或从环境变量读取） |
| `--prefix` | `-p` | string | 上传路径前缀 |
| `--dryRun` | | boolean | 预览模式，不实际执行上传 |
| `--namingStrategy` | | string | 命名策略：original \| timestamp \| hash \| custom |
| `--deletionStrategy` | | string | 删除策略：trash \| move \| hard-delete |

**示例：**

```bash
# 上传并预览（不实际执行）
cmtx upload ./docs --dryRun --region oss-cn-hangzhou --bucket my-bucket --prefix images/

# 实际上传到 OSS（使用环境变量认证）
ALIYUN_OSS_REGION=oss-cn-hangzhou \
ALIYUN_OSS_BUCKET=my-bucket \
ALIYUN_OSS_ACCESS_KEY_ID=your_key \
ALIYUN_OSS_ACCESS_KEY_SECRET=your_secret \
cmtx upload ./docs --prefix images/

# 指定命名和删除策略
cmtx upload ./docs \
  --region oss-cn-hangzhou \
  --bucket my-bucket \
  --namingStrategy hash \
  --deletionStrategy trash
```

### 3.4. format - 图片格式转换与尺寸调整

在 Markdown 图片和 HTML 图片语法之间转换，并支持为 HTML 图片批量设置 width/height。

```bash
cmtx format <filePath> --to <markdown|html> [options]
```

**选项：**

| 选项 | 别名 | 类型 | 说明 |
| --- | --- | --- | --- |
| `--to` | `-t` | string | 目标格式：markdown \| html（必填） |
| `--output` | `-o` | string | 输出文件路径（默认覆盖原文件） |
| `--width` | | string | 仅对 HTML 输出生效，设置 img 的 width 属性 |
| `--height` | | string | 仅对 HTML 输出生效，设置 img 的 height 属性 |
| `--dry-run` | `-d` | boolean | 预览模式，不实际写入文件 |
| `--verbose` | `-v` | boolean | 显示详细转换信息 |

**示例：**

```bash
# Markdown 图片转换为 HTML 图片
cmtx format ./docs/article.md --to html

# 转为 HTML 并统一设置尺寸
cmtx format ./docs/article.md --to html --width 480 --height auto

# 仅调整现有 HTML 图片尺寸（不改变 Markdown 图片时也可生效）
cmtx format ./docs/article.md --to html --width 60%

# HTML 转回 Markdown
cmtx format ./docs/article.md --to markdown
```

### 3.5. copy - 复制远程图片

将 Markdown 文件中的远程图片从一个对象存储复制到另一个对象存储（源文件保留），并自动更新 Markdown 中的图片引用。

```bash
cmtx copy <filePath> [options]
```

**选项：**

| 选项 | 别名 | 类型 | 说明 |
| --- | --- | --- | --- |
| `--config` | `-c` | string | 配置文件路径 |
| `--dry-run` | `-d` | boolean | 预览模式，不实际执行复制 |
| `--concurrency` | `-n` | number | 并发数（默认 5） |
| `--verbose` | `-v` | boolean | 详细输出 |
| `--source-bucket` | | string | 源存储桶（覆盖配置） |
| `--target-bucket` | | string | 目标存储桶（覆盖配置） |
| `--target-domain` | | string | 目标自定义域名（覆盖配置） |
| `--prefix` | `-p` | string | 目标路径前缀（覆盖配置） |
| `--naming-template` | `-t` | string | 命名模板 |
| `--overwrite` | | boolean | 是否覆盖已存在的文件 |
| `--temp-dir` | | string | 临时目录路径 |
| `--format` | `-f` | string | 输出格式：json \| table \| plain |

**示例：**

```bash
# 使用配置文件复制
cmtx copy ./article.md --config ./copy-config.yaml --verbose

# 使用环境变量复制
cmtx copy ./article.md --verbose

# 预览模式（不实际执行）
cmtx copy ./article.md --config ./copy-config.yaml --dry-run --verbose
```

### 3.6. move - 移动远程图片

将 Markdown 文件中的远程图片从一个对象存储移动到另一个对象存储（源文件删除），并自动更新 Markdown 中的图片引用。

```bash
cmtx move <filePath> [options]
```

**选项：**

继承 `copy` 命令所有选项，额外增加：

| 选项 | 说明 |
| --- | --- |
| `--keep-source` | 保留源文件（等同于 copy） |
| `--delete-source` | 删除源文件（默认 true） |

**示例：**

```bash
# 移动图片到新存储（源文件删除）
cmtx move ./article.md --config ./move-config.yaml

# 移动但保留源文件（等同于 copy）
cmtx move ./article.md --config ./move-config.yaml --keep-source
```

**配置文件示例：**

**copy-config.yaml（复制配置）：**

```yaml
# 源存储配置
source:
  # 自定义域名（用于匹配 Markdown 中的图片 URL）
  # 支持纯域名格式（推荐）：private.example.com
  # 也支持完整 URL 格式：https://private.example.com
  # 系统会自动处理协议名，无需担心格式问题
  customDomain: private.example.com
  config:
    bucket: source-bucket
    region: oss-cn-hangzhou

# 目标存储配置
target:
  # 自定义域名（用于生成新的图片 URL）
  # 支持纯域名格式（推荐）：cdn.example.com
  # 系统会自动添加 https:// 前缀生成完整 URL
  customDomain: cdn.example.com
  prefix: images/
  # 使用模板命名（推荐）
  namingTemplate: "{date}/{name}_{md5_8}{ext}"
  overwrite: false
  config:
    bucket: target-bucket
    region: oss-cn-hangzhou

# 传输选项
options:
  concurrency: 5
  tempDir: /tmp/cmtx-copy
  filter:
    extensions:
      - .jpg
      - .png
      - .gif
    maxSize: 10485760  # 10MB
```

**命名模板变量：**

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `{name}` | 文件名（不含扩展名） | `photo` |
| `{ext}` | 文件扩展名 | `.png` |
| `{fileName}` | 完整文件名 | `photo.png` |
| `{date}` | 日期（YYYY-MM-DD） | `2026-04-02` |
| `{timestamp}` | 时间戳 | `1712060123456` |
| `{year}/{month}/{day}` | 年月日分离 | `2026/04/02` |
| `{md5}` | 完整 MD5 哈希 | `a1b2c3d4e5f6...` |
| `{md5_8}` | MD5 前 8 位 | `a1b2c3d4` |
| `{md5_16}` | MD5 前 16 位 | `a1b2c3d4e5f6g7h8` |

**命令行使用命名模板：**

```bash
# 使用模板命名上传到目标存储
cmtx copy ./article.md --config copy-config.yaml

# 通过命令行指定命名模板（覆盖配置文件）
cmtx copy ./article.md --config copy-config.yaml --naming-template "{name}_{md5_8}{ext}"
```

**关于 customDomain 的说明：**

- **源存储的 customDomain**：用于匹配 Markdown 中的图片 URL。系统会自动移除协议名（`https://`）进行匹配，所以配置时可以使用纯域名格式（推荐）或完整 URL 格式。
- **目标存储的 customDomain**：用于生成新的图片 URL。系统会自动添加 `https://` 前缀，所以配置时只需要提供纯域名即可。

**环境变量：**

```bash
export ALIYUN_OSS_ACCESS_KEY_ID=your_key
export ALIYUN_OSS_ACCESS_KEY_SECRET=your_secret
export SOURCE_BUCKET=source-bucket
export TARGET_BUCKET=target-bucket
```

**move-config.yaml（移动配置）：**

```yaml
source:
  customDomain: private.example.com
  credentials:
    accessKeyId: ${SOURCE_ACCESS_KEY_ID}
    accessKeySecret: ${SOURCE_ACCESS_KEY_SECRET}
    region: oss-cn-hangzhou
    bucket: old-bucket

target:
  customDomain: cdn.example.com
  prefix: images/
  namingTemplate: "{name}{ext}"
  credentials:
    accessKeyId: ${TARGET_ACCESS_KEY_ID}
    accessKeySecret: ${TARGET_ACCESS_KEY_SECRET}
    region: oss-cn-hangzhou
    bucket: new-bucket

options:
  deleteSource: true  # 移动后删除源文件
```

**copy vs move 对比：**

| 命令 | 行为 | 源文件处理 | 适用场景 |
| --- | --- | --- | --- |
| `copy` | 云端复制 | 保留 | 备份、跨平台分发 |
| `move` | 云端移动 | 删除 | 存储迁移、清理旧资源 |

### 3.7. adapt - 多平台内容格式适配

按规则配置文件批量改写 Markdown 内容，用于适配知乎、微信公众号、CSDN 等不同平台。
规则文件使用 YAML 格式，每条规则由一个正则匹配式和替换字符串组成。
底层规则解析与批处理能力由 `@cmtx/adapt` 提供，CLI 负责命令行参数和文件输出。

```bash
# 单文件适配
cmtx adapt <input> --rule-file <rules.yaml> [options]

# 使用内置平台规则
cmtx adapt <input> --platform <wechat|zhihu|csdn> [options]

# 检查平台兼容性
cmtx adapt <input> --platform wechat --check

# 渲染微信公众号 HTML
cmtx adapt <input> --platform wechat --render html [options]

# 目录批量适配
cmtx adapt <inputDir> --rule-file <rules.yaml> --out-dir <outputDir>
```

**选项：**

| 选项 | 别名 | 类型 | 说明 |
| --- | --- | --- | --- |
| `--rule-file` | `-r` | string | 自定义规则配置文件路径 |
| `--platform` | `-p` | string | 内置平台规则：wechat \| zhihu \| csdn |
| `--check` | | boolean | 检查输入是否符合平台要求，不写磁盘 |
| `--render` | | string | 平台渲染输出格式，当前支持 html |
| `--out` | `-o` | string | 输出文件路径（单文件时用） |
| `--out-dir` | | string | 输出目录（目录批量时必填） |
| `--dry-run` | `-d` | boolean | 预览模式，结果输出到 stdout，不写磁盘 |
| `--verbose` | `-v` | boolean | 显示每个文件的处理状态 |

`--rule-file` 与 `--platform` 至少需要提供一个；如果两者同时提供，CLI 优先使用 `--rule-file`。
`--check` 与 `--render` 只能配合 `--platform` 使用，且两者不能同时使用。

**示例：**

```bash
# 单文件适配知乎格式，输出到指定文件
cmtx adapt ./article.md --rule-file ./zhihu.adapt.yaml --out ./output/zhihu/article.md

# 使用内置知乎规则
cmtx adapt ./article.md --platform zhihu --out ./output/zhihu/article.md

# 预览查看适配结果（不写文件）
cmtx adapt ./article.md --rule-file ./zhihu.adapt.yaml --dry-run

# 整个目录批量适配
cmtx adapt ./docs/ --rule-file ./zhihu.adapt.yaml --out-dir ./output/zhihu

# 使用内置微信规则批量处理
cmtx adapt ./docs/ --platform wechat --out-dir ./output/wechat

# 检查文章是否符合微信公众号要求
cmtx adapt ./article.md --platform wechat --check

# 渲染为可粘贴到微信公众号编辑器的 HTML
cmtx adapt ./article.md --platform wechat --render html --out ./output/wechat/article.html
```

**规则文件格式（`zhihu.adapt.yaml`）：**

```yaml
version: v1

rules:
  # 去除 frontmatter
  - name: strip frontmatter
    match: "^---[\\s\\S]*?---\\n+"
    replace: ""
    flags: "g"

  # 知乎标题升级：h2 -> h1（先处理低编号，防止链式误触发）
  - name: h2 to h1
    match: "^## (.+)$"
    replace: "# $1"
    flags: "gm"

  - name: h3 to h2
    match: "^### (.+)$"
    replace: "## $1"
    flags: "gm"

  # h4 及以下全部归并为 h2（最多二级标题）
  - name: h4 and deeper to h2
    match: "^#{4,} (.+)$"
    replace: "## $1"
    flags: "gm"
```

规则字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `match` | 是 | JavaScript 正则表达式字符串 |
| `replace` | 是 | 替换字符串，`$1` `$2` 引用捕获组 |
| `flags` | 否 | 正则标志，默认 `gm`（g=全局, m=多行, s=dotAll） |
| `name` | 否 | 可读描述，不影响执行 |

示例规则文件在 [`examples/adapt-configs/`](../../examples/adapt-configs) 目录，包含 `zhihu.adapt.yaml`、`wechat.adapt.yaml`、`csdn.adapt.yaml`。

## 4. 环境变量

上传命令支持通过环境变量配置 OSS 凭证，避免在命令行暴露敏感信息：

```bash
export ALIYUN_OSS_REGION=oss-cn-hangzhou
export ALIYUN_OSS_BUCKET=my-bucket
export ALIYUN_OSS_ACCESS_KEY_ID=your_access_key
export ALIYUN_OSS_ACCESS_KEY_SECRET=your_secret
```

然后直接执行：

```bash
cmtx upload ./docs --prefix images/
```

## 5. 命名策略

上传时自动重命名文件的方式：

- `original`：保持原文件名
- `timestamp`：添加时间戳前缀
- `hash`：使用 MD5 哈希值
- `custom`：自定义格式

## 6. 删除策略

上传完成后处理本地文件的方式：

- `trash`：移动到系统回收站（默认）
- `move`：移动到项目的 `.cmtx-trash/` 目录
- `hard-delete`：彻底删除（需谨慎使用）

## 7. 配置文件

支持通过 `cmtx.config.json` 配置默认选项（计划中）。

## 8. 常见问题

### 如何只预览不上传？

使用 `--dryRun` 选项：

```bash
cmtx upload ./docs --dryRun --region oss-cn-hangzhou --bucket my-bucket
```

### 如何安全地删除本地图片？

使用 `--deletionStrategy trash`（默认）或 `move`：

```bash
cmtx upload ./docs --deletionStrategy trash
```

### 如何处理权限问题？

确保 OSS 凭证正确，且对应的 bucket 有读写权限。

## 9. 依赖

- `@cmtx/core`：Markdown 图片处理与元数据操作
- `@cmtx/upload`：对象存储上传逻辑
- `yargs`：命令行参数解析
- `chalk`：终端文本着色
- `ora`：加载动画
- `ali-oss`：阿里云 OSS SDK

## 10. 许可证

Apache-2.0

## 11. 参见

- [@cmtx/core](../core/README.md) - 图片处理与元数据操作
- [@cmtx/upload](../upload/README.md) - 对象存储上传
- [@cmtx/mcp-server](../mcp-server/README.md) - JSON-RPC MCP 服务器
