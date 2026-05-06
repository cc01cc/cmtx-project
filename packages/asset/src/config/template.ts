export const DEFAULT_CONFIG_TEMPLATE = `# yaml-language-server: $schema=./config.schema.json
# CMTX Configuration
# See docs/CFG-001-configuration-reference.md for full reference

version: v2

storages:
  default:
    adapter: aliyun-oss
    config:
      region: oss-cn-hangzhou
      bucket: "\${CMTX_ALIYUN_BUCKET}"
      accessKeyId: "\${CMTX_ALIYUN_ACCESS_KEY_ID}"
      accessKeySecret: "\${CMTX_ALIYUN_ACCESS_KEY_SECRET}"

presignedUrls:
  expire: 600
  maxRetryCount: 3
  imageFormat: all
  domains:
    - domain: example.com
      useStorage: default

ai:
  # models:
  #   deepseek-v4-flash:
  #     provider: deepseek
  #     model: deepseek-v4-flash
  #     apiKey: "\${CMTX_DEEPSEEK_API_KEY}"
  #   qwen3-flash:
  #     provider: alibaba
  #     model: qwen3-flash
  #     apiKey: "\${CMTX_QWEN_API_KEY}"
  # defaultModel: deepseek-v4-flash

rules:
  upload-images:
    namingTemplate: "{name}.{ext}"
    conflictStrategy: skip
    useStorage: default
    prefix: ""
    # domain: cdn.example.com  # 可选，上传后 URL 替换为此域名
  download-images:
    useStorage: default
    # domains:  # 可选：多源映射
    #   - domain: example.com
    #     useStorage: default
  transfer-images:
    targetStorage:
      useStorage: default     # 目标存储
      # domain: cdn.example.com  # 可选，转移后 URL 域名替换
    sourceStorages:           # 可选，多源存储
      # - domain: old-cdn.example.com
      #   useStorage: source-1
    namingTemplate: "{name}.{ext}"
    prefix: ""
    deleteSource: false       # true=移动，false=复制
    concurrency: 5
`;

export function generateDefaultConfig(): string {
    return DEFAULT_CONFIG_TEMPLATE;
}
