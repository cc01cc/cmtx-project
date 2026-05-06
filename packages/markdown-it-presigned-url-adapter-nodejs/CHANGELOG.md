# @cmtx/markdown-it-presigned-url-adapter-nodejs 更新日志 / Changelog

## [0.2.0-alpha.3] - 2026-05-06

- 移除 pnpm catalog 依赖声明，改用直接版本号
- Updated dependencies [862fc95]
- Updated dependencies [862fc95]
- Updated dependencies [862fc95]
  - @cmtx/core@0.4.0-alpha.3
  - @cmtx/markdown-it-presigned-url@0.1.1-alpha.3
  - @cmtx/storage@0.1.1-alpha.2

## [0.2.0-alpha.2] - 2026-05-05

### Changed

- **`resolveStorageCredentials`**: 移除内联凭证分支，凭证解析统一走 `useStorage` -> `storageConfigs` 路径
- **`UrlSigner`**: 凭证解析重构，移除内联凭证支持

---

### Changed

- **`resolveStorageCredentials`**: Removed inline credential branch, credential resolution unified to `useStorage` -> `storageConfigs` path
- **`UrlSigner`**: Credential resolution refactored, inline credential support removed

## [0.1.1-alpha.1] - 2026-04-30

### Added

- `PresignedUrlDomainConfig` 类型导出，用于预签名 URL 域名配置
- `package.json` 增加 `repository`、`files`、`publishConfig` 元数据字段

### Breaking Changes

- 配置参数重构：`UrlSigner` 构造函数签名变更
  - 移除 `providerConfigs: CloudStorageConfig[]` 参数
  - 新增 `storageConfigs: Record<string, CloudStorageConfig>` 参数
  - 新增 `domains: PresignedUrlDomainConfig[]` 参数
- **迁移指南**：将原有数组格式的 `providerConfigs` 改为按存储 ID 索引的对象格式，并新增 `domains` 配置项：

```typescript
// 之前（旧）
new UrlSigner(client, {
  providerConfigs: [{ provider: 'aliyun', ... }],
})

// 之后（新）
new UrlSigner(client, {
  storageConfigs: {
    myStorage: { provider: 'aliyun', ... },
  },
  domains: [{ storageId: 'myStorage', pattern: 'https://...', ... }],
})
```

---

### Added

- Export `PresignedUrlDomainConfig` type for presigned URL domain configuration
- Add `repository`, `files`, `publishConfig` metadata fields to `package.json`

### Breaking Changes

- Configuration parameter refactor: `UrlSigner` constructor signature changed
  - Removed `providerConfigs: CloudStorageConfig[]` parameter
  - Added `storageConfigs: Record<string, CloudStorageConfig>` parameter
  - Added `domains: PresignedUrlDomainConfig[]` parameter
- **Migration guide**: Convert the original array-format `providerConfigs` to an object keyed by storage ID, and add a new `domains` configuration item

## 0.1.1-alpha.0

### Patch Changes

- 7d85dec: changeset test
- Updated dependencies [7d85dec]
  - @cmtx/core@0.3.1-alpha.0
  - @cmtx/markdown-it-presigned-url@0.1.1-alpha.0
  - @cmtx/storage@0.1.1-alpha.0

## 0.1.0 - 2026-04-13

### 核心功能

- **预签名 URL 生成器** (`UrlSigner`)

  - 为阿里云 OSS 等云存储生成预签名 URL
  - 支持自定义 URL 有效期（默认 3600 秒）
  - 域名白名单过滤
  - 可选的日志接口

- **URL 缓存管理器** (`UrlCacheManager`)

  - 内置 LRU 缓存机制
  - 可配置最大缓存条目数（默认 1000）
  - 支持 TTL 过期（默认 1 小时）
  - 提供 get/set/has/delete/clear 方法

- **类型定义**
  - `PresignedUrlAdapter` - 预签名 URL 适配器接口
  - `PresignedUrlCache` - 预签名 URL 缓存接口
  - `UrlSignerOptions` - 签名器配置选项
  - `UrlCacheManagerOptions` - 缓存管理器配置选项
  - `CacheManagerLogger` - 缓存管理器日志接口
  - `SignerLogger` - 签名器日志接口

### API 接口

- `UrlSigner` - 预签名 URL 生成器类

  - `constructor(client: OSS, options: UrlSignerOptions)`
  - `sign(src: string): Promise<string>`

- `UrlCacheManager` - URL 缓存管理器类
  - `constructor(options?: UrlCacheManagerOptions)`
  - `get(src: string): string | null`
  - `set(src: string, url: string): void`
  - `has(src: string): boolean`
  - `delete(src: string): boolean`
  - `clear(): void`

### 技术特性

- **Node.js 专用** - 针对 Node.js 环境优化
- **异步签名** - 支持 Promise-based 异步签名
- **缓存友好** - 内置 LRU 缓存，减少重复签名请求
- **零配置集成** - 与 @cmtx/markdown-it-presigned-url 插件无缝集成
- **TypeScript** - 完整的类型支持

### 依赖

- **Peer Dependencies**:

  - `@cmtx/markdown-it-presigned-url`: `workspace:*`

- **Dependencies**:

  - `@cmtx/storage`: `workspace:*`
  - `@cmtx/core`: `workspace:*`
  - `ali-oss`: `catalog:`

- **Dev Dependencies**:
  - `@types/ali-oss`: `catalog:`
  - `@types/node`: `catalog:`
  - `typescript`: `catalog:`
  - `vitest`: `catalog:`

### 测试覆盖

- 44 个单元测试
- 测试覆盖：
  - UrlCacheManager 基本操作
  - UrlCacheManager 过期机制
  - UrlCacheManager LRU 淘汰策略
  - UrlSigner 签名功能
  - UrlSigner 域名验证
  - 日志功能

### 文档

- 中文 README：`README.md`
- API 文档：运行 `pnpm run docs` 生成（位于 `docs/api/` 目录）

### 相关项目

- [@cmtx/markdown-it-presigned-url](../markdown-it-presigned-url) - Markdown-it 预签名 URL 插件
- [@cmtx/storage](../storage) - 对象存储适配器
- [@cmtx/vscode-extension](../vscode-extension) - VS Code 扩展（使用此适配器）

---

### Features

- **Presigned URL Generator** (`UrlSigner`)

  - Generate presigned URLs for Alibaba Cloud OSS and other cloud storage
  - Customizable URL expiration (default 3600 seconds)
  - Domain whitelist filtering
  - Optional logger interface

- **URL Cache Manager** (`UrlCacheManager`)

  - Built-in LRU cache mechanism
  - Configurable max cache entries (default 1000)
  - TTL expiration support (default 1 hour)
  - Provides get/set/has/delete/clear methods

- **Type Definitions**
  - `PresignedUrlAdapter` - Presigned URL adapter interface
  - `PresignedUrlCache` - Presigned URL cache interface
  - `UrlSignerOptions` - Signer configuration options
  - `UrlCacheManagerOptions` - Cache manager configuration options
  - `CacheManagerLogger` - Cache manager logger interface
  - `SignerLogger` - Signer logger interface

### API

- `UrlSigner` - Presigned URL generator class

  - `constructor(client: OSS, options: UrlSignerOptions)`
  - `sign(src: string): Promise<string>`

- `UrlCacheManager` - URL cache manager class
  - `constructor(options?: UrlCacheManagerOptions)`
  - `get(src: string): string | null`
  - `set(src: string, url: string): void`
  - `has(src: string): boolean`
  - `delete(src: string): boolean`
  - `clear(): void`

### Technical Highlights

- **Node.js Only** - Optimized for Node.js environments
- **Async Signing** - Promise-based async signing support
- **Cache Friendly** - Built-in LRU cache to reduce duplicate signing requests
- **Zero Config Integration** - Seamless integration with @cmtx/markdown-it-presigned-url plugin
- **TypeScript** - Full type support

### Dependencies

- **Peer Dependencies**:

  - `@cmtx/markdown-it-presigned-url`: `workspace:*`

- **Dependencies**:

  - `@cmtx/storage`: `workspace:*`
  - `@cmtx/core`: `workspace:*`
  - `ali-oss`: `catalog:`

- **Dev Dependencies**:
  - `@types/ali-oss`: `catalog:`
  - `@types/node`: `catalog:`
  - `typescript`: `catalog:`
  - `vitest`: `catalog:`

### Test Coverage

- 44 unit tests
- Test coverage includes:
  - UrlCacheManager basic operations
  - UrlCacheManager expiration mechanism
  - UrlCacheManager LRU eviction strategy
  - UrlSigner signing functionality
  - UrlSigner domain validation
  - Logger functionality

### Documentation

- Chinese README: `README.md`
- API docs: run `pnpm run docs` (generated in `docs/api/` directory)

### Related Projects

- [@cmtx/markdown-it-presigned-url](../markdown-it-presigned-url) - Markdown-it presigned URL plugin
- [@cmtx/storage](../storage) - Object storage adapter
- [@cmtx/vscode-extension](../vscode-extension) - VS Code extension (uses this adapter)
