# 4-with-ali-oss.ts 替换失败问题诊断报告

## 🎯 问题现象

执行 [4-with-ali-oss.ts](file://c:\zeogit\cmtx-project\packages\upload\examples\4-with-ali-oss.ts) 后，所有图片替换都失败了。

## 🔍 问题分析

### 根本原因

**路径解析问题**：示例文件使用相对路径引用图片，但上传目录设置不当导致无法正确解析绝对路径。

### 具体问题

1. **示例文件结构**：
   ```
   examples/
   ├── demo-data/
   │   ├── assets/           # 图片文件存放目录
   │   │   ├── tiny-placeholder.png
   │   │   └── small-swatch.jpg
   │   └── docs/             # Markdown 文件目录
   │       ├── local-images.md  # 包含 ![Tiny](../assets/tiny-placeholder.png)
   │       └── guide.md
   ```

2. **错误的目录设置**：
   ```typescript
   // ❌ 错误做法
   await uploadDirectory(
       resolve(__dirname, 'demo-data/docs'),  // 在 docs 目录下
       config,
       { pattern: '**/*.md' }  // 无法正确解析 ../assets/ 相对路径
   );
   ```

3. **过滤逻辑问题**：
   ```typescript
   // uploadDirectory 中的过滤逻辑
   const localImages = images.filter((img) => 
       img.type === 'local' && 'absLocalPath' in img  // 只处理有绝对路径的图片
   );
   ```

相对路径的图片（如 `../assets/tiny-placeholder.png`）无法转换为绝对路径，因此被过滤掉，导致没有图片需要上传和替换。

## ✅ 解决方案

### 修正后的配置

```typescript
// ✅ 正确做法
await uploadDirectory(
    resolve(__dirname, 'demo-data'),     // 在根目录 demo-data 下
    config,
    { 
        pattern: 'docs/**/*.md',         // 只处理 docs 目录下的文件
        recursive: true,
        concurrency: 3
    }
);
```

### 原理解释

1. **正确的基目录**：使用 `demo-data` 作为基目录，这样相对路径 `../assets/` 可以正确解析
2. **精确的文件匹配**：使用 `docs/**/*.md` 只处理需要的 Markdown 文件
3. **路径解析**：core 包的 `filterImagesFromDirectory` 能够正确处理相对路径并生成绝对路径

## 🧪 验证方法

### 手动验证步骤

1. **检查示例文件**：
   ```bash
   cd examples/demo-data/docs
   type local-images.md
   # 应该看到: ![Tiny](../assets/tiny-placeholder.png)
   ```

2. **检查资产文件**：
   ```bash
   dir examples/demo-data/assets
   # 应该看到实际的图片文件
   ```

3. **运行修正后的示例**：
   ```bash
   pnpm exec tsx examples/4-with-ali-oss.ts
   ```

### 预期结果

- ✅ 应该找到本地图片引用
- ✅ 应该成功上传图片到 OSS
- ✅ 应该正确替换 Markdown 中的图片引用
- ✅ 返回结果中 `uploaded` 和 `replaced` 应该大于 0

## 📝 技术要点

### 路径处理最佳实践

1. **基目录选择**：选择能够正确解析所有相对路径的最上层目录
2. **模式匹配**：使用精确的 glob 模式避免处理不需要的文件
3. **路径验证**：确保相对路径能够基于基目录正确解析为绝对路径

### Core 包依赖

此修复依赖于：
- `@cmtx/core` 的 `filterImagesFromDirectory` 函数
- 相对路径到绝对路径的自动解析能力
- 正确的 glob 模式匹配

## 🚀 后续建议

1. **文档更新**：在示例中添加关于目录结构和路径解析的说明
2. **错误提示**：当找不到本地图片时提供更清晰的提示信息
3. **路径验证**：添加预检查机制验证路径配置是否合理

## 📊 修正前后对比

| 项目 | 修正前 | 修正后 |
|------|--------|--------|
| 基目录 | `demo-data/docs` | `demo-data` |
| 文件模式 | `**/*.md` | `docs/**/*.md` |
| 图片发现 | 0 个 | 预期多个 |
| 替换结果 | 全部失败 | 预期成功 |

现在示例应该能够正常工作了！