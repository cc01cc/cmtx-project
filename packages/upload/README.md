# @cmtx/upload

上传 Markdown 中引用的本地图片到对象存储（如阿里云 OSS），并自动替换为远程 URL。

> **完整 API 文档**：运行 `pnpm run docs` 生成（位于 `docs/api/` 目录）

## 特性

### 核心功能
- **智能上传** - `uploadLocalImageInMarkdown()` 扫描并上传 Markdown 文件中的本地图片
- **模板系统** - 灵活的命名模板和字段模板，支持 `{md5_8}_{original}{ext}` 等语法
- **多字段替换** - 同时替换 src、alt、title 字段，支持模板变量渲染
- **安全删除** - 集成 @cmtx/core 删除功能，支持 trash/move/hard-delete 策略

### 架构优势
- **模块化设计** - 配置构建器模式，链式调用 API
- **适配器模式** - 支持多种云存储服务（阿里云 OSS、AWS S3 等）
- **事件驱动** - 完整的进度跟踪和回调机制
- **智能去重** - 单文件和跨文件两级去重，优化上传效率

## 智能去重

@cmtx/upload 提供两层去重机制，显著提升上传效率：

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

### 获取去重统计

```typescript
const result = await uploadMarkdown("article.md", { adapter });

if (result.deduplicationInfo) {
  const { uniqueFiles, totalReferences, duplicateCount, globalDedupSaved } = 
    result.deduplicationInfo;
  
  console.log(`优化率: ${
    ((duplicateCount + (globalDedupSaved || 0)) / totalReferences * 100).toFixed(1)
  }%`);
}
```

## 安装

```bash
pnpm add @cmtx/upload @cmtx/core

# 如果使用阿里云 OSS
pnpm add ali-oss
```

## 快速开始

### 上传单个 Markdown 文件

```typescript
import { uploadLocalImageInMarkdown, ConfigBuilder } from "@cmtx/upload";
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
  .events(
    (event) => {
      console.log(`[${event.type}]`, event.data);
    },
    (level, message) => {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  )
  .build();

// 4. 执行上传
const result = await uploadLocalImageInMarkdown("/path/to/article.md", config);

console.log(`成功上传 ${result.uploaded} 个图片`);
console.log(`成功替换 ${result.replaced} 个引用`);
```

### 批量处理多个文件

```typescript
// 可以循环处理多个文件
const files = ["/path/to/doc1.md", "/path/to/doc2.md", "/path/to/doc3.md"];

for (const file of files) {
  const result = await uploadLocalImageInMarkdown(file, config);
  console.log(`${file}: 上传 ${result.uploaded} 个图片`);
}
```

### 高级模板配置

```typescript
const advancedConfig = new ConfigBuilder()
  .storage(adapter, {
    prefix: "uploads/blog/",
    namingPattern: "{date}_{md5_8}{ext}"  // 按日期组织文件
  })
  .replace({
    fields: {
      src: "{cloudSrc}?optimize=true&quality=80",
      alt: "{author} - 来自我的博客",
      title: "博客图片"
    },
    context: {
      author: "张三",
      site: "myblog.com"
    }
  })
  .delete({
    strategy: "trash",
    rootPath: "/path/to/project",
    maxRetries: 3
  })
  .build();

// 生成的 Markdown 示例：
// ![张三 - 来自我的博客](https://cdn.example.com/20250130_a1b2c3d4.png?optimize=true&quality=80 "博客图片")
```

## 自定义存储适配器

实现 `IStorageAdapter` 接口以支持其他云存储服务：

```typescript
import type { IStorageAdapter, AdapterUploadResult } from "@cmtx/upload";

class MyStorageAdapter implements IStorageAdapter {
  async upload(localPath: string, remotePath: string): Promise<AdapterUploadResult> {
    // 上传文件到你的存储服务
    // 返回上传结果对象
    return {
      name: remotePath,
      url: `https://your-cdn.com/${remotePath}`
    };
  }
}

const adapter = new MyStorageAdapter();

// 使用自定义适配器
const config = new ConfigBuilder()
  .storage(adapter, {
    prefix: "my-images/",
    namingPattern: "{md5_8}{ext}"
  })
  .build();
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

> 查看完整的模板变量列表和 API 文档，运行：`pnpm run docs`

## 示例

### 运行示例

先生成本地占位数据（不会提交到 git）：

```bash
pnpm exec tsx examples/scripts/gen-demo-data.ts
```

然后运行示例：

```bash
# 基础上传示例
pnpm exec tsx examples/01-basic-upload.ts

# 字段模板配置示例
pnpm exec tsx examples/02-field-templates.ts

# 阿里云 OSS 完整示例
pnpm exec tsx examples/03-aliyun-oss.ts
```

### 示例文件说明

查看 [examples](./examples/) 目录了解更多使用示例：

- [01-basic-upload.ts](./examples/01-basic-upload.ts) - 基础上传功能演示
- [02-field-templates.ts](./examples/02-field-templates.ts) - 高级字段模板配置
- [03-aliyun-oss.ts](./examples/03-aliyun-oss.ts) - 阿里云 OSS 集成完整示例

> 默认 `maxFileSize` 为 10MB，生成的数据包含更大的占位文件，若要处理它们请在示例参数中显式提升 `maxFileSize`。

## 许可证

Apache-2.0

## 相关包

- [@cmtx/core](../core) - Markdown 图片解析和替换核心功能
