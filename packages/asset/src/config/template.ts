/**
 * CMTX 配置模板
 *
 * @module config/template
 * @description
 * 提供默认配置模板和生成函数。
 */

/**
 * 默认配置模板（YAML 格式）
 */
export const DEFAULT_CONFIG_TEMPLATE = `# CMTX Configuration
# See https://github.com/cc01cc/cmtx-project for documentation

version: v2

# Storage configuration
storages:
  default:
    adapter: aliyun-oss
    config:
      region: oss-cn-hangzhou
      # Use environment variables for sensitive data (recommended)
      bucket: "\${CMTX_ALIYUN_BUCKET}"
      accessKeyId: "\${CMTX_ALIYUN_ACCESS_KEY_ID}"
      accessKeySecret: "\${CMTX_ALIYUN_ACCESS_KEY_SECRET}"

# Upload configuration
upload:
  imageFormat: markdown  # markdown | html
  batchLimit: 5
  imageAltTemplate: ""
  namingTemplate: "{name}.{ext}"
  auto: false
  conflictStrategy: skip  # skip | overwrite
  useStorage: default
  prefix: blog/

  # Replace configuration for uploaded images
  # Controls how image attributes (src, alt, title) are rewritten
  # after uploading to the cloud.
  #
  # All fields (src, alt, title) use the same {variable} template syntax,
  # rendered by @cmtx/template's renderTemplate() with the same context.
  # However, each field has recommended variables:
  #
  #   src template (build cloud URL):
  #     {cloudSrc}       - Cloud URL of the uploaded image (most common)
  #     {originalSrc}    - Original local path before upload
  #   alt template (rewrite alt text):
  #     {originalAlt}    - Original alt text from the Markdown image (most common)
  #     {date}           - Current date (YYYY-MM-DD)
  #     {timestamp}      - Unix timestamp (milliseconds)
  #   title template (rewrite title attribute):
  #     {originalTitle}  - Original title attribute
  #
  # Other available variables (usable in any field):
  #   {imagePath}  - Alias of {originalSrc}
  #
  # Examples:
  #   src: "{cloudSrc}"                              (default)
  #   src: "{cloudSrc}?x-oss-process=image/resize,w_640"  (with OSS processing)
  #   alt: "{originalAlt}"                           (default)
  #   alt: "{originalAlt} - Uploaded on {date}"       (append date)
  #   alt: ""                                         (clear alt text)
  replace:
    fields:
      src: "{cloudSrc}"
      alt: "{originalAlt}"
      # title: "{originalTitle}"   # Optional: template for image title

  # Delete configuration for local images after upload
  delete:
    enabled: false
    strategy: trash  # trash | move | hard-delete

# Presigned URL configuration
presignedUrls:
  expire: 600
  maxRetryCount: 3
  imageFormat: all  # markdown | html | all
  domains:
    - domain: my-bucket.oss-cn-hangzhou.aliyuncs.com
      useStorage: default
      prefix: blog/
      accessKeyId: "\${CMTX_ALIYUN_ACCESS_KEY_ID}"
      accessKeySecret: "\${CMTX_ALIYUN_ACCESS_KEY_SECRET}"
      # Or use plaintext (not recommended)
      # accessKeyId: your-access-key-id
      # accessKeySecret: your-access-key-secret
      # Optional settings
      # path: images/
      # forceHttps: true

# Image resize configuration
resize:
  widths: [360, 480, 640, 800, 960, 1200]
  domains:
    - domain: my-bucket.oss-cn-hangzhou.aliyuncs.com
      provider: aliyun-oss

# Global rules configuration
# Rules 用于配置各处理模块的默认参数
# 注意：Rule 是否执行由 preset 控制，此处仅配置默认参数
rules:
  # 文本处理 Rules
  # [常用] 移除文档开头的 YAML frontmatter，发布到不支持 frontmatter 的平台时使用
  strip-frontmatter: {}

  # [常用] 提升标题层级，如 H2->H1, H3->H2
  promote-headings:
    levels: 1  # 提升的级数

  # [可选] 通用文本替换，使用正则表达式
  text-replace:
    match: 'TODO:\\\\s*(.+)'     # 正则表达式（使用单引号避免转义问题）
    replace: '[TODO] $1'      # 替换字符串，支持捕获组 $1, $2...
    flags: 'gm'              # 正则标志：g(全局), m(多行), i(忽略大小写)

  # 图片处理 Rules
  # [可选] 将 Markdown 图片语法转换为 HTML <img> 标签
  convert-images:
    convertToHtml: false

  # [常用] 上传本地图片到云端存储
  upload-images:
    width: 800  # 指定图片宽度（可选）

  # 章节编号 Rules
  # [常用] 为标题添加层级编号，如 "1.1. 标题"
  # 注意：默认从 H2 开始编号，配合 promote-headings 使用时建议改为 1
  add-section-numbers:
    minLevel: 2      # 最小标题等级（从 H2 开始编号）
    maxLevel: 6      # 最大标题等级
    startLevel: 2    # 起始层级
    separator: "."   # 分隔符

  # [可选] 移除标题中的章节编号
  remove-section-numbers: {}

  # Frontmatter 处理 Rules
  # [可选] 将指定级别的标题提取到 frontmatter 的 title 字段
  frontmatter-title:
    headingLevel: 1

  # [可选] 在 frontmatter 中添加 date 字段（当前日期）
  frontmatter-date:
    fieldName: date  # 自定义字段名，默认为 "date"

  # [可选] 在 frontmatter 中添加/更新 updated 字段
  frontmatter-updated:
    fieldName: updated  # 自定义字段名，默认为 "updated"

  # [可选] 在 frontmatter 中生成加密的唯一 ID
  frontmatter-id:
    # ID 生成策略：counter | filepath | content（默认：counter）
    strategy: counter
    encryptionKey: ""  # 加密密钥（必填，用于 FF1 格式保留加密）
    
    # 计数器配置（当 strategy='counter' 时使用）
    counter:
      name: global      # 计数器名称，多文件共享同一计数器
      length: 6         # ID 长度（位数）
      radix: 36         # 进制数（2-36，36 表示使用 0-9 和 A-Z）
      prefix: ""        # ID 前缀（可选）
      withChecksum: false  # 是否添加 Luhn 校验码（会增加 1 位长度）

  # 文案纠正 Rules
  # [可选] 自动纠正 CJK 文案中的空格、标点符号
  # 基于 https://github.com/huacnlee/autocorrect
  autocorrect:
    configPath: ".autocorrectrc"  # AutoCorrect 配置文件路径（可选）
    strict: false                 # 是否启用严格模式

# Presets (rule collections) for commonly used workflows
# Presets are ordered lists of rules applied sequentially
# Can be defined as string arrays (rule IDs) or objects (with custom config)
presets:
  # Example: basic blog publishing preset
  blog:
    - strip-frontmatter
    - promote-headings
    - add-section-numbers
    - upload-images
    - frontmatter-id
    - frontmatter-date

  # Example: blog publishing with HTML image conversion
  blog-html:
    - strip-frontmatter
    - promote-headings
    - add-section-numbers
    - convert-images
    - upload-images
    - frontmatter-id
    - frontmatter-date

  # Advanced example: using object format for custom rule configuration
  custom-example:
    - id: strip-frontmatter
    - id: promote-headings
      config:
        levels: 1
    - id: add-section-numbers
      config:
        minLevel: 2
        maxLevel: 4
    - id: text-replace
      config:
        match: '[s*]'
        replace: '[ ]'
        flags: 'g'
    - id: upload-images
      config:
        width: 1200

  # wechat: publish to WeChat Official Accounts (MP)
  # - strips frontmatter, promotes H1 to H2, adds section numbers,
  #   converts images to HTML, uploads local images
  # - render to HTML via the --render flag in CLI
  wechat:
    - strip-frontmatter
    - promote-headings
    - add-section-numbers
    - convert-images
    - upload-images
    - frontmatter-id
    - frontmatter-date

  # zhihu: publish to Zhihu articles
  zhihu:
    - strip-frontmatter
    - promote-headings
    - add-section-numbers
    - upload-images
    - frontmatter-id
    - frontmatter-date

  # csdn: publish to CSDN blog
  csdn:
    - strip-frontmatter
    - add-section-numbers
    - upload-images
    - frontmatter-date
`;

/**
 * 生成默认配置字符串
 * @returns 默认配置的 YAML 字符串
 */
export function generateDefaultConfig(): string {
    return DEFAULT_CONFIG_TEMPLATE;
}
