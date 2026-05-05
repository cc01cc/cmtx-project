# @cmtx/fpe-wasm 更新日志 / Changelog

## [0.1.1-alpha.1] - 2026-04-30
### Changed

- **WASM 加载策略简化**: 移除 `import.meta.url` 回退方案，统一通过 `__dirname`（tsdown shims）加载；新增 `existsSync()` 文件存在性检查，缺失时输出 `console.warn` 调试警告
- **package.json**: 新增 `publishConfig`（`access: public`）、`homepage`、`bugs`、`repository`、`author` 等元数据字段

---

### Changed

- **WASM loading strategy simplified**: Removed `import.meta.url` fallback, unified on `__dirname` via tsdown shims; added `existsSync()` file existence check with `console.warn` debug logging on missing WASM file
- **package.json**: Added metadata fields (`publishConfig`, `homepage`, `bugs`, `repository`, `author`)

## [0.1.1-alpha.0] - 2026-05-05
### Patch Changes

- 7d85dec: changeset test

## 0.1.0 - 2026-04-11

### 核心功能

- **FF1Cipher 类** - NIST SP 800-38G FF1 格式保留加密器
    - 支持 2-36 进制基数 (radix)
    - 使用 32 字节 AES-256 密钥
    - 字节数组加密/解密 (`encrypt`, `decrypt`)
    - 字符串加密/解密 (`encrypt_string`, `decrypt_string`)

- **WASM 实现** - 基于 Rust `fpe` crate
    - 编译为 WebAssembly 模块
    - 通过 wasm-bindgen 提供 JavaScript 绑定
    - 支持浏览器和 Node.js 环境

### 辅助函数

- `loadWASM()` - 加载 WASM 模块（必须先调用）
- `prepareFPEKey(key: string | Uint8Array): Uint8Array` - 准备加密密钥
    - 字符串自动填充至 32 字节
    - 支持直接传入 Uint8Array

### 类型定义

- `FF1Cipher` - FF1 加密器类
- `WasmModule` - WASM 模块接口

### 技术特性

- **Rust 实现** - 使用 `fpe` crate 实现 NIST FF1 算法
- **WASM 编译** - 使用 wasm-pack 编译为 WebAssembly
- **零运行时依赖** - 仅依赖 WASM 模块本身
- **完整的类型定义** - TypeScript 支持
- **双许可证** - MIT OR Apache-2.0

### 测试覆盖

- 17 个 Rust wasm-bindgen 测试
- 70 个 TypeScript vitest 测试
- 115 个集成测试（在 @cmtx/rule-engine 包中）
- 测试覆盖：
    - FF1Cipher 核心功能
    - 加密解密正确性
    - 错误处理（无效密钥长度、进制范围等）
    - 不同进制支持（radix-10, radix-16, radix-36）
    - 字符串和字节数组加密
    - 兼容性测试

### 安全性

- 遵循 NIST SP 800-38G 标准
- 使用 AES-256 作为底层分组密码
- 格式保留加密，保持密文与明文长度相同

---

### Core Features

- **FF1Cipher class** - NIST SP 800-38G FF1 Format-Preserving Encryptor
    - Support for radix 2-36
    - Uses 32-byte AES-256 key
    - Byte array encryption/decryption (`encrypt`, `decrypt`)
    - String encryption/decryption (`encrypt_string`, `decrypt_string`)

- **WASM Implementation** - Based on Rust `fpe` crate
    - Compiled to WebAssembly module
    - JavaScript bindings via wasm-bindgen
    - Support for browser and Node.js environments

### Helper Functions

- `loadWASM()` - Load WASM module (must be called first)
- `prepareFPEKey(key: string | Uint8Array): Uint8Array` - Prepare encryption key
    - String auto-padded to 32 bytes
    - Support direct Uint8Array input

### Type Definitions

- `FF1Cipher` - FF1 cipher class
- `WasmModule` - WASM module interface

### Technical Features

- **Rust Implementation** - NIST FF1 algorithm via `fpe` crate
- **WASM Compilation** - Compiled to WebAssembly via wasm-pack
- **Zero Runtime Dependencies** - Only depends on the WASM module
- **Complete Type Definitions** - TypeScript support
- **Dual License** - MIT OR Apache-2.0

### Test Coverage

- 17 Rust wasm-bindgen tests
- 70 TypeScript vitest tests
- 115 integration tests (in @cmtx/rule-engine package)
- Test coverage:
    - FF1Cipher core functionality
    - Encryption/decryption correctness
    - Error handling (invalid key length, radix range, etc.)
    - Different radix support (radix-10, radix-16, radix-36)
    - String and byte array encryption
    - Compatibility tests

### Security

- Follows NIST SP 800-38G standard
- Uses AES-256 as underlying block cipher
- Format-preserving encryption, ciphertext length equals plaintext length
