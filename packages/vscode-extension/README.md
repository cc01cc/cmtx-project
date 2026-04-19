# cmtx-vscode

CMTX for VS Code - Markdown 工具包。

## 功能特性

### 图片管理

- **上传图片** - 将本地图片上传到云存储（阿里云 OSS、腾讯云 COS）
- **下载图片** - 将远程图片下载到本地目录
- **图片调整** - 使用预设值调整图片宽度
- **预签名 URL 预览** - 使用自动生成的预签名 URL 预览私有存储桶图片

### 文档处理

- **格式转换** - 在 Markdown 和 HTML 格式之间转换图片
- **平台适配** - 为微信公众号、知乎、CSDN 平台适配文档
- **图片分析** - 分析并报告文档中的图片

### 实用工具

- **查找引用** - 查找图片的所有引用
- **配置向导** - 初始化 CMTX 配置

## 命令

| 命令 | 描述 |
| --- | --- |
| `CMTX: Upload local images` | 上传文档中的所有本地图片 |
| `CMTX: Upload selected images` | 上传选中文字中的图片 |
| `CMTX: Download remote images` | 下载远程图片到本地 |
| `CMTX: Convert images to HTML format` | 将 Markdown 图片转换为 HTML |
| `CMTX: Convert images to Markdown format` | 将 HTML 图片转换为 Markdown |
| `CMTX: Set image width` | 使用 QuickPick 设置图片宽度 |
| `CMTX: Increase image width` | 增加图片宽度 (Ctrl+Up) |
| `CMTX: Decrease image width` | 减小图片宽度 (Ctrl+Down) |
| `CMTX: Adapt for platform` | 为发布平台适配文档 |
| `CMTX: Analyze document images` | 分析文档中的图片 |
| `CMTX: Find image references` | 查找选中图片的所有引用 |
| `CMTX: Initialize configuration` | 创建 CMTX 配置文件 |

## 配置

CMTX 使用 `.cmtx/config.yaml` 进行所有配置。运行 `CMTX: Initialize configuration` 来创建配置文件。

详细配置指南请参见 [CONFIG.md](./CONFIG.md)。

### 环境变量

你可以在配置文件中使用 `"${VAR}"` 语法来使用环境变量（Docker Compose 标准）：

```yaml
storage:
  config:
    bucket: "${CMTX_ALIYUN_BUCKET}"
    accessKeyId: "${CMTX_ALIYUN_ACCESS_KEY_ID}"
    accessKeySecret: "${CMTX_ALIYUN_ACCESS_KEY_SECRET}"
```

**重要**：环境变量必须用**双引号**包裹（`"${VAR}"`），不能使用裸 `${VAR}`。

**为什么需要引号？** YAML 解析器会将未加引号的 `${VAR}` 解释为锚点/别名语法，解析为 `null`。

**支持的语法**：

- 简单语法：`"${VAR_NAME}"`
- 带默认值：`"${VAR_NAME:-default_value}"`

**带默认值的示例**：

```yaml
storage:
  config:
    bucket: "${CMTX_ALIYUN_BUCKET:-my-default-bucket}"
```

### 快速设置

1. 设置环境变量：

```bash
# 阿里云 OSS
export CMTX_ALIYUN_ACCESS_KEY_ID="your-access-key-id"
export CMTX_ALIYUN_ACCESS_KEY_SECRET="your-access-key-secret"
export CMTX_ALIYUN_BUCKET="your-bucket"
export CMTX_ALIYUN_REGION="oss-cn-hangzhou"

# 腾讯云 COS
export CMTX_TENCENT_SECRET_ID="your-secret-id"
export CMTX_TENCENT_SECRET_KEY="your-secret-key"
```

1. 运行 `CMTX: Initialize configuration` 创建 `.cmtx/config.yaml`

2. 编辑配置文件，设置你的参数

### 预签名 URL 配置

对于私有存储桶图片预览，在 `.cmtx/config.yaml` 中配置：

```yaml
presignedUrls:
  expire: 600
  maxRetryCount: 3
  imageFormat: all
  domains:
    - domain: private-bucket.oss-cn-hangzhou.aliyuncs.com
      provider: aliyun-oss
      bucket: "${CMTX_ALIYUN_BUCKET}"
      region: oss-cn-hangzhou
      accessKeyId: "${CMTX_ALIYUN_ACCESS_KEY_ID}"
      accessKeySecret: "${CMTX_ALIYUN_ACCESS_KEY_SECRET}"
```

## 快捷键

| 快捷键 | 命令 |
| --- | --- |
| `Ctrl+Shift+H` | 转换为 HTML 格式 |
| `Ctrl+Up` | 增加图片宽度 |
| `Ctrl+Down` | 减小图片宽度 |

## 要求

- VS Code 1.93.0 或更高版本
- Node.js 18.0.0 或更高版本

## 开发

### 快速打包

从项目根目录直接打包，无需切换目录：

```bash
# 一步打包（构建 + 打包）
pnpm -F cmtx-vscode build && pnpm -F cmtx-vscode package

# 仅构建
pnpm -F cmtx-vscode build

# 仅打包（需要先构建）
pnpm -F cmtx-vscode package
```

**打包产物**：`cmtx-vscode-<version>.vsix` 位于 `packages/vscode-extension/` 目录

**替代方式**：

```bash
# 使用 --dir 参数
pnpm --dir packages/vscode-extension build
pnpm --dir packages/vscode-extension package
```

### 安装测试

```bash
# 从 VSIX 文件安装
code --install-extension cmtx-vscode-0.1.0.vsix

# 卸载
code --uninstall-extension cc01cc.cmtx-vscode
```

### 开发指南

开发指南请参见 [docs](./docs/) 目录：

- [DEV-001-vscode_extension_debugging.md](./docs/DEV-001-vscode_extension_debugging.md) - 调试指南与日志最佳实践
- [DEV-002-vscode_extension_architecture.md](./docs/DEV-002-vscode_extension_architecture.md) - 扩展架构层次详解
- [DEV-003-vscode-extension-devcontainer-profile.md](./docs/DEV-003-vscode-extension-devcontainer-profile.md) - DevContainer 中 Profile 机制与扩展管理
- [DEV-004-markdown-it-plugin-guide.md](./docs/DEV-004-markdown-it-plugin-guide.md) - Markdown-it 插件开发指南
- [DEV-005-vsce-pnpm-workspace-integration.md](./docs/DEV-005-vsce-pnpm-workspace-integration.md) - VSCE 与 pnpm Workspace 集成指南

## 文档

- [English Documentation](./README.en.md)

## 许可证

Apache-2.0
