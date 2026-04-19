# @cmtx/storage Changelog

## 0.1.1-alpha.0

### Patch Changes

- 7d85dec: changeset test

## 0.1.0 - 2026-04-11

### Initial Release

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
