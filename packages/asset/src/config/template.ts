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

rules:
  upload-images:
    namingTemplate: "{name}.{ext}"
    conflictStrategy: skip
    useStorage: default
    prefix: ""
  download-images:
    useStorage: default
    # domains:  # 可选：多源映射
    #   - domain: example.com
    #     useStorage: default
`;

export function generateDefaultConfig(): string {
    return DEFAULT_CONFIG_TEMPLATE;
}
