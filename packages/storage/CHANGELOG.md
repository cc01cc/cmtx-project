# @cmtx/storage 更新日志 / Changelog

## [0.1.1-alpha.1] - 2026-04-30
### Added

- `CloudStorageConfig` 新增可选 `storageId` 字段，用于标识存储实例
- 新增 `StorageServiceConfig` 包装接口，用于封装存储服务配置
- `IStorageAdapter` 接口新增可选方法 `list(prefix: string): Promise<string[]>`，支持对象列表列举

### Fixed

- 修复无效的动态导入（`INEFFECTIVE_DYNAMIC_IMPORT` 警告）
- 修复 AliOSSAdapter `signatureUrl` 调用方式：`client.signatureUrl()` 为同步方法，移除多余的 `await`

### Changed

- 清理兼容性导出，移除冗余的重新导出

---

### Added

- Add optional `storageId` field to `CloudStorageConfig` for storage instance identification
- Add `StorageServiceConfig` wrapper interface for storage service configuration
- Add optional method `list(prefix: string): Promise<string[]>` to `IStorageAdapter` interface

### Fixed

- Fix ineffective dynamic import (`INEFFECTIVE_DYNAMIC_IMPORT` warning)
- Fix AliOSSAdapter `signatureUrl` call: `client.signatureUrl()` is synchronous, remove redundant `await`

### Changed

- Clean up compatibility exports, remove redundant re-exports

## [0.1.1-alpha.0] - 2026-05-05
### Patch Changes

- 7d85dec: changeset test

## 0.1.0 - 2026-04-11

### 初始发布

#### 核心功能

- **阿里云 OSS 适配器** (`AliOSSAdapter`)
    - 文件上传 (`upload`)
    - 缓冲区上传 (`uploadBuffer`)
    - 文件下载 (`downloadToFile`)
    - 获取对象元数据 (`getObjectMeta`)
    - 检查对象是否存在 (`exists`)
    - 删除对象 (`delete`)
    - 生成预签名 URL (`getSignedUrl`)
    - 构建对象 URL (`buildUrl`)

- **腾讯云 COS 适配器** (`TencentCOSAdapter`)
    - 文件上传 (`upload`)
    - 缓冲区上传 (`uploadBuffer`)
    - 文件下载 (`downloadToFile`)
    - 获取对象元数据 (`getObjectMeta`)
    - 检查对象是否存在 (`exists`)
    - 删除对象 (`delete`)
    - 生成预签名 URL (`getSignedUrl`)
    - 构建对象 URL (`buildUrl`)

- **工厂函数** (`createAdapter`)
    - 支持根据凭证类型自动创建对应适配器
    - 支持阿里云 OSS 和腾讯云 COS

#### 类型定义

- `IStorageAdapter` - 存储适配器接口
- `AdapterUploadResult` - 上传结果类型
- `ObjectMeta` - 对象元数据类型
- `CloudProvider` - 云服务提供商类型
- `AliyunCredentials` - 阿里云凭证类型
- `TencentCredentials` - 腾讯云凭证类型
- `CloudCredentials` - 联合凭证类型
- `UploadBufferOptions` - 缓冲区上传选项

#### 技术特性

- **ESM / TypeScript** - 使用 ES 模块和 TypeScript
- **零运行时依赖** - 仅使用 peerDependencies
- **完整的类型定义** - 所有 API 都有完整的类型支持
- **子路径导入** - 支持按需导入特定适配器
- **TypeDoc 文档** - 自动生成 API 文档至 `docs/api/`

#### 测试覆盖

- 56 个单元测试，覆盖所有核心功能
- 支持集成测试（需要真实云存储凭证）

---

### Initial Release

#### Core Features

- **Aliyun OSS Adapter** (`AliOSSAdapter`)
    - File upload (`upload`)
    - Buffer upload (`uploadBuffer`)
    - File download (`downloadToFile`)
    - Get object metadata (`getObjectMeta`)
    - Check object existence (`exists`)
    - Delete object (`delete`)
    - Generate signed URL (`getSignedUrl`)
    - Build object URL (`buildUrl`)

- **Tencent Cloud COS Adapter** (`TencentCOSAdapter`)
    - File upload (`upload`)
    - Buffer upload (`uploadBuffer`)
    - File download (`downloadToFile`)
    - Get object metadata (`getObjectMeta`)
    - Check object existence (`exists`)
    - Delete object (`delete`)
    - Generate signed URL (`getSignedUrl`)
    - Build object URL (`buildUrl`)

- **Factory Function** (`createAdapter`)
    - Auto-create adapter based on credential type
    - Supports Aliyun OSS and Tencent Cloud COS

#### Type Definitions

- `IStorageAdapter` - Storage adapter interface
- `AdapterUploadResult` - Upload result type
- `ObjectMeta` - Object metadata type
- `CloudProvider` - Cloud provider type
- `AliyunCredentials` - Aliyun credential type
- `TencentCredentials` - Tencent Cloud credential type
- `CloudCredentials` - Union credential type
- `UploadBufferOptions` - Buffer upload options

#### Technical Features

- **ESM / TypeScript** - ES modules and TypeScript
- **Zero runtime dependencies** - peerDependencies only
- **Complete type definitions** - Full type support for all APIs
- **Sub-path imports** - Import specific adapters on demand
- **TypeDoc documentation** - Auto-generated API docs at `docs/api/`

#### Test Coverage

- 56 unit tests covering all core functionality
- Integration test support (requires real cloud storage credentials)
