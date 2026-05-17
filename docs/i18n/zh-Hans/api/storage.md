---
title: "@cmtx/storage - 存储接口与工具"
category: api
sidebar_order: 5
lang: zh-Hans
package: "@cmtx/storage"
module: core
status: stable
---

# @cmtx/storage - 存储接口与工具

> 对象存储适配器的统一抽象接口、凭证工厂和 URL 检测工具，支持阿里云 OSS 和腾讯云 COS。


::: warning
CMTX 仍处于活跃开发阶段，API 可能随版本迭代发生变化。如有疑问或发现文档错误，欢迎通过 [GitHub Issues](https://github.com/cc01cc/cmtx-project/issues) 反馈。
:::

## 安装

```bash
pnpm add @cmtx/storage
```

## 快速开始

```typescript
import {
  type StorageAdapter,
  type AdapterUploadResult,
  type CloudCredentials,
  type AliyunCredentials,
  type TencentCredentials,
  createCredentials,
} from '@cmtx/storage'

// 创建阿里云 OSS 凭证
const aliyunCreds = createCredentials('aliyun-oss', {
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  bucket: 'my-bucket',
  region: 'oss-cn-hangzhou',
})
console.log(aliyunCreds.provider) // 'aliyun-oss'
```

## 存储适配器接口

### StorageAdapter

所有存储服务适配器必须实现的标准接口。

```ts
interface StorageAdapter {
  upload(localPath: string, remotePath: string): Promise<AdapterUploadResult>
  getSignedUrl?(remotePath: string, expires: number, options?: GetSignedUrlOptions): Promise<string>
  uploadBuffer?(key: string, body: Buffer, options?: UploadBufferOptions): Promise<AdapterUploadResult>
  downloadToFile?(remotePath: string, localPath: string): Promise<void>
  getObjectMeta?(remotePath: string): Promise<ObjectMeta>
  exists?(remotePath: string): Promise<boolean>
  buildUrl?(remotePath: string): string
  delete?(remotePath: string): Promise<void>
  list?(prefix?: string): Promise<ObjectMeta[]>
}
```

| 方法 | 说明 |
|------|------|
| `upload(localPath, remotePath)` | 上传文件到云存储 |
| `getSignedUrl(remotePath, expires, options?)` | 生成预签名 URL |
| `uploadBuffer(key, body, options?)` | 从 Buffer 上传文件 |
| `downloadToFile(remotePath, localPath)` | 下载远程文件到本地 |
| `getObjectMeta(remotePath)` | 获取对象元数据 |
| `exists(remotePath)` | 检查对象是否存在 |
| `buildUrl(remotePath)` | 构建完整的 HTTPS 访问 URL |
| `delete(remotePath)` | 删除远程文件 |
| `list(prefix?)` | 列出指定前缀下的对象 |

::: info
`getSignedUrl`、`uploadBuffer`、`downloadToFile`、`getObjectMeta`、`exists`、`buildUrl`、`delete`、`list` 均为可选方法，具体实现取决于适配器。
:::


### AdapterUploadResult

上传结果类型。

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `name` | `string` | 远程文件名 |
| `url` | `string` | 可访问的 HTTPS URL |

### UploadBufferOptions

Buffer 上传选项。

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `forbidOverwrite?` | `boolean` | 是否禁止覆盖同名文件 |
| `contentType?` | `string` | 内容类型 |
| `metadata?` | `Record<string, string>` | 自定义元数据 |

### ObjectMeta

对象元数据。

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `size` | `number` | 文件大小（字节） |
| `lastModified` | `Date` | 最后修改时间 |
| `contentType?` | `string` | 内容类型 |
| `etag?` | `string` | ETag |

## 凭证工厂

### createCredentials

根据云服务商类型创建凭证，支持从配置对象创建或回退到环境变量。

```ts
function createCredentials(
  provider: CloudProvider,
  config?: CredentialConfig,
): CloudCredentials
```

| 参数 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `provider` | `CloudProvider` | — | 云服务商标识 |
| `config` | `CredentialConfig` | `{}` | 凭证配置（字段会回退到环境变量） |

`CloudProvider`：`'aliyun-oss' | 'tencent-cos' | 'aws-s3'`

`CloudCredentials`：`AliyunCredentials | TencentCredentials`

### CredentialConfig

凭证配置，所有字段可选，工厂函数会回退到环境变量。

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `accessKeyId?` | `string` | 阿里云访问密钥 ID |
| `accessKeySecret?` | `string` | 阿里云访问密钥 Secret |
| `secretId?` | `string` | 腾讯云密钥 ID |
| `secretKey?` | `string` | 腾讯云密钥 Key |
| `region?` | `string` | 区域 |
| `bucket?` | `string` | 存储桶名称 |

```typescript
// 阿里云 OSS - 从配置创建
const aliyun = createCredentials('aliyun-oss', {
  accessKeyId: 'LTAI5t...',
  accessKeySecret: 'xxx',
  bucket: 'my-bucket',
  region: 'oss-cn-hangzhou',
})

// 腾讯云 COS - 从环境变量创建
const tencent = createCredentials('tencent-cos', {})
// 需设置: CMTX_TENCENT_SECRET_ID, CMTX_TENCENT_SECRET_KEY, CMTX_TENCENT_BUCKET
```

#### 环境变量

| 变量 | 说明 |
|------|------|
| `CMTX_ALIYUN_ACCESS_KEY_ID` | 阿里云访问密钥 ID |
| `CMTX_ALIYUN_ACCESS_KEY_SECRET` | 阿里云访问密钥 Secret |
| `CMTX_ALIYUN_BUCKET` | 阿里云存储桶名称 |
| `CMTX_ALIYUN_REGION` | 阿里云区域（默认 `oss-cn-hangzhou`） |
| `CMTX_TENCENT_SECRET_ID` | 腾讯云密钥 ID |
| `CMTX_TENCENT_SECRET_KEY` | 腾讯云密钥 Key |
| `CMTX_TENCENT_BUCKET` | 腾讯云存储桶（格式：`bucketname-appid`） |
| `CMTX_TENCENT_REGION` | 腾讯云区域（默认 `ap-guangzhou`） |

## 存储凭证类型

### AliyunCredentials

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `provider` | `'aliyun-oss'` | 云服务商标识 |
| `accessKeyId` | `string` | 访问密钥 ID |
| `accessKeySecret` | `string` | 访问密钥 Secret |
| `region` | `string` | 区域 |
| `bucket` | `string` | 存储桶名称 |
| `stsToken?` | `string` | STS 临时凭证 |

### TencentCredentials

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `provider` | `'tencent-cos'` | 云服务商标识 |
| `secretId` | `string` | 密钥 ID |
| `secretKey` | `string` | 密钥 Key |
| `region` | `string` | 区域 |
| `bucket` | `string` | 存储桶名称（格式：`bucketname-appid`） |
| `sessionToken?` | `string` | STS 临时凭证 |

### CloudStorageConfig

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `provider` | `CloudProvider` | 云服务商 |
| `bucket` | `string` | 存储桶名称 |
| `region` | `string` | 地域 |
| `storageId?` | `string` | Storage Pool 中的 ID |
| `domain?` | `string` | 自定义域名 |
| `accessKeyId?` | `string` | 访问密钥 ID |
| `accessKeySecret?` | `string` | 访问密钥 Secret |

## URL 检测

### isStorageUrl

判断 URL 是否为云存储 URL（支持自定义域名映射）。

```ts
function isStorageUrl(url: string, options?: StorageUrlDetectOptions): boolean
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `url` | `string` | 要判断的 URL |
| `options?` | `StorageUrlDetectOptions` | 检测选项（支持自定义域名映射） |

```typescript
import { isStorageUrl } from '@cmtx/storage'

isStorageUrl('https://mybucket.oss-cn-hangzhou.aliyuncs.com/image.png') // true
isStorageUrl('https://example.com/image.png') // false

// 自定义域名
isStorageUrl('https://cdn.mycompany.com/image.png', {
  customDomains: ['cdn.mycompany.com'],
  domainProviderMap: { 'cdn.mycompany.com': 'aliyun' },
})
// => true
```

## 参考

- 完整类型定义请查阅 [TypeDoc 生成的参考文档](/cmtx/typedoc/)
- 源码：[GitHub - packages/storage/src](https://github.com/cc01cc/cmtx-project/tree/main/packages/storage/src)
- 适配器实现：[AliyunOSSAdapter](./storage-adapters.md#aliossadapter) | [TencentCOSAdapter](./storage-adapters.md#tencentcosadapter)
