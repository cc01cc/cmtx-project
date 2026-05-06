/**
 * CMTX 统一配置类型定义
 *
 * @module config/types
 * @description
 * 定义 CMTX 配置文件的完整类型结构，包括存储池、上传、预签名 URL、图片缩放、规则和预设配置。
 */

import { DEFAULT_NAMING_TEMPLATE } from "../shared/constants.js";
// RuleConfig 本地定义，避免循环依赖 @cmtx/rule-engine
/**
 * Rule 配置（用于全局 rules 配置）
 * 每个 Rule 直接对应其配置参数
 */
export interface RuleConfig {
    [key: string]: unknown;
}

// ==================== 存储池配置 ====================

/**
 * 存储池中单个存储配置
 */
export interface CmtxStorageConfig {
    /** 存储提供商 (aliyun-oss | tencent-cos) */
    provider?: string;
    /** 适配器类型 */
    adapter: string;
    /** 适配器配置 */
    config: Record<string, string>;
}

// ==================== 图片替换配置 ====================

/**
 * 图片替换配置
 */
export interface ReplaceConfig {
    /** 是否启用替换 */
    enabled?: boolean;
    /** 字段模板 */
    fields?: {
        /** src 字段模板 */
        src?: string;
        /** alt 字段模板 */
        alt?: string;
    };
}

// ==================== 预签名 URL 配置 ====================

/**
 * 预签名 URL 域名配置
 */
export interface CmtxPresignedUrlDomain {
    /** 域名 */
    domain: string;
    /** 引用 storages 中的 storage ID */
    useStorage: string;
    /** 路径前缀 */
    path?: string;
    /** 强制使用 HTTPS */
    forceHttps?: boolean;
}

/**
 * 预签名 URL 配置
 */
export interface CmtxPresignedUrlConfig {
    /** 过期时间（秒） */
    expire?: number;
    /** 最大重试次数 */
    maxRetryCount?: number;
    /** 图片格式 */
    imageFormat?: "markdown" | "html" | "all";
    /** 域名列表 */
    domains?: CmtxPresignedUrlDomain[];
}

// ==================== 主配置接口 ====================

/**
 * CMTX 统一配置（完整格式）
 * 用于 cmtx.config.yaml 文件
 */
export interface CmtxConfig {
    /** 配置版本 */
    version: string;
    /** 存储池配置 */
    storages?: Record<string, CmtxStorageConfig>;
    /** 预签名 URL 配置 */
    presignedUrls?: CmtxPresignedUrlConfig;
    /** AI 配置 */
    ai?: Record<string, unknown>;
    /** 全局 Rules 配置 */
    rules?: Record<string, RuleConfig>;
    /** Presets（Rule 集合） */
    presets?: Record<string, PresetConfig>;
}

// ==================== Preset 配置 ====================

/**
 * Preset 配置（简洁版或完整版）
 */
export type PresetConfig = string[] | PresetConfigFull;

/**
 * 完整版 Preset 配置
 */
export interface PresetConfigFull {
    /** Preset ID */
    id: string;
    /** Preset 显示名称 */
    name: string;
    /** Preset 描述 */
    description?: string;
    /** Rule 步骤配置列表 */
    steps: RuleStepConfig[];
}

/**
 * Rule 步骤配置
 */
export interface RuleStepConfig {
    /** Rule ID */
    id: string;
    /** 是否启用，默认 true */
    enabled?: boolean;
    /** Rule 特定配置 */
    config?: Record<string, unknown>;
}

// ==================== 默认配置 ====================

/**
 * 默认 CMTX 配置
 */
export const DEFAULT_CONFIG: CmtxConfig = {
    version: "v2",
    presignedUrls: {
        expire: 600,
        maxRetryCount: 3,
        imageFormat: "all",
        domains: [{ domain: "example.com", useStorage: "default" }],
    },
    rules: {
        "strip-frontmatter": {},
        "promote-headings": {
            levels: 1,
        },
        "text-replace": {
            match: "",
            replace: "",
            flags: "gm",
        },
        "convert-images": {
            convertToHtml: false,
        },
        "upload-images": {
            imageFormat: "markdown",
            batchLimit: 5,
            imageAltTemplate: "",
            namingTemplate: DEFAULT_NAMING_TEMPLATE,
            auto: false,
            conflictStrategy: "skip",
            useStorage: "default",
            prefix: "",
            domain: "",
            replace: {
                fields: {
                    src: "{cloudSrc}",
                    alt: "{originalAlt}",
                },
            },
        },
        "resize-image": {
            widths: [360, 480, 640, 800, 960, 1200],
            domains: [],
        },
        "add-section-numbers": {
            minLevel: 2,
            maxLevel: 6,
            startLevel: 2,
            separator: ".",
        },
        "remove-section-numbers": {},
        "frontmatter-title": {
            headingLevel: 1,
        },
        "frontmatter-date": {},
        "frontmatter-updated": {},
        "frontmatter-id": {
            template: "{counter_global}",
            fieldName: "id",
            prefix: "",
            counter: {
                global: { length: 6, radix: 36 },
            },
            ff1: {
                useCounter: "global",
                encryptionKey: "",
                withChecksum: false,
                length: 6,
                radix: 36,
            },
        },
        autocorrect: {
            configPath: ".autocorrectrc",
            strict: false,
        },
        "download-images": {
            useStorage: "default",
        },
        "transfer-images": {
            targetStorage: {
                useStorage: "default",
                domain: "",
            },
            sourceStorages: [],
            namingTemplate: "{name}.{ext}",
            prefix: "",
            deleteSource: false,
            concurrency: 5,
        },
    },
    presets: {},
};
