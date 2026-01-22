# Markdown 图片提取器

从 Markdown 文本、文件或目录中提取符合特定条件的图片，支持按网页域名或本地路径进行过滤。提供灵活的路径处理机制，支持相对路径和绝对路径混用，并可通过 `projectRoot` 参数统一管理相对路径基准点。

## 快速开始

### 基本用法

```typescript
import { extractImages } from "@cmtx/core";

const markdown = `
![cc01cc logo](https://cc01cc.cn/logo.png "官网 logo")
![local image](./images/demo.png)
![other](https://example.com/image.png)
`;

// 仅提取 cc01cc.cn 域名的图片
const result = extractImages(markdown, {
  webHosts: ["cc01cc.cn"],
});

console.log(result);
// [
//   {
//     alt: "cc01cc logo",
//     src: "https://cc01cc.cn/logo.png",
//     title: "官网 logo",
//     raw: '![cc01cc logo](https://cc01cc.cn/logo.png "官网 logo")',
//     index: 0,
//     sourceType: "web"
//   }
// ]
```

## 核心特性

| 特性 | 说明 |
|------|------|
| **网页图片过滤** | 按域名严格匹配 HTTP/HTTPS 图片 |
| **本地图片过滤** | 按路径前缀匹配本地文件 |
| **通配符支持** | 使用 `*` 匹配所有网页或所有本地图片 |
| **跨平台路径** | 目录扫描返回统一的正斜杠路径 |
| **异步扫描** | 高效递归扫描目录中的所有 Markdown 文件 |
| **projectRoot 参数** | 统一管理相对路径基准点，支持灵活的项目结构 |
| **图片引用检查** | 检查 Markdown 文件是否引用特定图片（支持相对路径和绝对路径） |
| **批量查找** | 在目录中查找所有引用特定图片的文件 |
| **详细位置信息** | 获取图片在 Markdown 文件中的行号、列号和上下文 |

## 常见用例

### 1. 从文本提取网页和本地图片

```typescript
import { extractImages } from "@cmtx/core";

const markdown = `![web](https://cc01cc.cn/a.png) ![local](./b.png)`;

const result = extractImages(markdown, {
  webHosts: ["cc01cc.cn"],
  localPrefixes: ["./"]
});

// result.length === 2
```

### 2. 从文件提取图片

```typescript
import { extractImagesFromFile } from "@cmtx/core";

const images = await extractImagesFromFile("./README.md", {
  webHosts: ["cc01cc.cn"]
});

console.log(`找到 ${images.length} 个 cc01cc.cn 的图片`);
```

### 3. 从目录递归扫描所有 Markdown 文件

```typescript
import { extractImagesFromDirectory } from "@cmtx/core";

// 使用 projectRoot 参数统一管理相对路径基准点
const results = await extractImagesFromDirectory("./docs", {
  webHosts: ["*"],
  localPrefixes: ["./"],
  depth: "all",  // 扫描所有子目录（默认）
  projectRoot: "C:\\my-project"  // 指定项目根目录
});

// 输出结果 - 返回的路径已拆分为 rootPath + relativePath + absolutePath
for (const result of results) {
  console.log(`文件：${result.relativePath}`);
  console.log(`绝对路径：${result.absolutePath}`);
  console.log(`图片数量：${result.images.length}`);
  result.images.forEach(img => {
    console.log(`  - ${img.alt}: ${img.src}`);
  });
}
```

### 4. 限制扫描深度

```typescript
// 仅扫描根目录
const root = await extractImagesFromDirectory("./docs", {
  webHosts: ["*"],
  depth: 0
});

// 扫描根目录和一级子目录
const oneLevel = await extractImagesFromDirectory("./docs", {
  webHosts: ["*"],
  depth: 1
});
```

### 5. 汇总所有图片

```typescript
const results = await extractImagesFromDirectory("./docs", {
  webHosts: ["*"],
  localPrefixes: ["*"]
});

// 获取扁平的图片列表，包含所在文件
const allImages = results.flatMap(r =>
  r.images.map(img => ({
    ...img,
    file: r.relativePath
  }))
);

console.log(`共找到 ${allImages.length} 个图片`);
```

### 6. 检查 Markdown 文件是否引用了特定图片

```typescript
import { isImageReferencedInFile } from "@cmtx/core";

// 支持 projectRoot 参数 - 相对路径将基于 projectRoot 解析
const isReferenced = await isImageReferencedInFile(
  "./images/logo.png",     // 相对于 projectRoot 的图片路径
  "./docs/README.md",      // 相对于 projectRoot 的 Markdown 文件路径
  { projectRoot: "C:\\project" }  // 指定项目根目录
);

if (isReferenced) {
  console.log("该文件引用了这个图片");
}

// 也支持绝对路径（不需要 projectRoot）
const isRefAbsolute = await isImageReferencedInFile(
  "C:\\project\\images\\logo.png",  // 图片的绝对路径
  "C:\\project\\docs\\README.md"    // Markdown 文件的绝对路径
);
```

### 7. 批量查找引用特定图片的所有文件

```typescript
import { findFilesReferencingImage } from "@cmtx/core";

// 使用 projectRoot 统一管理相对路径
const referencingFiles = await findFilesReferencingImage(
  "./images/logo.png",    // 相对于 projectRoot 的图片路径
  "./docs",               // 相对于 projectRoot 的搜索目录
  { 
    depth: "all",
    projectRoot: "C:\\project"  // 指定项目根目录
  }
);

console.log(`找到 ${referencingFiles.length} 个文件引用了该图片：`);
referencingFiles.forEach(file => {
  console.log(`- ${file.relativePath}`);  // 使用 relativePath（相对于 rootPath）
});
```

### 8. 获取图片引用的详细位置信息

```typescript
import { getImageReferenceDetails } from "@cmtx/core";

// 获取所有引用 logo.png 的详细位置信息
const details = await getImageReferenceDetails(
  "./images/logo.png",
  "./docs",
  { 
    depth: "all",
    projectRoot: "C:\\project"
  }
);

// 遍历所有引用位置
details.forEach(detail => {
  console.log(`文件：${detail.relativePath}`);
  console.log(`绝对路径：${detail.absolutePath}`);
  console.log(`引用次数：${detail.locations.length}`);
  
  detail.locations.forEach((loc, i) => {
    console.log(`  引用 ${i + 1}:`);
    console.log(`    行号：${loc.line}`);
    console.log(`    列号：${loc.column}`);
    console.log(`    内容：${loc.lineText.trim()}`);
  });
});
```

## API 参考

### 导出项

| 项目 | 说明 |
| --- | --- |
| `extractImages(md, options?)` | 从 Markdown 文本提取图片 |
| `extractImagesFromFile(path, options?)` | 从 Markdown 文件提取图片 |
| `extractImagesFromDirectory(dir, options?)` | 从目录递归扫描并提取图片 |
| `isImageReferencedInFile(imagePath, mdPath, options?)` | 检查单个文件是否引用了特定图片 |
| `findFilesReferencingImage(imagePath, dir, options?)` | 查找所有引用特定图片的文件 |
| `getImageReferenceDetails(imagePath, dir, options?)` | 获取图片引用的详细位置信息（行号、列号、上下文） |

### 主要类型

```typescript
// 匹配到的图片
interface ImageMatch {
  alt: string;           // 图片的 alt 文本
  src: string;           // 图片源（URL 或本地路径）
  title?: string;        // 图片的 title
  raw: string;           // 原始 Markdown 片段
  index: number;         // 在文本中的位置
  sourceType: "web" | "local";  // 图片类型
}

// 提取选项
interface ExtractOptions {
  webHosts?: string[];       // 网页图片的域名列表（支持 "*"）
  localPrefixes?: string[];  // 本地图片的路径前缀列表（支持 "*"）
  projectRoot?: string;      // 项目根目录（用于解析相对路径）
}

// 目录扫描选项
interface ScanDirectoryOptions extends ExtractOptions {
  depth?: "all" | number;  // 扫描深度（"all" 为默认）
}

// 目录扫描结果
interface DirectoryScanResult {
  rootPath: string;          // 搜索根目录的绝对路径
  relativePath: string;      // 相对于 rootPath 的路径（始终使用 /）
  absolutePath: string;      // 文件的绝对路径
  images: ImageMatch[];      // 该文件中的图片
}

// 图片引用位置信息
interface ImageReferenceLocation {
  line: number;      // 行号（从 1 开始）
  column: number;    // 列号（从 0 开始）
  lineText: string;  // 该行的完整文本内容
}

// 图片引用详细信息
interface ImageReferenceDetail {
  rootPath: string;                    // 搜索根目录的绝对路径
  relativePath: string;                // 相对于 rootPath 的文件路径
  absolutePath: string;                // 文件的绝对路径
  locations: ImageReferenceLocation[]; // 该文件中所有引用位置
}
```

## 错误处理

```typescript
try {
  const results = await extractImagesFromDirectory("/path/to/docs", {
    webHosts: ["*"]
  });
} catch (error) {
  console.error("扫描失败：", error.message);
  // 常见原因：路径不存在、无访问权限
}
```

扫描过程中无法读取的单个文件会被跳过，不会中断整个扫描。

## 位置信息标准

本库所有返回的**行号和列号**遵循**编辑器标准**（LSP/VS Code 标准），便于与编辑器 API 和开发工具集成。

### 位置编号规则

| 位置信息 | 起始值 | 说明 |
| -------- | ------ | ---- |
| **行号** | **1** | 从 1 开始，与编辑器显示保持一致 |
| **列号** | **0** | 从 0 开始，表示字符在行中的索引 |

### 示例说明

```markdown
1: # 标题
2: ![Logo](../images/logo.png)
   ^                          ^
   |                          |
   column: 0, line: 2      column: 27, line: 2
```

在上例中：

- `![Logo]` 开始于第 2 行，列号 0
- `png)` 结束于第 2 行，列号 27
- 用户在编辑器中看到的行号就是返回的 `line` 值
- 编辑器中显示的列号通常 = 返回的 `column` + 1（因为编辑器通常从列 1 开始显示）

### 为什么这样设计？

1. ✅ **符合 LSP 标准**：与 Language Server Protocol 保持一致
2. ✅ **编辑器友好**：与 VS Code、Vim 等编辑器的 API 直接对接
3. ✅ **无需转换**：用户在编辑器看到的行号就是库返回的值
4. ✅ **直观易用**：字符索引从 0 开始是编程中的常见约定

### 使用场景

```typescript
// 获取图片引用的详细位置
const details = await getImageReferenceDetails(
  "./images/logo.png",
  "./docs"
);

details.forEach(detail => {
  detail.locations.forEach(loc => {
    console.log(`第 ${loc.line} 行，第 ${loc.column} 列`);
    console.log(`行内容：${loc.lineText}`);
    
    // 在编辑器中跳转到该位置
    editor.goto({
      line: loc.line,
      column: loc.column
    });
  });
});
```

---

## 常见问题

**Q: 为什么子域名 `sub.cc01cc.cn` 没被匹配？**

A: 采用严格等值匹配。需要时在 `webHosts` 中明确列出所需的所有域名。

**Q: 如何匹配所有图片类型？**

A: 同时指定两个通配符：

```typescript
const allImages = extractImages(md, {
  webHosts: ["*"],
  localPrefixes: ["*"]
});
```

**Q: 扫描大目录会很慢吗？**

A: 包含几千个 Markdown 文件通常在数秒内完成。用 `depth` 参数限制扫描范围可进一步提速。

**Q: 返回的路径在 Windows 和 Linux 上一致吗？**

A: 是的。`filePath` 统一使用正斜杠 `/`，确保跨平台一致。

**Q: 不支持引用式图片 `[alt][ref]` 吗？**

A: 暂不支持。目前仅支持内联语法 `![alt](src)`。

**Q: 目录为空时会怎样？**

A: 返回空数组，不会抛出异常。

**Q: 图片引用检查如何处理相对路径？**

A: 自动解析相对路径（如 `../images/logo.png`）为绝对路径后进行比较。支持跨平台（Windows 下大小写不敏感）。

**Q: 如何找出哪些 Markdown 文件引用了某个即将删除的图片？**

A: 使用 `findFilesReferencingImage` 或 `getImageReferenceDetails` 函数：

```typescript
// 方式 1：仅获取文件列表
const files = await findFilesReferencingImage(
  "./images/old-logo.png",
  "./docs",
  { projectRoot: "C:\\project" }
);

if (files.length > 0) {
  console.log("以下文件还在使用该图片，请先更新：");
  files.forEach(f => console.log(f.relativePath));
}

// 方式 2：获取详细位置信息（推荐）
const details = await getImageReferenceDetails(
  "./images/old-logo.png",
  "./docs",
  { projectRoot: "C:\\project" }
);

details.forEach(detail => {
  console.log(`${detail.relativePath}:`);
  detail.locations.forEach(loc => {
    console.log(`  第 ${loc.line} 行：${loc.lineText.trim()}`);
  });
});
```

**Q: projectRoot 参数的作用是什么？**

A: `projectRoot` 统一管理所有相对路径的基准点。如果不指定，相对路径将基于 `process.cwd()`（当前工作目录）。使用 `projectRoot` 可以：

1. 明确指定项目根目录，避免依赖当前工作目录
2. 支持在不同位置运行脚本时保持路径解析一致
3. 简化配置，所有相对路径都相对于同一个基准点

```typescript
// 不使用 projectRoot - 相对于 process.cwd()
const results1 = await extractImagesFromDirectory("./docs");

// 使用 projectRoot - 相对于指定目录
const results2 = await extractImagesFromDirectory("./docs", {
  projectRoot: "C:\\my-project"
});
```

**Q: 返回的路径格式是什么？**

A: 所有返回结果都包含三种路径格式：

- `rootPath`: 搜索根目录的绝对路径（如 `C:/project/docs`）
- `relativePath`: 相对于 rootPath 的路径，使用 `/` 分隔符（如 `subfolder/README.md`）
- `absolutePath`: 文件的完整绝对路径（如 `C:/project/docs/subfolder/README.md`）

这种设计提供了最大灵活性，可以根据需求选择使用哪种路径格式。

**Q: 如何获取图片在 Markdown 文件中的具体位置？**

A: 使用 `getImageReferenceDetails()` 函数获取详细的行号、列号和上下文信息：

```typescript
const details = await getImageReferenceDetails(
  "./images/logo.png",
  "./docs"
);

details.forEach(detail => {
  detail.locations.forEach(loc => {
    console.log(`第 ${loc.line} 行，第 ${loc.column} 列`);
    console.log(`内容：${loc.lineText}`);
  });
});
```

行号从 1 开始，列号从 0 开始（与大多数编辑器一致）。

---

## 未来功能规划

| 功能 | 优先级 | 预计版本 | 说明 |
| ---- | ------ | -------- | ---- |
| 移动/重命名图片 | 高 | 0.2.0 | 移动图片文件并自动更新所有引用 |
| 检查损坏引用 | 高 | 0.2.0 | 检测引用了不存在的图片 |
| 查找未使用图片 | 高 | 0.2.0 | 找出未被任何文件引用的图片 |
| 反向查询 | 中 | 0.3.0 | 查询单个文件引用的所有图片 |
| 批量操作 | 中 | 0.3.0 | 一次替换多个图片引用 |

---

## 更多信息

- **完整的 API 文档**：运行 `pnpm docs` 生成 TypeDoc（位于 `docs/api/`）
- **源码注释**：参考 `src/markdownImages.ts` 中的详细实现
- **测试用例**：`tests/markdownImages.test.ts` 包含全面的使用示例
