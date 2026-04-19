# @cmtx/upload 文档

对象存储上传助手，提供图片分析、上传、替换和删除功能。

## 核心功能

### 1. 图片分析 (analyzeImages)

扫描 Markdown 文件，统计本地图片引用和文件大小。

```typescript
import { analyzeImages } from '@cmtx/upload';

const analysis = await analyzeImages({
  projectRoot: '/project',
  searchDir: '/project/docs',
  uploadPrefix: 'images/',
  maxFileSize: 10 * 1024 * 1024,  // 10MB
  allowedExtensions: ['.jpg', '.png', '.gif', '.svg', '.webp']
});

console.log(analysis);
// {
//   images: [
//     { localPath: 'docs/img1.jpg', fileSize: 102400, referencedIn: ['docs/README.md'] }
//   ],
//   skipped: [
//     { path: 'docs/large.png', reason: 'File size exceeds limit' }
//   ],
//   totalSize: 102400,
//   totalCount: 1
// }
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| projectRoot | string | 是 | 项目根目录 |
| searchDir | string | 是 | 搜索目录 |
| localPrefixes | string[] | - | 本地路径前缀过滤 |
| uploadPrefix | string | - | 上传到 OSS 的路径前缀 |
| namingStrategy | NamingStrategy | - | 文件重命名策略 |
| maxFileSize | number | - | 最大文件大小（字节） |
| allowedExtensions | string[] | - | 允许的文件扩展名 |
| logger | LoggerCallback | - | 日志回调函数 |

### 2. 上传单个图片 (uploadImage)

上传单个图片并返回远程 URL。

```typescript
import { uploadImage } from '@cmtx/upload';
import { AliOSSAdapter } from '@cmtx/upload/adapters/ali-oss';

const adapter = new AliOSSAdapter({
  region: 'oss-cn-hangzhou',
  bucket: 'my-bucket',
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET
});

const result = await uploadImage({
  localPath: 'docs/image.jpg',
  projectRoot: '/project',
  adapter,
  uploadPrefix: 'images/'
});

console.log(result);
// {
//   localPath: 'docs/image.jpg',
//   remotePath: 'https://my-bucket.oss-cn-hangzhou.aliyuncs.com/images/image-20260126-120000.jpg',
//   uploaded: true
// }
```

### 3. 批量上传并替换 (uploadAndReplace)

批量上传所有本地图片，并自动更新 Markdown 引用。

```typescript
import { uploadAndReplace } from '@cmtx/upload';

const result = await uploadAndReplace({
  projectRoot: '/project',
  searchDir: '/project/docs',
  adapter,
  uploadPrefix: 'images/',
  namingStrategy: 'original+timestamp+hash',
  deletionStrategy: 'trash'
}, {
  onEvent: (event) => {
    console.log(`[${event.type}]`, event.data);
  }
});

console.log(result);
// {
//   count: 5,
//   results: [
//     {
//       localPath: 'docs/img1.jpg',
//       remotePath: 'https://...',
//       updated: ['docs/README.md', 'docs/guide.md'],
//       deleted: true
//     },
//     ...
//   ]
// }
```

**参数（UploadOptions）：**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| projectRoot | string | 是 | 项目根目录 |
| searchDir | string | 是 | 扫描目录 |
| adapter | IStorageAdapter | 是 | 存储适配器 |
| uploadPrefix | string | - | OSS 路径前缀 |
| maxFileSize | number | - | 文件大小限制（字节），默认 10MB |
| allowedExtensions | string[] | - | 允许的扩展名 |
| namingStrategy | NamingStrategy | - | 命名策略，默认 original+timestamp+hash |
| deletionStrategy | DeletionStrategy | - | 删除策略，默认 trash |
| trashDir | string | - | 回收目录 |
| maxDeletionRetries | number | - | 删除最大重试次数，默认 3 |
| onEvent | UploadEventCallback | - | 事件回调 |
| logger | LoggerCallback | - | 日志回调 |

## 命名策略

文件上传时自动重命名的方式：

### original

保持原文件名。

```
docs/image.jpg → images/image.jpg
```

### timestamp

添加时间戳前缀。

```
docs/image.jpg → images/20260126-120000-image.jpg
```

### hash

使用 MD5 哈希值（前 8 位）。

```
docs/image.jpg → images/a1b2c3d4.jpg
```

### original+timestamp+hash（推荐）

组合所有信息，避免重名。

```
docs/image.jpg → images/image-20260126-120000-a1b2c3d4.jpg
```

## 删除策略

上传成功后处理本地文件的方式：

### trash（默认）

移动到系统回收站（Windows Recycle Bin、macOS Trash、Linux trash-cli）。

```typescript
{
  deletionStrategy: 'trash'
}
```

### move

移动到项目目录的 `.cmtx-trash/` 子目录（可配置）。

```typescript
{
  deletionStrategy: 'move',
  trashDir: '.cmtx-trash/'
}
```

### hard-delete

彻底删除（需谨慎！）。

```typescript
{
  deletionStrategy: 'hard-delete'
}
```

## 存储适配器

### 阿里云 OSS 适配器

```typescript
import { AliOSSAdapter } from '@cmtx/upload/adapters/ali-oss';

const adapter = new AliOSSAdapter({
  region: 'oss-cn-hangzhou',
  bucket: 'my-bucket',
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET
});
```

### 自定义适配器

实现 `IStorageAdapter` 接口：

```typescript
import type { IStorageAdapter } from '@cmtx/upload';

class S3Adapter implements IStorageAdapter {
  async upload(localPath: string, remotePath: string): Promise<string> {
    // 上传逻辑
    return 'https://bucket.s3.amazonaws.com/path/to/file.jpg';
  }
}

const adapter = new S3Adapter();
```

## 事件系统

通过 `onEvent` 回调跟踪上传进度：

```typescript
const result = await uploadAndReplace(options, {
  onEvent: (event) => {
    switch (event.type) {
      case 'scan':
        console.log(`扫描完成: ${event.data.count} 个文件`);
        break;
      case 'upload':
        console.log(`上传: ${event.data.file}`);
        break;
      case 'replace':
        console.log(`替换: ${event.data.file} 中的引用`);
        break;
      case 'delete':
        console.log(`删除: ${event.data.file}`);
        break;
      case 'complete':
        console.log(`完成: 上传 ${event.data.uploaded} 个文件`);
        break;
    }
  }
});
```

**事件类型：**

| 类型 | 数据 | 说明 |
| --- | --- | --- |
| scan | { count: number } | 扫描完成 |
| upload | { file: string; index: number; total: number } | 单个文件上传 |
| replace | { file: string } | 引用替换 |
| delete | { file: string; strategy: string } | 文件删除 |
| complete | { uploaded: number; deleted: number } | 操作完成 |

## 日志回调

使用 `logger` 回调获取详细的调试信息：

```typescript
const result = await uploadAndReplace(options, {
  logger: (level, message, data) => {
    console.log(`[${level}] ${message}`, data);
  }
});
```

## 使用示例

### 示例 1：分析本地图片

见 [examples/1-analyze-images.ts](../examples/1-analyze-images.ts)

### 示例 2：上传单个图片

见 [examples/2-upload-single.ts](../examples/2-upload-single.ts)

### 示例 3：批量上传并替换

见 [examples/3-batch-upload.ts](../examples/3-batch-upload.ts)

### 示例 4：使用阿里云 OSS

见 [examples/4-with-ali-oss.ts](../examples/4-with-ali-oss.ts)

### 示例 5：重命名和清理

见 [examples/5-rename-and-cleanup.ts](../examples/5-rename-and-cleanup.ts)

## API 参考

完整的 API 文档由 TypeDoc 生成，位于 [api/](./api/) 目录。

## 类型定义

### UploadOptions

```typescript
interface UploadOptions {
  projectRoot: string;
  searchDir: string;
  adapter: IStorageAdapter;
  uploadPrefix?: string;
  maxFileSize?: number;
  allowedExtensions?: string[];
  namingStrategy?: NamingStrategy;
  deletionStrategy?: DeletionStrategy;
  trashDir?: string;
  maxDeletionRetries?: number;
  onEvent?: UploadEventCallback;
  logger?: LoggerCallback;
}
```

### UploadResult

```typescript
interface UploadResult {
  localPath: string;
  remotePath: string;
  updated: string[];
  deleted: boolean;
  error?: string;
}
```

### UploadAnalysis

```typescript
interface UploadAnalysis {
  images: Array<{
    localPath: string;
    fileSize: number;
    referencedIn: string[];
  }>;
  skipped: Array<{
    path: string;
    reason: string;
  }>;
  totalSize: number;
  totalCount: number;
}
```

## 常见问题

### 如何处理上传中的错误？

```typescript
try {
  const result = await uploadAndReplace(options);
  console.log('成功上传', result.results.length, '个文件');
} catch (error) {
  console.error('上传失败:', error.message);
  // 根据错误类型处理
}
```

### 如何支持新的存储服务？

实现 `IStorageAdapter` 接口并传入。详见自定义适配器章节。

### 如何批量上传但保留本地文件？

使用 `deletionStrategy: 'move'` 并指定 `trashDir`，或自定义实现。

## 许可证

Apache-2.0
