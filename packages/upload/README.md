# @cmtx/upload

上传 Markdown 中引用的本地图片到对象存储（如阿里云 OSS），并自动替换为远程 URL。

## 1. 特性

- **自动上传和替换** - 扫描 Markdown 文件，上传本地图片，自动替换引用
- **智能重命名** - 上传前自动重命名图片（原名 + 时间戳 + 内容哈希），避免命名冲突
- **安全回收** - 上传成功后可将本地图片移至系统回收站或指定目录，支持失败重试
- **适配器模式** - 支持多种云存储服务（阿里云 OSS、AWS S3 等）
- **安全可靠** - 路径验证、文件大小限制、扩展名白名单
- **进度跟踪** - 事件回调机制，实时监控上传、重命名、回收进度
- **分析模式** - 预览待上传的图片，无需实际上传

## 2. 安装

```bash
pnpm add @cmtx/upload @cmtx/core

# 如果使用阿里云 OSS
pnpm add ali-oss
```

## 3. 快速开始

### 3.1. 批量上传所有本地图片

```typescript
import { uploadAndReplace } from "@cmtx/upload";
import { AliOSSAdapter } from "@cmtx/upload/adapters/ali-oss";
import OSS from "ali-oss";

// 1. 配置 OSS 客户端
const ossClient = new OSS({
  region: "oss-cn-hangzhou",
  accessKeyId: "your-access-key-id",
  accessKeySecret: "your-access-key-secret",
  bucket: "your-bucket-name",
});

// 2. 创建适配器
const adapter = new AliOSSAdapter(ossClient);

// 3. 批量上传并替换
const results = await uploadAndReplace({
  projectRoot: "/path/to/project",
  searchDir: "docs",  // 扫描 docs 目录
  adapter,
  uploadPrefix: "blog/images",  // 上传到 blog/images 路径
  onEvent: (event) => {
    console.log(`[${event.type}]`, event.data);
  },
});

console.log(`成功上传 ${results.length} 个图片`);
```

### 3.2. 分析本地图片（不上传）

```typescript
import { analyzeImages } from "@cmtx/upload";

// 仅分析，不需要 adapter
const analysis = await analyzeImages({
  projectRoot: "/path/to/project",
  searchDir: "docs",
  maxFileSize: 10 * 1024 * 1024, // 10MB 默认限制
});

console.log(`找到 ${analysis.totalCount} 个本地图片`);
console.log(`总大小：${(analysis.totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`跳过：${analysis.skipped.length} 个图片`);

// 符合条件的图片
for (const img of analysis.images) {
  console.log(`${img.localPath} (${img.referencedIn.length} 个引用)`);
}

// 被跳过的图片（体积超限或扩展名不支持）
for (const skip of analysis.skipped) {
  console.log(`跳过：${skip.localPath} - ${skip.reason}`);
}
```

### 3.3. 上传单个图片

```typescript
import { uploadImage } from "@cmtx/upload";

const result = await uploadImage({
  localPath: "images/logo.png",
  projectRoot: "/path/to/project",
  adapter,
  uploadPrefix: "blog/images",
});

console.log(`上传成功：${result.remotePath}`);
console.log(`替换了 ${result.updated.length} 个 Markdown 文件`);
```

### 3.4. 上传前重命名并回收本地文件

```typescript
import { uploadAndReplace } from "@cmtx/upload";

const results = await uploadAndReplace({
  projectRoot: "/path/to/project",
  searchDir: "docs",
  adapter,
  uploadPrefix: "blog/images",

  // 命名策略：原名-YYYYMMDD-HHmmss-SSS-{MD5 前 8 位}.ext
  // 例如：logo.png -> logo-20260124-153045-123-a1b2c3d4.png
  namingStrategy: "original+timestamp+hash",

  // 删除策略：使用系统回收站（推荐）
  deletionStrategy: "trash",

  // 或移动到指定目录
  // deletionStrategy: "move",
  // trashDir: ".cmtx-trash/",

  // 删除失败时的最大重试次数
  maxDeletionRetries: 3,

  onEvent: (event) => {
    switch (event.type) {
      case "upload":
        console.log(`上传：${event.data?.file}`);
        break;
      case "replace":
        console.log(`替换：${event.data?.file} 中的引用`);
        break;
      case "delete":
        console.log(`回收：${event.data?.file}`);
        break;
      case "complete":
        console.log("全部完成！");
        break;
    }
  },
});

// 查看结果
console.log(`成功上传 ${results.length} 个图片`);
for (const result of results) {
  console.log(`${result.localPath} → ${result.remotePath}`);
  console.log(`  更新的文件：${result.updated.join(", ")}`);
  console.log(`  已删除：${result.deleted}`);
}
```

## 4. 自定义存储适配器

实现 `IStorageAdapter` 接口以支持其他云存储服务：

```typescript
import type { IStorageAdapter } from "@cmtx/upload";

class MyStorageAdapter implements IStorageAdapter {
  async upload(localPath: string, remotePath: string): Promise<string> {
    // 上传文件到你的存储服务
    // 返回完整的 CDN URL
    return `https://your-cdn.com/${remotePath}`;
  }
}

const adapter = new MyStorageAdapter();
```

## 5. API 文档

### 5.1. `analyzeImages(options: UploadOptions): Promise<UploadAnalysis>`

扫描 Markdown 文件，分析本地图片引用，但不执行上传。

### 5.2. `uploadImage(options: UploadOptions): Promise<UploadResult>`

上传单个指定的本地图片，并替换所有引用它的 Markdown 文件。

### 5.3. `uploadAndReplace(options: UploadOptions): Promise<UploadResult[]>`

批量上传所有本地图片，并替换 Markdown 引用。串行执行，支持错误恢复。

### 5.4. `UploadOptions`

<!-- markdownlint-disable MD060 -->

| 字段                 | 类型                  | 必填 | 说明                                                                                     |
| -------------------- | --------------------- | ---- | ---------------------------------------------------------------------------------------- |
| `projectRoot`        | `string`              | 是   | 项目根目录                                                                               |
| `searchDir`          | `string`              | 是   | 扫描目录                                                                                 |
| `adapter`            | `IStorageAdapter`     | 是   | 存储适配器                                                                               |
| `uploadPrefix`       | `string`              | -    | OSS 路径前缀                                                                             |
| `maxFileSize`        | `number`              | -    | 文件大小限制（字节），默认 10MB                                                          |
| `allowedExtensions`  | `string[]`            | -    | 允许的扩展名，默认 `['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp']`                  |
| `namingStrategy`     | `NamingStrategy`      | -    | 命名策略，默认 `"original+timestamp+hash"`（原名-YYYYMMDD-HHmmss-SSS-{MD5 前 8 位}.ext） |
| `deletionStrategy`   | `DeletionStrategy`    | -    | 删除策略，默认 `"trash"`（系统回收站），可选 `"move"`、`"hard-delete"`                   |
| `trashDir`           | `string`              | -    | 回收目录，默认 `".cmtx-trash/"`（当 `deletionStrategy` 为 `"move"` 时使用）              |
| `maxDeletionRetries` | `number`              | -    | 删除最大重试次数，默认 `3`                                                               |
| `onEvent`            | `UploadEventCallback` | -    | 事件回调                                                                                 |
| `logger`             | `LoggerCallback`      | -    | 日志回调                                                                                 |

<!-- markdownlint-enable MD060 -->

## 6. 事件监听

通过 `onEvent` 回调跟踪上传进度：

```typescript
await uploadAndReplace({
  // ...其他选项
  onEvent: (event) => {
    switch (event.type) {
      case "scan":
        console.log(`扫描完成：${event.data?.count} 个文件`);
        break;
      case "upload":
        console.log(`上传：${event.data?.file}`);
        break;
      case "replace":
        console.log(`替换：${event.data?.file} 中的引用`);
        break;
      case "delete":
        console.log(`删除：${event.data?.file}`);
        break;
      case "complete":
        console.log(`完成：上传 ${event.data?.uploaded} 个文件`);
        break;
    }
  },
});
```

**事件类型：**

| 类型 | 数据 | 说明 |
| --- | --- | --- |
| scan | { count: number } | 扫描完成 |
| upload | { file: string } | 单个文件上传 |
| replace | { file: string } | 引用替换 |
| delete | { file: string } | 文件删除 |
| complete | { uploaded: number } | 操作完成 |

## 7. 示例

先生成本地占位数据（不会提交到 git）：

```bash
pnpm exec tsx examples/scripts/gen-demo-data.ts
```

默认 `maxFileSize` 为 10MB，生成的数据包含更大的占位文件，若要处理它们请在示例参数中显式提升 `maxFileSize`。

查看 [examples](./examples/) 目录了解更多使用示例：

- [1-analyze-images.ts](./examples/1-analyze-images.ts) - 分析本地图片引用
- [2-upload-single.ts](./examples/2-upload-single.ts) - 上传单个图片
- [3-batch-upload.ts](./examples/3-batch-upload.ts) - 批量上传
- [4-with-ali-oss.ts](./examples/4-with-ali-oss.ts) - 阿里云 OSS 完整示例
- [5-rename-and-cleanup.ts](./examples/5-rename-and-cleanup.ts) - 上传前重命名并回收本地文件
- [6-cli-preview.ts](./examples/6-cli-preview.ts) - CLI 预览示例

## 8. 安全性

- **路径验证** - 所有文件操作限制在 `projectRoot` 内
- **文件大小限制** - 防止上传过大文件
- **扩展名白名单** - 只上传允许的文件类型
- **错误隔离** - 单个文件失败不影响其他文件

## 9. 许可证

Apache-2.0

## 10. 贡献

欢迎提交 Issue 和 Pull Request！

## 11. 相关包

- [@cmtx/core](../core) - Markdown 图片解析和替换核心功能
