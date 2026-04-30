# @cmtx/asset

[![npm version](https://img.shields.io/npm/v/@cmtx/asset.svg)](https://www.npmjs.com/package/@cmtx/asset)
[![License](https://img.shields.io/npm/l/@cmtx/asset.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Markdown 资产管理管道 —— 上传本地图片到云存储、在存储服务间转移、下载远程图片、带引用检查的删除。协调文件 I/O 和跨包业务逻辑编排。

> **完整 API 文档**：运行 `pnpm run docs` 生成（位于 `docs/api/` 目录）

## 子模块

### @cmtx/asset/file - 文件操作服务

提供文件系统级别的图片处理功能（从 @cmtx/core 迁移）：

- 图片筛选（从文件/目录）
- 图片替换（文件/目录批量替换）
- 图片删除（安全删除本地图片）
- 通用文件操作

### @cmtx/asset/upload

本地图片上传到对象存储，支持智能去重和模板命名。

### @cmtx/asset/transfer

远程图片在存储间转移，支持并发控制和进度跟踪。

### @cmtx/asset/download

远程图片下载到本地，支持命名模板和并发控制。

### @cmtx/asset/delete

图片删除服务，提供引用检查和多种删除策略（trash/move/hard-delete）。

### @cmtx/asset/config - 配置管理

提供 YAML 配置文件加载、验证和环境变量替换功能。

## 核心理念

- **文件系统操作中心**：负责所有文件级操作（筛选、替换、删除、上传、下载）
- **业务逻辑编排**：协调各组件完成复杂任务，调用 @cmtx/template 生成文本
- **纯文本处理委托**：调用 @cmtx/core 执行纯文本处理（解析、替换、格式化）
- **高度模块化**：通过配置构建器模式实现灵活组合
- **统一适配器接口**：通过 @cmtx/storage 支持多种云存储服务

## 特性

### 文件操作服务（FileService）

通过 `FileService` 提供文件系统级别的图片处理（从 @cmtx/core 迁移）：

```typescript
import { createFileService, FileService } from "@cmtx/asset/file";

// 创建服务实例
const fileService = createFileService();

// 从文件筛选图片
const images = await fileService.filterImagesFromFile("/path/to/file.md");

// 替换文件中的图片
const result = await fileService.replaceImagesInFile("/path/to/file.md", [
    { field: "src", pattern: "./old.png", newSrc: "./new.png" },
]);

// 删除本地图片（含引用检查）
const deleteResult = await fileService.deleteLocalImage("/path/to/image.png", {
    strategy: "trash",
});
```

### 上传功能

- **智能上传** - `uploadLocalImageInMarkdown()` 扫描并上传 Markdown 文件中的本地图片
- **模板系统** - 集成 @cmtx/template 的 Builder 模式，支持灵活的命名规则
- **多字段替换** - 同时替换 src、alt、title 字段，支持模板变量渲染
- **安全删除** - 通过 FileService 集成删除功能，支持 trash/move/hard-delete 策略

### 转移功能

- **远程转移** - `transferRemoteImages()` 将远程图片从源存储转移到目标存储
- **URL 识别** - 自动识别属于源存储的 URL
- **并发控制** - 支持并发传输和进度跟踪
- **自动替换** - 传输完成后自动替换 Markdown 中的 URL

### 下载功能

- **远程下载** - `createDownloadService()` 将 Markdown 中的远程图片下载到本地
- **命名模板** - 支持 `{date}`, `{name}`, `{ext}`, `{sequence}` 等变量
- **域名过滤** - 可选只下载特定域名的图片
- **并发控制** - 可配置并发下载数量

### DeleteService

专门的图片删除服务，提供引用检查和安全的删除策略：

```typescript
import { DeleteService } from "@cmtx/asset/delete";

const service = new DeleteService({
    workspaceRoot: "/path/to/workspace",
    options: {
        strategy: "trash",
        removeFromMarkdown: true,
    },
});

// 扫描引用
const target = await service.scanReferences("./images/test.png");

// 执行删除
const result = await service.delete(target);
```

### 配置管理（Config）

提供 YAML 配置文件加载和验证：

```typescript
import { ConfigLoader, ConfigValidator } from "@cmtx/asset/config";

// 加载配置
const config = await ConfigLoader.loadFromFile("./cmtx.config.yaml");

// 验证配置
const errors = ConfigValidator.validate(config);
```

### 云存储 URL 检测

```typescript
import { detectStorageUrl, isSignedUrl, isStorageUrl,
         isAliyunOssUrl, isAwsS3Url, isTencentCosUrl } from "@cmtx/asset";

detectStorageUrl("https://mybucket.oss-cn-hangzhou.aliyuncs.com/image.png");
// => { provider: "aliyun", bucket: "mybucket", region: "cn-hangzhou" }

isStorageUrl("https://mybucket.oss-cn-hangzhou.aliyuncs.com/image.png"); // true
isAliyunOssUrl("https://mybucket.oss-cn-hangzhou.aliyuncs.com/image.png"); // true
```

### 架构优势

- **文件系统收束** - 所有文件操作统一在 asset 包，core 只做纯文本处理
- **分层设计** - 与 @cmtx/template 和 @cmtx/core 协作
- **模块化设计** - 配置构建器模式，链式调用 API
- **适配器模式** - 通过 @cmtx/storage 支持多种云存储服务
- **事件驱动** - 完整的进度跟踪和回调机制
- **智能去重** - 单文件和跨文件两级去重，优化上传效率

## 安装

```bash
pnpm add @cmtx/asset

# 如果使用阿里云 OSS
pnpm add ali-oss

# 如果使用腾讯云 COS
pnpm add cos-nodejs-sdk-v5
```

**注意**: `@cmtx/core` 不再需要单独安装，它作为 `@cmtx/asset` 的间接依赖。

## 快速开始

### 文件操作（FileService）

`FileService` 是文件系统操作的统一入口，封装了从 @cmtx/core 迁移的图片处理功能：

```typescript
import { createFileService } from "@cmtx/asset/file";

const fs = createFileService();

// 1. 从文件筛选图片
const images = await fs.filterImagesFromFile("/path/to/file.md", {
    mode: "sourceType",
    value: "local", // 只筛选本地图片
});

// 2. 从目录批量筛选
const allImages = await fs.filterImagesFromDirectory("./docs", {
    mode: "regex",
    value: /\.png$/i,
});

// 3. 替换文件中的图片
const replaceResult = await fs.replaceImagesInFile("/path/to/file.md", [
    {
        field: "src",
        pattern: "./old.png",
        newSrc: "https://cdn.example.com/new.png",
        newAlt: "New description",
    },
]);

// 4. 批量替换目录中的图片
const dirResult = await fs.replaceImagesInDirectory("./docs", [
    { field: "src", pattern: "./old/", newSrc: "./new/" },
]);

// 5. 安全删除本地图片（含引用检查）
const deleteResult = await fs.deleteLocalImage("/path/to/image.png", {
    strategy: "trash",
    maxRetries: 3,
});
```

### 上传本地图片

```typescript
import { uploadLocalImageInMarkdown, ConfigBuilder } from "@cmtx/asset/upload";
import { AliOSSAdapter } from "@cmtx/storage/adapters/ali-oss";
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

// 3. 构建配置（链式调用）
const config = new ConfigBuilder()
    .storages({
        default: { adapter, namingTemplate: "{date}_{hash}{ext}" },
    })
    .useStorage("default")
    .prefix("blog/images/")
    .replace({
        fields: {
            src: "{cloudSrc}?x-oss-process=image/resize,w_640",
            alt: "{originalAlt} - 来自我的博客",
        },
    })
    .build();

// 4. 执行上传
const result = await uploadLocalImageInMarkdown("/path/to/article.md", config);

console.log(`成功上传 ${result.uploaded} 个图片`);
console.log(`成功替换 ${result.replaced} 个引用`);

// 5. 获取处理后的内容
console.log(result.content); // 处理后的 Markdown 内容
```

### API 说明

**uploadLocalImageInMarkdown 参数：**

```typescript
interface UploadOptions {
  writeFile?: boolean;  // 是否写入文件，默认 false
}

await uploadLocalImageInMarkdown(
  filePath: string,
  config: UploadConfig,
  options?: UploadOptions
);
```

**返回值：**

```typescript
interface UploadResult {
    success: boolean; // 是否全部成功
    content: string; // 处理后的 Markdown 内容
    uploaded: number; // 上传成功的图片数
    replaced: number; // 替换成功的引用数
    deleted: number; // 删除成功的本地图片数
    failed?: FailedItem[]; // 失败项
    deduplicationInfo?: DeduplicationInfo; // 去重信息
}
```

**使用示例：**

```typescript
// 默认不写入文件，返回内容（适合集成到其他工具）
const result = await uploadLocalImageInMarkdown(filePath, config);
console.log(result.content);

// 写入文件（CLI 行为）
await uploadLocalImageInMarkdown(filePath, config, { writeFile: true });
```

### 统一流水线（高级用法）

当你需要把上传能力集成到编辑器内存文本或自定义文档系统时，可以使用统一流水线 API：

```typescript
import {
    executeUploadPipeline,
    type DocumentAccessor,
    type UploadStrategy,
} from "@cmtx/asset/upload";

const result = await executeUploadPipeline({
    documentAccessor,
    uploadStrategy,
    config,
    baseDirectory: process.cwd(),
});
```

该模式把“文档读写”和“上传动作”抽象为策略接口，CLI（文件写回）和 VS Code（内存编辑）可共用同一上传编排逻辑。

### 转移远程图片

```typescript
import { transferRemoteImages, TransferConfigBuilder } from "@cmtx/asset/transfer";

// 构建传输配置
const transferConfig = new TransferConfigBuilder()
    .source({
        customDomain: "https://private.example.com",
        credentials: {
            provider: "aliyun-oss",
            accessKeyId: process.env.SOURCE_KEY_ID,
            accessKeySecret: process.env.SOURCE_KEY_SECRET,
            region: "oss-cn-hangzhou",
            bucket: "private-bucket",
        },
    })
    .target({
        customDomain: "https://cdn.example.com",
        credentials: {
            provider: "aliyun-oss",
            accessKeyId: process.env.TARGET_KEY_ID,
            accessKeySecret: process.env.TARGET_KEY_SECRET,
            region: "oss-cn-beijing",
            bucket: "public-bucket",
        },
        prefix: "images/",
    })
    .options({
        concurrency: 5,
        onProgress: (progress) => {
            console.log(`${progress.current}/${progress.total}: ${progress.fileName}`);
        },
    })
    .build();

// 执行传输
const result = await transferRemoteImages("/path/to/article.md", transferConfig);

console.log(`成功传输 ${result.success} 个图片`);
console.log(`失败: ${result.failed}`);
console.log(`跳过: ${result.skipped}`);
```

## 架构关系

```
用户/CLI/VSCode → @cmtx/asset (文件操作 + 业务编排)
                     ↓              ↓               ↓
                 FileService    @cmtx/template    @cmtx/core
                 (文件读写)     (模板渲染)        (纯文本处理)
                     ↓              ↓               ↓
                 筛选/替换      生成替换文本      解析/格式化
                 删除/上传
                     ↓
              @cmtx/storage (云存储适配器)
```

@cmtx/asset 的职责：

1. **文件系统操作**（FileService）：读取文件、调用 core 处理文本、写回文件
2. **业务逻辑编排**：协调上传、转移、下载、删除等复杂任务
3. **调用 @cmtx/template**：生成具体的替换文本和命名规则
4. **调用 @cmtx/core**：执行纯文本处理（解析、替换、格式化）
5. **调用 @cmtx/storage**：与云存储服务交互

## 智能去重

@cmtx/asset/upload 提供两层去重机制，显著提升上传效率：

### 单文件去重

在单个 Markdown 文件内，相同的本地图片只上传一次：

```markdown
# 原始文档

![Logo](./images/logo.png)
![Logo Copy](./images/logo.png)
![Logo Again](./images/logo.png)

# 处理后

![Logo](https://cdn.example.com/logo.png)
![Logo Copy](https://cdn.example.com/logo.png)
![Logo Again](https://cdn.example.com/logo.png)

# 结果：3 个引用，1 次上传
```

### 跨文件全局去重

处理多个 Markdown 文件时，相同图片在不同文件间只上传一次：

```typescript
// 跨文件全局去重通过多次调用 uploadLocalImageInMarkdown 实现，
// 内部缓存机制会自动检测重复文件
const result = await uploadLocalImageInMarkdown("./docs/article1.md", config);
```

// 假设有 3 个文件都引用 logo.png
// 只会上传 1 次，其他 2 个文件会使用缓存的 URL
console.log(result.deduplicationInfo);
// {
//   uniqueFiles: 1,          // 实际唯一的图片文件数
//   totalReferences: 3,      // 总引用数
//   duplicateCount: 2,       // 单文件内的重复数
//   globalDedupSaved: 2      // 跨文件节省的引用数
// }
```

## 模板变量

### 命名模板变量

用于生成远程文件名：

- `{name}` - 文件名（不含扩展名）
- `{ext}` - 文件扩展名（如 `.png`）
- `{fileName}` - 完整文件名
- `{date}` - 当前日期（YYYY-MM-DD）
- `{year}/{month}/{day}` - 年月日
- `{md5}` - 完整 MD5 哈希
- `{md5_8}` - MD5 前 8 位
- `{md5_16}` - MD5 前 16 位

### 字段模板变量

用于替换 Markdown 字段值：

- `{cloudSrc}` - 云端图片 URL
- `{originalSrc}` - 原始 src 值
- `{originalAlt}` - 原始 alt 值
- `{originalTitle}` - 原始 title 值
- `{date}` - 当前日期
- `{timestamp}` - 时间戳

## 示例

查看 [examples](./examples/) 目录了解更多使用示例：

### 上传功能

- [01-basic-upload.ts](./examples/01-basic-upload.ts) - 基础上传功能演示
- [02-field-templates.ts](./examples/02-field-templates.ts) - 高级字段模板配置
- [03-aliyun-oss.ts](./examples/03-aliyun-oss.ts) - 阿里云 OSS 集成完整示例

### 转移功能

- [transfer-basic.ts](./examples/transfer-basic.ts) - 基础转移功能演示
- [transfer-cross-account.ts](./examples/transfer-cross-account.ts) - 跨账号传输示例
- [transfer-batch.ts](./examples/transfer-batch.ts) - 批量传输示例
- [transfer-config-file.ts](./examples/transfer-config-file.ts) - 配置文件使用示例

## 配置文件

支持使用 YAML 配置文件进行传输：

```yaml
# transfer-config.yaml
source:
    customDomain: https://private.example.com
    config:
        bucket: source-bucket
        region: oss-cn-hangzhou

target:
    customDomain: https://cdn.example.com
    prefix: images/
    overwrite: false
    config:
        bucket: target-bucket
        region: oss-cn-beijing

options:
    concurrency: 5
    tempDir: /tmp/cmtx-transfer
    filter:
        extensions:
            - .jpg
            - .png
            - .gif
        maxSize: 10485760 # 10MB
```

使用环境变量注入敏感信息：

```yaml
source:
    config:
        accessKeyId: ${ALIYUN_OSS_ACCESS_KEY_ID}
        accessKeySecret: ${ALIYUN_OSS_ACCESS_KEY_SECRET}
```

## 许可证

Apache-2.0

## 相关包

- [@cmtx/core](../core) - Markdown 纯文本处理（解析、替换、格式化）
- [@cmtx/storage](../storage) - 存储适配器（阿里云 OSS、腾讯云 COS）
- [@cmtx/template](../template) - 模板引擎（Builder 模式）
- [@cmtx/publish](../publish) - Markdown 发布处理（平台适配、规则引擎）
