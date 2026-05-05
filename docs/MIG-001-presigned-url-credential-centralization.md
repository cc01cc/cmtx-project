---
title: MIG-001 - presignedUrls 凭证配置迁移指南
---

# MIG-001: presignedUrls 凭证配置迁移指南

## 背景

`@cmtx/asset` v2.0 起，`presignedUrls.domains[]` 移除了内联凭证字段（`provider`、`bucket`、`region`、`accessKeyId`、`accessKeySecret`）。所有凭证必须通过 `useStorage` 引用 storages 池。

## 迁移步骤

### 旧配置（v1.x）

```yaml
presignedUrls:
  domains:
    - domain: img.example.com
      provider: aliyun-oss
      bucket: my-bucket
      region: oss-cn-hangzhou
      accessKeyId: "${CMTX_ALIYUN_ACCESS_KEY_ID}"
      accessKeySecret: "${CMTX_ALIYUN_ACCESS_KEY_SECRET}"
```

### 新配置（v2.0）

1. 将凭证信息移入 storages 池（如已有则跳过）：

```yaml
storages:
  default:
    adapter: aliyun-oss
    config:
      region: oss-cn-hangzhou
      bucket: "${CMTX_ALIYUN_BUCKET}"
      accessKeyId: "${CMTX_ALIYUN_ACCESS_KEY_ID}"
      accessKeySecret: "${CMTX_ALIYUN_ACCESS_KEY_SECRET}"
```

2. Domain 改为引用 `useStorage`：

```yaml
presignedUrls:
  domains:
    - domain: img.example.com
      useStorage: default     # 引用 storages 池中的配置
      path: images/           # URL 路径前缀（可选）
```

## 多 domain 共享同一 storage

多个 domain 可引用同一个 storage ID：

```yaml
presignedUrls:
  domains:
    - domain: cdn.example.com
      useStorage: default
    - domain: img.example.com
      useStorage: default
```

## 不同 domain 使用不同 storage

```yaml
storages:
  aliyun:
    adapter: aliyun-oss
    config:
      region: oss-cn-hangzhou
      bucket: "${CMTX_ALIYUN_BUCKET}"
      accessKeyId: "${CMTX_ALIYUN_ACCESS_KEY_ID}"
      accessKeySecret: "${CMTX_ALIYUN_ACCESS_KEY_SECRET}"
  tencent:
    adapter: tencent-cos
    config:
      region: ap-guangzhou
      bucket: "${CMTX_TENCENT_BUCKET}"
      secretId: "${CMTX_TENCENT_SECRET_ID}"
      secretKey: "${CMTX_TENCENT_SECRET_KEY}"

presignedUrls:
  domains:
    - domain: aliyun-cdn.example.com
      useStorage: aliyun
    - domain: tencent-cdn.example.com
      useStorage: tencent
```
