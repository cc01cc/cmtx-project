# CMTX for VS Code 配置指南

## 快速开始

### 1. 环境变量配置

在终端中设置以下环境变量：

```bash
# 阿里云 OSS
export ALIYUN_OSS_ACCESS_KEY_ID="your-access-key-id"
export ALIYUN_OSS_ACCESS_KEY_SECRET="your-access-key-secret"

# 或腾讯云 COS
export TENCENT_COS_SECRET_ID="your-secret-id"
export TENCENT_COS_SECRET_KEY="your-secret-key"
```

**Windows 系统设置方式**：

```powershell
# 临时设置（当前终端）
$env:ALIYUN_OSS_ACCESS_KEY_ID="your-access-key-id"
$env:ALIYUN_OSS_ACCESS_KEY_SECRET="your-access-key-secret"

# 永久设置（用户环境变量）
[Environment]::SetEnvironmentVariable("ALIYUN_OSS_ACCESS_KEY_ID", "your-access-key-id", "User")
[Environment]::SetEnvironmentVariable("ALIYUN_OSS_ACCESS_KEY_SECRET", "your-access-key-secret", "User")
```

### 2. VS Code settings.json 配置

打开 VS Code 设置（`Ctrl+,`）或直接编辑 `settings.json`：

```json
{
  // ========== 上传配置 ==========
  "cmtx.upload.imageFormat": "markdown",
  "cmtx.upload.batchLimit": 5,
  "cmtx.upload.auto": false,
  "cmtx.upload.keepLocalImages": true,
  "cmtx.upload.providerConfig": {
    "provider": "aliyun-oss",
    "bucket": "your-bucket-name",
    "region": "oss-cn-hangzhou",
    "path": "images/",
    "forceHttps": true
  },

  // ========== 图片尺寸调整 ==========
  "cmtx.resize.widths": [360, 480, 640, 800, 960, 1200],
  "cmtx.resize.domains": [
    {
      "domain": "your-bucket.oss-cn-hangzhou.aliyuncs.com",
      "provider": "aliyun-oss"
    }
  ],

  // ========== 预签名 URL ==========
  "cmtx.presignedUrls.expire": 600,
  "cmtx.presignedUrls.providerConfigs": []
}
```

## 配置项详细说明

### cmtx.upload.* 上传配置

| 配置项 | 类型 | 默认值 | 说明 |
| ------ | ---- | ------ | ---- |
| `imageFormat` | string | "markdown" | 上传后的图片格式，可选 `markdown` 或 `html` |
| `batchLimit` | number | 5 | 批量上传时的并发数量限制 |
| `auto` | boolean | false | 是否在粘贴图片后自动上传 |
| `keepLocalImages` | boolean | true | 自动上传后是否保留本地图片 |
| `providerConfig` | object | {} | 云存储提供商配置 |

### cmtx.upload.providerConfig 云存储配置

#### 配置字段完整说明

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `provider` | string | 是 | 云存储提供商：`aliyun-oss`、`tencent-cos`、`aws` |
| `bucket` | string | 是 | 存储桶名称 |
| `region` | string | 是 | 地域 |
| `path` | string | 否 | 存储路径前缀 |
| `domain` | string | 否 | 自定义域名 |
| `forceHttps` | boolean | 否 | 是否强制 HTTPS（默认 true） |
| `accessKeyId` | string | 否 | 访问密钥 ID（优先使用环境变量） |
| `accessKeySecret` | string | 否 | 访问密钥 Secret（优先使用环境变量） |

#### 阿里云 OSS

```json
{
  "provider": "aliyun-oss",
  "bucket": "your-bucket-name",
  "region": "oss-cn-hangzhou",
  "path": "images/",
  "forceHttps": true,
  "accessKeyId": "可选，优先使用环境变量 ALIYUN_OSS_ACCESS_KEY_ID",
  "accessKeySecret": "可选，优先使用环境变量 ALIYUN_OSS_ACCESS_KEY_SECRET"
}
```

**Region 参考**：<https://help.aliyun.com/zh/oss/regions-and-endpoints>

常用 Region：
- `oss-cn-hangzhou` - 杭州
- `oss-cn-shanghai` - 上海
- `oss-cn-beijing` - 北京
- `oss-cn-shenzhen` - 深圳

#### 腾讯云 COS

```json
{
  "provider": "tencent-cos",
  "bucket": "your-bucket-appid",
  "region": "ap-guangzhou",
  "path": "images/",
  "accessKeyId": "对应腾讯云 secretId，优先使用环境变量 TENCENT_COS_SECRET_ID",
  "accessKeySecret": "对应腾讯云 secretKey，优先使用环境变量 TENCENT_COS_SECRET_KEY"
}
```

**注意**：腾讯云 COS 的 bucket 名称必须包含 appid，格式为 `bucket-appid`。

#### 凭证配置方式

**方式一：环境变量（推荐）**

```bash
# 阿里云 OSS
export ALIYUN_OSS_ACCESS_KEY_ID="your-access-key-id"
export ALIYUN_OSS_ACCESS_KEY_SECRET="your-access-key-secret"

# 腾讯云 COS
export TENCENT_COS_SECRET_ID="your-secret-id"
export TENCENT_COS_SECRET_KEY="your-secret-key"
```

**方式二：配置文件**

直接在 `providerConfig` 中配置凭证（不推荐，有安全风险）：

```json
{
  "cmtx.upload.providerConfig": {
    "provider": "aliyun-oss",
    "bucket": "your-bucket",
    "region": "oss-cn-hangzhou",
    "accessKeyId": "your-access-key-id",
    "accessKeySecret": "your-access-key-secret"
  }
}
```

**凭证优先级**：配置文件字段 > 环境变量

#### 腾讯云凭证字段映射

由于扩展配置统一使用 `accessKeyId/accessKeySecret` 字段名，腾讯云配置时这两个字段分别对应 `secretId/secretKey`：

| 腾讯云官方字段名 | 扩展配置字段名 | 说明 |
| --------------- | -------------- | ---- |
| `secretId` | `accessKeyId` | 密钥 ID |
| `secretKey` | `accessKeySecret` | 密钥 Key |

### cmtx.resize.* 图片尺寸调整

| 配置项 | 类型 | 默认值 | 说明 |
| ------ | ---- | ------ | ---- |
| `widths` | number[] | [360, 480, 640, 800, 960, 1200] | 预设宽度列表（像素） |
| `domains` | array | [] | 域名配置，用于确定使用哪种缩放方式 |

**domains 配置说明**：

| provider | 缩放方式 |
| -------- | -------- |
| `aliyun-oss` | 使用 OSS 图片处理参数 `x-oss-process=image/resize,w_800` |
| `tencent-cos` | 使用 COS 图片处理参数 |
| `html` | 使用 HTML `width` 属性 |

**示例**：

```json
{
  "cmtx.resize.domains": [
    {
      "domain": "cdn.example.com",
      "provider": "aliyun-oss"
    },
    {
      "domain": "another-bucket.oss-cn-shanghai.aliyuncs.com",
      "provider": "aliyun-oss"
    }
  ]
}
```

### cmtx.presignedUrls.* 预签名 URL 配置

用于在 Markdown 预览中显示私有云存储图片。当图片存储在私有 Bucket 时，预览无法直接访问，需要生成临时预签名 URL。

| 配置项 | 类型 | 默认值 | 说明 |
| ------ | ---- | ------ | ---- |
| `expire` | number | 600 | 预签名 URL 过期时间（秒） |
| `maxRetryCount` | number | 3 | 签名失败时的最大重试次数 |
| `providerConfigs` | CloudStorageConfig[] | [] | 云存储提供商配置列表 |

#### providerConfigs 配置结构

与 `cmtx.upload.providerConfig` 结构相同，支持配置多个提供商：

```json
{
  "cmtx.presignedUrls.expire": 600,
  "cmtx.presignedUrls.providerConfigs": [
    {
      "provider": "aliyun-oss",
      "bucket": "private-bucket",
      "region": "oss-cn-hangzhou",
      "domain": "cdn.example.com"
    }
  ]
}
```

#### 配置字段说明

| 字段 | 必填 | 说明 |
| ---- | ---- | ---- |
| `provider` | 是 | 云存储提供商：`aliyun-oss`、`tencent-cos`、`aws` |
| `bucket` | 是 | 存储桶名称 |
| `region` | 是 | 地域 |
| `domain` | 否 | 自定义域名或默认域名，用于匹配文档中的图片 URL |
| `accessKeyId` | 否 | 访问密钥 ID，优先使用环境变量 |
| `accessKeySecret` | 否 | 访问密钥 Secret，优先使用环境变量 |

#### 使用场景

1. **私有 Bucket 图片预览**：文档中的图片存储在私有 Bucket，预览时自动生成临时签名 URL
2. **多域名支持**：配置多个提供商，支持不同来源的图片

#### 多提供商配置示例

同时支持阿里云和腾讯云的预签名 URL：

```json
{
  "cmtx.presignedUrls.expire": 600,
  "cmtx.presignedUrls.providerConfigs": [
    {
      "provider": "aliyun-oss",
      "bucket": "my-aliyun-bucket",
      "region": "oss-cn-hangzhou",
      "domain": "aliyun-cdn.example.com"
    },
    {
      "provider": "tencent-cos",
      "bucket": "my-tencent-bucket-1250000000",
      "region": "ap-guangzhou",
      "domain": "tencent-cdn.example.com"
    }
  ]
}
```

**对应的环境变量配置**：

```bash
# 阿里云凭证
export ALIYUN_OSS_ACCESS_KEY_ID="your-aliyun-key-id"
export ALIYUN_OSS_ACCESS_KEY_SECRET="your-aliyun-key-secret"

# 腾讯云凭证
export TENCENT_COS_SECRET_ID="your-tencent-secret-id"
export TENCENT_COS_SECRET_KEY="your-tencent-secret-key"
```

#### 注意事项

- 凭证优先使用环境变量，避免在配置文件中暴露密钥
- `domain` 字段用于匹配文档中的图片 URL，必须与实际图片 URL 的域名一致
- 如果使用自定义域名，需要在此配置中指定

## 存储路径配置

`cmtx.upload.providerConfig.path` 允许指定图片上传到 OSS 的目录路径：

```json
{
  "cmtx.upload.providerConfig": {
    "path": "images/2024/"
  }
}
```

- 路径格式：`images/`、`blog/2024/`、`uploads/markdown/`
- 自动规范化：移除开头和结尾的斜杠，并在路径后添加斜杠
- 留空则上传到 Bucket 根目录

## 费用说明

使用云存储服务会产生费用，请参考官方文档：

- 阿里云 OSS API 操作调用费用：<https://help.aliyun.com/zh/oss/api-operation-calling-fees>
- 阿里云 OSS 数据处理费用：<https://help.aliyun.com/zh/oss/data-processing-fees>
- 腾讯云 COS 计费概述：<https://cloud.tencent.com/document/product/436/16871>

费用根据实际使用量计算，包括：
- 存储：按存储容量计费
- 流量：按外网流出流量计费
- 请求次数：按 API 调用次数计费
- 图片处理：按处理次数计费

## 常见问题

### 环境变量未生效

1. 检查环境变量是否正确设置
2. 重启 VS Code 使环境变量生效
3. 在 VS Code 终端中验证：`echo $ALIYUN_OSS_ACCESS_KEY_ID`

### 预签名 URL 生成失败

1. 确认环境变量配置正确
2. 确认 Bucket 和 Region 与配置匹配
3. 确认域名在 `providerConfigs[*].domain` 中

### 图片上传失败

1. 检查 Bucket 权限配置
2. 检查 AccessKey 是否有效
3. 检查网络连接和 Region 设置

## 环境变量参考

所有支持的环境变量：

| 环境变量 | 说明 | 用于 |
| -------- | ---- | ---- |
| `ALIYUN_OSS_ACCESS_KEY_ID` | 阿里云 AccessKey ID | 上传、预签名 URL |
| `ALIYUN_OSS_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret | 上传、预签名 URL |
| `TENCENT_COS_SECRET_ID` | 腾讯云 Secret ID | 上传、预签名 URL |
| `TENCENT_COS_SECRET_KEY` | 腾讯云 Secret Key | 上传、预签名 URL |

**设置方式**：

```bash
# Linux/macOS - 添加到 ~/.bashrc 或 ~/.zshrc
export ALIYUN_OSS_ACCESS_KEY_ID="your-access-key-id"
export ALIYUN_OSS_ACCESS_KEY_SECRET="your-access-key-secret"

# Windows PowerShell - 用户环境变量
[Environment]::SetEnvironmentVariable("ALIYUN_OSS_ACCESS_KEY_ID", "your-access-key-id", "User")
[Environment]::SetEnvironmentVariable("ALIYUN_OSS_ACCESS_KEY_SECRET", "your-access-key-secret", "User")
```

**注意**：设置环境变量后需要重启 VS Code 才能生效。

## 相关链接

- OSS 管理控制台：<https://oss.console.aliyun.com/bucket>
- OSS Node.js SDK：<https://help.aliyun.com/zh/oss/developer-reference/node-js-1>
- OSS 预签名 URL：<https://help.aliyun.com/zh/oss/developer-reference/presigned-url-1>
- OSS 自定义域名：<https://help.aliyun.com/zh/oss/access-buckets-via-custom-domain-names>