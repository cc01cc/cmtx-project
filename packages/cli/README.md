# @cmtx/cli

Markdown 图片管理命令行工具。提供扫描分析、批量上传等功能，集成 @cmtx/core 与 @cmtx/upload。

## 快速开始

### 安装

```bash
npm install -g @cmtx/cli
# 或通过 pnpm
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
cmtx upload --help
```

## 命令列表

### 1. analyze - 扫描和分析

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

### 2. upload - 上传图片

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
OSS_REGION=oss-cn-hangzhou \
OSS_BUCKET=my-bucket \
OSS_ACCESS_KEY_ID=your_key \
OSS_ACCESS_KEY_SECRET=your_secret \
cmtx upload ./docs --prefix images/

# 指定命名和删除策略
cmtx upload ./docs \
  --region oss-cn-hangzhou \
  --bucket my-bucket \
  --namingStrategy hash \
  --deletionStrategy trash
```

## 环境变量

上传命令支持通过环境变量配置 OSS 凭证，避免在命令行暴露敏感信息：

```bash
export OSS_REGION=oss-cn-hangzhou
export OSS_BUCKET=my-bucket
export OSS_ACCESS_KEY_ID=your_access_key
export OSS_ACCESS_KEY_SECRET=your_secret
```

然后直接执行：

```bash
cmtx upload ./docs --prefix images/
```

## 命名策略

上传时自动重命名文件的方式：

- `original`：保持原文件名
- `timestamp`：添加时间戳前缀
- `hash`：使用 MD5 哈希值
- `custom`：自定义格式

## 删除策略

上传完成后处理本地文件的方式：

- `trash`：移动到系统回收站（默认）
- `move`：移动到项目的 `.cmtx-trash/` 目录
- `hard-delete`：彻底删除（需谨慎使用）

## 配置文件

支持通过 `cmtx.config.json` 配置默认选项（计划中）。

## 常见问题

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

## 依赖

- `@cmtx/core`：Markdown 图片提取和引用分析
- `@cmtx/upload`：对象存储上传逻辑
- `yargs`：命令行参数解析
- `chalk`：终端文本着色
- `ora`：加载动画
- `ali-oss`：阿里云 OSS SDK

## 许可证

Apache-2.0

## 参见

- [@cmtx/core](../core/README.md) - 图片提取和引用分析
- [@cmtx/upload](../upload/README.md) - 对象存储上传
- [@cmtx/mcp-server](../mcp-server/README.md) - JSON-RPC MCP 服务器
