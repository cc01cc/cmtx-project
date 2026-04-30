# @cmtx/asset

[![npm version](https://img.shields.io/npm/v/@cmtx/asset.svg)](https://www.npmjs.com/package/@cmtx/asset)
[![License](https://img.shields.io/npm/l/@cmtx/asset.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Markdown asset management pipeline -- upload local images to cloud storage,
transfer between storage services, download remote images, and delete with
reference checking. Coordinates file I/O and cross-package business logic.

## Quick start

```bash
pnpm add @cmtx/asset
```

```typescript
import { createFileService } from "@cmtx/asset/file";

const fs = createFileService();

const images = await fs.filterImagesFromFile("/path/to/file.md");

const result = await fs.replaceImagesInFile("/path/to/file.md", [
    { field: "src", pattern: "./old.png", newSrc: "./new.png" },
]);

const deleteResult = await fs.deleteLocalImage("/path/to/image.png", {
    strategy: "trash",
});
```

## Key features

- FileService: unified file-level image operations (filter, replace, delete)
- Upload pipeline: scan Markdown files, upload local images to cloud storage
  with deduplication and template-based naming
- Transfer pipeline: move or copy remote images between storage providers
  with concurrency control and progress tracking
- Download pipeline: download remote images to local with naming templates
  and domain filtering
- DeleteService: reference-checked deletion with trash / move / hard-delete
  strategies
- ConfigBuilder: chain-style configuration for upload and transfer workflows
- ConfigLoader / ConfigValidator: YAML configuration loading with
  environment variable substitution
- Two-level deduplication: per-file and cross-file to minimize uploads
- URL detection: `detectStorageUrl`, `isStorageUrl`, `isSignedUrl`, `isAliyunOssUrl`

## API docs

Generate API documentation with:

```bash
pnpm run docs
```

Output is written to `docs/api/`.

## Development

```bash
pnpm build   # compile TypeScript
pnpm test    # run all tests
pnpm lint    # code quality and formatting check
```

## License

Apache-2.0
