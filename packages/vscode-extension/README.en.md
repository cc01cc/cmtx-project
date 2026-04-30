# cmtx-vscode

[![Version](https://img.shields.io/visual-studio-marketplace/v/cc01cc.cmtx-vscode)](https://marketplace.visualstudio.com/items?itemName=cc01cc.cmtx-vscode)
[![License](https://img.shields.io/github/license/cc01cc/cmtx-project)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

CMTX for VS Code - Markdown toolkit.

## Features

### Image Management

- **Upload images** - Upload local images to cloud storage (Aliyun OSS, Tencent COS)
- **Download images** - Download remote images to local directory
- **Image resize** - Adjust image width with preset values
- **Presigned URL preview** - Preview private bucket images with auto-generated presigned URLs

### Document Processing

- **Format conversion** - Convert images between Markdown and HTML formats
- **Platform adaptation** - Adapt documents for WeChat, Zhihu, CSDN platforms
- **Image analysis** - Analyze and report on images in documents

### Utilities

- **Find references** - Find all references to an image
- **Configuration wizard** - Initialize CMTX configuration

## Commands

| Command                                   | Description                            |
| ----------------------------------------- | -------------------------------------- |
| `CMTX: Upload selected images`            | Upload images in selected text         |
| `CMTX: Download remote images`            | Download remote images to local        |
| `CMTX: Delete image...`                   | Delete a specific image                |
| `CMTX: Convert images to HTML format`     | Convert Markdown images to HTML        |
| `CMTX: Set image width...`                | Set image width with QuickPick         |
| `CMTX: Increase image size (zoom in)`     | Increase image width (Ctrl+Up)         |
| `CMTX: Decrease image size (zoom out)`    | Decrease image width (Ctrl+Down)       |
| `CMTX: Apply preset...`                   | Apply a preset                         |
| `CMTX: Add/Update section numbers`        | Add or update section numbers          |
| `CMTX: Remove section numbers`            | Remove section numbers                 |
| `CMTX: Clear presigned URL cache`         | Clear presigned URL cache              |
| `CMTX: Create configuration...`           | Create CMTX configuration file         |
| `CMTX: Refresh configuration`             | Refresh configuration (reload to apply)|
| `CMTX: Reload window to apply config changes` | Reload window to apply config changes |
| `CMTX (Rule): Upload images`              | Upload images (rule mode)              |
| `CMTX (Rule): Download remote images`     | Download remote images (rule mode)     |
| `CMTX (Rule): Delete image`               | Delete image (rule mode)               |
| `CMTX (Rule): Convert images to HTML`     | Convert images to HTML (rule mode)     |
| `CMTX (Rule): Resize image`               | Resize image (rule mode)               |
| `CMTX (Rule): Generate frontmatter ID`    | Generate frontmatter ID                |
| `CMTX (Rule): Convert title to frontmatter` | Convert title to frontmatter        |
| `CMTX (Rule): Strip frontmatter`          | Strip frontmatter                      |
| `CMTX (Rule): Add frontmatter date`       | Add frontmatter date                   |
| `CMTX (Rule): Add frontmatter updated date` | Add frontmatter updated date         |
| `CMTX (Rule): Promote headings`           | Promote heading levels                 |
| `CMTX (Rule): Add section numbers`        | Add section numbers (rule mode)        |
| `CMTX (Rule): Remove section numbers`     | Remove section numbers (rule mode)     |

## Configuration

CMTX uses `.cmtx/config.yaml` for all configuration. Run `CMTX: Initialize configuration` to create the file.

For detailed configuration guide, see [CFG-001-config-guide.md](./docs/CFG-001-config-guide.md).

### Environment Variables

You can use environment variables in the config file with the `"${VAR}"` syntax (Docker Compose standard):

```yaml
storage:
    config:
        bucket: "${CMTX_ALIYUN_BUCKET}"
        accessKeyId: "${CMTX_ALIYUN_ACCESS_KEY_ID}"
        accessKeySecret: "${CMTX_ALIYUN_ACCESS_KEY_SECRET}"
```

**Important**: Environment variables must be wrapped in **double quotes** (`"${VAR}"`), not bare `${VAR}`.

**Why quotes?** YAML parsers interpret unquoted `${VAR}` as anchor/alias syntax, which resolves to `null`.

**Supported syntax**:

- Simple: `"${VAR_NAME}"`
- With default: `"${VAR_NAME:-default_value}"`

**Example with default**:

```yaml
storage:
    config:
        bucket: "${CMTX_ALIYUN_BUCKET:-my-default-bucket}"
```

### Quick Setup

1. Set environment variables:

```bash
# Aliyun OSS
export CMTX_ALIYUN_ACCESS_KEY_ID="your-access-key-id"
export CMTX_ALIYUN_ACCESS_KEY_SECRET="your-access-key-secret"
export CMTX_ALIYUN_BUCKET="your-bucket"
export CMTX_ALIYUN_REGION="oss-cn-hangzhou"

# Tencent COS
export CMTX_TENCENT_SECRET_ID="your-secret-id"
export CMTX_TENCENT_SECRET_KEY="your-secret-key"
```

1. Run `CMTX: Initialize configuration` to create `.cmtx/config.yaml`

2. Edit the configuration file with your settings

### Presigned URL Configuration

For private bucket image preview, configure in `.cmtx/config.yaml`:

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

## Keyboard Shortcuts

| Shortcut       | Command                |
| -------------- | ---------------------- |
| `Ctrl+Shift+H` | Convert to HTML format |
| `Ctrl+Up`      | Increase image width   |
| `Ctrl+Down`    | Decrease image width   |

## Requirements

- VS Code 1.110.0 or higher
- Node.js 18.0.0 or higher

## Development

For development guides, see the [docs](./docs/) directory:

- [DEV-001-vscode_extension_debugging.md](./docs/DEV-001-vscode_extension_debugging.md) - Debugging guide and logging best practices
- [DEV-002-vscode_extension_architecture.md](./docs/DEV-002-vscode_extension_architecture.md) - Extension architecture layers
- [DEV-003-vscode-extension-devcontainer-profile.md](./docs/DEV-003-vscode-extension-devcontainer-profile.md) - Profile mechanism and extension management in DevContainer
- [DEV-004-markdown-it-plugin-guide.md](./docs/DEV-004-markdown-it-plugin-guide.md) - Markdown-it plugin development guide
- [DEV-005-vsce-pnpm-workspace-integration.md](./docs/DEV-005-vsce-pnpm-workspace-integration.md) - VSCE and pnpm Workspace integration
- [DEV-006-tsdown-dependency-bundling-guide.md](./docs/DEV-006-tsdown-dependency-bundling-guide.md) - tsdown dependency bundling guide
- [DEV-007-vscode-testing-conflict.md](./docs/DEV-007-vscode-testing-conflict.md) - Conflict handling configuration test

## Documentation

- [中文文档](./README.md)

## License

Apache-2.0
