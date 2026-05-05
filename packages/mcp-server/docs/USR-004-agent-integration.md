---
title: USR-004 - Agent 集成
---

# USR-004: Agent 集成

## 为什么需要 MCP Server？

AI Agent 在编写或编辑 Markdown 时面临和人类一样的痛点：

- **上传门槛**：图片需要上传到云存储，但 AI 不应该持有云凭证
- **引用更新**：上传后 Markdown 中的图片引用需要同步更新
- **清理维护**：不再使用的图片需要检测并安全删除
- **预签名 URL**：私有存储桶的图片需要临时访问链接

CMTX MCP 服务器作为**能力代理层（capability delegation layer）**：AI 描述意图（"上传所有本地图片并更新引用"），CMTX 处理凭证和权限操作。

## 自动图片上传

```
User: "Upload all local images in docs/ to cloud storage and update Markdown references"
Agent: Calls upload.run with the configured storage credentials
```

## 图片使用分析

```
User: "Which files reference logo.png?"
Agent: Calls find.filesReferencingImage to get the list
```

## 安全清理

```
User: "Remove all unused images from the assets/ directory"
Agent: Calls scan.analyze to identify unused images, then delete.safe for each
```

## 跨存储转移

```
User: "Transfer all images from Aliyun OSS to Tencent COS"
Agent: Calls transfer tools to move assets between providers
```
