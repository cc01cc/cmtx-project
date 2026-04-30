# @cmtx/markdown-it-presigned-url-adapter-nodejs

[![npm version](https://img.shields.io/npm/v/@cmtx/markdown-it-presigned-url-adapter-nodejs.svg)](https://www.npmjs.com/package/@cmtx/markdown-it-presigned-url-adapter-nodejs)
[![License](https://img.shields.io/npm/l/@cmtx/markdown-it-presigned-url-adapter-nodejs.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Node.js 适配器，为 `@cmtx/markdown-it-presigned-url` 插件提供云存储预签名 URL 生成能力。内置缓存管理，支持阿里云 OSS。

> 完整 API 文档：`pnpm run docs`（生成于 `docs/api/`）

## 1. 安装

```bash
pnpm add @cmtx/markdown-it-presigned-url-adapter-nodejs @cmtx/markdown-it-presigned-url
```

## 2. 快速开始

```typescript
import MarkdownIt from "markdown-it";
import { presignedUrlPlugin } from "@cmtx/markdown-it-presigned-url";
import { UrlSigner, UrlCacheManager } from "@cmtx/markdown-it-presigned-url-adapter-nodejs";

// 域名配置：每个域名可引用 storage pool 或独立配置
const signer = new UrlSigner({
    // 存储池配置
    storageConfigs: {
        oss: {
            provider: "aliyun-oss",
            region: "oss-cn-hangzhou",
            bucket: "your-bucket",
            accessKeyId: process.env.OSS_ACCESS_KEY_ID,
            accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
            // endpoint: "oss-cn-hangzhou.aliyuncs.com",
        },
    },
    // 域名配置：关联 storage pool
    domains: [
        { domain: "your-bucket.oss-cn-hangzhou.aliyuncs.com", useStorage: "oss" },
    ],
    expire: 600, // 预签名 URL 过期时间（秒）
    maxRetryCount: 3,
}, new UrlCacheManager());

// 生成预签名 URL
const signedUrl = await signer.signUrl(
    "https://your-bucket.oss-cn-hangzhou.aliyuncs.com/path/image.png"
);

// 配置 markdown-it 插件
const md = new MarkdownIt();
md.use(presignedUrlPlugin, {
    domains: ["your-bucket.oss-cn-hangzhou.aliyuncs.com"],
    imageFormat: "all",
    getSignedUrl: (src) => signer.signUrl(src),
});
```

## 3. API

### UrlSigner

预签名 URL 生成器。

```typescript
constructor(options: PresignedUrlAdapterOptions, cacheManager: UrlCacheManager)
```

| 选项 | 类型 | 说明 |
|------|------|------|
| `storageConfigs` | `Record<string, CloudStorageConfig>` | 存储池配置 |
| `domains` | `PresignedUrlDomainConfig[]` | 域名配置数组 |
| `expire` | `number` | 预签名 URL 过期时间（秒） |
| `maxRetryCount` | `number` | 签名失败最大重试次数 |
| `logger?` | `Logger` | 日志接口 |

**方法**：

- `signUrl(url: string): Promise<string>` - 生成预签名 URL（自动缓存）
- `getMaxRetryCount(): number` - 获取最大重试次数

### UrlCacheManager

URL 缓存管理器。

```typescript
constructor(logger?: Logger)
```

**方法**：

| 方法 | 说明 |
|------|------|
| `get(url)` | 获取缓存的签名 URL |
| `set(url, signedUrl, expireInSeconds)` | 设置缓存（含过期时间） |
| `has(url)` | 检查缓存是否存在 |
| `clear()` | 清空所有缓存 |
| `canRetry(url, maxRetryCount)` | 检查是否可重试 |
| `getRetryCount(url)` | 获取重试次数 |
| `recordFailure(url)` | 记录失败次数 |
| `resetRetry(url)` | 重置重试计数 |
| `addPendingRequest(url, promise)` | 添加待处理请求 |
| `getPendingRequest(url)` | 获取待处理请求 |
| `removePendingRequest(url)` | 移除待处理请求 |
| `waitForAllPending()` | 等待所有待处理请求完成 |

### PresignedUrlCache

```typescript
interface PresignedUrlCacheItem {
    url: string;
    timestamp: number;
    expires: number;
}

interface PresignedUrlCache {
    [key: string]: PresignedUrlCacheItem;
}
```

## 4. 工作原理

1. 创建 `UrlSigner`（配置域名和存储凭证）和 `UrlCacheManager`
2. 渲染 Markdown 时，插件对匹配域名的图片 URL 调用 `signUrl()`
3. `signUrl()` 先查缓存，命中直接返回
4. 未命中则通过 `AliOSSAdapter.getSignedUrl()` 生成预签名 URL
5. 结果缓存后返回，后续请求直接从缓存读取

## 5. 相关项目

- [@cmtx/markdown-it-presigned-url](../markdown-it-presigned-url) - markdown-it 预签名 URL 插件
- [@cmtx/storage](../storage) - 对象存储适配器

## 6. 开发

```bash
pnpm build       # 构建
pnpm test        # 测试
pnpm lint        # 代码检查
pnpm run docs    # 生成 API 文档
```
