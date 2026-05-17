---
title: "快速开始"
category: user-guide
group: "命令行工具"
sidebar_order: 1
lang: zh-Hans
---

# 安装与快速开始

## 前置要求

- Node.js >= 22.0.0

## 安装

```bash
pnpm add -g @cmtx/cli
```

验证安装：

```bash
cmtx --version
```

## 命令结构

CLI 命令分为以下几类：

```
cmtx
├── image              # 图片管理命令组
│   ├── analyze       # 扫描分析
│   ├── download      # 下载远程图片
│   ├── upload        # 上传本地图片
│   ├── delete        # 删除指定图片
│   ├── copy          # 复制远程图片
│   ├── move          # 移动远程图片
│   ├── cleanup       # 清理未引用图片
│   └── presign       # 生成预签名 URL
├── format             # Markdown/HTML 转换
├── section-numbers    # 章节编号管理
│   ├── add           # 添加编号
│   └── remove        # 移除编号
├── publish            # 执行 preset
└── config             # 配置管理
    ├── init          # 创建配置
    └── show          # 显示模板
```

## 基本用法

```bash
cmtx <command> [options]
```

## 查看帮助

```bash
cmtx --help
cmtx image --help
cmtx image copy --help
cmtx config --help
cmtx publish --help
```

## 配置文件

### 创建配置文件

```bash
cmtx config init
```

使用自定义文件名：

```bash
cmtx config init --output-file .cmtx/config.yaml
```

强制覆盖已存在的文件：

```bash
cmtx config init --force
```

### 显示配置模板

```bash
cmtx config show
```

### 配置文件发现

未指定 `--config` 时，CLI 会自动向上遍历目录查找：

1. `cmtx.config.yaml`
2. `.cmtx/config.yaml`

最多遍历 10 层目录。

### 环境变量

凭证可通过环境变量传入，避免在命令历史中暴露敏感信息。

完整环境变量清单请参考 [CFG-001 配置参考](../../CFG-001-configuration-reference.md#环境变量)。

```bash
CMTX_ALIYUN_ACCESS_KEY_ID=your_key \
CMTX_ALIYUN_ACCESS_KEY_SECRET=your_secret \
CMTX_ALIYUN_BUCKET=my-bucket \
cmtx image upload ./article.md --prefix blog/images
```

## 快速示例

```bash
# 分析文档中的图片
cmtx image analyze ./docs --depth 2

# 上传图片到阿里云 OSS
cmtx image upload ./article.md --provider aliyun-oss --prefix blog/images

# 清理未引用的图片
cmtx image cleanup ./assets --strategy trash

# 为 Markdown 添加章节编号
cmtx section-numbers add ./article.md --in-place
```
