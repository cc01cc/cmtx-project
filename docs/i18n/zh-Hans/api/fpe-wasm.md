---
title: "@cmtx/fpe-wasm API"
category: api
sidebar_order: 7
lang: zh-Hans
package: "@cmtx/fpe-wasm"
status: stable
---

# @cmtx/fpe-wasm API

> NIST SP 800-38G FF1 格式保留加密（Format-Preserving Encryption）的 WASM 封装。
> 基于 AES-256 加密算法，密文与明文保持相同长度和字符集，支持 radix 2-36 的字符空间。


::: warning
CMTX 仍处于活跃开发阶段，API 可能随版本迭代发生变化。如有疑问或发现文档错误，欢迎通过 [GitHub Issues](https://github.com/cc01cc/cmtx-project/issues) 反馈。
:::

## 安装

```bash
pnpm add @cmtx/fpe-wasm
```

## 快速开始

```typescript
import { loadWASM, createFF1Cipher, prepareFPEKey, encryptString, decryptString } from '@cmtx/fpe-wasm'

// 1. 加载 WASM（必须先调用）
await loadWASM()

// 2. 准备密钥
const key = prepareFPEKey('my-secret-key')

// 3. 创建加密器
const cipher = createFF1Cipher(key, 36)

// 4. 加密字符串
const encrypted = encryptString(cipher, 'ABC123')

// 5. 解密字符串
const decrypted = decryptString(cipher, encrypted)
// => 'ABC123'
```

## WASM 加载

`loadWASM` 必须在调用加密功能前完成。多次调用是安全的，WASM 只会被加载一次。

### loadWASM

加载 FPE WASM 模块。

```ts
function loadWASM(options?: LoadWasmOptions): Promise<void>
```

| 参数 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `options` | `LoadWasmOptions` | — | 加载选项（可选） |

`LoadWasmOptions`：

| 属性 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `data` | `InitInput` | — | WASM 数据，不提供时自动从 pkg 目录加载 |

```typescript
// 标准加载
await loadWASM()

// VS Code Extension：手动传入 WASM buffer
import { readFileSync } from 'node:fs'
const wasmBuffer = readFileSync('./path/to/cmtx_fpe_wasm_bg.wasm')
await loadWASM({ data: wasmBuffer })
```

::: warning
`loadWASM` 必须在调用 `createFF1Cipher`、`encryptString`、`decryptString` 等函数之前完成。多次调用是安全的，WASM 只会被加载一次。
:::


### isWasmLoaded

检查 WASM 模块是否已加载完成。

```ts
function isWasmLoaded(): boolean
```

#### 返回值

`boolean` — WASM 是否已加载完成。

### InitInput

WASM 初始化输入的类型，支持多种数据来源。

```ts
type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module
```

### InitOutput

WASM 初始化后的输出实例类型（由 wasm-bindgen 生成）。

## FF1 加密器

### FF1Cipher

FF1 格式化保留加密器，提供字节级的加密和解密操作。

```ts
class FF1Cipher {
  constructor(key: Uint8Array, radix: number)
  encrypt(plaintext: Uint8Array): Uint8Array
  decrypt(ciphertext: Uint8Array): Uint8Array
  get radix(): number
}
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `key` | `Uint8Array` | 32 字节 AES-256 密钥 |
| `radix` | `number` | 进制数（2-36） |

#### 方法

| 方法 | 返回值 | 说明 |
|:------|:--------|:------|
| `encrypt(plaintext)` | `Uint8Array` | 加密字节数组，输出与输入等长 |
| `decrypt(ciphertext)` | `Uint8Array` | 解密字节数组 |
| `radix` | `number` | 获取当前进制数 |

> [!WARNING]
> `FF1Cipher` 构造函数要求密钥长度为 32 字节。可使用 `prepareFPEKey` 将任意密钥字符串转换为符合要求的格式。

```typescript
const key = new Uint8Array(32)
const cipher = new FF1Cipher(key, 36)
const encrypted = cipher.encrypt(new Uint8Array([1, 2, 3, 4, 5, 6]))
const decrypted = cipher.decrypt(encrypted)
```

### createFF1Cipher

创建 FF1 加密器的便捷方法，自动处理 WASM 加载。

```ts
function createFF1Cipher(key: Uint8Array, radix?: number): FF1Cipher
```

| 参数 | 类型 | 默认值 | 说明 |
|:------|:------|:--------|:------|
| `key` | `Uint8Array` | — | 32 字节加密密钥 |
| `radix` | `number` | `36` | 进制数 |

```typescript
const key = prepareFPEKey('my-secret-key')
const cipher = createFF1Cipher(key) // radix 默认为 36
```

### encryptString

加密字符串，使用 radix 对应的字符集进行格式化保留加密。

```ts
function encryptString(cipher: FF1Cipher, plaintext: string): string
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `cipher` | `FF1Cipher` | FF1 加密器实例 |
| `plaintext` | `string` | 明文，仅含 0-9 A-Z a-z 字符 |

#### 返回值

`string` — 密文，与明文等长且使用相同字符集。输入字母不区分大小写，输出统一为大写。

> [!NOTE]
> 密文最小长度由 radix 决定。radix=36 时，明文至少需要 6 个字符。

### decryptString

解密字符串。

```ts
function decryptString(cipher: FF1Cipher, ciphertext: string): string
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `cipher` | `FF1Cipher` | FF1 加密器实例 |
| `ciphertext` | `string` | 密文 |

#### 返回值

`string` — 解密后的明文。

## 辅助函数

### prepareFPEKey

将密钥转换为 FF1 算法所需的 32 字节格式。

```ts
function prepareFPEKey(key: string | Buffer): Uint8Array
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `key` | `string \| Buffer` | 原始密钥 |

#### 返回值

`Uint8Array` — 32 字节密钥数组。

- 字符串：自动 padding 或截断至 32 字节
- Buffer：16/24/32 字节自动 padding 至 32 字节
- 空值：抛出错误

## 参考

- 完整类型定义请查阅 [TypeDoc 生成的参考文档](/cmtx/typedoc/)
- 源码：[GitHub - packages/fpe-wasm](https://github.com/cc01cc/cmtx-project/tree/main/packages/fpe-wasm)
- 算法标准：NIST SP 800-38G FF1
