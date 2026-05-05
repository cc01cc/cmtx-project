# @cmtx/cli

[![npm version](https://img.shields.io/npm/v/@cmtx/cli.svg)](https://www.npmjs.com/package/@cmtx/cli)
[![License](https://img.shields.io/npm/l/@cmtx/cli.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Markdown 图片管理命令行工具。提供扫描分析、上传、格式转换等功能，集成 `@cmtx/core`、`@cmtx/asset` 与 `@cmtx/rule-engine`。

## 安装

```bash
pnpm add -g @cmtx/cli
```

## 快速开始

```bash
cmtx analyze ./docs --depth 2
cmtx upload ./article.md --provider aliyun-oss --prefix blog/images
cmtx publish ./article.md --to-dir ../target/
```

## 命令

| 命令 | 描述 |
|------|------|
| `analyze` | 扫描 Markdown 中的图片引用 |
| `upload` | 上传图片到对象存储 |
| `download` | 下载远程图片到本地 |
| `copy` | 复制远程图片到目标存储 |
| `move` | 移动远程图片 |
| `presign` | 生成预签名 URL |
| `publish` | 执行 preset 处理文档（发布/平台适配等） |
| `format` | Markdown/HTML 格式转换 |
| `config` | 配置管理 |

## 文档

- [安装与快速开始](./docs/USR-001-getting-started.md)
- [命令参考](./docs/USR-002-commands-reference.md)
- [配置指南](./docs/USR-003-configuration.md)
- [使用教程](./docs/USR-004-guides.md)
- [故障排查](./docs/USR-005-troubleshooting.md)
- [文档索引](./docs/INDEX.md)

## 许可证

Apache-2.0
