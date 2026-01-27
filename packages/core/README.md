# @cmtx/core

核心依赖包，为其他项目提供通用能力。

## 核心功能

### Markdown 图片提取器

从 Markdown 文本或文件中提取符合特定域名或路径条件的图片元素。支持单个文件提取、目录递归扫描、图片引用追踪和详细的引用位置查询。支持灵活的路径处理，可通过 `projectRoot` 参数统一管理相对路径基准点。

详见：[Markdown 图片提取器完整文档](./docs/markdown-image-extractor.md)

#### 快速示例 - 从文本提取

```typescript
import { extractImages } from "@cmtx/core";

const markdown = `
![logo](https://cc01cc.cn/logo.png)
![demo](./images/demo.png)
`;

const result = extractImages(markdown, {
  webHosts: ["cc01cc.cn"],
  localPrefixes: ["./"]
});
```

#### 快速示例 - 从文件提取

```typescript
import { extractImagesFromFile } from "@cmtx/core";

const images = await extractImagesFromFile("./README.md", {
  webHosts: ["cc01cc.cn"]
});
```

#### 快速示例 - 从目录递归扫描

```typescript
import { extractImagesFromDirectory } from "@cmtx/core";

// 使用 projectRoot 统一管理相对路径
const results = await extractImagesFromDirectory("docs", {
  webHosts: ["cc01cc.cn"],
  localPrefixes: ["./"],
  depth: "all",  // 默认递归扫描所有子目录
  projectRoot: "/path/to/project"  // 相对路径的基准点
});

// 结果包含 rootPath（搜索根目录）、relativePath（相对路径）和 absolutePath（绝对路径）
results.forEach(r => {
  console.log(`File: ${r.relativePath}`);
  console.log(`  Root: ${r.rootPath}`);
  console.log(`  Absolute: ${r.absolutePath}`);
  console.log(`  Images: ${r.images.length}`);
});
```

#### 快速示例 - 检查图片引用

```typescript
import { 
  isImageReferencedInFile, 
  findFilesReferencingImage,
  getImageReferenceDetails 
} from "@cmtx/core";

const projectRoot = "/path/to/project";

// 1. 检查单个文件是否引用了特定图片
const isReferenced = await isImageReferencedInFile(
  "images/logo.png",  // 支持相对路径
  "docs/README.md",
  { projectRoot }
);

if (isReferenced) {
  console.log("该文件引用了这个图片");
}

// 2. 批量查找所有引用特定图片的文件
const referencingFiles = await findFilesReferencingImage(
  "images/logo.png",
  "docs",
  { depth: "all", projectRoot }
);

console.log(`找到 ${referencingFiles.length} 个文件引用了该图片`);
referencingFiles.forEach(file => {
  console.log(`- ${file.relativePath}`);
});

// 3. 获取详细的引用位置信息（NEW）
const details = await getImageReferenceDetails(
  "images/logo.png",
  "docs",
  { projectRoot }
);

details.forEach(detail => {
  console.log(`\nFile: ${detail.relativePath}`);
  detail.locations.forEach(loc => {
    console.log(`  Line ${loc.line}, Column ${loc.column}:`);
    console.log(`    ${loc.lineText}`);
  });
});
```

## 示例脚本

项目提供了 4 个简洁的示例脚本，演示核心 API 的使用方法：

```bash
# 示例 1: 检查单个文件
pnpm exec tsx examples/1-check-single-file.ts

# 示例 2: 查找所有引用
pnpm exec tsx examples/2-find-all.ts

# 示例 3: 获取详细位置
pnpm exec tsx examples/3-get-details.ts

# 示例 4: 安全删除图片
pnpm exec tsx examples/4-safe-delete.ts
```

| 示例 | API | 输出 |
| ---- | ---- | ------ |
| [1-check-single-file.ts](./examples/1-check-single-file.ts) | `isImageReferencedInFile` | `true` / `false` |
| [2-find-all.ts](./examples/2-find-all.ts) | `findFilesReferencingImage` | 文件列表 |
| [3-get-details.ts](./examples/3-get-details.ts) | `getImageReferenceDetails` | 详细位置 |
| [4-safe-delete.ts](./examples/4-safe-delete.ts) | `safeDeleteLocalImage` | 删除结果 |

详见 [examples/README.md](./examples/README.md)。

## 使用

```bash
pnpm add @cmtx/core
```

## 开发

### 构建

```bash
pnpm build
```

### 测试

```bash
pnpm test
```

### 生成文档

```bash
pnpm run docs
```

生成的 API 文档位于 `docs/api/` 目录。
