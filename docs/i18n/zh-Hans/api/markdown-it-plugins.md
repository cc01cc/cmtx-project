---
title: "markdown-it 预签名 URL 插件"
category: api
sidebar_order: 11
lang: zh-Hans
package: "@cmtx/markdown-it-presigned-url"
status: stable
---

# markdown-it 预签名 URL 插件

> 为 markdown-it 提供云存储预签名 URL 支持。包含两个包：`@cmtx/markdown-it-presigned-url` 用于标记和渲染处理，
> `@cmtx/markdown-it-presigned-url-adapter-nodejs` 提供 Node.js 环境的 URL 签名和缓存实现。


::: warning
CMTX 仍处于活跃开发阶段，API 可能随版本迭代发生变化。如有疑问或发现文档错误，欢迎通过 [GitHub Issues](https://github.com/cc01cc/cmtx-project/issues) 反馈。
:::

## 安装

```bash
pnpm add @cmtx/markdown-it-presigned-url @cmtx/markdown-it-presigned-url-adapter-nodejs
```

## 快速开始

```typescript
import MarkdownIt from 'markdown-it'
import { presignedUrlPlugin } from '@cmtx/markdown-it-presigned-url'
import { UrlSigner, UrlCacheManager } from '@cmtx/markdown-it-presigned-url-adapter-nodejs'

// 创建缓存和签名器
const cache = new UrlCacheManager()
const signer = new UrlSigner({
  storageConfigs: {
    myStorage: {
      provider: 'aliyun-oss',
      region: 'oss-cn-hangzhou',
      bucket: 'my-bucket',
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
    },
  },
  domains: [
    { domain: 'cdn.example.com', useStorage: 'myStorage' },
  ],
  expire: 600,
  maxRetryCount: 3,
}, cache)

// 配置 markdown-it
const md = new MarkdownIt()
md.use(presignedUrlPlugin, {
  domains: ['cdn.example.com'],
  imageFormat: 'all',
  getSignedUrl: (src) => cache.get(src),
  requestSignedUrl: async (src) => signer.signUrl(src),
})

// 渲染时自动替换为预签名 URL
const html = md.render('![](https://cdn.example.com/images/photo.jpg)')
```

## 插件

### presignedUrlPlugin

markdown-it 插件，自动识别匹配域名的图片 URL 并标记为需要预签名处理。

```ts
function presignedUrlPlugin(md: MarkdownIt, options: PresignedUrlPluginOptions): void
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `md` | `MarkdownIt` | markdown-it 实例 |
| `options` | `PresignedUrlPluginOptions` | 插件配置（详见下方） |

插件会注册 inline 解析规则和 renderer 规则，覆盖 `image`、`html_inline`、`html_block` 渲染器以处理匹配域名的图片。

插件配置选项：

| 属性 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `domains` | `string[]` | — | 需要处理的域名列表 |
| `imageFormat` | `'markdown' \| 'html' \| 'all'` | — | 图片格式类型 |
| `logger` | `Logger` | — | 日志接口（可选） |
| `getSignedUrl` | `(src: string) => string \| null` | — | 同步获取缓存的预签名 URL |
| `requestSignedUrl` | `(src: string) => Promise<string>` | — | 异步请求预签名 URL（可选） |
| `onSignedUrlReady` | `() => void` | — | 预签名 URL 就绪回调（可选） |
| `enabled` | `boolean \| (() => boolean)` | `true` | 运行时开关（可选） |

## Node.js 适配器

### UrlSigner

URL 签名器，根据域名配置生成云存储的预签名 URL。

```ts
class UrlSigner {
  constructor(options: PresignedUrlAdapterOptions, cacheManager: UrlCacheManager)
  signUrl(url: string): Promise<string>
  getMaxRetryCount(): number
}
```

| 方法 | 返回值 | 说明 |
|:------|:--------|:------|
| `signUrl(url)` | `Promise<string>` | 对 URL 进行预签名，返回预签名 URL |
| `getMaxRetryCount()` | `number` | 获取最大重试次数 |

`signUrl` 的执行流程：

1. 检查缓存：命中则直接返回缓存的预签名 URL
2. 域名匹配：从配置中找到匹配域名
3. 根据 provider 类型调用对应签名方法
4. 结果写入缓存后返回

```typescript
const signedUrl = await signer.signUrl('https://cdn.example.com/images/photo.jpg')
```

### UrlCacheManager

预签名 URL 缓存管理器。

```ts
class UrlCacheManager {
  constructor(logger?: Logger)
  get(url: string): string | null
  set(originalUrl: string, signedUrl: string, expireInSeconds: number): void
  has(url: string): boolean
  clear(): void
  canRetry(url: string, maxRetryCount: number): boolean
  getRetryCount(url: string): number
  recordFailure(url: string): number
  resetRetry(url: string): void
  addPendingRequest(url: string, promise: Promise<string>): void
  getPendingRequest(url: string): Promise<string> | undefined
  removePendingRequest(url: string): void
  waitForAllPending(): Promise<void>
}
```

| 方法 | 说明 |
|------|------|
| `get(url)` | 获取缓存的预签名 URL，自动判断过期 |
| `set(url, signedUrl, expireInSeconds)` | 设置缓存 |
| `has(url)` | 检查是否存在有效缓存 |
| `clear()` | 清空所有缓存和重试计数 |
| `canRetry(url, maxRetryCount)` | 检查是否可重试 |
| `recordFailure(url)` | 记录签名失败次数 |
| `resetRetry(url)` | 重置失败计数 |
| `addPendingRequest(url, promise)` | 添加待处理的签名请求 |
| `waitForAllPending()` | 等待所有待处理请求完成 |

> [!TIP]
> 缓存使用 TTL 的 90% 作为提前过期时间，避免在过期临界点返回失效 URL。

### PresignedUrlAdapterOptions

```ts
interface PresignedUrlAdapterOptions {
  storageConfigs: Record<string, CloudStorageConfig>
  domains: PresignedUrlDomainConfig[]
  expire: number
  maxRetryCount: number
  logger?: {
    debug: (message: string, ...args: unknown[]) => void
    info: (message: string, ...args: unknown[]) => void
    warn: (message: string, ...args: unknown[]) => void
    error: (message: string, ...args: unknown[]) => void
  }
}
```

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `storageConfigs` | `Record<string, CloudStorageConfig>` | 存储池配置，key 为 storage ID |
| `domains` | `PresignedUrlDomainConfig[]` | 域名配置数组 |
| `expire` | `number` | 预签名 URL 过期时间（秒） |
| `maxRetryCount` | `number` | 最大重试次数 |

### CloudStorageConfig

云存储配置，由 `@cmtx/storage` 导出。

```ts
interface CloudStorageConfig {
  provider: 'aliyun-oss' | 'tencent-cos' | 'aws-s3'
  region: string
  bucket: string
  accessKeyId?: string
  accessKeySecret?: string
}
```

## 参考

- 完整类型定义请查阅 [TypeDoc 生成的参考文档](/cmtx/typedoc/)
- 存储适配器详见 [@cmtx/storage](./storage.md)
- 源码：[GitHub - packages/markdown-it-presigned-url](https://github.com/cc01cc/cmtx-project/tree/main/packages/markdown-it-presigned-url) / [adapter](https://github.com/cc01cc/cmtx-project/tree/main/packages/markdown-it-presigned-url-adapter-nodejs)
