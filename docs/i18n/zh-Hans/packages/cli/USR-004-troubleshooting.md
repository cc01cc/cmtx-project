---
title: "故障排除"
category: user-guide
group: "命令行工具"
sidebar_order: 4
lang: zh-Hans
---

# 故障排查

## 常见问题

### 上传失败

检查环境变量是否正确设置（完整变量名见 [CFG-001 配置参考](../../CFG-001-configuration-reference.md#环境变量)）：

```bash
echo $CMTX_ALIYUN_ACCESS_KEY_ID
echo $CMTX_ALIYUN_BUCKET
```

使用 `--verbose` 标志查看详细日志：

```bash
cmtx image upload ./article.md --verbose
```

### 配置文件未找到

```bash
cmtx config init
cmtx image upload ./article.md --config ./cmtx.config.yaml
```

### 分析命令无输出

```bash
cmtx image analyze ./docs --depth 2 --output json
```
