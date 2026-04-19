# 示例脚本

演示如何使用 @cmtx/core 的核心 API，所有示例均基于真实的文件内容。

## 演示数据

所有示例都会在首次运行时自动初始化演示数据。数据存储在 `demo-data/` 目录中：

```
demo-data/
├── docs/
│   ├── README.md           # 综合功能测试
│   └── multilingual.md     # 多语言路径测试
└── images/
   ├── logo.png             # 被引用
   ├── banner.png           # 被引用
   └── unused.png           # 未被引用
```

## 运行示例

```bash
# 所有示例都会自动初始化所需数据
pnpm exec tsx examples/multi-regex-basic.ts     # 多组正则替换
pnpm exec tsx examples/multi-regex-find.ts      # 多组正则查询
pnpm exec tsx examples/comprehensive-analysis.ts
pnpm exec tsx examples/delete-images.ts
pnpm exec tsx examples/directory-replace.ts
pnpm exec tsx examples/multilingual-test.ts
```

## 示例说明

### 核心示例（推荐优先学习）

#### multi-regex-basic.ts

多组正则表达式替换功能演示，基于真实文件场景。

**API**: `replaceWithMultipleRegex(text, options)`

**核心场景**:

- 文档现代化改造
- 批量配置文件更新
- 代码重构助手
- 内容标准化处理

#### multi-regex-find.ts

多组正则表达式查询功能演示，专注于内容分析。

**API**: `findAllMatches(text, options)`

**核心场景**:

- 智能内容分析与质量检查
- 生产环境部署预检
- 安全内容扫描
- 变更影响评估

### 其他功能示例

#### comprehensive-analysis.ts

综合图片分析和路径测试，整合了多种分析维度。

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
