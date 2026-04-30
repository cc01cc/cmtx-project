# @cmtx/markdown-it-presigned-url

[![npm version](https://img.shields.io/npm/v/@cmtx/markdown-it-presigned-url.svg)](https://www.npmjs.com/package/@cmtx/markdown-it-presigned-url)
[![License](https://img.shields.io/npm/l/@cmtx/markdown-it-presigned-url.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Markdown-it plugin for presigned URL image rendering. Automatically signs image URLs from private cloud storage (OSS, S3, COS) for secure preview in markdown.

## Features

- Sign image URLs from private cloud storage
- Support both Markdown and HTML image formats
- Asynchronous URL signing with refresh callback
- Zero VS Code dependency - works with any markdown-it application
- Optional logging interface for debugging

## Installation

```bash
npm install @cmtx/markdown-it-presigned-url markdown-it
```

## Usage

### Basic Usage

```typescript
import MarkdownIt from "markdown-it";
import { presignedUrlPlugin } from "@cmtx/markdown-it-presigned-url";

const md = new MarkdownIt();

md.use(presignedUrlPlugin, {
    domains: ["bucket.oss-cn-hangzhou.aliyuncs.com"],
    imageFormat: "all",
    getSignedUrl: (src) => {
        // Return cached signed URL or null
        return myCache.get(src);
    },
    requestSignedUrl: async (src) => {
        // Generate and cache signed URL
        const signedUrl = await mySigner.sign(src);
        myCache.set(src, signedUrl);
        return signedUrl;
    },
    onSignedUrlReady: () => {
        // Refresh markdown preview
        console.log("URL ready, refresh preview");
    },
});

const html = md.render("![image](https://bucket.oss-cn-hangzhou.aliyuncs.com/path/image.png)");
```

### With Logger

```typescript
import { presignedUrlPlugin, type Logger } from "@cmtx/markdown-it-presigned-url";

const logger: Logger = {
    debug: (msg, ...args) => console.debug(msg, ...args),
    info: (msg, ...args) => console.info(msg, ...args),
    warn: (msg, ...args) => console.warn(msg, ...args),
    error: (msg, ...args) => console.error(msg, ...args),
};

md.use(presignedUrlPlugin, {
    domains: ["example.com"],
    imageFormat: "all",
    logger,
    getSignedUrl: (src) => null,
});
```

## API

### `presignedUrlPlugin(md, options)`

Markdown-it plugin function.

#### Options

| Option             | Type                               | Required | Description                                      |
| ------------------ | ---------------------------------- | -------- | ------------------------------------------------ |
| `domains`          | `string[]`                         | Yes      | List of hostnames to sign URLs for (exact match) |
| `imageFormat`      | `'markdown' \| 'html' \| 'all'`    | Yes      | Which image formats to process                   |
| `logger`           | `Logger`                           | No       | Optional logger interface for debugging          |
| `getSignedUrl`     | `(src: string) => string \| null`  | Yes      | Synchronous function to get cached signed URL    |
| `requestSignedUrl` | `(src: string) => Promise<string>` | No       | Asynchronous function to generate signed URL     |
| `onSignedUrlReady` | `() => void`                       | No       | Callback when async signing completes            |

### `Logger` Interface

```typescript
interface Logger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}
```

## How It Works

1. **Render Phase (Synchronous)**: Plugin checks if URL matches configured domains
    - If cached signed URL exists → return signed URL
    - If not cached → return original URL + trigger async signing

2. **Async Signing**: `requestSignedUrl` generates the signed URL in background
    - When complete, `onSignedUrlReady` callback is called
    - Host application should re-render markdown (e.g., refresh preview)

3. **Re-render**: Plugin finds cached signed URL and returns it

## Related

- [@cmtx/vscode-shared](../vscode-extensions/shared) - VS Code extension using this plugin

## Documentation

- [中文文档](./README.md)

## License

Apache-2.0
