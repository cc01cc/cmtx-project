# @cmtx/fpe-wasm

[![npm version](https://img.shields.io/npm/v/@cmtx/fpe-wasm.svg)](https://www.npmjs.com/package/@cmtx/fpe-wasm)
[![License](https://img.shields.io/npm/l/@cmtx/fpe-wasm.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

NIST SP 800-38G FF1 format-preserving encryption (FPE) implemented as a
WebAssembly module, built on the Rust `fpe` crate with AES-256.

## Quick start

```bash
pnpm add @cmtx/fpe-wasm
```

```typescript
import { FF1Cipher, encrypt_string, decrypt_string } from "@cmtx/fpe-wasm";

const key = new Uint8Array(32);
// ... populate key with 32 bytes

const cipher = new FF1Cipher(key, 36); // radix 36 (0-9, A-Z)

const encrypted = encrypt_string(cipher, "ABC123");
const decrypted = decrypt_string(cipher, encrypted);
```

## Key features

- NIST SP 800-38G FF1 standard compliance with AES-256
- Format-preserving: output length equals input length
- Radix range 2-36 supporting digits, letters, and mixed alphabets
- Lazy WASM loading: module auto-loads on first use, no manual `loadWASM()` call required
- String-level API (`encrypt_string` / `decrypt_string`) for radix-36 text
- Byte-level API (`encrypt` / `decrypt` on `FF1Cipher`) for arbitrary data
- Convenience functions: `encryptString`, `decryptString`, `createFF1Cipher`, `prepareFPEKey`
- WASM status: `loadWASM()`, `isWasmLoaded()` for manual control
- Built on Rust `fpe` crate compiled to WASM via wasm-pack
- Full TypeScript type definitions included

## API docs

Generate API documentation with:

```bash
pnpm run docs
```

Output is written to `docs/api/`.

## Development

```bash
pnpm build   # compile Rust to WASM and bundle TypeScript
pnpm test    # run all tests (Rust wasm-bindgen + TypeScript vitest)
pnpm lint    # code quality and formatting check
```

## License

Apache-2.0
