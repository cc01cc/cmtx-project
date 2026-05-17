---
title: "@cmtx/asset - 服务层"
category: api
sidebar_order: 21
lang: zh-Hans
package: "@cmtx/asset"
module: services
status: stable
---

# @cmtx/asset - 服务层

> Markdown 图片资产管理的核心服务层，提供上传、下载、跨存储转移和删除的功能编排。


::: warning
CMTX 仍处于活跃开发阶段，API 可能随版本迭代发生变化。如有疑问或发现文档错误，欢迎通过 [GitHub Issues](https://github.com/cc01cc/cmtx-project/issues) 反馈。
:::

## 安装

```bash
pnpm add @cmtx/asset
```

## 快速开始

```typescript
import {
  UploadService,
  DownloadService,
  TransferService,
  DeleteService,
} from '@cmtx/asset'

// UploadService — 单存储上传
const uploader = new UploadService({
  adapter: ossAdapter,
  namingTemplate: '{date}/{name}{ext}',
})
const result = await uploader.uploadImagesInDocument(markdown, '/path/to/article.md')

// DownloadService — 多存储下载
const downloader = createDownloadService({
  sourceAdapters: [{ domain: 'cdn.example.com', adapter: ossAdapter }],
  namingTemplate: '{date}/{originalName}{ext}',
})
const downloadResult = await downloader.downloadImages(markdown, './images/')

// TransferService — 跨存储转移
const transfer = createTransferService({
  sourceAdapters: [{ domain: 'old-cdn.example.com', adapter: ossAdapter }],
  targetAdapter: cosAdapter,
  namingTemplate: '{name}_{md5_8}{ext}',
})
const transferResult = await transfer.transferImages(markdown, '/path/to/article.md')

// DeleteService — 图片删除
const deleter = new DeleteService({ baseDirectory: '/path/to/workspace' })
const target = await deleter.scanReferences('./images/photo.png')
const deleteResult = await deleter.delete(target)
```

## 核心服务

### Service

服务基础接口，所有服务必须实现此接口。

```ts
interface Service<TConfig = unknown> {
  readonly id: string
  initialize?(config: TConfig): void | Promise<void>
  dispose?(): void | Promise<void>
}
```

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `id` | `string` | 服务唯一标识 |
| `initialize?` | `(config: TConfig) => void \| Promise<void>` | 初始化（可选） |
| `dispose?` | `() => void \| Promise<void>` | 销毁（可选） |

## 上传服务

### UploadService

将 Markdown 文档中的本地图片上传到单一对象存储目标。

```ts
class UploadService implements Service<UploadServiceConfig> {
  readonly id = 'upload'
  constructor(config: UploadServiceConfig)
  initialize(config?: UploadServiceConfig): void
  uploadImagesInDocument(document: string, basePath: string): Promise<UploadResult>
}
```

| 方法 | 返回值 | 说明 |
|:------|:--------|:------|
| `uploadImagesInDocument(document, basePath)` | `Promise<UploadResult>` | 上传文档中的本地图片 |

#### UploadServiceConfig

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `adapter` | `StorageAdapter` | 上传目标存储适配器（必填） |
| `prefix?` | `string` | 上传前缀路径 |
| `namingTemplate?` | `string` | 命名模板 |
| `conflictStrategy?` | `ConflictResolutionStrategy` | 冲突处理策略 |
| `replace?` | `ReplaceConfig` | 图片替换配置 |
| `logger?` | `Logger` | 日志回调 |
| `domain?` | `string` | 自定义域名（上传后 URL 替换为此域名） |

#### UploadResult

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `content` | `string` | 处理后的 Markdown 内容 |
| `succeeded` | `number` | 成功上传的图片数 |
| `failed` | `FailedItemDetail[]` | 失败的图片详情 |
| `skipped` | `FailedItemDetail[]` | 跳过的图片详情 |
| `downloaded` | `FailedItemDetail[]` | 下载的图片详情 |

#### createUploadService

```ts
function createUploadService(config: UploadServiceConfig): UploadService
```

#### 示例

```typescript
import { createUploadService } from '@cmtx/asset'
import { createAliyunOssAdapter } from '@cmtx/storage'

const service = createUploadService({
  adapter: createAliyunOssAdapter({ bucket: 'my-bucket', region: 'oss-cn-hangzhou' }),
  namingTemplate: '{date}/{md5_8}{ext}',
  conflictStrategy: { type: 'skip-all' },
  replace: {
    fields: { src: '{cloudSrc}', alt: '{originalAlt}' },
  },
})

const result = await service.uploadImagesInDocument(markdown, '/path/to/article.md')
console.log(`Uploaded ${result.uploaded} images`)
```

## 下载服务

### DownloadService

将 Markdown 文档中的远程图片下载到本地，支持多存储源适配。

```ts
class DownloadService implements Service<DownloadServiceConfig> {
  readonly id = 'download'
  constructor(config: DownloadServiceConfig)
  initialize(config?: DownloadServiceConfig): void
  downloadImages(document: string, outputDir: string, options?: Omit<DownloadOptions, 'outputDir'>): Promise<SimpleDownloadResult>
  downloadSingleUrl(url: string, localPath: string): Promise<number>
}
```

| 方法 | 返回值 | 说明 |
|:------|:--------|:------|
| `downloadImages(document, outputDir, options?)` | `Promise<SimpleDownloadResult>` | 下载文档中的远程图片 |
| `downloadSingleUrl(url, localPath)` | `Promise<number>` | 下载单个 URL 到本地路径（返回字节数） |

#### DownloadServiceConfig

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `sourceAdapters?` | `StorageDomainConfig[]` | 多存储源（domain -> adapter 映射） |
| `namingTemplate?` | `string` | 命名模板 |
| `concurrency?` | `number` | 下载并发数 |
| `logger?` | `Logger` | 日志回调 |

#### StorageDomainConfig

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `domain` | `string` | 自定义域名（用于 URL 匹配） |
| `adapter` | `StorageAdapter` | 对应的存储适配器 |

#### SimpleDownloadResult

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `succeeded` | `number` | 成功数 |
| `failed` | `number` | 失败数 |
| `skipped` | `number` | 跳过数 |

#### createDownloadService

```ts
function createDownloadService(config: DownloadServiceConfig): DownloadService
```

#### 示例

```typescript
import { createDownloadService } from '@cmtx/asset'

const service = createDownloadService({
  sourceAdapters: [
    { domain: 'private.oss-cn-hangzhou.aliyuncs.com', adapter: ossAdapter },
  ],
  namingTemplate: '{date}/{name}_{md5_8}{ext}',
  concurrency: 3,
})

const result = await service.downloadImages(markdown, './downloads/')
console.log(`Downloaded ${result.success} images, ${result.failed} failed`)
```

## 转移服务

### TransferService

将 Markdown 文档中的远程图片从一个对象存储转移到另一个（组合下载 + 上传）。

```ts
class TransferService implements Service<TransferServiceConfig> {
  readonly id = 'transfer'
  constructor(config: TransferServiceConfig)
  initialize(config?: TransferServiceConfig): void
  transferImages(document: string, filePath: string, options?: {
    sourceDomain?: string
    targetDomain?: string
    concurrency?: number
    deleteSource?: boolean
  }): Promise<TransferAssetsResult>
}
```

| 方法 | 返回值 | 说明 |
|:------|:--------|:------|
| `transferImages(document, filePath, options?)` | `Promise<TransferAssetsResult>` | 转移文档中的远程图片 |

#### TransferServiceConfig

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `sourceAdapters` | `StorageDomainConfig[]` | 源存储（多存储，domain -> adapter） |
| `targetAdapter` | `StorageAdapter` | 目标存储适配器（单存储） |
| `targetPrefix?` | `string` | 目标存储前缀 |
| `targetDomain?` | `string` | 目标存储自定义域名 |
| `sourceDomain?` | `string` | 源存储自定义域名 |
| `namingTemplate?` | `string` | 命名模板 |
| `concurrency?` | `number` | 并发数 |
| `deleteSource?` | `boolean` | 是否删除源文件 |
| `logger?` | `Logger` | 日志回调 |

#### TransferAssetsResult

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `content` | `string` | 处理后的 Markdown 内容 |
| `succeeded` | `number` | 成功转移的图片数 |
| `failed` | `number` | 失败数 |
| `skipped` | `number` | 跳过数 |
| `mappings` | `UrlMapping[]` | 详细 URL 映射列表 |
| `errors` | `Array<{ url: string; error: string }>` | 错误列表 |

#### createTransferService

```ts
function createTransferService(config: TransferServiceConfig): TransferService
```

#### 示例

```typescript
import { createTransferService } from '@cmtx/asset'
import { createAliyunOssAdapter, createTencentCosAdapter } from '@cmtx/storage'

const service = createTransferService({
  sourceAdapters: [{ domain: 'old-cdn.example.com', adapter: createAliyunOssAdapter({...}) }],
  targetAdapter: createTencentCosAdapter({...}),
  targetDomain: 'new-cdn.example.com',
  namingTemplate: '{name}_{md5_8}{ext}',
  deleteSource: false,
})

const result = await service.transferImages(markdown, '/path/to/article.md')
console.log(`Transferred ${result.transferred} images`)
```

## 删除服务

### DeleteService

提供图片删除功能，包括引用检查、文件删除（回收站/移动/永久删除）以及从 Markdown 文件中移除图片引用。

```ts
class DeleteService {
  constructor(config: DeleteServiceConfig, logger?: Logger)
  scanReferences(imagePath: string): Promise<DeleteTarget>
  delete(target: DeleteTarget): Promise<DeleteResult>
  safeDelete(imagePath: string, options?: SafeDeleteOptions): Promise<SafeDeleteResult>
  pruneDirectory(dirPath: string, options?: PruneOptions): Promise<PruneResult>
}
```

| 方法 | 返回值 | 说明 |
|:------|:--------|:------|
| `scanReferences(imagePath)` | `Promise<DeleteTarget>` | 扫描图片在所有 Markdown 文件中的引用 |
| `delete(target)` | `Promise<DeleteResult>` | 执行删除操作 |
| `safeDelete(imagePath, options?)` | `Promise<SafeDeleteResult>` | 安全删除（组合 scanReferences + delete） |
| `pruneDirectory(dirPath, options?)` | `Promise<PruneResult>` | 清理目录下所有未被引用的图片 |

#### DeleteServiceConfig

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `baseDirectory` | `string` | 根目录绝对路径（用于搜索 Markdown 文件和解析相对路径） |
| `options?` | `DeleteOptions` | 删除选项 |

#### DeleteOptions

| 属性 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `strategy?` | `'trash' \| 'move' \| 'hard-delete'` | `'hard-delete'` | 删除策略 |
| `trashDir?` | `string` | — | 回收站目录（strategy 为 `'move'` 时） |
| `maxRetries?` | `number` | `3` | 最大重试次数 |
| `force?` | `boolean` | `false` | 是否强制删除（忽略引用检查） |
| `removeFromMarkdown?` | `boolean` | `false` | 是否从所有引用文件中移除图片标记 |
| `onProgress?` | `(progress: DeleteProgress) => void` | — | 进度回调 |

#### DeleteResult

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `success` | `boolean` | 是否成功 |
| `deletedCount` | `number` | 删除的文件数 |
| `referencesRemovedFrom` | `number` | 移除引用的文件数 |
| `error?` | `string` | 错误信息 |
| `details` | `DeleteDetail[]` | 详细结果 |

#### DeleteProgress

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `currentFile?` | `string` | 当前处理的文件 |
| `processedFiles` | `number` | 已处理的文件数 |
| `totalFiles` | `number` | 总文件数 |
| `status` | `'scanning' \| 'deleting' \| 'removing-references' \| 'complete'` | 当前状态 |

#### 示例

```typescript
import { DeleteService } from '@cmtx/asset'

const service = new DeleteService({
  baseDirectory: '/path/to/workspace',
  options: { strategy: 'trash', removeFromMarkdown: true },
})

// 扫描引用
const target = await service.scanReferences('./images/photo.png')
console.log(`Referenced in ${target.referencedIn.length} files`)

// 执行删除
const result = await service.delete(target)
console.log(`Deleted: ${result.deletedCount}, modified ${result.referencesRemovedFrom} markdown files`)

// 安全删除（引用检查 + 删除一站式）
const safeResult = await service.safeDelete('./images/old.png', {
  strategy: 'move',
  trashDir: '/tmp/backup',
  removeFromMarkdown: true,
})

// 清理 orphan 图片
const pruneResult = await service.pruneDirectory('./images/', {
  extensions: ['png', 'jpg'],
  maxSize: 10 * 1024 * 1024,
})
console.log(`Pruned ${pruneResult.deletedCount} orphan images, freed ${pruneResult.freedSize} bytes`)
```

## IdGenerator

多策略 ID 生成器，支持 slug、UUID、哈希和 FF1 格式保留加密。

```ts
class IdGenerator {
  generate(strategy?: string, input?: string, options?): string
  generateUUID(): string
  generateHash(input: string, algorithm?: string, length?: number): string
  generateSlug(input: string, maxLength?: number): string
  encryptFF1(plaintext: string, encryptionKey: string | Buffer, options?: FF1EncryptOptions): string
  decryptFF1(ciphertext: string, encryptionKey: string | Buffer, options?): string
  validateEncryptedId(id: string, options): EncryptedIdValidationResult
}
```

#### 生成策略

| 策略 | 说明 |
|------|------|
| `slug` | 基于文本生成 URL slug |
| `uuid` | 生成 UUID v4 |
| `md5` | MD5 哈希（默认取前 8 位） |
| `sha1` | SHA-1 哈希（默认取前 8 位） |
| `sha256` | SHA-256 哈希（默认取前 8 位） |
| `ff1` | FF1 格式保留加密 |

#### 示例

```typescript
import { IdGenerator } from '@cmtx/asset'

const gen = new IdGenerator()
gen.generate('slug', 'My Document Title')  // 'My-Document-Titl'
gen.generate('uuid')                        // '550e8400-...'
```

## 参考

- 完整类型定义请查阅 [TypeDoc 生成的参考文档](/cmtx/typedoc/)
- 源码：[GitHub - packages/asset](https://github.com/cc01cc/cmtx-project/tree/main/packages/asset)
