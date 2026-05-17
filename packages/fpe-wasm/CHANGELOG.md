# @cmtx/fpe-wasm 更新日志 / Changelog

## [0.2.0-alpha.3] - 2026-05-17

### Changed

- **`ILoadWASMOptions` → `LoadWasmOptions`**: 移除 `I` 前缀，符合 DEV-013 命名规范

---

### Changed

- **`ILoadWASMOptions` → `LoadWasmOptions`**: Removed `I` prefix to comply with DEV-013 naming convention

## [0.1.1-alpha.2] - 2026-05-06

- 移除 pnpm catalog 依赖声明，改用直接版本号

---

- Removed pnpm catalog dependency declarations, use direct version numbers

## [0.1.1-alpha.1] - 2026-04-30

### Changed

- **WASM 加载策略简化**: 移除 `import.meta.url` 回退方案，统一通过 `__dirname` 加载；新增 `existsSync()` 文件存在性检查
- **package.json**: 新增 `publishConfig`、`homepage`、`bugs`、`repository`、`author` 等元数据字段

---

### Changed

- **WASM Loading Simplified**: Removed `import.meta.url` fallback, unified on `__dirname` loading; added `existsSync()` file existence check
- **package.json**: Added metadata fields (`publishConfig`, `homepage`, `bugs`, `repository`, `author`)

## [0.1.1-alpha.0] - 2026-05-05

### Fixed

- Changeset test

---

### Fixed

- Changeset test

## 0.1.0 - 2026-04-11

### 核心功能

- **FF1Cipher 类**: NIST SP 800-38G FF1 格式保留加密器，支持 2-36 进制，使用 32 字节 AES-256 密钥
- **WASM 实现**: 基于 Rust `fpe` crate，编译为 WebAssembly，支持浏览器和 Node.js

### 辅助函数

- `loadWASM()`: 加载 WASM 模块
- `prepareFPEKey()`: 准备加密密钥，字符串自动填充至 32 字节

### 类型定义

- `FF1Cipher` - FF1 加密器类
- `WasmModule` - WASM 模块接口

### 技术特性

- **Rust 实现**: 使用 `fpe` crate 实现 NIST FF1 算法
- **WASM 编译**: 使用 wasm-pack 编译为 WebAssembly
- **零运行时依赖**: 仅依赖 WASM 模块本身
- **完整的类型定义**: TypeScript 支持

---

### Core Features

- **FF1Cipher Class**: NIST SP 800-38G FF1 Format-Preserving Encryptor, supports radix 2-36, uses 32-byte AES-256 key
- **WASM Implementation**: Based on Rust `fpe` crate, compiled to WebAssembly, supports browser and Node.js

### Helper Functions

- `loadWASM()`: Load WASM module
- `prepareFPEKey()`: Prepare encryption key, auto-pad strings to 32 bytes

### Type Definitions

- `FF1Cipher` - FF1 cipher class
- `WasmModule` - WASM module interface

### Technical Features

- **Rust Implementation**: NIST FF1 algorithm via `fpe` crate
- **WASM Compilation**: Compiled to WebAssembly via wasm-pack
- **Zero Runtime Dependencies**: Only depends on the WASM module
- **Complete Type Definitions**: TypeScript support
