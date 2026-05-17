---
title: "@cmtx/asset - 配置模块"
category: api
sidebar_order: 22
lang: zh-Hans
package: "@cmtx/asset"
module: config
status: stable
---

# @cmtx/asset - 配置模块

> CMTX 统一配置的事实源，提供配置文件的加载、保存、验证、环境变量替换和模板生成。


::: warning
CMTX 仍处于活跃开发阶段，API 可能随版本迭代发生变化。如有疑问或发现文档错误，欢迎通过 [GitHub Issues](https://github.com/cc01cc/cmtx-project/issues) 反馈。
:::

## 安装

```bash
pnpm add @cmtx/asset
```

## 快速开始

```typescript
import {
  loadConfigFromFile,
  validateConfig,
  generateDefaultConfig,
} from '@cmtx/asset'

// 1. 生成默认配置模板
const template = generateDefaultConfig()

// 2. 从文件加载配置
const config = await loadConfigFromFile('./cmtx.config.yaml')

// 3. 验证配置
const result = validateConfig(config)
if (!result.isValid) {
  console.error(result.errors.join('\n'))
}
```

## 配置加载

### ConfigLoader

配置加载器类，支持从 YAML 文件或字符串加载配置，自动替换环境变量。

```ts
class ConfigLoader {
  constructor(options?: { verbose?: boolean; envResolver?: (name: string) => string | undefined })
  loadFromFile(configPath: string): Promise<CmtxConfig>
  loadFromString(content: string): CmtxConfig
  saveToFile(configPath: string, config: CmtxConfig): Promise<void>
  findDefaultConfig(): Promise<string | undefined>
}
```

| 方法 | 返回值 | 说明 |
|:------|:--------|:------|
| `loadFromFile(configPath)` | `Promise<CmtxConfig>` | 从 YAML 文件加载配置 |
| `loadFromString(content)` | `CmtxConfig` | 从 YAML 字符串加载配置 |
| `saveToFile(configPath, config)` | `Promise<void>` | 保存配置到 YAML 文件 |
| `findDefaultConfig()` | `Promise<string \| undefined>` | 查找默认配置文件路径（向上遍历目录搜索 `cmtx.config.yaml` 或 `.cmtx/config.yaml`） |


### loadConfigFromFile

便捷函数，从文件加载配置。

```ts
function loadConfigFromFile(configPath: string, options?: { verbose?: boolean; envResolver?: (name: string) => string | undefined }): Promise<CmtxConfig>
```

### loadConfigFromString

便捷函数，从 YAML 字符串加载配置。

```ts
function loadConfigFromString(content: string, options?: { verbose?: boolean; envResolver?: (name: string) => string | undefined }): CmtxConfig
```

## 配置验证

### validateConfig

验证配置，返回验证结果对象。

```ts
function validateConfig(config: CmtxConfig): ValidationResult
```

#### ValidationResult (class)

| 方法 | 返回值 | 说明 |
|:------|:--------|:------|
| `hasErrors()` | `boolean` | 是否存在错误 |
| `hasFatal()` | `boolean` | 是否存在致命错误 |
| `format()` | `string` | 格式化输出所有错误信息 |

#### ConfigValidationError

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `path` | `string` | 错误路径（如 `storages.default.adapter`） |
| `message` | `string` | 错误消息 |
| `severity` | `'error' \| 'warning'` | 严重程度 |

#### 示例

```typescript
import { validateConfig } from '@cmtx/asset'

const result = validateConfig(config)
if (result.hasErrors()) {
  console.error(result.format())
}
```

## 配置类型

### CmtxConfig

CMTX 统一配置接口，对应 `cmtx.config.yaml` 文件结构。

```ts
interface CmtxConfig {
  version: string
  storages?: Record<string, CmtxStorageConfig>
  presignedUrls?: CmtxPresignedUrlConfig
  ai?: AIConfig
  rules?: Record<string, RuleConfig>
  presets?: Record<string, PresetConfig>
}
```

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `version` | `string` | 配置版本 |
| `storages?` | `Record<string, CmtxStorageConfig>` | 存储池配置 |
| `presignedUrls?` | `CmtxPresignedUrlConfig` | 预签名 URL 配置 |
| \`ai?\` | \`AIConfig\` | AI 配置（参见 [AIConfig](#) 类型） |
| `rules?` | `Record<string, RuleConfig>` | 全局 Rules 配置 |
| `presets?` | `Record<string, PresetConfig>` | Presets（Rule 集合） |

### CmtxStorageConfig

存储池中单个存储的配置。

```ts
interface CmtxStorageConfig {
  provider?: string
  adapter: string
  config: Record<string, string>
}
```

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `provider?` | `string` | 存储提供商（如 `aliyun-oss`、`tencent-cos`） |
| `adapter` | `string` | 适配器类型 |
| `config` | `Record<string, string>` | 适配器配置（敏感字段建议使用环境变量） |

### PresetConfig

Preset 配置，可为简洁版（string[]）或完整版（PresetConfigFull）。

```ts
type PresetConfig = string[] | PresetConfigFull
```

#### 示例

```typescript
import type { CmtxConfig, CmtxStorageConfig } from '@cmtx/asset'

// 完整的配置对象结构
const config: CmtxConfig = {
  version: 'v2',
  storages: {
    default: {
      adapter: 'aliyun-oss',
      config: {
        region: 'oss-cn-hangzhou',
        bucket: '${CMTX_BUCKET}',
        accessKeyId: '${CMTX_ACCESS_KEY_ID}',
      },
    },
  },
  presignedUrls: {
    expire: 600,
    domains: [
      { domain: 'cdn.example.com', useStorage: 'default' },
    ],
  },
}
```

## 预签名 URL

### resolvePresignedUrlOptions

解析预签名 URL 配置，将存储池配置映射为运行时所需的格式。

```ts
function resolvePresignedUrlOptions(
  presignedUrls: CmtxPresignedUrlConfig,
  storages?: Record<string, CmtxStorageConfig>,
): PresignedUrlResolvedOptions
```

| 参数 | 类型 | 说明 |
|:------|:------|:------|
| `presignedUrls` | `CmtxPresignedUrlConfig` | 预签名 URL 配置 |
| `storages?` | `Record<string, CmtxStorageConfig>` | 存储池配置 |

#### PresignedUrlResolvedOptions

| 属性 | 类型 | 说明 |
|:------|:------|:------|
| `storageConfigs` | `Record<string, CloudStorageConfig>` | 解析后的存储配置 |
| `domains` | `ResolvedDomainConfig[]` | 域名配置列表 |
| `expire` | `number` | 过期时间（秒） |
| `maxRetryCount` | `number` | 最大重试次数 |
| `imageFormat?` | `'markdown' \| 'html' \| 'all'` | 图片格式 |

## generateDefaultConfig

生成默认配置模板字符串。

```ts
function generateDefaultConfig(): string
```

#### 示例

```typescript
import { generateDefaultConfig } from '@cmtx/asset'

// 获取 YAML 模板
const template = generateDefaultConfig()
```

## 参考

- 完整类型定义请查阅 [TypeDoc 生成的参考文档](/cmtx/typedoc/)
- 配置参考：[CFG-001](../CFG-001-configuration-reference.md)
- 源码：[GitHub - packages/asset](https://github.com/cc01cc/cmtx-project/tree/main/packages/asset)
