# @cmtx/template Changelog

## 0.1.1-alpha.0

### Patch Changes

- 7d85dec: changeset test

## 0.1.0 - 2026-04-11

### Initial Release

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
