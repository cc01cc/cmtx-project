# @cmtx/autocorrect-wasm Changelog

## [0.1.1-alpha.0] - 2026-04-30
### Added

#### 核心功能

- **文本格式化** (`formatText`)
    - 自动在中英文之间添加空格
    - 纯文本格式化支持
    - 基于 Rust `autocorrect` crate

- **按文件类型格式化** (`formatForType`)
    - 支持 Markdown、TypeScript 等多种文件格式
    - 根据文件扩展名或文件名选择格式化规则
    - 返回格式化后的文本内容

- **按文件类型检查** (`lintForType`)
    - 检查文本中的格式问题
    - 返回详细的检查结果（行号、列号、修改建议）
    - 支持 `LintResult` 结构化的结果对象

- **配置加载** (`loadAutoCorrectConfig`)
    - 从 JSON 字符串加载 AutoCorrect 配置
    - 支持自定义格式化规则

- **路径忽略** (`createIgnorer`)
    - 创建 `.gitignore` 风格的路径匹配器
    - 支持工作目录设置
    - 提供 `isIgnored` 方法检查路径是否被忽略

- **WASM 加载管理** (`loadWASM`, `isWasmLoaded`)
    - 单例模式加载 WASM 模块
    - 支持并发调用安全
    - 支持手动传入 WASM 二进制数据
    - 支持 Buffer、Uint8Array、ArrayBuffer 多种输入格式

#### 类型定义

- `ILoadWASMOptions` - WASM 加载选项
- `LintResult` - 检查结果类型（包含 filepath、lines、error）

#### 技术特性

- **Rust 实现** - 使用 `autocorrect` crate 实现文本自动纠正
- **WASM 编译** - 使用 wasm-pack 编译为 WebAssembly
- **零运行时依赖** - 仅依赖 WASM 模块本身
- **完整的类型定义** - TypeScript 支持
- **ESM 模块** - 使用 ES 模块格式

#### 测试覆盖

- 15 个 TypeScript vitest 测试
- 1 个 Rust wasm-bindgen 测试
- 测试覆盖：
    - WASM 加载功能（自动加载、手动加载、并发安全）
    - 文本格式化功能（纯文本、多语言混合）
    - 按文件类型格式化和检查
    - 边界情况处理（空字符串、纯中文、纯英文）
