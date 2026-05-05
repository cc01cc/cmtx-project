---
title: USR-004 - 使用教程
---

# USR-004: 使用教程

## 上传图片到阿里云 OSS

```bash
cmtx image upload ./article.md --provider aliyun-oss --prefix blog/images
```

通过环境变量认证（完整变量名见 [CFG-001 配置参考](../../../docs/CFG-001-configuration-reference.md#环境变量)）：

```bash
CMTX_ALIYUN_ACCESS_KEY_ID=your_key \
CMTX_ALIYUN_ACCESS_KEY_SECRET=your_secret \
CMTX_ALIYUN_BUCKET=my-bucket \
cmtx image upload ./article.md --prefix blog/images

```

### presign

```bash
cmtx image presign --url "https://bucket.oss-cn-hangzhou.aliyuncs.com/path/image.png"

cmtx image presign ./article.md --expire 3600
```
