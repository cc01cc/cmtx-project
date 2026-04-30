# scripts 目录

此目录包含项目的公开构建和文档脚本。

## 脚本列表

### generate-docs-index.js

生成文档索引页（docs-index.html），列出所有可用的 API 文档。

### release-changelog.mjs

生成变更日志，用于 Changesets 版本发布流程。

## 快速使用

```bash
pnpm run docs          # 生成所有文档（包括索引）
pnpm run docs:index    # 仅生成文档索引页
```

## 环境变量

在 `scripts/.env` 中配置以下变量（可选）：

| 变量                  | 说明                                   | 默认值                           |
| --------------------- | -------------------------------------- | -------------------------------- |
| `ALIYUN_OSS_PROFILE`  | ossutil profile 名称                   | `cmtx`                           |
| `ALIYUN_OSS_BUCKET`   | OSS bucket 名称                        | `******`                         |
| `ALIYUN_OSS_ENDPOINT` | OSS 端点                               | `oss-cn-hangzhou.aliyuncs.com`   |
| `DOC_SITE_URL`        | 文档访问地址                           | `https://project.cc01cc.cn/cmtx` |

## 安全提示

- `.env` 文件已在 `.gitignore`，**不会被提交到版本控制**
- 不要将 `.env` 提交到 git
