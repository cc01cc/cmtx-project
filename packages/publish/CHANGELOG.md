# @cmtx/publish 更新日志 / Changelog

## 0.1.1-alpha.0

### Patch Changes

- 7d85dec: changeset test
- Updated dependencies [7d85dec]
  - @cmtx/asset@0.1.1-alpha.0
  - @cmtx/core@0.3.1-alpha.0
  - @cmtx/fpe-wasm@0.1.1-alpha.0
  - @cmtx/template@0.1.1-alpha.0

## 0.1.0 - 2026-04-11

### 初始发布

#### 功能特性

**元数据管理**

- 从 Markdown 文件中提取元数据（Frontmatter、标题、文件名）
- 按元数据查询和筛选 Markdown 文件
- 为文档生成唯一 ID
- 管理文档发布状态

**平台适配**

- 微信公众号平台适配器
- 知乎平台适配器
- CSDN 平台适配器
- 可扩展的适配器架构，支持自定义平台

**文档渲染**

- Markdown 转 HTML 转换
- 平台特定的渲染规则
- 基于 @cmtx/template 的模板渲染
- 发布图片处理和优化

**发布工作流**

- 发布前验证 Markdown 文档
- 处理发布图片（上传、转换）
- 针对特定平台格式化文档
- 支持批量处理

#### API 接口

- `MarkdownMetadataExtractor` - 提取和管理文档元数据
- `MarkdownFileQuery` - 查询和筛选 Markdown 文件
- `IdGenerator` - 生成唯一文档 ID
- `adaptMarkdown()` - 针对特定平台适配文档
- `renderMarkdown()` - 将 Markdown 渲染为 HTML
- `validateMarkdown()` - 发布前验证文档
- `processImagesForPublish()` - 处理发布图片
- `formatForPublish()` - 格式化文档用于发布

#### 依赖

- @cmtx/core: Markdown 处理核心
- @cmtx/asset: 资产管理（上传、转移）
- @cmtx/template: 模板渲染引擎
- @cmtx/fpe-wasm: 用于 ID 生成的格式保留加密
- @huacnlee/autocorrect: 中文文本校正
- unified/remark/rehype: Markdown 处理生态系统

---

### Initial Release

#### Features

**Metadata Management**

- Extract metadata from Markdown files (Frontmatter, headings, filename)
- Query and filter Markdown files by metadata
- Generate unique IDs for documents
- Manage document publication status

**Platform Adaptation**

- WeChat platform adapter
- Zhihu platform adapter
- CSDN platform adapter
- Extensible adapter architecture for custom platforms

**Document Rendering**

- Markdown to HTML conversion
- Platform-specific rendering rules
- Template-based rendering with @cmtx/template
- Image processing and optimization for publishing

**Publishing Workflow**

- Validate Markdown documents before publishing
- Process images for publishing (upload, transform)
- Format documents for specific platforms
- Batch processing support

#### API

- `MarkdownMetadataExtractor` - Extract and manage document metadata
- `MarkdownFileQuery` - Query and filter Markdown files
- `IdGenerator` - Generate unique document IDs
- `adaptMarkdown()` - Adapt documents for specific platforms
- `renderMarkdown()` - Render Markdown to HTML
- `validateMarkdown()` - Validate documents before publishing
- `processImagesForPublish()` - Process images for publishing
- `formatForPublish()` - Format documents for publishing

#### Dependencies

- @cmtx/core: Core markdown processing
- @cmtx/asset: Asset management (upload, transfer)
- @cmtx/template: Template rendering engine
- @cmtx/fpe-wasm: Format-preserving encryption for ID generation
- @huacnlee/autocorrect: Chinese text correction
- unified/remark/rehype: Markdown processing ecosystem
