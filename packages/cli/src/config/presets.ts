/**
 * 预设配置模板
 * 提供常用的配置模板，方便用户快速开始
 */

export const PRESETS = {
    'blog-simple': {
        version: '1.0',
        storage: {
            adapter: 'aliyun-oss' as const,
            config: {
                region: 'oss-cn-hangzhou',
                accessKeyId: '${ALIYUN_OSS_ACCESS_KEY_ID}',
                accessKeySecret: '${ALIYUN_OSS_ACCESS_KEY_SECRET}',
                bucket: '${ALIYUN_OSS_BUCKET}',
            },
            prefix: 'blog/',
            namingPattern: '{date}_{md5_8}{ext}',
        },
        replace: {
            enabled: true,
            fields: {
                src: '{cloudSrc}',
                alt: '{originalAlt}',
            },
        },
        delete: {
            enabled: false,
        },
    },

    'blog-advanced': {
        version: '1.0',
        storage: {
            adapter: 'aliyun-oss' as const,
            config: {
                region: 'oss-cn-hangzhou',
                accessKeyId: '${ALIYUN_OSS_ACCESS_KEY_ID}',
                accessKeySecret: '${ALIYUN_OSS_ACCESS_KEY_SECRET}',
                bucket: '${ALIYUN_OSS_BUCKET}',
            },
            prefix: 'blog/images/',
            namingPattern: '{date}_{md5_8}{ext}',
        },
        replace: {
            enabled: true,
            fields: {
                src: '{cloudSrc}?x-oss-process=image/resize,w_800',
                alt: '{originalAlt} - 来自我的博客',
                title: '{originalTitle} - 博客图片',
            },
            context: {
                author: '博主',
                site: 'myblog.com',
            },
        },
        delete: {
            enabled: true,
            strategy: 'trash' as const,
            rootPath: './docs',
        },
        advanced: {
            concurrency: 3,
            maxFileSize: 10485760, // 10MB
            verbose: true,
        },
    },

    docs: {
        version: '1.0',
        storage: {
            adapter: 'aliyun-oss' as const,
            config: {
                region: 'oss-cn-hangzhou',
                accessKeyId: '${ALIYUN_OSS_ACCESS_KEY_ID}',
                accessKeySecret: '${ALIYUN_OSS_ACCESS_KEY_SECRET}',
                bucket: '${ALIYUN_OSS_BUCKET}',
            },
            prefix: 'docs/assets/',
            namingPattern: '{name}_{hash}{ext}',
        },
        replace: {
            enabled: true,
            fields: {
                src: '{cloudSrc}',
                alt: '{originalAlt} - 文档图片',
            },
        },
        delete: {
            enabled: false,
        },
    },

    minimal: {
        version: '1.0',
        storage: {
            adapter: 'aliyun-oss' as const,
            config: {
                region: 'oss-cn-hangzhou',
                accessKeyId: '${ALIYUN_OSS_ACCESS_KEY_ID}',
                accessKeySecret: '${ALIYUN_OSS_ACCESS_KEY_SECRET}',
                bucket: '${ALIYUN_OSS_BUCKET}',
            },
        },
        replace: {
            enabled: true,
            fields: {
                src: '{cloudSrc}',
            },
        },
        delete: {
            enabled: false,
        },
    },
} as const;

export type PresetName = keyof typeof PRESETS;

/**
 * 获取预设配置
 * @param presetName 预设名称
 * @returns 预设配置对象
 */
export function getPreset(presetName: PresetName): (typeof PRESETS)[PresetName] {
    const preset = PRESETS[presetName];
    if (!preset) {
        throw new Error(`未知的预设配置: ${presetName}`);
    }
    return preset;
}

/**
 * 列出所有可用的预设
 * @returns 预设名称数组
 */
export function listPresets(): PresetName[] {
    return Object.keys(PRESETS) as PresetName[];
}

/**
 * 生成预设配置文件
 * @param presetName 预设名称
 * @returns YAML 格式的配置文件内容
 */
export function generatePresetConfig(presetName: PresetName): string {
    const _preset = getPreset(presetName);

    // 为不同的预设生成对应的配置
    switch (presetName) {
        case 'blog-simple':
            return `# CMTX CLI 配置文件 - blog-simple 预设
# 生成时间: ${new Date().toISOString()}

version: 1.0
storage:
  adapter: aliyun-oss
  config:
    region: oss-cn-hangzhou
    accessKeyId: \${ALIYUN_OSS_ACCESS_KEY_ID}
    accessKeySecret: \${ALIYUN_OSS_ACCESS_KEY_SECRET}
    bucket: \${ALIYUN_OSS_BUCKET}
  prefix: blog/
  namingPattern: "{date}_{md5_8}{ext}"
replace:
  enabled: true
  fields:
    src: {cloudSrc}
    alt: {originalAlt}
delete:
  enabled: false
`;

        case 'blog-advanced':
            return `# CMTX CLI 配置文件 - blog-advanced 预设
# 生成时间: ${new Date().toISOString()}

version: 1.0
storage:
  adapter: aliyun-oss
  config:
    region: oss-cn-hangzhou
    accessKeyId: \${ALIYUN_OSS_ACCESS_KEY_ID}
    accessKeySecret: \${ALIYUN_OSS_ACCESS_KEY_SECRET}
    bucket: \${ALIYUN_OSS_BUCKET}
  prefix: blog/images/
  namingPattern: "{date}_{md5_8}{ext}"
replace:
  enabled: true
  fields:
    src: {cloudSrc}?x-oss-process=image/resize,w_800
    alt: {originalAlt} - 来自我的博客
delete:
  enabled: true
  strategy: trash
  rootPath: ./docs
advanced:
  concurrency: 3
  maxFileSize: 10485760
  verbose: true
`;

        case 'docs':
            return `# CMTX CLI 配置文件 - docs 预设
# 生成时间: ${new Date().toISOString()}

version: 1.0
storage:
  adapter: aliyun-oss
  config:
    region: oss-cn-hangzhou
    accessKeyId: \${ALIYUN_OSS_ACCESS_KEY_ID}
    accessKeySecret: \${ALIYUN_OSS_ACCESS_KEY_SECRET}
    bucket: \${ALIYUN_OSS_BUCKET}
  prefix: docs/assets/
  namingPattern: "{name}_{hash}{ext}"
replace:
  enabled: true
  fields:
    src: {cloudSrc}
    alt: {originalAlt} - 文档图片
delete:
  enabled: false
`;
        default:
            return `# CMTX CLI 配置文件 - minimal 预设
# 生成时间: ${new Date().toISOString()}

version: 1.0
storage:
  adapter: aliyun-oss
  config:
    region: oss-cn-hangzhou
    accessKeyId: \${ALIYUN_OSS_ACCESS_KEY_ID}
    accessKeySecret: \${ALIYUN_OSS_ACCESS_KEY_SECRET}
    bucket: \${ALIYUN_OSS_BUCKET}
replace:
  enabled: true
  fields:
    src: {cloudSrc}
delete:
  enabled: false
`;
    }
}
