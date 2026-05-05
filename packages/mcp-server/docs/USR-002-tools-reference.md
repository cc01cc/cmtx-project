---
title: USR-002 - 工具参考
---

# USR-002: 工具参考

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

**参数：** 同 scan.analyze，另加存储适配器配置（region、bucket、credentials）。

## upload.run

执行实际上传和引用替换。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| projectRoot | string | 是 | 项目根目录 |
| searchDir | string | 是 | 扫描目录 |
| region | string | 否 | OSS 区域 |
| bucket | string | 否 | OSS bucket 名称 |
| uploadPrefix | string | 否 | 上传路径前缀 |
| namingTemplate | string | 否 | 命名模板（如 `{date}_{md5_8}{ext}`） |

## find.filesReferencingImage

查找引用指定图片的所有 Markdown 文件。

## find.referenceDetails

获取图片引用的详细位置信息（行号、列号、原文）。

## delete.safe

安全删除图片（仅当无 Markdown 文件引用时）。

## delete.force

强制删除图片（需显式确认 `allowHardDelete: true`）。

## transfer.analyze

分析远程图片的转移需求。

## transfer.preview

预览转移操作结果（干运行）。

## transfer.execute

执行远程图片转移。
