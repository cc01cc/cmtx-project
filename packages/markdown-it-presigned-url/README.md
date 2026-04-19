# @cmtx/markdown-it-presigned-url

Markdown-it 预签名 URL 图片渲染插件。自动为私有云存储（OSS、S3、COS）的图片 URL 签名，以便在 Markdown 中安全预览。

## 功能特性

- 为私有云存储的图片 URL 签名
- 支持 Markdown 和 HTML 图片格式
- 异步 URL 签名与刷新回调
- 零 VS Code 依赖 - 适用于任何 markdown-it 应用
- 可选的日志接口用于调试

## 安装

```bash
npm install @cmtx/markdown-it-presigned-url markdown-it
```

## 使用

### 基础用法

```typescript
import MarkdownIt from 'markdown-it';
import { presignedUrlPlugin } from '@cmtx/markdown-it-presigned-url';

const md = new MarkdownIt();

md.use(presignedUrlPlugin, {
    domains: ['bucket.oss-cn-hangzhou.aliyuncs.com'],
    imageFormat: 'all',
    getSignedUrl: (src) => {
        // 返回缓存的签名 URL 或 null
        return myCache.get(src);
    },
    requestSignedUrl: async (src) => {
        // 生成并缓存签名 URL
        const signedUrl = await mySigner.sign(src);
        myCache.set(src, signedUrl);
        return signedUrl;
    },
    onSignedUrlReady: () => {
        // 刷新 Markdown 预览
        console.log('URL 准备就绪，刷新预览');
    },
});

const html = md.render('![image](https://bucket.oss-cn-hangzhou.aliyuncs.com/path/image.png)');
```

### 使用日志

```typescript
import { presignedUrlPlugin, type Logger } from '@cmtx/markdown-it-presigned-url';

const logger: Logger = {
    debug: (msg, ...args) => console.debug(msg, ...args),
    info: (msg, ...args) => console.info(msg, ...args),
    warn: (msg, ...args) => console.warn(msg, ...args),
    error: (msg, ...args) => console.error(msg, ...args),
};

md.use(presignedUrlPlugin, {
    domains: ['example.com'],
    imageFormat: 'all',
    logger,
    getSignedUrl: (src) => null,
});
```

## API

### `presignedUrlPlugin(md, options)`

Markdown-it 插件函数。

#### 选项

| 选项 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `domains` | `string[]` | 是 | 需要签名 URL 的主机名列表（精确匹配） |
| `imageFormat` | `'markdown' \| 'html' \| 'all'` | 是 | 要处理的图片格式 |
| `logger` | `Logger` | 否 | 可选的日志接口用于调试 |
| `getSignedUrl` | `(src: string) => string \| null` | 是 | 同步函数，获取缓存的签名 URL |
| `requestSignedUrl` | `(src: string) => Promise<string>` | 否 | 异步函数，生成签名 URL |
| `onSignedUrlReady` | `() => void` | 否 | 异步签名完成时的回调 |

### `Logger` 接口

```typescript
interface Logger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}
```

## 工作原理

1. **渲染阶段（同步）**：插件检查 URL 是否匹配配置的域名
   - 如果存在缓存的签名 URL → 返回签名 URL
   - 如果未缓存 → 返回原始 URL + 触发异步签名

2. **异步签名**：`requestSignedUrl` 在后台生成签名 URL
   - 完成后调用 `onSignedUrlReady` 回调
   - 宿主应用应重新渲染 Markdown（例如刷新预览）

3. **重新渲染**：插件找到缓存的签名 URL 并返回

## 相关项目

- [@cmtx/vscode-shared](../vscode-extensions/shared) - 使用此插件的 VS Code 扩展

## 文档

- [English Documentation](./README.en.md)

## 许可证

Apache-2.0
