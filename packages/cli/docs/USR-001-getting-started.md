---
title: USR-001 - 安装与快速开始
---

# USR-001: 安装与快速开始

## 安装

```bash
pnpm add -g @cmtx/cli
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

## 依赖

- `@cmtx/core`：Markdown 图片处理与元数据操作
- `@cmtx/asset`：文件操作与对象存储上传
- `@cmtx/rule-engine`：内容变换规则引擎
- `yargs`：命令行参数解析
