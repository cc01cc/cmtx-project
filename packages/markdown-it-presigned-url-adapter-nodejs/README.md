# @cmtx/markdown-it-presigned-url-adapter-nodejs

Node.js 适配器，为 @cmtx/markdown-it-presigned-url 插件提供云存储预签名 URL 生成能力。

[![npm version](https://img.shields.io/npm/v/@cmtx/markdown-it-presigned-url-adapter-nodejs.svg)](https://www.npmjs.com/package/@cmtx/markdown-it-presigned-url-adapter-nodejs)
[![License](https://img.shields.io/npm/l/@cmtx/markdown-it-presigned-url-adapter-nodejs.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

## 1. 功能特性

- **预签名 URL 生成** - 为阿里云 OSS 等云存储生成预签名 URL
- **缓存管理** - 内置 URL 缓存机制，减少重复签名请求
- **Node.js 专用** - 针对 Node.js 环境优化，支持异步签名
- **零配置集成** - 与 @cmtx/markdown-it-presigned-url 插件无缝集成
- **类型安全** - 完整的 TypeScript 类型支持

## 2. 安装

```bash
npm install @cmtx/markdown-it-presigned-url-adapter-nodejs @cmtx/markdown-it-presigned-url
```

## 3. 快速开始

### 3.1 基础用法

```typescript
import MarkdownIt from 'markdown-it';
import { presignedUrlPlugin } from '@cmtx/markdown-it-presigned-url';
import { UrlSigner, UrlCacheManager } from '@cmtx/markdown-it-presigned-url-adapter-nodejs';
import OSS from 'ali-oss';

// 初始化阿里云 OSS 客户端
const client = new OSS({
    region: 'oss-cn-hangzhou',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: 'your-bucket'
});

// 创建签名器
const signer = new UrlSigner(client, {
    expires: 3600, // URL 有效期 1 小时
    domains: ['your-bucket.oss-cn-hangzhou.aliyuncs.com']
});

// 创建缓存管理器
const cacheManager = new UrlCacheManager();

// 配置 markdown-it 插件
const md = new MarkdownIt();
md.use(presignedUrlPlugin, {
    domains: ['your-bucket.oss-cn-hangzhou.aliyuncs.com'],
    imageFormat: 'all',
    getSignedUrl: (src) => {
        // 从缓存获取签名 URL
        return cacheManager.get(src);
    },
    requestSignedUrl: async (src) => {
        // 生成签名 URL 并缓存
        const signedUrl = await signer.sign(src);
        cacheManager.set(src, signedUrl);
        return signedUrl;
    },
    onSignedUrlReady: () => {
        // 签名完成后刷新预览
        console.log('URL 签名完成，刷新预览');
    }
});

// 渲染 Markdown
const html = md.render('![image](https://your-bucket.oss-cn-hangzhou.aliyuncs.com/path/image.png)');
```

### 3.2 使用日志

```typescript
import { UrlSigner, UrlCacheManager, type CacheManagerLogger, type SignerLogger } from '@cmtx/markdown-it-presigned-url-adapter-nodejs';

// 配置日志
const logger: CacheManagerLogger & SignerLogger = {
    debug: (msg, ...args) => console.debug(msg, ...args),
    info: (msg, ...args) => console.info(msg, ...args),
    warn: (msg, ...args) => console.warn(msg, ...args),
    error: (msg, ...args) => console.error(msg, ...args),
};

const cacheManager = new UrlCacheManager({ logger });
const signer = new UrlSigner(client, {
    expires: 3600,
    domains: ['example.com'],
    logger
});
```

## 4. API

### `UrlSigner`

预签名 URL 生成器。

#### 构造函数

```typescript
constructor(client: OSS, options: UrlSignerOptions)
```

#### 选项

| 选项 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `expires` | `number` | 否 | `3600` | URL 有效期（秒） |
| `domains` | `string[]` | 是 | - | 允许的域名列表 |
| `logger` | `SignerLogger` | 否 | - | 日志接口 |

#### 方法

- **`sign(src: string): Promise<string>`** - 为图片 URL 生成预签名 URL

### `UrlCacheManager`

URL 缓存管理器。

#### 构造函数

```typescript
constructor(options?: UrlCacheManagerOptions)
```

#### 选项

| 选项 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `maxSize` | `number` | 否 | `1000` | 最大缓存条目数 |
| `ttl` | `number` | 否 | `3600000` | 缓存有效期（毫秒） |
| `logger` | `CacheManagerLogger` | 否 | - | 日志接口 |

#### 方法

- **`get(src: string): string | null`** - 获取缓存的签名 URL
- **`set(src: string, url: string): void`** - 设置缓存
- **`has(src: string): boolean`** - 检查缓存是否存在
- **`delete(src: string): boolean`** - 删除缓存
- **`clear(): void`** - 清空所有缓存

### `PresignedUrlAdapter`

预签名 URL 适配器接口。

```typescript
interface PresignedUrlAdapter {
    sign(src: string): Promise<string>;
}
```

### `PresignedUrlCache`

预签名 URL 缓存接口。

```typescript
interface PresignedUrlCache {
    get(src: string): string | null;
    set(src: string, url: string): void;
    has(src: string): boolean;
}
```

## 5. 类型定义

### `UrlSignerOptions`

```typescript
interface UrlSignerOptions {
    expires?: number;
    domains: string[];
    logger?: SignerLogger;
}
```

### `UrlCacheManagerOptions`

```typescript
interface UrlCacheManagerOptions {
    maxSize?: number;
    ttl?: number;
    logger?: CacheManagerLogger;
}
```

### `Logger` 接口

```typescript
interface Logger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}
```

## 6. 工作原理

1. **初始化**：创建 `UrlSigner` 和 `UrlCacheManager` 实例
2. **渲染请求**：markdown-it 渲染 Markdown 内容
3. **缓存检查**：`getSignedUrl` 检查缓存
   - 命中 → 返回缓存的签名 URL
   - 未命中 → 返回 null，触发异步签名
4. **异步签名**：`requestSignedUrl` 调用 `UrlSigner.sign()` 生成签名 URL
5. **缓存更新**：将签名 URL 存入 `UrlCacheManager`
6. **刷新回调**：调用 `onSignedUrlReady` 通知宿主应用刷新预览

## 7. 依赖

### Peer Dependencies

- `@cmtx/markdown-it-presigned-url`: `workspace:*`
- `markdown-it`: `^14.0.0`

### Dependencies

- `@cmtx/storage`: `workspace:*`
- `@cmtx/core`: `workspace:*`
- `ali-oss`: `catalog:`

## 8. 相关项目

- [@cmtx/markdown-it-presigned-url](../markdown-it-presigned-url) - Markdown-it 预签名 URL 插件
- [@cmtx/storage](../storage) - 对象存储适配器
- [@cmtx/vscode-extension](../vscode-extension) - VS Code 扩展（使用此适配器）

## 9. 许可证

Apache-2.0
