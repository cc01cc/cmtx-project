# @cmtx/markdown-it-presigned-url-adapter-nodejs Changelog

## 0.1.1-alpha.0

### Patch Changes

- 7d85dec: changeset test
- Updated dependencies [7d85dec]
  - @cmtx/core@0.3.1-alpha.0
  - @cmtx/markdown-it-presigned-url@0.1.1-alpha.0
  - @cmtx/storage@0.1.1-alpha.0

## 0.1.0 - 2026-04-13

### Initial Release

#### 核心功能

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

#### API 接口

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

#### 技术特性

- **Node.js 专用** - 针对 Node.js 环境优化
- **异步签名** - 支持 Promise-based 异步签名
- **缓存友好** - 内置 LRU 缓存，减少重复签名请求
- **零配置集成** - 与 @cmtx/markdown-it-presigned-url 插件无缝集成
- **TypeScript** - 完整的类型支持

#### 依赖

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

#### 测试覆盖

- 44 个单元测试
- 测试覆盖：
  - UrlCacheManager 基本操作
  - UrlCacheManager 过期机制
  - UrlCacheManager LRU 淘汰策略
  - UrlSigner 签名功能
  - UrlSigner 域名验证
  - 日志功能

#### 文档

- 中文 README：`README.md`
- API 文档：运行 `pnpm run docs` 生成（位于 `docs/api/` 目录）

#### 相关项目

- [@cmtx/markdown-it-presigned-url](../markdown-it-presigned-url) - Markdown-it 预签名 URL 插件
- [@cmtx/storage](../storage) - 对象存储适配器
- [@cmtx/vscode-extension](../vscode-extension) - VS Code 扩展（使用此适配器）
