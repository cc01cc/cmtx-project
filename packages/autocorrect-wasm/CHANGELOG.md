# @cmtx/autocorrect-wasm 更新日志 / Changelog

## [0.2.0-alpha.2] - 2026-05-17

### Changed

- **`ILoadWASMOptions` → `LoadWasmOptions`**: 移除 `I` 前缀，符合 DEV-013 命名规范

---

### Changed

- **`ILoadWASMOptions` → `LoadWasmOptions`**: Removed `I` prefix to comply with DEV-013 naming convention

## [0.1.1-alpha.1] - 2026-05-06

- 移除 pnpm catalog 依赖声明，改用直接版本号

---

- Removed pnpm catalog dependency declarations, use direct version numbers

## [0.1.1-alpha.0] - 2026-04-30

### Added

#### 核心功能

- **文本格式化** (`formatText`): 自动在中英文之间添加空格，纯文本格式化支持
- **按文件类型格式化** (`formatForType`): 支持 Markdown、TypeScript 等多种文件格式
- **按文件类型检查** (`lintForType`): 检查文本中的格式问题，返回详细检查结果
- **配置加载** (`loadAutoCorrectConfig`): 从 JSON 字符串加载 AutoCorrect 配置
- **路径忽略** (`createIgnorer`): 创建 `.gitignore` 风格的路径匹配器
- **WASM 加载管理** (`loadWASM`, `isWasmLoaded`): 单例模式加载 WASM 模块，支持并发调用安全

#### 类型定义

- `ILoadWASMOptions` - WASM 加载选项
- `LintResult` - 检查结果类型

#### 技术特性

- **Rust 实现** - 使用 `autocorrect` crate 实现文本自动纠正
- **WASM 编译** - 使用 wasm-pack 编译为 WebAssembly
- **零运行时依赖** - 仅依赖 WASM 模块本身
- **完整的类型定义** - TypeScript 支持

---

### Added

#### Core Features

- **Text Formatting** (`formatText`): Auto-add spaces between Chinese and English, plain text formatting support
- **Format by File Type** (`formatForType`): Support Markdown, TypeScript, and other file formats
- **Lint by File Type** (`lintForType`): Check text formatting issues with detailed results
- **Config Loading** (`loadAutoCorrectConfig`): Load AutoCorrect config from JSON string
- **Path Ignore** (`createIgnorer`): Create `.gitignore`-style path matcher
- **WASM Loading** (`loadWASM`, `isWasmLoaded`): Singleton WASM module loading with concurrent call safety

#### Type Definitions

- `ILoadWASMOptions` - WASM loading options
- `LintResult` - Lint result type

#### Technical Features

- **Rust Implementation** - Text auto-correction using `autocorrect` crate
- **WASM Compilation** - Compiled to WebAssembly using wasm-pack
- **Zero Runtime Dependencies** - Only depends on WASM module itself
- **Complete Type Definitions** - TypeScript support
