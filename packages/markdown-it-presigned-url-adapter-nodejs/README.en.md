# @cmtx/markdown-it-presigned-url-adapter-nodejs

[![npm version](https://img.shields.io/npm/v/@cmtx/markdown-it-presigned-url-adapter-nodejs.svg)](https://www.npmjs.com/package/@cmtx/markdown-it-presigned-url-adapter-nodejs)
[![License](https://img.shields.io/npm/l/@cmtx/markdown-it-presigned-url-adapter-nodejs.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Node.js adapter providing cloud-storage presigned URL generation for the
`@cmtx/markdown-it-presigned-url` plugin with built-in caching and Aliyun OSS support.

> Full API documentation: `pnpm run docs` (generated at `docs/api/`)

## 1. Installation

```bash
pnpm add @cmtx/markdown-it-presigned-url-adapter-nodejs @cmtx/markdown-it-presigned-url
```

## 2. Quick start

```typescript
import MarkdownIt from "markdown-it";
import { presignedUrlPlugin } from "@cmtx/markdown-it-presigned-url";
import { UrlSigner, UrlCacheManager } from "@cmtx/markdown-it-presigned-url-adapter-nodejs";

const signer = new UrlSigner({
    storageConfigs: {
        oss: {
            provider: "aliyun-oss",
            region: "oss-cn-hangzhou",
            bucket: "your-bucket",
            accessKeyId: process.env.CMTX_ALIYUN_ACCESS_KEY_ID,
            accessKeySecret: process.env.CMTX_ALIYUN_ACCESS_KEY_SECRET,
        },
    },
    domains: [
        { domain: "your-bucket.oss-cn-hangzhou.aliyuncs.com", useStorage: "oss" },
    ],
    expire: 600,
    maxRetryCount: 3,
}, new UrlCacheManager());

const signedUrl = await signer.signUrl(
    "https://your-bucket.oss-cn-hangzhou.aliyuncs.com/path/image.png"
);
```

## 3. Features

- **UrlSigner**: presigned URL generation with storage pool and domain config
- **UrlCacheManager**: built-in caching with TTL, retry tracking, and pending request dedup
- **Aliyun OSS**: full Aliyun OSS presigned URL support
- **markdown-it integration**: drop-in with `presignedUrlPlugin`

## 4. Development

```bash
pnpm build      # Build
pnpm test       # Run tests
pnpm lint       # Code quality check
pnpm run docs   # Generate API docs
```

## 5. License

Apache-2.0
