/**
 * 默认配置
 *
 * @module default-config
 * @description
 * 提供 VS Code Extension 的默认配置，包括 presets 和 rules 默认设置。
 */

import type { CmtxConfig } from './cmtx-config';

/**
 * 默认 CMTX 配置
 */
export const DEFAULT_CONFIG: CmtxConfig = {
    version: 'v2',

    // 存储配置
    storage: {
        adapter: 'aliyun-oss',
        config: {},
    },

    // 预签名 URL 配置
    presignedUrls: {
        expire: 600,
        maxRetryCount: 3,
        imageFormat: 'all',
        domains: [],
    },

    // 上传配置
    upload: {
        imageFormat: 'markdown',
        batchLimit: 5,
        namingTemplate: '{name}.{ext}',
        auto: false,
        keepLocalImages: true,
    },

    // 尺寸调整配置
    resize: {
        widths: [360, 480, 640, 800, 960, 1200],
        domains: [],
    },

    // 全局 Rule 默认配置
    rules: {
        'strip-frontmatter': {},
        'promote-headings': {
            levels: 1,
        },
        'text-replace': {
            match: '',
            replace: '',
            flags: 'gm',
        },
        'convert-images': {
            convertToHtml: false,
        },
        'upload-images': {
            width: 800,
        },
        'add-section-numbers': {
            minLevel: 2,
            maxLevel: 6,
            startLevel: 2,
            separator: '.',
        },
        'remove-section-numbers': {},
        'frontmatter-title': {
            headingLevel: 1,
        },
        'frontmatter-date': {},
        'frontmatter-updated': {},
        'frontmatter-id': {
            encryptionKey: '',
        },
        autocorrect: {
            configPath: '.autocorrectrc',
            strict: false,
        },
    },

    // Presets（Rule 集合）
    presets: {
        // 知乎
        zhihu: [
            'strip-frontmatter',
            'promote-headings',
            'add-section-numbers',
            'upload-images',
            'frontmatter-id',
            'frontmatter-date',
        ],

        // 微信公众号
        wechat: [
            'strip-frontmatter',
            'promote-headings',
            'add-section-numbers',
            'convert-images',
            'upload-images',
            'frontmatter-id',
            'frontmatter-date',
        ],

        // CSDN
        csdn: ['strip-frontmatter', 'add-section-numbers', 'upload-images', 'frontmatter-date'],

        // 掘金
        juejin: [
            'strip-frontmatter',
            'promote-headings',
            'add-section-numbers',
            'upload-images',
            'frontmatter-date',
        ],

        // 博客园
        cnblogs: [
            'strip-frontmatter',
            'promote-headings',
            'add-section-numbers',
            'upload-images',
            'frontmatter-id',
            'frontmatter-date',
        ],
    },
};
