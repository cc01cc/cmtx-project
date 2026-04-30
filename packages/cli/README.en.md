# @cmtx/cli

[![npm version](https://img.shields.io/npm/v/@cmtx/cli.svg)](https://www.npmjs.com/package/@cmtx/cli)
[![License](https://img.shields.io/npm/l/@cmtx/cli.svg)](https://github.com/cc01cc/cmtx-project/blob/main/LICENSE)

Markdown image management command-line tool. Scan, analyze, upload, download,
transfer, format, and adapt images in Markdown files through a unified CLI
interface backed by `@cmtx/asset` and `@cmtx/publish`.

## Quick start

```bash
pnpm add -g @cmtx/cli
```

```bash
cmtx --help
cmtx analyze ./docs --depth 2 --output json
cmtx upload ./docs --region oss-cn-hangzhou --bucket my-bucket --prefix images/
cmtx download ./article.md --output ./images/ --domain cdn.example.com
cmtx format ./article.md --to html --width 480
cmtx adapt ./article.md --rule-file ./my-preset.yaml --out ./output/article.md
```

## Key features

- `analyze`: scan Markdown files, extract and list all image references with
  filtering by depth, extension, and size
- `upload`: batch-upload local images to cloud storage (OSS) and
  auto-update Markdown references with deduplication
- `download`: download remote images from Markdown files to local
  directories with naming templates and concurrency control
- `format`: convert between Markdown img and HTML img syntax, set
  width/height on HTML output
- `copy`: copy remote images between storage providers (source preserved),
  update Markdown references
- `move`: transfer remote images between storage providers (source deleted),
  update Markdown references
- `adapt`: apply rule-engine transformations and registered Presets to
  rewrite Markdown content, with validation and HTML rendering
- Environment variable support for credentials, avoiding sensitive data
  in command history
- YAML-based configuration files for copy/move operations

## API docs

This package provides a CLI interface. For library API documentation of
its dependencies, see the respective packages.

## Development

```bash
pnpm build   # compile TypeScript
pnpm test    # run all tests
pnpm lint    # code quality and formatting check
```

## License

Apache-2.0
