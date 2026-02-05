# 示例脚本

演示如何使用 @cmtx/core 的核心 API。

## 演示数据

`demo-data/` 目录包含测试用的 Markdown 文件和图片：

```
demo-data/
├── docs/
│   ├── README.md           # 基础功能测试
│   ├── core-features.md    # 核心特性测试
│   ├── path-formats.md     # 路径格式测试
│   ├── comprehensive-paths.md # 综合路径测试
│   └── multilingual.md     # 多语言路径测试
└── images/
   ├── logo.png             # 被引用
   ├── banner.png           # 被引用
   └── unused.png           # 未被引用
```

## 运行示例

```bash
# 示例 1: 综合图片分析和路径测试
pnpm exec tsx examples/1-comprehensive-analysis.ts

# 示例 2: 从目录中批量筛选图片
pnpm exec tsx examples/2-find-all.ts

# 示例 3: 解析 Markdown 文件中的图片
pnpm exec tsx examples/3-get-details.ts

# 示例 4: 图片删除功能综合演示
pnpm exec tsx examples/4-delete-images.ts

# 示例 5: 替换图片引用
pnpm exec tsx examples/5-replace-image.ts

# 示例 6: 目录级别图片替换（推荐API）
pnpm exec tsx examples/6-directory-replace.ts

# 示例 7: 多语言路径测试
pnpm exec tsx examples/7-multilingual-test.ts
```

## 示例说明

### 1-comprehensive-analysis.ts

综合图片分析和路径测试，整合了原来example 1和example 7的功能。

**API**: 
- `filterImagesFromFile(filePath, options)`
- `filterImagesInText(content)`

**功能**:
- 从多个文件中筛选和分析图片
- 按语法类型（Markdown/HTML）分类统计
- 按路径类型（相对/绝对/Web）分析
- 识别复杂路径格式
- 提供详细的统计汇总

### 2-find-all.ts

从目录中批量筛选所有图片。

**API**: `filterImagesFromDirectory(dirPath, options?)`

**输出**: 所有图片和文件统计

### 3-get-details.ts

解析Markdown文件中的图片，按语法类型分类。

**API**: `filterImagesInText(content)`

**输出**: 图片详情和语法分类统计

### 4-delete-images.ts

综合演示图片删除功能，包括安全删除和直接删除。

**API**: 
- `deleteLocalImageSafely(imagePath, rootPath, options)`
- `deleteLocalImage(imagePath, options)`

**输出**: 各种删除场景的结果对比

### 5-replace-image.ts

替换单个文件中的图片引用。

**API**: `replaceImagesInFile(filePath, replaceOptions[])`

**输出**: 替换结果和替换详情

### 6-directory-replace.ts

目录级别图片替换功能演示（推荐使用的新API）。

**API**: `replaceImagesInDirectory(dirPath, replaceOptions[], globOptions?, logger?)`

**功能**:
- 批量处理目录中的多个文件
- 支持文件模式匹配和忽略规则
- 提供详细的处理结果统计
- 与 filterImagesFromDirectory 设计风格一致
- 支持多字段同时替换
- 支持正则表达式高级匹配
- 支持详细日志回调

**输出**: 批量替换统计和结果

### 7-multilingual-test.ts

多语言路径处理能力测试。

**API**: `filterImagesFromFile()`, `filterImagesInText()`

**功能**:
- 测试中文、日文、韩文等多语言路径支持
- Unicode字符路径识别和处理
- 多语言混合路径场景测试
- 国际化Web URL处理
- 详细的语言支持报告

## 在你的项目中使用

将 `examples/demo-data` 替换为你的实际项目路径：

```typescript
import { filterImagesFromFile } from "@cmtx/core";

const images = await filterImagesFromFile(
  "path/to/your/markdown.md",
  {
    mode: 'sourceType',
    value: 'local'
  }
);

console.log(images);
```