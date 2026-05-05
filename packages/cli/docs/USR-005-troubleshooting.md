---
title: USR-005 - 故障排查
---

# USR-005: 故障排查

## 常见问题

### 上传失败

检查环境变量是否正确设置（完整变量名见 [CFG-001 配置参考](../../../docs/CFG-001-configuration-reference.md#环境变量)）：

```bash
echo $CMTX_ALIYUN_ACCESS_KEY_ID
echo $CMTX_ALIYUN_BUCKET
```

使用 `--verbose` 标志查看详细日志：

```bash
cmtx image upload ./article.md --verbose

cmtx image analyze ./docs --depth 2 --output json
```
