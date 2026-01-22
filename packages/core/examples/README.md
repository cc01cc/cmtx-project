# 示例脚本

演示如何使用 @cmtx/core 的核心 API。

## 演示数据

`demo-data/` 目录包含测试用的 Markdown 文件和图片：

```
demo-data/
├── docs/
│   ├── README.md    # 引用了 logo.png 和 banner.png
│   ├── guide.md     # 引用了 logo.png 和 banner.png
│   └── blog.md      # 没有图片引用
└── images/
    ├── logo.png     # 被引用
    ├── banner.png   # 被引用
    └── unused.png   # 未被引用
```

## 运行示例

```bash
# 示例 1: 检查单个文件
pnpm exec tsx examples/1-check-single-file.ts

# 示例 2: 查找所有引用
pnpm exec tsx examples/2-find-all.ts

# 示例 3: 获取详细位置
pnpm exec tsx examples/3-get-details.ts

# 示例 4: 安全删除
pnpm exec tsx examples/4-safe-delete.ts
```

## 示例说明

### 1-check-single-file.ts

检查单个文件是否引用了图片。

**API**: `isImageReferencedInFile(imagePath, markdownFilePath)`

**输出**: `true` 或 `false`

### 2-find-all.ts

查找所有引用特定图片的文件。

**API**: `findFilesReferencingImage(imagePath, searchDir)`

**输出**: 文件列表数组

### 3-get-details.ts

获取图片引用的详细位置（行号、列号、行文本）。

**API**: `getImageReferenceDetails(imagePath, searchDir)`

**输出**: 包含详细位置信息的数组

### 4-safe-delete.ts

安全删除图片（检查引用后删除）。

**API**: `safeDeleteLocalImage(rootDir, imagePath)`

**输出**: `{ deleted: true }` 或 `{ deleted: false, reason: "referenced", firstReference: {...} }`

## 在你的项目中使用

将 `examples/demo-data` 替换为你的实际项目路径：

```typescript
import { isImageReferencedInFile } from "@cmtx/core";

const result = await isImageReferencedInFile(
  "path/to/your/image.png",
  "path/to/your/markdown.md"
);

console.log(result);
```
