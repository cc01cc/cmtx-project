---
title: "工具参考"
category: user-guide
group: "AI Agent（MCP）"
sidebar_order: 11
lang: zh-Hans
---

# 工具参考

> 本文档面向 MCP Server 的终端用户：AI Agent。请向 Agent 提供此文档或直接让其阅读。

## scan.analyze

扫描目录中的本地图片，分析其在 Markdown 文件中的引用情况。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| projectRoot | string | 是 | 项目根目录（路径安全限制） |
| searchDir | string | 是 | 扫描目录 |

**返回：** 图片列表（含引用计数）、跳过文件、总计统计。

## upload.preview

预览上传操作结果（干运行），不实际修改文件。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| projectRoot | string | 是 | 项目根目录 |
| searchDir | string | 是 | 扫描目录 |
| provider | string | 否 | 云存储提供商（aliyun-oss \| tencent-cos） |
| region | string | 否 | 存储区域 |
| bucket | string | 否 | 存储桶名称 |
| accessKeyId | string | 否 | Access Key ID |
| accessKeySecret | string | 否 | Access Key Secret |
| secretId | string | 否 | Secret ID（腾讯云） |
| secretKey | string | 否 | Secret Key（腾讯云） |

## upload.run

执行实际上传和引用替换。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| projectRoot | string | 是 | 项目根目录 |
| searchDir | string | 是 | 扫描目录 |
| provider | string | 否 | 云存储提供商 |
| region | string | 否 | OSS 区域 |
| bucket | string | 否 | OSS bucket 名称 |
| accessKeyId | string | 否 | Access Key ID |
| accessKeySecret | string | 否 | Access Key Secret |
| secretId | string | 否 | Secret ID（腾讯云） |
| secretKey | string | 否 | Secret Key（腾讯云） |
| uploadPrefix | string | 否 | 上传路径前缀 |
| namingTemplate | string | 否 | 命名模板（如 `{date}_{md5_8}{ext}`） |

## find.filesReferencingImage

查找引用指定图片的所有 Markdown 文件。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| imagePath | string | 是 | 图片路径 |
| searchDir | string | 是 | 搜索目录 |

## find.referenceDetails

获取图片引用的详细位置信息（行号、列号、原文）。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| imagePath | string | 是 | 图片路径 |
| searchDir | string | 是 | 搜索目录 |

## delete.image

删除图片（支持引用检查）。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| imagePath | string | 是 | 图片路径 |
| searchDir | string | 否 | 搜索目录（默认当前工作目录） |
| force | boolean | 否 | 强制删除（跳过引用检查） |

## cleanup.images

清理目录中未被 Markdown 引用的图片。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| searchDir | string | 否 | 搜索目录（默认当前工作目录） |
| strategy | string | 否 | 删除策略（trash \| move \| hard-delete，默认 trash） |

## transfer.analyze

分析远程图片的转移需求。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| filePath | string | 是 | Markdown 文件路径 |
| sourceDomain | string | 否 | 源存储域名 |

## transfer.preview

预览转移操作结果（干运行）。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| filePath | string | 是 | Markdown 文件路径 |
| sourceDomain | string | 否 | 源存储域名 |
| targetDomain | string | 否 | 目标存储域名 |
| prefix | string | 否 | 目标路径前缀 |

## transfer.execute

执行远程图片转移。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| filePath | string | 是 | Markdown 文件路径 |
| provider | string | 否 | 云存储提供商 |
| sourceAccessKeyId | string | 否 | 源 Access Key ID |
| sourceAccessKeySecret | string | 否 | 源 Access Key Secret |
| sourceRegion | string | 否 | 源存储区域 |
| sourceBucket | string | 否 | 源存储桶 |
| targetAccessKeyId | string | 否 | 目标 Access Key ID |
| targetAccessKeySecret | string | 否 | 目标 Access Key Secret |
| targetRegion | string | 否 | 目标存储区域 |
| targetBucket | string | 否 | 目标存储桶 |
| sourceDomain | string | 否 | 源存储域名 |
| targetDomain | string | 否 | 目标存储域名 |
| prefix | string | 否 | 目标路径前缀 |
| overwrite | boolean | 否 | 是否覆盖已存在文件 |
| concurrency | number | 否 | 并发数（默认 5） |
