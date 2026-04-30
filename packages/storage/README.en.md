# @cmtx/storage

[![npm version](https://img.shields.io/npm/v/@cmtx/storage.svg)](https://www.npmjs.com/package/@cmtx/storage)
[![License](https://img.shields.io/npm/l/@cmtx/storage.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Object storage adapters providing a unified `IStorageAdapter` interface for
multiple cloud storage providers.

## Quick Start

```bash
pnpm add @cmtx/storage
pnpm add ali-oss          # For Aliyun OSS
pnpm add cos-nodejs-sdk-v5 # For Tencent COS
```

```typescript
import { createAdapter } from "@cmtx/storage/adapters/factory";

const adapter = await createAdapter({
    provider: "aliyun-oss",
    accessKeyId: "your-access-key-id",
    accessKeySecret: "your-access-key-secret",
    region: "oss-cn-hangzhou",
    bucket: "your-bucket-name",
});

const result = await adapter.upload(
    "/path/to/local/file.png",
    "remote/path/file.png",
);
console.log(result.url);
```

## Key Features

- **Unified interface** - `IStorageAdapter` provides a consistent API across
  providers
- **Aliyun OSS support** - Built-in adapter for Alibaba Cloud Object Storage
  Service
- **Tencent COS support** - Built-in adapter for Tencent Cloud Object Storage
- **Factory function** - `createAdapter` auto-creates the correct adapter based
  on provider config
- **Signed URLs** - Generate time-limited presigned URLs for secure sharing
- **Buffer uploads** - Upload from memory buffers with content type and
  overwrite protection
- **Extensible** - Implement `IStorageAdapter` to add support for any storage
  provider
- **TypeScript** - Full type definitions for all interfaces and configs

## API Docs

Generate full API documentation:

```bash
pnpm run docs
```

The generated docs are available at `docs/api/` and cover all adapters, types,
and factory functions.

## Development

```bash
pnpm build              # Build the package
pnpm test               # Run unit tests (mocked)
pnpm test:integration   # Run integration tests (real cloud)
pnpm lint               # Run code quality checks
```
