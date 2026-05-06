/**
 * Transfer 模块类型定义
 *
 * @module transfer/types
 * @description
 * 定义远程图片转移功能所需的所有类型接口和配置结构。
 *
 * @remarks
 * ## 核心类型
 *
 * ### 配置相关
 * - {@link TransferConfig} - 主配置接口
 * - {@link SourceConfig} - 源存储配置
 * - {@link TargetConfig} - 目标存储配置
 * - {@link TransferOptions} - 传输选项
 *
 * ### 结果相关
 * - {@link TransferResult} - 传输结果
 * - {@link UrlMapping} - URL 映射关系
 * - {@link TransferProgress} - 传输进度
 *
 * ### 工具类型
 * - {@link TransferConfigBuilder} - 配置构建器
 * - {@link TransferEvent} - 事件类型
 */

import type { CloudCredentials, IStorageAdapter } from "@cmtx/storage";

// ==================== 凭证配置 ====================

// 重新导出凭证类型
export type { CloudCredentials } from "@cmtx/storage";

/**

// ==================== 传输配置 ====================

/**
 * 传输配置
 * 这是用于配置文件和 CLI 输入的配置类型
 * @public
 */
export interface TransferConfig {
    /** 源存储配置 */
    source: SourceConfig;

    /** 目标存储配置 */
    target: TargetConfig;

    /** 传输选项 */
    options?: TransferOptions;
}

/**
 * 源存储配置（用于配置输入）
 */
export interface SourceConfig {
    /** 自定义域名（用于识别属于该存储的 URL） */
    domain?: string;

    /** 云服务凭证配置 */
    credentials: CloudCredentials;

    /** 是否使用签名 URL */
    useSignedUrl?: boolean;

    /** 签名 URL 过期时间（秒） */
    signedUrlExpires?: number;
}

/**
 * 目标存储配置（用于配置输入）
 */
export interface TargetConfig {
    /** 自定义域名（用于生成新 URL） */
    domain?: string;

    /** 云服务凭证配置 */
    credentials: CloudCredentials;

    /** 上传前缀路径 */
    prefix?: string;

    /**
     * 命名模板（推荐）
     *
     * @description
     * 支持与 Upload 相同的模板变量：
     * - `{name}` - 文件名（不含扩展名）
     * - `{ext}` - 文件扩展名
     * - `{fileName}` - 完整文件名
     * - `{date}` - 日期（YYYY-MM-DD）
     * - `{timestamp}` - 时间戳
     * - `{year}/{month}/{day}` - 年月日分离
     * - `{md5}` - 完整 MD5 哈希
     * - `{md5_8}` - MD5 前 8 位
     * - `{md5_16}` - MD5 前 16 位
     *
     * @example
     * ```yaml
     * namingTemplate: "{date}/{name}_{md5_8}{ext}"
     * # 结果：2026-04-02/photo_a1b2c3d4.png
     * ```
     */
    namingTemplate?: string;

    /** 是否覆盖已存在的文件 */
    overwrite?: boolean;
}

/**
 * 内部源存储配置（包含适配器）
 * 用于运行时内部传递
 */
export interface InternalSourceConfig extends Omit<SourceConfig, "credentials"> {
    /** 存储适配器 */
    adapter: IStorageAdapter;
}

/**
 * 内部目标存储配置（包含适配器）
 * 用于运行时内部传递
 */
export interface InternalTargetConfig extends Omit<TargetConfig, "credentials"> {
    /** 存储适配器 */
    adapter: IStorageAdapter;
}

/**
 * 内部传输配置（包含适配器）
 * 用于运行时内部传递
 */
export interface InternalTransferConfig {
    /** 源存储配置 */
    source: InternalSourceConfig;

    /** 目标存储配置 */
    target: InternalTargetConfig;

    /** 传输选项 */
    options?: TransferOptions;
}

/**
 * 传输选项
 * @public
 */
export interface TransferOptions {
    /** 并发数 */
    concurrency?: number;

    /** 最大并发下载数（控制磁盘占用） */
    maxConcurrentDownloads?: number;

    /** 临时目录路径 */
    tempDir?: string;

    /** 文件过滤器 */
    filter?: FileFilter;

    /** 进度回调 */
    onProgress?: (progress: TransferProgress) => void;

    /** 调试模式 */
    debug?: boolean;

    /**
     * 是否在传输成功后删除源文件
     * @default false
     */
    deleteSource?: boolean;
}

/**
 * 文件过滤器
 */
export interface FileFilter {
    /** 允许的扩展名列表 */
    extensions?: string[];

    /** 最大文件大小（字节） */
    maxSize?: number;

    /** 最小文件大小（字节） */
    minSize?: number;

    /** 自定义过滤函数 */
    custom?: (meta: { size: number; name: string }) => boolean;
}

// ==================== 结果类型 ====================

/**
 * URL 映射关系
 */
export interface UrlMapping {
    /** 原始 URL */
    originalUrl: string;

    /** 新 URL */
    newUrl: string;

    /** 远程路径 */
    remotePath: string;

    /** 文件大小 */
    size: number;

    /** 是否成功 */
    success: boolean;

    /** 错误信息 */
    error?: string;
}

/**
 * 传输结果
 * @public
 */
export interface TransferResult {
    /** 总数 */
    total: number;

    /** 成功数 */
    success: number;

    /** 失败数 */
    failed: number;

    /** 跳过数 */
    skipped: number;

    /** URL 映射列表 */
    mappings: UrlMapping[];

    /** 错误列表 */
    errors: Array<{ url: string; error: string }>;

    /** 替换后的 Markdown 内容 */
    newContent?: string;
}

/**
 * 传输进度
 */
export interface TransferProgress {
    /** 当前索引 */
    current: number;

    /** 总数 */
    total: number;

    /** 文件名 */
    fileName: string;

    /** 已传输字节数 */
    bytesTransferred: number;

    /** 总字节数 */
    totalBytes: number;

    /** 状态 */
    status: "downloading" | "uploading" | "completed" | "failed";
}

// ==================== 事件类型 ====================

/**
 * 传输事件类型
 */
export type TransferEventType =
    | "transfer:start"
    | "transfer:complete"
    | "transfer:error"
    | "download:start"
    | "download:complete"
    | "download:error"
    | "upload:start"
    | "upload:complete"
    | "upload:error"
    | "replace:complete";

/**
 * 传输事件
 */
export interface TransferEvent {
    /** 事件类型 */
    type: TransferEventType;

    /** 时间戳 */
    timestamp: number;

    /** 事件数据 */
    data?: {
        /** 原始 URL */
        originalUrl?: string;

        /** 新 URL */
        newUrl?: string;

        /** 远程路径 */
        remotePath?: string;

        /** 错误对象 */
        error?: Error;

        /** 是否跳过 */
        skipped?: boolean;
    };
}

// ==================== 配置构建器 ====================

/**
 * 传输配置构建器
 *
 * @example
 * ```typescript
 * const config = new TransferConfigBuilder()
 *   .source({
 *     domain: 'https://private.example.com',
 *     credentials: {
 *       accessKeyId: process.env.SOURCE_ACCESS_KEY_ID!,
 *       accessKeySecret: process.env.SOURCE_ACCESS_KEY_SECRET!,
 *       region: 'oss-cn-hangzhou',
 *       bucket: 'source-bucket'
 *     }
 *   })
 *   .target({
 *     domain: 'https://cdn.example.com',
 *     credentials: {
 *       accessKeyId: process.env.TARGET_ACCESS_KEY_ID!,
 *       accessKeySecret: process.env.TARGET_ACCESS_KEY_SECRET!,
 *       region: 'oss-cn-hangzhou',
 *       bucket: 'target-bucket'
 *     },
 *     prefix: 'images/'
 *   })
 *   .options({
 *     concurrency: 5,
 *     overwrite: false
 *   })
 *   .build();
 * ```
 * @public
 */
export class TransferConfigBuilder {
    private readonly config: Partial<TransferConfig> = {};

    /**
     * 设置源存储配置
     * @param options - 源存储选项
     * @returns this - 支持链式调用
     */
    source(options: {
        domain?: string;
        credentials: CloudCredentials;
        useSignedUrl?: boolean;
        signedUrlExpires?: number;
    }): this {
        this.config.source = {
            domain: options?.domain,
            credentials: options.credentials,
            useSignedUrl: options?.useSignedUrl,
            signedUrlExpires: options?.signedUrlExpires,
        };
        return this;
    }

    /**
     * 设置目标存储配置
     * @param options - 目标存储选项
     * @returns this - 支持链式调用
     */
    target(options: {
        domain?: string;
        credentials: CloudCredentials;
        prefix?: string;
        overwrite?: boolean;
    }): this {
        this.config.target = {
            domain: options?.domain,
            credentials: options.credentials,
            prefix: options?.prefix,
            overwrite: options?.overwrite ?? false,
        };
        return this;
    }

    /**
     * 设置传输选项
     * @param options - 传输选项
     * @returns this - 支持链式调用
     */
    options(options: TransferOptions): this {
        this.config.options = options;
        return this;
    }

    /**
     * 设置并发数
     * @param concurrency - 并发数
     * @returns this - 支持链式调用
     */
    concurrency(concurrency: number): this {
        this.config.options = {
            ...this.config.options,
            concurrency,
        };
        return this;
    }

    /**
     * 设置文件过滤器
     * @param filter - 文件过滤器
     * @returns this - 支持链式调用
     */
    filter(filter: FileFilter): this {
        this.config.options = {
            ...this.config.options,
            filter,
        };
        return this;
    }

    /**
     * 设置进度回调
     * @param onProgress - 进度回调函数
     * @returns this - 支持链式调用
     */
    onProgress(onProgress: (progress: TransferProgress) => void): this {
        this.config.options = {
            ...this.config.options,
            onProgress,
        };
        return this;
    }

    /**
     * 构建最终配置
     * @returns TransferConfig - 完整的传输配置
     * @throws {Error} 当缺少必需的源或目标存储配置时
     */
    build(): TransferConfig {
        if (!this.config.source) {
            throw new Error("Source storage configuration is required");
        }

        if (!this.config.target) {
            throw new Error("Target storage configuration is required");
        }

        return {
            source: this.config.source,
            target: this.config.target,
            options: this.config.options,
        };
    }
}
