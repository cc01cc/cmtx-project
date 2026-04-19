# @cmtx/upload 示例

本目录包含 @cmtx/upload 的使用示例，展示了基于 template 的现代化 API。

## 🚀 新特性

- **ConfigBuilder API**: 流畅的配置构建器模式
- **Template 系统**: 使用 `{variable}` 语法的模板替换
- **字段分离**: 独立控制 src/alt/title 字段的替换
- **条件替换**: 基于内容的智能替换逻辑
- **上下文变量**: 支持自定义上下文数据

## 示例列表

1. **01-basic-upload.ts** - 基础上传功能示例
2. **02-field-templates.ts** - 字段模板配置示例
3. **03-aliyun-oss.ts** - 阿里云 OSS 集成示例

## 运行示例

首先安装依赖：

```bash
pnpm install
```

生成本地 demo 数据（包含占位图片与 Markdown）：

```bash
pnpm exec tsx examples/scripts/gen-demo-data.ts
```

然后运行任意示例：

```bash
# 使用 tsx 运行 TypeScript（推荐）
pnpm exec tsx examples/01-basic-upload.ts
pnpm exec tsx examples/02-field-templates.ts
pnpm exec tsx examples/03-aliyun-oss.ts
```

## 🆕 现代化 API 示例

### 基础配置
```typescript
import { ConfigBuilder } from '@cmtx/upload';

const config = new ConfigBuilder()
    .storage(adapter, {
        prefix: 'blog/images/',
        namingPattern: '{date}_{md5_8}{ext}'
    })
    .fieldTemplates({
        src: '{cloudSrc}?quality=80',
        alt: '{originalValue} - 来自我的博客'
    })
    .build();
```

### 高级配置
```typescript
const advancedConfig = new ConfigBuilder()
    .storage(adapter)
    .replace({
        fields: {
            alt: {
                template: '{originalValue} [新版]',
                condition: { includes: '待更新' }
            }
        },
        context: { 
            author: '张三', 
            site: 'myblog.com' 
        }
    })
    .build();
```

## 特性展示

### 模板系统
支持丰富的变量替换：
- `{cloudSrc}` - 上传后的云端 URL
- `{originalValue}` - 原始字段值
- `{name}`, `{ext}`, `{date}` - 文件信息
- 自定义上下文变量

### 条件替换
```typescript
{
    template: '{originalValue} [新版]',
    condition: { 
        includes: '待更新',
        // 或者使用: equals, match (正则)
    }
}
```

### 字段分离
独立控制不同字段的替换逻辑：
- `src`: 图片源地址
- `alt`: 替代文本
- `title`: 标题属性

## 注意事项

- 所有示例都已更新为使用新的 template API
- 示例 1-3 和 5 使用模拟适配器，不会实际上传到云存储
- 示例 4 需要配置真实的阿里云 OSS 凭证
- 新增的综合演示展示了所有主要功能

## 阿里云 OSS 配置

**4-with-ali-oss.ts** 需要配置阿里云 OSS 凭证。

### 方式 1：使用 .env 文件（推荐）

```bash
# 复制环境变量模板
cp examples/.env.example examples/.env

# 编辑 .env 填入真实凭证
# ALIYUN_OSS_REGION=oss-cn-hangzhou
# ALIYUN_OSS_ACCESS_KEY_ID=your-key
# ALIYUN_OSS_ACCESS_KEY_SECRET=your-secret
# ALIYUN_OSS_BUCKET=your-bucket
```

### 方式 2：手动设置环境变量

```bash
# PowerShell
$env:ALIYUN_OSS_REGION="oss-cn-hangzhou"
$env:ALIYUN_OSS_ACCESS_KEY_ID="your-key"
$env:ALIYUN_OSS_ACCESS_KEY_SECRET="your-secret"
$env:ALIYUN_OSS_BUCKET="your-bucket"
pnpm exec tsx examples/4-with-ali-oss.ts

# Bash
export ALIYUN_OSS_REGION=oss-cn-hangzhou
export ALIYUN_OSS_ACCESS_KEY_ID=your-key
export ALIYUN_OSS_ACCESS_KEY_SECRET=your-secret
export ALIYUN_OSS_BUCKET=your-bucket
pnpm exec tsx examples/4-with-ali-oss.ts
```

## 测试环境配置

项目提供了一个测试用的 OSS 环境，使用 ossutil 进行文档同步。

### ossutil 配置

#### 1. 安装 ossutil

```bash
# macOS/Linux
curl -o /usr/local/bin/ossutil http://gosspublic.alicdn.com/ossutil/1.7.16/ossutil64
chmod 755 /usr/local/bin/ossutil

# Windows
# 下载 ossutil64.exe 并添加到 PATH
# https://gosspublic.alicdn.com/ossutil/1.7.16/ossutil64.exe
```

#### 2. 配置 ossutil

使用 `ossutil config` 命令进行交互式配置：

```bash
ossutil config
```

按照提示输入：

- Endpoint: `oss-cn-beijing.aliyuncs.com`
- AccessKeyID: 你的 AccessKey ID
- AccessKeySecret: 你的 AccessKey Secret
- STSToken: 直接回车跳过

#### 3. 配置多环境 profile（推荐）

创建或编辑 `~/.ossutilconfig` 文件，配置多个环境：

```ini
[Credentials]
language=CH

# 默认配置（生产环境）
[default]
endpoint=oss-cn-hangzhou.aliyuncs.com
accessKeyID=your-prod-access-key-id
accessKeySecret=your-prod-access-key-secret

# 测试环境配置
[profile-test]
endpoint=oss-cn-beijing.aliyuncs.com
accessKeyID=your-test-access-key-id
accessKeySecret=your-test-access-key-secret

# 开发环境配置
[profile-dev]
endpoint=oss-cn-shanghai.aliyuncs.com
accessKeyID=your-dev-access-key-id
accessKeySecret=your-dev-access-key-secret
```

> 💡 **配置示例**: 查看 [`ossutil-config-example.ini`](./ossutil-config-example.ini) 获取完整的配置文件示例

#### 4. 使用不同 profile 的命令示例

```bash
# 使用测试环境 profile
ossutil --profile test ls oss://your-test-bucket

# 使用开发环境 profile  
ossutil --profile dev cp local-file.txt oss://your-dev-bucket/

# 使用默认（生产）环境
ossutil ls oss://your-prod-bucket
```

#### 5. 文档同步命令示例

```bash
# 同步 upload 文档到测试环境
ossutil --profile test sync packages/upload/docs/api oss://zeotmp/cmtx/upload --force --delete

# 同步 core 文档到测试环境
ossutil --profile test sync packages/core/docs/api oss://zeotmp/cmtx/core --force --delete

# 同步到生产环境（使用默认profile）
ossutil sync packages/upload/docs/api oss://production-bucket/cmtx/upload --force --delete
```

### 阿里云 CLI 用户说明

如果你使用的是阿里云 CLI（aliyun ossutil），命令格式略有不同：

```bash
# 使用阿里云 CLI 的 ossutil 命令
aliyun ossutil --profile test sync packages/upload/docs/api oss://zeotmp/cmtx/upload --force --delete
aliyun ossutil --profile test sync packages/core/docs/api oss://zeotmp/cmtx/core --force --delete
```

### 常用命令参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `--profile` | 指定使用的配置profile | `--profile test` |
| `--force` | 强制覆盖已存在的文件 | `--force` |
| `--delete` | 删除目标位置不存在于源位置的文件 | `--delete` |
| `-r` 或 `--recursive` | 递归处理目录 | `-r` |
| `--exclude` | 排除特定文件模式 | `--exclude "*.tmp"` |
| `--include` | 包含特定文件模式 | `--include "*.md"` |

### 文档上传脚本

项目提供了文档上传脚本，支持多环境和更多功能：

```bash
# 查看帮助信息
node scripts/upload-docs.js --help

# 上传文档到测试环境
node scripts/upload-docs.js test

# 上传文档到开发环境
node scripts/upload-docs.js dev

# 预览模式（不实际上传）
node scripts/upload-docs.js test --dry-run

# 详细输出模式
node scripts/upload-docs.js test --verbose
```

该脚本会：

1. 生成文档索引页面
2. 上传索引页面到 OSS
3. 同步 core 文档
4. 同步 upload 文档

### 环境切换最佳实践

1. **开发阶段**：使用 `profile-dev` 进行功能测试
2. **测试阶段**：使用 `profile-test` 进行集成测试
3. **生产部署**：使用 `default` profile 或 `profile-prod`

这样可以确保不同环境的数据隔离，避免误操作影响生产环境。

### 故障排除

如果遇到权限问题，请检查：

1. AccessKey 是否正确配置
2. 对应Bucket是否有读写权限
3. Endpoint是否与Bucket所在地域匹配
4. 网络连接是否正常
