# CFG-001: CMTX for VS Code 配置指南

## 配置总览

CMTX for VS Code 的配置分为两层：

| 层级 | 位置 | 说明 |
| --- | --- | --- |
| VS Code 原生配置 | `settings.json` | 仅 `cmtx.configDir`，指定配置目录路径 |
| 统一配置文件 | `.cmtx/config.yaml` | 存储池、上传、预签名 URL、图片缩放、Rules、Presets |

### VS Code 原生配置

仅有一个 `cmtx.configDir` 配置项，用于指定 CMTX 配置目录的路径（相对工作区根目录或绝对路径），默认为 `.cmtx`。

```json
{
    "cmtx.configDir": ".cmtx"
}
```

所有扩展功能配置均通过 `@cmtx/asset` 包统一管理，写入 `{configDir}/config.yaml` 文件。

## 统一配置文件

### 基础配置

- **config 文件**：`.cmtx/config.yaml`（或自定义 `cmtx.configDir` 指向的目录下的 `config.yaml`）
- **加载器**：`@cmtx/asset` 包的 `ConfigLoader`
- **配置版本**：当前为 `v2`

### 环境变量替换

配置文件中支持使用 `${VAR_NAME}` 语法引用环境变量，适用于密钥等敏感信息：

```yaml
storages:
  default:
    adapter: aliyun-oss
    config:
      region: oss-cn-hangzhou
      bucket: "${CMTX_ALIYUN_BUCKET}"
      accessKeyId: "${CMTX_ALIYUN_ACCESS_KEY_ID}"
      accessKeySecret: "${CMTX_ALIYUN_ACCESS_KEY_SECRET}"
```

设置环境变量后需重启 VS Code 才能生效。

### 配置模板

扩展提供了一个默认配置模板，可通过命令 `CMTX: Create configuration...` 生成（对应 `cmtx.configInit` 命令）。

### 示例配置文件

```yaml
version: v2

storages:
  default:
    adapter: aliyun-oss
    config:
      region: oss-cn-hangzhou
      bucket: "${CMTX_ALIYUN_BUCKET}"
      accessKeyId: "${CMTX_ALIYUN_ACCESS_KEY_ID}"
      accessKeySecret: "${CMTX_ALIYUN_ACCESS_KEY_SECRET}"

upload:
  imageFormat: markdown
  batchLimit: 5
  auto: false
  conflictStrategy: skip
  useStorage: default
  prefix: blog/
  replace:
    fields:
      src: "{cloudSrc}"
      alt: "{originalAlt}"
  delete:
    enabled: false
    strategy: trash

presignedUrls:
  expire: 600
  maxRetryCount: 3
  imageFormat: all
  domains:
    - domain: my-bucket.oss-cn-hangzhou.aliyuncs.com
      useStorage: default
      prefix: blog/

resize:
  widths: [360, 480, 640, 800, 960, 1200]
  domains:
    - domain: my-bucket.oss-cn-hangzhou.aliyuncs.com
      provider: aliyun-oss

rules:
  add-section-numbers:
    minLevel: 2
    maxLevel: 6
    startLevel: 2
    separator: "."

presets:
  blog:
    - strip-frontmatter
    - promote-headings
    - add-section-numbers
    - upload-images
    - frontmatter-id
    - frontmatter-date
```

### 配置项详细说明

完整配置类型定义位于 `@cmtx/asset` 包的 `src/config/types.ts`，核心结构：

| 顶层字段 | 类型 | 说明 |
| --- | --- | --- |
| `version` | string | 配置版本号 |
| `storages` | Record<string, StorageConfig> | 存储池配置（支持多存储实例） |
| `upload` | UploadConfig | 上传行为配置 |
| `presignedUrls` | PresignedUrlConfig | 预签名 URL 生成配置 |
| `resize` | ResizeConfig | 图片缩放配置 |
| `rules` | Record<string, RuleConfig> | 全局 Rule 默认参数 |
| `presets` | Record<string, PresetConfig> | Preset 集合（有序 Rule 列表） |

## 环境变量参考

完整环境变量清单请参考 [CFG-001 配置参考](../../docs/CFG-001-configuration-reference.md#环境变量)。

## 配置验证

扩展使用 `@cmtx/asset` 的 `validateConfig()` 在加载配置时进行校验，校验结果通过 VS Code 通知面板展示。

## 配置热重载

扩展监听 `.cmtx/config.yaml` 文件变更，文件修改后配置会自动重新加载。

## 相关文档

- `@cmtx/asset` 配置系统：`packages/asset/src/config/`
- 默认配置模板：`packages/asset/src/config/template.ts`
- 配置类型定义：`packages/asset/src/config/types.ts`
