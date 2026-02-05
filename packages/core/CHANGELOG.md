# @cmtx/core Changelog

## 0.2.0 - 2026-02-05

### ⚠️ BREAKING CHANGES

- **图片筛选 API 重构**：筛选参数从 `{ webHosts?, localPrefixes? }` 改为 `{ mode, value }`（支持 sourceType/hostname/absolutePath/regex 四种模式）
- **类型定义重构**：`ExtractOptions` 和 `ScanDirectoryOptions` 已重构，参数结构发生变化
- **位置信息移除**：不再提供精确的位置信息（行号、列号等）
- **返回类型简化**：`DirectoryScanResult` 等复合类型已简化

### Major Refactor

- **核心架构优化**：采用正则统一架构，专注于基础原子操作
  - 保持纯正则表达式解析，不依赖复杂 AST
  - 显著减少运行时依赖数量
  - 不提供精确的位置信息，专注于核心功能

### Added

- **模块化重构**：
  - 新增 `filter.ts` 模块，主要负责图片筛选功能
  - 新增 `replace.ts` 模块，主要负责图片替换功能
  - 新增 `delete.ts` 模块，主要负责图片删除功能
  - 新增 `parser.ts` 模块，主要负责图片解析功能
  - 新增 `constants/regex.ts` 模块，统一管理正则表达式

- **增强的筛选功能**：
  - 重构并增强目录批量扫描功能 (`filterImagesFromDirectory`)
  - 支持四种筛选模式：`sourceType`、`hostname`、`absolutePath`、`regex`
  - 新增快速内容检查机制，提升性能
  - 新增 `DirFilterOptions` 类型，支持自定义 glob 模式匹配

- **改进的替换功能**：
  - 支持多字段模式：通过 src 或 raw 识别图片，同时替换多个字段
  - 新增目录级别图片替换功能 (`replaceImagesInDirectory`)
  - 增强文件验证机制，避免处理过大或非文本文件
  - 支持文件模式匹配和忽略规则

- **强化的删除功能**：
  - 新增 `deleteLocalImage` 函数，支持多种删除策略
  - 新增 `deleteLocalImageSafely` 函数，带使用检查的安全删除
  - 新增 `withRetry` 通用重试机制，支持指数退避和降级策略
  - 支持三种删除策略：trash（回收站）、move（移动）、hard-delete（永久删除）
  - 新增 `validatePathWithinRoot` 函数，防止路径遍历攻击

- **错误处理增强**：
  - 新增 `ErrorCode` 枚举，支持结构化错误代码
  - 新增 `CoreError` 类，提供结构化的错误对象
  - 统一错误处理和日志支持

### Changed

- **API 重构**：
  - 重构图片筛选 API（参数格式改变，详见 BREAKING CHANGES 部分）
  - 简化导出结构，移除复杂的内部模块分离
  - 统一各函数的参数结构和命名规范

- **依赖优化**：
  - 移除未使用的依赖项
  - 保留必要的运行时依赖：fast-glob, trash
  - 显著减少包体积和安装时间

- **性能优化**：
  - 采用纯正则表达式匹配，避免 AST 解析开销
  - 实现快速内容检查机制，在完整解析前进行字符串匹配
  - 实现指数退避重试机制，提升操作可靠性
  - 内置降级策略，确保操作的高可用性

- **文档增强**：
  - 为所有模块和函数添加详细的 JSDoc 文档
  - 添加模块级文档，提供完整的 API 概览
  - 为所有导出类型添加详细的使用示例
  - 规范化内部函数的注释，添加 `@internal` 标签

### Removed

- **已重构的 API 函数**：
  - `extractImagesFromDirectory()` → 重构为 `filterImagesFromDirectory()`（参数和返回类型变化）
  - 位置查询相关函数 → 功能已移除，不再提供精确位置信息

- **已删除的类型定义**：
  - `ExtractOptions`, `ScanDirectoryOptions` - 改用新参数格式（详见 BREAKING CHANGES）
  - `ImageReferenceLocation` - 不再提供位置信息
  - `DirectoryScanResult`, `DirectoryReplaceOptions` - 返回类型已简化
  - `FileReplaceOptions` - 改用新参数格式

- **代码结构清理**：
  - 删除废弃的 `src/core/` 目录结构
  - 移除已弃用的 `modifier.ts` 和 `query.ts` 相关功能
  - 删除过时的设计文档和报告文件
  - 清理所有备份文件和废弃代码

### Fixed

- 修复路径处理中的边界情况
- 优化文件读取和写入的错误处理
- 改进跨平台路径兼容性
- 修复大文件处理的内存问题

### Performance Improvements

- 解析性能提升：通过正则表达式和缓存机制
- 内存使用优化：减少不必要的对象创建
- 并发处理优化：改进目录扫描和批量操作
- 错误恢复优化：通过重试机制和降级策略

### Known Limitations

- 文件编码：默认使用 UTF-8，不支持其他编码格式
- 位置信息：不提供精确的行号、列号等位置信息
- 语法支持：仅支持标准 Markdown 和 HTML 图片语法

## 0.1.1 - 2026-01-22

### Fixed

- 修复 `replaceImageInFiles` 返回的 `relativePath` 计算错误（之前返回文件名，现在返回从搜索目录的相对路径）
- 修正 `replaceImageInFileInternal` 函数签名，添加 `searchDirAbsPath` 参数以正确计算相对路径

### Added

- 添加可选的 `logger` 回调支持，用于调试和错误跟踪（`LoggerCallback` 类型）
- 为所有 Options 接口添加 `logger?: LoggerCallback` 可选参数
- 在 API 层添加输入验证：空字符串检测、负数 depth 检测、特殊字符检测
- 添加 `validatePath` 和 `validateDepth` 内部验证函数

### Changed

- API 层函数现在会在参数无效时抛出明确的错误（TypeError, RangeError）
- 改进了错误消息的可读性和调试体验

## 0.1.0 - 2026-01-26

### Initial Release

#### 核心功能

- **Markdown 图片解析器**：支持内联、引用式和 HTML 图片语法
  - 使用 remark AST 解析 Markdown
  - 使用 rehype AST 解析 HTML 片段
  - 支持多行 HTML img 标签
  - 支持引用式图片 `![alt][ref]` 和定义 `[ref]: url`
  - 内置 LRU 缓存提升性能

- **图片筛选系统**：从文本、文件和目录中筛选图片
  - `filterImagesInText`：从纯文本筛选图片
  - `filterImagesFromFile`：从单个文件筛选图片
  - `filterImagesFromDirectory`：从目录批量筛选图片
  - 支持四种筛选模式：sourceType、hostname、absolutePath、regex

- **图片替换系统**：两层 API（文本层、文件层）
  - `replaceImagesInText`：在纯文本中替换图片
  - `replaceImagesInFile`：在文件中替换图片
  - 支持 src 和 alt 替换
  - 支持引用定义自动更新
  - 使用 magic-string 进行高效字符串操作

- **工具函数**：类型守卫和路径处理
  - `isWebImage`、`isLocalImage`：类型守卫函数
  - `isLocalImageWithAbsPath`、`isLocalImageRelative`：细粒度类型守卫
  - `hasAbsLocalPath`：检查图片是否有绝对路径
  - `normalizePath`：跨平台路径规范化
  - `isWebSource`：判断是否为 Web 链接

- **删除功能**：安全的图片文件删除
  - `deleteLocalImage`：删除本地图片文件
  - `validatePathWithinRoot`：验证路径安全性
  - `deleteLocalImageSafely`：结合验证和使用检查的安全删除

#### 类型系统

- **核心类型**：
  - `ParsedImage`：解析后的图片数据
  - `ImageMatch`：匹配到的图片（联合类型）
  - `WebImageMatch`、`LocalImageMatch`：具体图片类型
  - `LocalImageMatchRelative`、`LocalImageMatchWithAbsPath`：本地图片细分类型

- **筛选类型**：
  - `ImageFilterOptions`：图片筛选选项
  - `ImageFilterMode`：筛选模式枚举
  - `ImageFilterValue`：筛选值类型
  - `DirFilterOptions`：目录筛选选项

- **替换类型**：
  - `ReplaceParams`：替换参数
  - `ReplaceTextOptions`：文本层替换选项
  - `TextReplaceResult`：文本层替换结果
  - `FileReplaceResult`：文件层替换结果
  - `CoreReplacementDetail`：替换详情

- **其他类型**：
  - `LoggerCallback`：日志回调函数
  - `LogLevel`：日志级别枚举
  - `ImageSourceType`：图片来源类型

#### 技术特性

- **ESM / TypeScript**：使用 ES 模块和 TypeScript
- **零运行时依赖**：仅使用开发依赖
- **完整的类型定义**：所有 API 都有完整的类型支持
- **LSP 标准位置**：行号 1-based，列号 0-based
- **跨平台兼容**：统一路径处理，支持 Windows 和 Linux
- **TypeDoc 文档**：自动生成 API 文档至 `docs/api/`

#### 测试覆盖

- 149 个单元测试，覆盖所有核心功能
- 测试文件：
  - `utils.test.ts`：工具函数测试（47 个测试）
  - `replacer.test.ts`：替换功能测试（9 个测试）
  - `replacer-advanced.test.ts`：高级替换功能测试（8 个测试）
  - `delete.test.ts`：删除功能测试（24 个测试）
  - `parser.test.ts`：解析器测试（33 个测试）
  - `filter.test.ts`：筛选功能测试（28 个测试）
