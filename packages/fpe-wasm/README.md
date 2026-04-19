# @cmtx/fpe-wasm

NIST SP 800-38G FF1 Format-Preserving Encryption (WASM)

## 1. 概述

该包提供 NIST SP 800-38G 标准的 FF1 格式保留加密算法的 WebAssembly 实现，基于 Rust `fpe` crate。

## 2. 安装

```bash
pnpm add @cmtx/fpe-wasm
```

## 3. 使用

```typescript
import { FF1Cipher, encrypt_string, decrypt_string } from '@cmtx/fpe-wasm';

// 创建加密器（32 字节 AES-256 密钥）
const key = new Uint8Array(32);
// ... 填充密钥

const cipher = new FF1Cipher(key, 36); // radix = 36 (0-9, A-Z)

// 加密字符串
const encrypted = encrypt_string(cipher, 'ABC123');
console.log('Encrypted:', encrypted);

// 解密字符串
const decrypted = decrypt_string(cipher, encrypted);
console.log('Decrypted:', decrypted);
```

## 4. API

### 4.1. `FF1Cipher`

FF1 加密器类。

#### 4.1.1. `constructor(key: Uint8Array, radix: number)`

创建新的 FF1 加密器。

- `key`: 32 字节 AES-256 密钥
- `radix`: 进制基数 (2-36)

#### 4.1.2. `encrypt(plaintext: Uint8Array): Uint8Array`

加密字节数组。

#### 4.1.3. `decrypt(ciphertext: Uint8Array): Uint8Array`

解密字节数组。

### 4.2. `encrypt_string(cipher: FF1Cipher, plaintext: string): string`

加密 radix-36 字符串。

### 4.3. `decrypt_string(cipher: FF1Cipher, ciphertext: string): string`

解密 radix-36 字符串。

## 5. 构建

需要安装 Rust 和 wasm-pack：

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 wasm-pack
cargo install wasm-pack

# 构建
cd packages/fpe-wasm
pnpm build
```

## 6. 测试

### 6.1. 测试概述

本包包含两层测试：

- **Rust 层测试**：使用 wasm-bindgen-test 测试 WASM 核心功能（17 tests）
- **TypeScript 层测试**：使用 vitest 测试 JavaScript API 封装（70 tests）

### 6.2. 运行测试

#### 6.2.1. 运行所有测试

```bash
pnpm -F @cmtx/fpe-wasm test
```

#### 6.2.2. 仅运行 Rust 测试

```bash
pnpm -F @cmtx/fpe-wasm run test:wasm
```

#### 6.2.3. 仅运行 TypeScript 测试

```bash
pnpm -F @cmtx/fpe-wasm run test:ts
```

#### 6.2.4. 运行特定测试文件

```bash
# 运行单个 TypeScript 测试文件
pnpm -F @cmtx/fpe-wasm run test:ts -- tests/ff1-cipher.test.ts

# 运行匹配模式的测试
pnpm -F @cmtx/fpe-wasm run test:ts -- --testNamePattern="encrypt"
```

### 6.3. 测试文件结构

```
packages/fpe-wasm/
├── src/lib.rs                 # Rust 源码 + 内联测试 (17 tests)
└── tests/                     # TypeScript 测试目录 (70 tests)
    ├── vitest.setup.ts        # WASM 加载初始化
    ├── wasm-loader.test.ts    # WASM 加载器测试 (6 tests)
    ├── ff1-cipher.test.ts     # FF1Cipher 类测试 (17 tests)
    ├── string-encryption.test.ts  # 字符串加密测试 (20 tests)
    ├── crypto-helpers.test.ts     # 辅助函数测试 (21 tests)
    └── compat.test.ts         # 兼容层测试 (6 tests)
```

### 6.4. 测试命名规范

#### 6.4.1. Rust 测试命名

- 函数命名格式：`test_<功能描述>`
- 使用 `#[wasm_bindgen_test]` 宏标记
- 示例：`test_encrypt_decrypt_string`, `test_invalid_key_length`

#### 6.4.2. TypeScript 测试命名

- 文件命名格式：`<模块名>.test.ts`
- 使用 `describe` 分组，`it` 定义测试用例
- 示例：

```typescript
describe('FF1Cipher', () => {
    describe('constructor', () => {
        it('should create cipher with 32-byte key and radix 36', () => {
            // ...
        });
    });
});
```

### 6.5. 手动测试示例

#### 6.5.1. 测试加密解密功能

```typescript
import { loadWASM, FF1Cipher, prepareFPEKey, encrypt_string, decrypt_string } from '@cmtx/fpe-wasm';

// 1. 加载 WASM（必须先执行）
await loadWASM();

// 2. 准备密钥（字符串自动填充至 32 字节）
const key = prepareFPEKey('my-secret-key-32-bytes!!');

// 3. 创建加密器
const cipher = new FF1Cipher(key, 36); // radix = 36 (0-9, A-Z)

// 4. 测试字符串加密
const plaintext = 'ABC123';
const encrypted = encrypt_string(cipher, plaintext);
const decrypted = decrypt_string(cipher, encrypted);

console.log('Plaintext:', plaintext);
console.log('Encrypted:', encrypted);
console.log('Decrypted:', decrypted);
console.log('Match:', plaintext === decrypted); // true
console.log('Length preserved:', encrypted.length === plaintext.length); // true
```

#### 6.5.2. 测试字节数组加密

```typescript
import { loadWASM, FF1Cipher } from '@cmtx/fpe-wasm';

await loadWASM();

const key = new Uint8Array(32).fill(42);
const cipher = new FF1Cipher(key, 36);

const plaintext = new Uint8Array([1, 2, 3, 4, 5, 6]);
const encrypted = cipher.encrypt(plaintext);
const decrypted = cipher.decrypt(encrypted);

console.log('Match:', decrypted.every((v, i) => v === plaintext[i])); // true
```

#### 6.5.3. 测试不同进制

```typescript
import { loadWASM, FF1Cipher, encrypt_string, decrypt_string } from '@cmtx/fpe-wasm';

await loadWASM();

const key = new Uint8Array(32).fill(0);

// radix = 10 (仅数字 0-9)
const cipher10 = new FF1Cipher(key, 10);
const digits = '123456';
const enc10 = encrypt_string(cipher10, digits);
console.log('radix-10:', enc10); // 仅包含数字

// radix = 16 (十六进制 0-9, A-F)
const cipher16 = new FF1Cipher(key, 16);
const hex = 'ABCDEF';
const enc16 = encrypt_string(cipher16, hex);
console.log('radix-16:', enc16); // 仅包含 0-9, A-F
```

### 6.6. 集成测试

本包被 `@cmtx/publish` 包集成使用，相关集成测试位于：

```bash
# 运行集成测试
pnpm -F @cmtx/publish run test
```

主要集成测试文件：

- `packages/publish/tests/encrypted-id.test.ts` - FF1 加密 ID 生成器测试（45 tests）
- `packages/publish/tests/id-validator.test.ts` - ID 验证测试（8 tests）

### 6.7. 测试覆盖率

| 测试类型               | 数量 | 覆盖范围                              |
| ---------------------- | ---- | ------------------------------------- |
| Rust wasm-bindgen-test | 17   | FF1Cipher 核心、加密解密、错误处理    |
| TypeScript vitest      | 70   | WASM 加载、API 封装、辅助函数、兼容层 |
| 集成测试               | 115  | 实际使用场景、ID 生成、验证           |

---

## 7. 安全性

本实现严格遵循 NIST SP 800-38G 标准，使用 AES-256 作为底层分组密码。

## 8. 许可证

Apache-2.0
