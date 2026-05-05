# @cmtx/template 更新日志 / Changelog

## [0.2.0-alpha.2] - 2026-05-05

### Changed

- **`renderTemplate`**: 未定义的模板变量不再保留字面量占位符，改为替换为空字符串
- **命名模板**: 上传时如果 `namingTemplate` 中包含未知变量，通过 `Logger.warn` 输出警告

---

### Changed

- **`renderTemplate`**: Undefined template variables no longer preserve literal placeholders, replaced with empty string instead
- **Naming template**: Unknown variables in `namingTemplate` now log a warning via `Logger.warn`

## [0.1.1-alpha.1] - 2026-04-30

### Added

- **renderTemplate**: 新增 `trimWhitespace` 选项，支持空白字符修剪
- **renderTemplate**: 新增空字符串变量处理和渲染后处理（post-processing）支持
- **RenderTemplateOptions**: 新增公开类型导出，支持模板渲染选项的类型安全配置

### Removed (Breaking Changes)

- **ValidationResult**: 移除从 `@cmtx/template` 的重新导出，改为从 `@cmtx/core` 导入。如果使用了 `ValidationResult` 类型，请更新导入路径

---

### Added

- **RenderTemplateOptions**: New public type export for type-safe template rendering configuration

### Removed (Breaking Changes)

- **ValidationResult**: Removed re-export from `@cmtx/template`; import from `@cmtx/core` instead. Update import paths if using this type

## 0.1.1-alpha.0

### Patch Changes

- 7d85dec: changeset test

## 0.1.0 - 2026-04-11

### 初始发布

#### 核心功能

- **模板渲染** (`renderTemplate`)

  - 使用 `{variable}` 语法进行变量替换
  - 支持字符串、数字、布尔值类型的变量
  - 未定义变量保留原始格式
  - 支持变量名包含空格

- **模板验证** (`validateTemplate`)

  - 验证模板语法正确性
  - 检查大括号是否匹配
  - 检测空的模板变量
  - 返回详细的错误信息

- **Builder 模式** (`BaseTemplateBuilder`)

  - 流式 API 构建模板
  - 支持链式调用
  - 内置变量自动添加
  - 可扩展的 Builder 基类

- **上下文管理** (`ContextManager`)

  - 管理模板渲染所需的变量上下文
  - 支持单个/批量添加变量
  - 变量存在性检查
  - 上下文合并功能

- **内置变量** (`BuiltinVariables`)
  - `date` - 当前日期 (YYYY-MM-DD)
  - `timestamp` - 当前时间戳
  - `uuid` - 随机 UUID

#### 类型定义

- `TemplateContext` - 模板上下文类型
- `TemplateEngine` - 模板引擎接口
- `ValidationResult` - 验证结果类型

#### 技术特性

- **ESM / TypeScript** - 使用 ES 模块和 TypeScript
- **零运行时依赖** - 纯原生实现
- **完整的类型定义** - 所有 API 都有完整的类型支持
- **TypeDoc 文档** - 自动生成 API 文档至 `docs/api/`

#### 测试覆盖

- 33 个单元测试，覆盖所有核心功能
- 测试文件：
  - `core.test.ts` - 核心渲染功能测试
  - `builder.test.ts` - Builder 模式测试
  - `index.test.ts` - 模块导出测试

---

### Initial Release

#### Core Features

- **Template Rendering** (`renderTemplate`)

  - Variable substitution using `{variable}` syntax
  - Support for string, number, and boolean variable types
  - Undefined variables preserve original format
  - Support for variable names containing spaces

- **Template Validation** (`validateTemplate`)

  - Validate template syntax correctness
  - Check braces for matching
  - Detect empty template variables
  - Return detailed error messages

- **Builder Pattern** (`BaseTemplateBuilder`)

  - Fluent API for building templates
  - Support chained calls
  - Automatic built-in variable addition
  - Extensible Builder base class

- **Context Management** (`ContextManager`)

  - Manage variable context for template rendering
  - Support single/batch variable addition
  - Variable existence check
  - Context merge functionality

- **Built-in Variables** (`BuiltinVariables`)
  - `date` - Current date (YYYY-MM-DD)
  - `timestamp` - Current timestamp
  - `uuid` - Random UUID

#### Type Definitions

- `TemplateContext` - Template context type
- `TemplateEngine` - Template engine interface
- `ValidationResult` - Validation result type

#### Technical Features

- **ESM / TypeScript** - Using ES modules and TypeScript
- **Zero Runtime Dependencies** - Pure native implementation
- **Complete Type Definitions** - Full type support for all APIs
- **TypeDoc Documentation** - Auto-generated API docs at `docs/api/`

#### Test Coverage

- 33 unit tests covering all core functionality
- Test files:
  - `core.test.ts` - Core rendering functionality tests
  - `builder.test.ts` - Builder pattern tests
  - `index.test.ts` - Module export tests
