---
title: CFG-001 - 配置参考
---

# CFG-001: 配置参考

> 本文档是 CMTX 配置的唯一事实源。所有应用层文档（CLI、VS Code、MCP Server）的配置部分均引用本文档。
> 后续新增环境变量或配置字段只需修改此处 + 对应代码实现。

## 环境变量

凭证优先从 YAML 配置文件中读取，未配置时回退到环境变量。

### 阿里云 OSS

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `CMTX_ALIYUN_ACCESS_KEY_ID` | 是 | - | RAM 用户 AccessKey ID |
| `CMTX_ALIYUN_ACCESS_KEY_SECRET` | 是 | - | RAM 用户 AccessKey Secret |
| `CMTX_ALIYUN_BUCKET` | 是 | - | OSS Bucket 名称 |
| `CMTX_ALIYUN_REGION` | 否 | `oss-cn-hangzhou` | OSS 地域 |

### 腾讯云 COS

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `CMTX_TENCENT_SECRET_ID` | 是 | - | 云 API SecretId |
| `CMTX_TENCENT_SECRET_KEY` | 是 | - | 云 API SecretKey |
| `CMTX_TENCENT_BUCKET` | 是 | - | COS Bucket（格式 `bucketname-appid`） |
| `CMTX_TENCENT_REGION` | 否 | `ap-guangzhou` | COS 地域 |

### AI Provider

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `CMTX_DEEPSEEK_API_KEY` | 否 | DeepSeek API Key（`ai.models.*.provider: deepseek` 时使用）|
| `CMTX_QWEN_API_KEY` | 否 | 阿里云 Qwen API Key（`ai.models.*.provider: alibaba` 时使用）|

### FBE 加密密钥

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `CMTX_FBE_KEY` | 否 | ID 生成时的 FPE 加密密钥（`frontmatter-id.ff1.encryptionKey` 默认值）|

## 凭证解析流程

```
1. config.accessKeyId / config.secretId（YAML 配置文件中的值）
2. CMTX_ALIYUN_ACCESS_KEY_ID / CMTX_TENCENT_SECRET_ID（环境变量）
3. 内置默认值（region 等）
```

当三个字段（key/secret/bucket）任一缺失时报错。

> **注意**: 配置项 `upload`、`resize` 已废弃并从顶层移除，其配置迁移至 `rules.upload-images` 和 `rules.resize-image` 下。`upload.delete` 配置项已移除。

## YAML 配置参考

> 以下 YAML 展示每个 section 内部的默认值。顶级可选 section（`presignedUrls`、`rules`、`presets`）整块不配置时对应功能关闭。
> 运行 `cmtx config init` 生成的模板仅包含必要配置，不在此模板中的字段不会丢失默认行为。

```yaml
# yaml-language-server: $schema=./config.schema.json
version: v2                       # 配置版本（当前为 v2）

# ============================
# 存储池（必需）
# ============================
storages:
  default:                        # 存储 ID，可自定义；rules.upload-images.useStorage 引用此 ID
    adapter: aliyun-oss           # aliyun-oss | tencent-cos
    config:
      region: oss-cn-hangzhou     # 地域（如 oss-cn-hangzhou、ap-guangzhou）
      bucket: "${CMTX_ALIYUN_BUCKET}"          # Bucket 名称；支持环境变量引用
      accessKeyId: "${CMTX_ALIYUN_ACCESS_KEY_ID}"
      accessKeySecret: "${CMTX_ALIYUN_ACCESS_KEY_SECRET}"

# ============================
# 预签名 URL 配置（可选，整块不配置则禁用预签名功能）
# 各子字段仅在 presignedUrls 存在时生效
# ============================
presignedUrls:
  expire: 600                     # 签名过期时间，单位秒
  maxRetryCount: 3                # 签名失败时最大重试次数
  imageFormat: all                # 处理的图片格式范围：markdown | html | all
  domains:                        # 需要签名处理的域名列表
    - domain: my-bucket.oss-cn-hangzhou.aliyuncs.com
      useStorage: default         # 引用 storages 中的配置（必填）
      path: blog/                 # URL 路径前缀，可选

# ============================
# AI 配置（可选，整块不配置则 AI 功能禁用）
# ============================
ai:
  models:
    deepseek-v4-flash:              # 自定义模型 ID，rule 中通过 useModel 引用
      provider: deepseek            # deepseek | alibaba | openai-compatible
      model: deepseek-v4-flash      # 实际模型名称
      apiKey: "${CMTX_DEEPSEEK_API_KEY}" # 支持环境变量引用
      timeout: 30000                # 可选，超时（毫秒）
      maxRetries: 3                 # 可选，重试次数
  defaultModel: deepseek-v4-flash   # 可选，不指定时 rule 必须显式指定 useModel

# ============================
# 全局 Rules 默认参数（可选，整块不配置则所有 rule 使用代码内置默认值）
# 当 preset 中某个 rule 未指定 config 时，使用此处的默认值
# ============================
rules:
  # 文本处理
  strip-frontmatter: {}           # 移除 YAML frontmatter
  promote-headings:
    levels: 1                     # 提升 N 级标题（H2->H1, H3->H2）
  text-replace:
    match: ""                     # 正则匹配模式
    replace: ""                   # 替换文本，支持 $1 捕获组
    flags: "gm"                   # 正则标志：g(全局) m(多行) i(忽略大小写)

  # 图片处理
  convert-images:
    convertToHtml: false          # true=Markdown 转 HTML img 标签；false=反向转换

  # 图片上传（可选，整块不配置则禁用上传功能）
  upload-images:
    imageFormat: markdown         # 输出格式：markdown | html
    batchLimit: 5                 # 批量上传并发数
    namingTemplate: "{timestamp}-{name}.{ext}"  # 远程文件命名模板
    auto: false                   # 是否自动上传（监听文件变更）
    conflictStrategy: skip        # 冲突策略：skip（跳过，保留远程）| overwrite（覆盖为本地）
    useStorage: default           # 引用 storages 中的哪个存储配置
    prefix: ""                    # 远程路径前缀，如 blog/images/
    domain: ""                    # 自定义域名（可选），上传后 URL 替换为此域名，如 cdn.example.com
    replace:                      # 字段替换模板（上传后修改图片引用属性）
      fields:
        src: "{cloudSrc}"         # 替换图片路径的模板
        alt: "{originalAlt}"      # 替换 alt 文本的模板
        # title: "{originalTitle}"

  # 图片缩放（可选，整块不配置则禁用缩放功能）
  resize-image:
    widths: [360, 480, 640, 800, 960, 1200]   # 可用缩放宽度列表
    domains:
      - domain: my-bucket.oss-cn-hangzhou.aliyuncs.com
        provider: aliyun-oss      # aliyun-oss | tencent-cos | html

  # 章节编号
  add-section-numbers:
    minLevel: 2                   # 起始标题等级
    maxLevel: 6                   # 最大标题等级
    startLevel: 2                 # 起始层级
    separator: "."                # 编号分隔符（如 "1.1."）
  remove-section-numbers: {}      # 移除章节编号

  # Metadata / Frontmatter
  frontmatter-title:
    headingLevel: 1               # 提取指定级别的标题到 frontmatter.title
  frontmatter-date:
    fieldName: date               # 日期字段名
  frontmatter-updated:
    fieldName: updated            # 更新日期字段名
  frontmatter-id:
    template: "{counter_global}"  # ID 生成模板：{counter_<id>} / {ff1} / {sha256_N} / {md5_N} / {sha1_N} / {uuid}
    fieldName: "id"              # ID 写入 frontmatter 的字段名
    prefix: ""                   # 最终 ID 前缀，追加到渲染结果头部
    counter:                     # counter 格式配置，key 为 counter id
      global:
        length: 6                # ID 位数（默认 6）
        radix: 36                # 进制 2-36（默认 36）
    ff1:                         # 仅 template 含 {ff1} 时生效
      useCounter: "global"       # 引用的 counter id
      encryptionKey: ""          # FPE 加密密钥
      withChecksum: false        # 是否添加 Luhn 校验码
      length: 6                  # 输出长度（默认继承 counter 配置）
      radix: 36                  # 进制 2-36（默认继承 counter 配置）

  # Frontmatter slug
  # 注意: transform 策略通过 [^a-z0-9-] 过滤字符，
  # CJK（中文等非 ASCII 字符）会被完全删除而非转拼音。
  # 如需处理中文标题，请使用 ai 策略或后续扩展支持。
  frontmatter-slug:
    strategy: transform            # transform | extract | ai
    transform:                     # strategy=transform 时生效
      fromField: title             # 源字段
      separator: "-"               # 分隔符
      lowercase: true              # 转为小写
      maxLength: 80                # 最大长度
    extract:                       # strategy=extract 时生效
      fromField: title             # 直接复制到 slug 的源字段
    ai:                            # strategy=ai 时生效
      useModel: deepseek-v4-flash  # AI 模型 ID（需在 ai.models 中配置）

  # 文案纠正
  autocorrect:
    configPath: ".autocorrectrc"
    strict: false

  # 图片下载（可选，整块不配置则禁用下载功能）
  download-images:
    useStorage: default           # 引用 storages 中的哪个存储配置
    namingTemplate: "{name}.{ext}" # 本地保存命名模板
    # domains:                  # 多源存储映射（可选）
    #   - domain: example.com
    #     useStorage: default

  # 图片删除（可选，整块不配置则禁用删除功能）
  delete-image:
    strategy: trash                # 删除策略：trash（放入回收站）| move（移动到其他目录）| hard-delete（永久删除）
    removeFromMarkdown: true       # 是否从 Markdown 中移除图片引用
    force: false                   # 是否强制删除（跳过引用检查）

  # 图片转移（可选，整块不配置则禁用转移功能）
  # 用于跨存储复制/移动图片（如从私有存储转到 CDN 存储）
  transfer-images:
    targetStorage:                # 目标存储配置
      useStorage: default         # 引用 storages 中的配置
      domain: ""                  # 自定义域名（可选），转移后 URL 替换为此域名
    sourceStorages:               # 源存储列表（可选，多源匹配）
      # - domain: old-cdn.example.com  # 源 URL 域名（用于匹配）
      #   useStorage: source-1          # 引用 storages 中的配置
    namingTemplate: "{name}.{ext}" # 目标存储命名模板
    prefix: ""                    # 目标存储路径前缀
    deleteSource: false           # 是否删除源文件（true=移动，false=复制）
    concurrency: 5              # 并发传输数

# ============================
# Presets（可选，整块不配置则无预设流程可用）
# Preset 是有序的 Rule 列表，用于一次运行多个处理步骤
# 格式：可以直接写 rule ID 列表，也可以带自定义配置
# ============================
presets:
  # 简单列表格式
  blog:
    - strip-frontmatter
    - promote-headings
    - add-section-numbers
    - upload-images

  # 带自定义配置的格式
  custom-example:
    - id: text-replace
      config:
        match: 'TODO:\s*(.+)'
        replace: '[TODO] $1'
        flags: "gm"
    - id: upload-images
```

## 配置模板

运行 `cmtx config init` 可生成初始配置文件。模板只包含必要配置，完整字段参考本文档。

## 维护指南

### 新增环境变量

1. 在 `packages/storage/src/credentials.ts` 中添加读取逻辑
2. 在本文档的环境变量表中添加条目

无需修改任何应用层文档（CLI / VS Code / MCP）。

### 新增 YAML 配置字段

1. 在 `packages/asset/src/config/types.ts` 中添加类型定义和 `DEFAULT_CONFIG` 默认值
2. 在本文档的 YAML 参考部分添加带注释的字段

无需修改任何应用层文档。
