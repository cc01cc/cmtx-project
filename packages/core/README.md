# @cmtx/core v0.2.0

Markdown 图片处理核心库。提供完整的图片筛选、替换和删除功能。

> **完整 API 文档**：运行 `pnpm run docs` 生成（位于 `docs/api/` 目录）

## 支持的图片格式

- **内联图片**：`![alt](url "title")`
- **HTML 图片**：`<img src="url" alt="alt" title="title" />` （部分属性可选）

## 核心功能

### 1. 图片筛选

从 Markdown 文本、文件或目录中筛选图片。支持按来源类型、主机名、绝对路径或正则表达式进行过滤。

**支持的图片类型**:
- `WebImageMatch` - Web 图片（http/https URL）
- `LocalImageMatch` - 本地图片（相对路径或绝对路径）

```typescript
import { filterImagesInText, filterImagesFromFile, filterImagesFromDirectory } from "@cmtx/core";

// 从文本中获取所有图片（不过滤）
const allImages = filterImagesInText(markdown);

// 从文本中筛选本地图片
const local = filterImagesInText(markdown, {
  mode: 'sourceType',
  value: 'local'
});

// 从文件中筛选特定主机的图片
const webImages = await filterImagesFromFile("./README.md", {
  mode: 'hostname',
  value: 'cc01cc.cn'
});

// 从目录批量筛选 PNG 图片
const pngImages = await filterImagesFromDirectory("./docs", {
  mode: 'regex',
  value: /\.png$/i
});
```

### 2. 图片替换

使用正则表达式替换图片的 src、alt 或 title 属性。支持多字段模式和目录批量替换。

**注意**: 替换使用正则表达式匹配，会替换所有符合条件的图片。

```typescript
import { replaceImagesInText, replaceImagesInFile, replaceImagesInDirectory } from "@cmtx/core";

// 多字段替换 - 通过 src 匹配，同时替换多个字段
const result = replaceImagesInText(markdown, [
  {
    field: 'src',
    pattern: './old-path/image.png',
    newSrc: 'https://cdn.example.com/image.png',
    newAlt: '新的图片描述',
    newTitle: '新的图片标题'
  }
]);

console.log(result.newText);        // 替换后的文本
console.log(result.replacements);   // 替换详情 [{before: '...', after: '...'}]

// 通过 raw 精确匹配替换
const exactResult = replaceImagesInText(markdown, [
  {
    field: 'raw',
    pattern: '![](./specific-image.png)',
    newSrc: './updated-image.png',
    newAlt: '精确匹配的图片'
  }
]);

// 使用正则表达式批量替换
const regexResult = replaceImagesInText(markdown, [
  {
    field: 'src',
    pattern: /\.png$/,
    newSrc: (match) => match.replace(/\.png$/, '.webp')
  }
]);

// 替换文件中的图片
const fileResult = await replaceImagesInFile("./README.md", [
  {
    field: 'src',
    pattern: './old-image.png',
    newSrc: './new-image.png'
  }
]);

if (fileResult.success) {
  console.log(`已替换 ${fileResult.result?.replacements.length} 张图片`);
}

// 批量替换目录中的图片
const dirResult = await replaceImagesInDirectory("./docs", [
  { field: 'src', pattern: './old/', newSrc: './new/' }
], {
  patterns: ['**/*.md'],
  ignore: ['**/node_modules/**', '**/.git/**']
});

console.log(`处理了 ${dirResult.totalFiles} 个文件`);
console.log(`成功替换 ${dirResult.totalReplacements} 次`);
```

### 3. 图片删除

安全删除本地图片文件，支持多种策略（trash/move/hard-delete）和重试机制。

```typescript
import { deleteLocalImage, deleteLocalImageSafely } from "@cmtx/core";

// 使用系统回收站删除
const result = await deleteLocalImage("/path/to/image.png", {
  strategy: "trash",
  maxRetries: 3
});

// 安全删除（检查使用情况）
const safeResult = await deleteLocalImageSafely(
  "/project/docs/images/logo.png",
  "/project",
  { strategy: "trash" }
);

if (safeResult.status === "success") {
  console.log("图片已删除");
} else if (safeResult.error?.includes("still in use")) {
  console.log("图片仍在使用中");
}
```

## 删除策略

| 策略          | 说明       | 场景            |
| ------------- | ---------- | --------------- |
| `trash`       | 系统回收站 | 推荐，跨平台 |
| `move`        | 移动到目录 | 可选，保留副本   |
| `hard-delete` | 永久删除   | 需要谨慎        |

## 示例脚本

快速演示各功能的使用：

```bash
# 筛选图片
pnpm exec tsx examples/1-comprehensive-analysis.ts
pnpm exec tsx examples/2-find-all.ts

# 获取图片详情
pnpm exec tsx examples/3-get-details.ts

# 删除图片
pnpm exec tsx examples/4-delete-images.ts
pnpm exec tsx examples/5-delete-file.ts

# 替换图片
pnpm exec tsx examples/5-replace-image.ts
pnpm exec tsx examples/6-batch-replace.ts

# 多语言测试
pnpm exec tsx examples/7-multilingual-test.ts
```

详见 [examples/README.md](./examples/README.md)

## 使用

```bash
# 安装
pnpm add @cmtx/core

# 构建
pnpm build

# 测试
pnpm test

# 生成 API 文档（输出到 docs/api/）
pnpm run docs
```

## 编码支持说明

> **重要**：本包默认使用 UTF-8 编码处理所有文件。

### 支持的编码
- ✅ **UTF-8**：完全支持（默认）
- ⚠️ **其他编码**：不直接支持（GBK、Latin-1 等）

### 处理非 UTF-8 文件的建议

如果需要处理其他编码的 Markdown 文件，请先转换编码：

```bash
# 使用 iconv 转换编码（Linux/macOS）
iconv -f gbk -t utf-8 input.md > output.md

# 使用 PowerShell 转换编码（Windows）
Get-Content input.md -Encoding GBK | Set-Content output.md -Encoding UTF8
```

### 为什么不内置编码支持？

1. **保持简洁**：core 包专注于核心图片处理功能
2. **性能考虑**：编码检测和转换会增加处理开销
3. **使用场景**：现代 Markdown 项目普遍使用 UTF-8
4. **替代方案**：用户可在预处理阶段处理编码转换

## API 设计说明

### 架构特点

本包采用**正则统一架构**，专注于提供基础原子操作：

- ✅ **极简依赖**：仅依赖 fast-glob（目录扫描）和 trash（回收站支持）
- ✅ **高性能**：纯 JavaScript 正则表达式解析
- ✅ **易维护**：清晰的模块化设计，每个模块职责单一
- ⚠️ **功能聚焦**：不提供精确位置信息，专注于核心图片处理
- ⚠️ **基础导向**：作为底层基础库，为上层应用提供可靠支撑
- ⚠️ **编码限制**：默认使用 UTF-8 编码处理文件，不支持其他编码格式

### 核心类型

#### ImageMatch
图片匹配结果的联合类型：
```typescript
type ImageMatch = WebImageMatch | LocalImageMatch;

interface WebImageMatch {
  type: 'web';
  alt: string;
  src: string;           // 完整 URL
  title?: string;
  raw: string;           // 原始图片语法
  markdownType: 'markdown-singleline' | 'html-singleline';
  source: 'text' | 'file';
}

interface LocalImageMatch {
  type: 'local';
  alt: string;
  src: string;           // Markdown 中的原始路径
  absLocalPath?: string; // 绝对路径（仅文件层有）
  title?: string;
  raw: string;
  markdownType: 'markdown-singleline' | 'html-singleline';
  source: 'text' | 'file';
}
```

#### ReplaceOptions
替换操作的配置：
```typescript
interface ReplaceOptions {
  field: 'src' | 'alt' | 'title';  // 要替换的字段
  pattern: string | RegExp;         // 要匹配的值（支持正则）
  newValue: string;                 // 新值
}

interface ReplaceResult {
  newText: string;                  // 替换后的文本
  replacements: ReplacementDetail[]; // 替换详情
}

interface ReplacementDetail {
  before: string;  // 替换前的完整图片语法
  after: string;   // 替换后的完整图片语法
}

interface DirectoryReplaceResult {
  totalFiles: number;              // 总共处理的文件数
  successfulFiles: number;         // 成功处理的文件数
  failedFiles: number;             // 失败的文件数
  totalReplacements: number;       // 总替换次数
  results: FileReplaceResult[];    // 详细结果
}
```

## 测试

运行测试套件：

```bash
# 运行所有测试
pnpm test

# 运行特定模块的测试
pnpm test parser
pnpm test filter
pnpm test replacer
pnpm test replace
pnpm test delete
```

## 文档

生成 API 文档：

```bash
pnpm run docs
```

生成的文档位于 `docs/api/` 目录，包含所有公共 API 的详细说明和示例。

## 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 监听模式构建
pnpm build --watch

# 代码检查
pnpm lint
```
