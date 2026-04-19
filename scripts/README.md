# scripts 目录

此目录包含项目的构建和运维脚本。

## 脚本列表

### generate-docs-index.js

生成文档索引页（docs-index.html），列出所有可用的 API 文档。

### upload-docs.js

上传生成的文档到阿里云 OSS。支持通过环境变量配置。

### restic-backup.js

使用 restic 执行工作区备份。支持共享仓库，通过 `PROJECT_TAG` 隔离不同项目。

### restic-restore.js

执行工作区恢复。自动检测工作区状态并恢复最新的项目快照。

## 快速使用

### 1. 生成文档

```bash
pnpm run docs          # 生成所有文档（包括索引）
pnpm run docs:index    # 仅生成文档索引页
```

### 2. 上传文档到 OSS

首先配置 OSS 环境（仅需一次）：

```bash
# 复制配置文件
cp scripts/.env.example scripts/.env

# 编辑配置（ALIYUN_OSS_PROFILE, ALIYUN_OSS_BUCKET 等）
# 注意：.env 已在 .gitignore，不会被提交
vim scripts/.env
```

然后上传：

```bash
pnpm run docs:upload
```

### 3. 工作区备份与恢复 (restic)

这些脚本支持将当前工作区备份到指定的共享 restic 仓库中。

```bash
# 备份
node scripts/restic-backup.js

# 恢复
node scripts/restic-restore.js
```

## 配置说明

### 环境变量

在 `scripts/.env` 中配置以下变量：

| 变量              | 说明                                         | 默认值                           |
| ----------------- | -------------------------------------------- | -------------------------------- |
| `ALIYUN_OSS_PROFILE`     | ossutil profile 名称                         | `cmtx`                           |
| `ALIYUN_OSS_BUCKET`      | OSS bucket 名称                              | `******`                         |
| `ALIYUN_OSS_ENDPOINT`    | OSS 端点                                     | `oss-cn-hangzhou.aliyuncs.com`   |
| `DOC_SITE_URL`    | 文档访问地址                                 | `https://project.cc01cc.cn/cmtx` |
| `BACKUP_PATH`     | 存放 restic 仓库的父目录                     | (无)                             |
| `WORKSPACE_PATH`  | 需要备份的工作区绝对路径                     | (无)                             |
| `RESTIC_PASSWORD`     | restic 仓库密码                              | (无)                             |
| `PROJECT_TAG`         | 项目标识，用于在共享仓库中区分不同项目       | `cmtx-project`                   |
| `RESTIC_INCLUDE_FILE` | 备份包含列表文件路径                         | `scripts/restic.include`         |
| `RESTIC_EXCLUDE_FILE` | 备份排除列表文件路径                         | `scripts/restic.exclude`         |

#### 如何共享仓库

由于使用了 `PROJECT_TAG` 和 `WORKSPACE_PATH` (绝对路径) 的组合，多个不同的项目可以安全地共用同一个 `RESTIC_REPO` (`${BACKUP_PATH}/zeogit-restic`)。每个项目使用唯一的 `PROJECT_TAG` 即可。

#### 包含与排除文件

脚本支持通用的包含与排除配置文件：

- **包含文件 (Include)**: 如果 `RESTIC_INCLUDE_FILE` (默认 `scripts/restic.include`) 存在，脚本将仅备份/恢复文件中列出的路径，而不是整个 `WORKSPACE_PATH`。
- **排除文件 (Exclude)**: 如果 `RESTIC_EXCLUDE_FILE` (默认 `scripts/restic.exclude`) 存在，备份时将自动排除匹配的文件/目录（如 `node_modules`）。

### 前置要求

#### 安装 ossutil

```bash
# macOS
brew install ossutil

# 或从官方下载：https://github.com/aliyun/ossutil
```

#### 配置 ossutil Profile

```bash
# 交互式配置
ossutil config

# 或编辑配置文件 ~/.ossutilconfig
[cmtx_profile]
endpoint = oss-cn-hangzhou.aliyuncs.com
access_id = <your_access_key_id>
access_key = <your_access_key_secret>
```

## 常见问题

**Q: 如何测试 OSS 连接？**

```bash
ossutil ls oss://bucket-name --profile cmtx
```

**Q: 上传失败？**

检查以下几点：

- ossutil 是否已安装：`ossutil --version`
- profile 是否正确配置
- AccessKey 是否有效且拥有 OSS 权限
- bucket 名称是否正确

**Q: 如何只上传单个文档？**

```bash
# 上传索引页(aliyun cli)
aliyun ossutil --profile cmtx cp docs-index.html oss://bucket/cmtx/index.html
# (ossutil)
ossutil --profile cmtx cp docs-index.html oss://bucket/cmtx/index.html

# 上传 core 文档(aliyun cli)
aliyun ossutil --profile cmtx sync packages/core/docs/api oss://bucket/cmtx/core --force
# (ossutil)
ossutil --profile cmtx sync packages/core/docs/api oss://bucket/cmtx/core --force

# 上传 upload 文档(aliyun cli)
aliyun ossutil --profile cmtx sync packages/upload/docs/api oss://bucket/cmtx/upload --force
# (ossutil)
ossutil --profile cmtx sync packages/upload/docs/api oss://bucket/cmtx/upload --force
```

**Q: 如何定制 bucket 或路径？**

编辑 `scripts/.env`，修改相应的环境变量。

## 安全提示

- ✅ `.env` 文件已在 `.gitignore`，**不会被提交到版本控制**
- ✅ AccessKey 等敏感信息存储在 ossutil 配置中或 `.env` 中
- ✅ 每个开发者需独立配置自己的 `.env` 文件
- ⚠️ 不要将 `.env` 提交到 git
