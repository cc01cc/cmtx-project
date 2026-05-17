---
title: "@cmtx/storage - 适配器实现"
category: api
sidebar_order: 6
lang: zh-Hans
package: "@cmtx/storage"
module: adapters
status: stable
---

# @cmtx/storage - 适配器实现

> [StorageAdapter](./storage.md#storageadapter) 接口的具体实现，包括阿里云 OSS 和腾讯云 COS 适配器，以及工厂函数。


::: warning
CMTX 仍处于活跃开发阶段，API 可能随版本迭代发生变化。如有疑问或发现文档错误，欢迎通过 [GitHub Issues](https://github.com/cc01cc/cmtx-project/issues) 反馈。
:::

## 安装

```bash
pnpm add @cmtx/storage
```

额外安装云服务 SDK：

```bash
# 阿里云 OSS（可选）
pnpm add ali-oss

# 腾讯云 COS（可选）
pnpm add cos-nodejs-sdk-v5
```

## 快速开始

```typescript
import { AliyunOSSAdapter } from '@cmtx/storage/adapters/ali-oss'
import { TencentCOSAdapter } from '@cmtx/storage/adapters/tencent-cos'
import { createAdapter } from '@cmtx/storage/adapters/factory'
import OSS from 'ali-oss'
import COS from 'cos-nodejs-sdk-v5'

// 阿里云 OSS
const ossClient = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: 'your-key',
  accessKeySecret: 'your-secret',
  bucket: 'your-bucket',
})
const ossAdapter = new AliyunOSSAdapter(ossClient)
ossAdapter.upload('/local/image.png', 'remote/image.png')
  .then(result => console.log(result.url))

// 腾讯云 COS
const cosClient = new COS({
  SecretId: 'your-secret-id',
  SecretKey: 'your-secret-key',
})
const cosAdapter = new TencentCOSAdapter(cosClient, {
  Bucket: 'my-bucket-1250000000',
  Region: 'ap-guangzhou',
})

// 工厂函数自动创建
const adapter = await createAdapter({
  provider: 'aliyun-oss',
  accessKeyId: 'your-key',
  accessKeySecret: 'your-secret',
  region: 'oss-cn-hangzhou',
  bucket: 'your-bucket',
})
```

## 阿里云 OSS 适配器

### AliyunOSSAdapter

阿里云 OSS 存储适配器，封装 `ali-oss` SDK，实现 [StorageAdapter](./storage.md#storageadapter) 接口。

```ts
class AliyunOSSAdapter implements StorageAdapter {
  constructor(client: AliyunOSSClient)
  upload(localPath: string, remotePath: string): Promise<AdapterUploadResult>
  getSignedUrl(remotePath: string, expires: number, options?: GetSignedUrlOptions): Promise<string>
  uploadBuffer(key: string, body: Buffer, options?: UploadBufferOptions): Promise<AdapterUploadResult>
  downloadToFile(remotePath: string, localPath: string): Promise<void>
  getObjectMeta(remotePath: string): Promise<ObjectMeta>
  exists(remotePath: string): Promise<boolean>
  buildUrl(remotePath: string): string
  delete(remotePath: string): Promise<void>
}
```

| 方法 | 参数 | 返回值 | 说明 |
|:------|:------|:--------|:------|
| `upload` | `localPath: string, remotePath: string` | `Promise<AdapterUploadResult>` | 上传文件到 OSS |
| `getSignedUrl` | `remotePath: string, expires: number, options?` | `Promise<string>` | 生成预签名 URL |
| `uploadBuffer` | `key: string, body: Buffer, options?` | `Promise<AdapterUploadResult>` | 从 Buffer 上传 |
| `downloadToFile` | `remotePath: string, localPath: string` | `Promise<void>` | 下载到本地文件 |
| `getObjectMeta` | `remotePath: string` | `Promise<ObjectMeta>` | 获取对象元数据 |
| `exists` | `remotePath: string` | `Promise<boolean>` | 检查对象是否存在 |
| `buildUrl` | `remotePath: string` | `string` | 构建 HTTPS URL |
| `delete` | `remotePath: string` | `Promise<void>` | 删除远程文件 |

```typescript
import OSS from 'ali-oss'
import { AliyunOSSAdapter } from '@cmtx/storage/adapters/ali-oss'

const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET!,
  bucket: 'my-bucket',
})

const adapter = new AliyunOSSAdapter(client)

// 上传文件
const result = await adapter.upload('/path/to/image.png', 'images/image.png')
console.log(result.url)
// => 'https://my-bucket.oss-cn-hangzhou.aliyuncs.com/images/image.png'

// 预签名 URL（1 小时过期）
const signedUrl = await adapter.getSignedUrl('images/image.png', 3600)

// 浏览器预览模式
const previewUrl = await adapter.getSignedUrl('images/image.png', 3600, {
  disposition: 'inline',
})

// Buffer 上传
const buffer = Buffer.from('...')
const bufResult = await adapter.uploadBuffer('images/photo.png', buffer, {
  forbidOverwrite: true,
  contentType: 'image/png',
})

// 获取元数据
const meta = await adapter.getObjectMeta('images/image.png')
console.log(meta.size, meta.lastModified)
```

### AliyunOSSClient

阿里云 OSS 客户端类型。

```ts
type AliyunOSSClient = OSS
```

## 腾讯云 COS 适配器

### TencentCOSAdapter

腾讯云 COS 存储适配器，封装 `cos-nodejs-sdk-v5` SDK，实现 [StorageAdapter](./storage.md#storageadapter) 接口。

```ts
class TencentCOSAdapter implements StorageAdapter {
  constructor(client: CosClient, config: TencentCOSAdapterConfig)
  upload(localPath: string, remotePath: string): Promise<AdapterUploadResult>
  getSignedUrl(remotePath: string, expires: number, options?: GetSignedUrlOptions): Promise<string>
  uploadBuffer(key: string, body: Buffer, options?: UploadBufferOptions): Promise<AdapterUploadResult>
  downloadToFile(remotePath: string, localPath: string): Promise<void>
  getObjectMeta(remotePath: string): Promise<ObjectMeta>
  exists(remotePath: string): Promise<boolean>
  buildUrl(key: string): string
  delete(remotePath: string): Promise<void>
}
```

### TencentCOSAdapterConfig

腾讯云 COS 适配器配置。

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `bucket` | `string` | 存储桶名称（格式：`bucketname-appid`） |
| `region` | `string` | 地域（如 `ap-guangzhou`） |

```typescript
import COS from 'cos-nodejs-sdk-v5'
import { TencentCOSAdapter } from '@cmtx/storage/adapters/tencent-cos'

const cos = new COS({
  SecretId: process.env.TENCENT_SECRET_ID!,
  SecretKey: process.env.TENCENT_SECRET_KEY!,
})

const adapter = new TencentCOSAdapter(cos, {
  Bucket: 'my-bucket-1250000000',
  Region: 'ap-guangzhou',
})

// 上传文件
const result = await adapter.upload('/path/to/image.png', 'images/image.png')
console.log(result.url)
// => 'https://my-bucket-1250000000.cos.ap-guangzhou.myqcloud.com/images/image.png'

// 预签名 URL
const signedUrl = await adapter.getSignedUrl('images/image.png', 3600)

// Buffer 上传
const buffer = Buffer.from('...')
const bufResult = await adapter.uploadBuffer('images/photo.png', buffer, {
  contentType: 'image/png',
})

// 下载到本地
await adapter.downloadToFile('images/image.png', '/tmp/image.png')

// 获取元数据
const meta = await adapter.getObjectMeta('images/image.png')
console.log(meta.size, meta.lastModified)
```

## 工厂函数

### createAdapter

根据凭证配置自动创建对应的存储适配器实例。

```ts
async function createAdapter(
  credentials: CloudCredentials,
): Promise<StorageAdapter>
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `credentials` | `CloudCredentials` | 云服务凭证配置 |

::: tip
工厂函数会自动初始化云服务 SDK 客户端，无需手动创建 `OSS` 或 `COS` 实例。
:::


```typescript
import { createAdapter } from '@cmtx/storage/adapters/factory'

// 阿里云 OSS
const ossAdapter = await createAdapter({
  provider: 'aliyun-oss',
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
  region: 'oss-cn-hangzhou',
  bucket: 'my-bucket',
})

// 腾讯云 COS
const cosAdapter = await createAdapter({
  provider: 'tencent-cos',
  secretId: process.env.TENCENT_SECRET_ID!,
  secretKey: process.env.TENCENT_SECRET_KEY!,
  region: 'ap-guangzhou',
  bucket: 'my-bucket-1250000000',
})
```

#### 错误处理

当传入不支持的 `provider` 时抛出错误：

```typescript
try {
  const adapter = await createAdapter({ provider: 'aws-s3' } as any)
} catch (error) {
  console.error(error.message)
  // 'Unsupported storage provider: aws-s3. Supported providers: aliyun-oss, tencent-cos'
}
```

## 参考

- 完整类型定义请查阅 [TypeDoc 生成的参考文档](/cmtx/typedoc/)
- 源码：[GitHub - packages/storage/src/adapters](https://github.com/cc01cc/cmtx-project/tree/main/packages/storage/src/adapters)
- 核心接口：[StorageAdapter](./storage.md#storageadapter)
