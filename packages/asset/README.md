# @cmtx/asset

Markdown 资产管理工具。支持本地图片上传和远程图片转移，负责业务逻辑编排，调用模板引擎生成文本，调用核心库执行文档操作。

> **完整 API 文档**：运行 `pnpm run docs` 生成（位于 `docs/api/` 目录）

## 子模块

### @cmtx/asset/upload

本地图片上传到对象存储。

### @cmtx/asset/transfer

远程图片在存储间转移。

## 核心理念

- **业务逻辑编排**：负责协调各组件完成复杂任务
- **无直接文档操作**：调用 @cmtx/template 生成文本，调用 @cmtx/core 执行操作
- **高度模块化**：通过配置构建器模式实现灵活组合

## 特性

### 上传功能

- **智能上传** - `uploadLocalImageInMarkdown()` 扫描并上传 Markdown 文件中的本地图片
- **模板系统** - 集成 @cmtx/template 的 Builder 模式，支持灵活的命名规则
- **多字段替换** - 同时替换 src、alt、title 字段，支持模板变量渲染
- **安全删除** - 集成 @cmtx/core 删除功能，支持 trash/move/hard-delete 策略

### 转移功能

- **远程转移** - `transferRemoteImages()` 将远程图片从源存储转移到目标存储
- **URL 识别** - 自动识别属于源存储的 URL
- **并发控制** - 支持并发传输和进度跟踪
- **自动替换** - 传输完成后自动替换 Markdown 中的 URL

### 架构优势

- **分层设计** - 与 @cmtx/template 和 @cmtx/core 协作
- **模块化设计** - 配置构建器模式，链式调用 API
- **适配器模式** - 支持多种云存储服务（阿里云 OSS、AWS S3 等）
- **事件驱动** - 完整的进度跟踪和回调机制
- **智能去重** - 单文件和跨文件两级去重，优化上传效率

## 安装

```bash
pnpm add @cmtx/asset @cmtx/core

# 如果使用阿里云 OSS
pnpm add ali-oss
```

## 快速开始

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
  .storage(adapter, {
    prefix: "blog/images/",
    namingPattern: "{date}_{md5_8}{ext}"
  })
  .replace({
    fields: {
      src: "{cloudSrc}?x-oss-process=image/resize,w_640",
      alt: "{originalAlt} - 来自我的博客"
    }
  })
  .build();

// 4. 执行上传
const result = await uploadLocalImageInMarkdown("/path/to/article.md", config);

console.log(`成功上传 ${result.uploaded} 个图片`);
console.log(`成功替换 ${result.replaced} 个引用`);

// 5. 获取处理后的内容
console.log(result.content);  // 处理后的 Markdown 内容
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
  options?: UploadOptions | LoggerCallback  // 向后兼容：第三个参数也可以是 LoggerCallback
);
```

**返回值：**

```typescript
interface UploadResult {
  content: string;    // 处理后的 Markdown 内容
  uploaded: number;   // 上传成功的图片数
  replaced: number;   // 替换成功的引用数
  deleted: number;    // 删除成功的本地图片数
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
import { AliOSSAdapter } from "@cmtx/storage/adapters/ali-oss";
import OSS from "ali-oss";

// 1. 配置源存储（私有 Bucket）
const sourceAdapter = new AliOSSAdapter(
  new OSS({
    region: "oss-cn-hangzhou",
    accessKeyId: "source-key",
    accessKeySecret: "source-secret",
    bucket: "private-bucket",
  })
);

// 2. 配置目标存储（公开 Bucket）
const targetAdapter = new AliOSSAdapter(
  new OSS({
    region: "oss-cn-beijing",
    accessKeyId: "target-key",
    accessKeySecret: "target-secret",
    bucket: "public-bucket",
  })
);

// 3. 构建传输配置
const transferConfig = new TransferConfigBuilder()
  .source(sourceAdapter, {
    customDomain: "https://private.example.com"
  })
  .target(targetAdapter, {
    customDomain: "https://cdn.example.com",
    prefix: "images/",
    namingStrategy: "preserve"
  })
  .options({
    concurrency: 5,
    onProgress: (progress) => {
      console.log(`${progress.current}/${progress.total}: ${progress.fileName}`);
    }
  })
  .build();

// 4. 执行传输
const result = await transferRemoteImages("/path/to/article.md", transferConfig);

console.log(`成功传输 ${result.success} 个图片`);
console.log(`失败: ${result.failed}`);
console.log(`跳过: ${result.skipped}`);
```

## 架构关系

```
用户/CLI → @cmtx/asset → @cmtx/template → @cmtx/core
     ↓         ↓              ↓              ↓
   配置参数   业务编排      生成文本        执行替换
```

@cmtx/asset 作为业务逻辑编排层：

1. 接收用户配置和参数
2. 调用 @cmtx/template 生成具体的替换文本
3. 调用 @cmtx/core 执行实际的文档操作

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
const result = await uploadDirectory("./docs", {
  adapter: ossAdapter,
  deleteRootPath: "./docs"
});

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
  namingStrategy: preserve
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
    maxSize: 10485760  # 10MB
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

- [@cmtx/core](../core) - Markdown 图片处理与元数据核心功能
- [@cmtx/storage](../storage) - 存储适配器
- [@cmtx/template](../template) - 模板引擎
