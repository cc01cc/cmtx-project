/**
 * Download 模块类型定义
 *
 * @module download/types
 * @description
 * 定义下载功能所需的所有类型接口和配置结构。
 */

import type { IStorageAdapter } from "@cmtx/storage";
import type { BaseNamingVariables } from "../shared/types.js";

// ==================== 命名模板变量 ====================

/**
 * Download 命名模板变量
 *
 * @description
 * 继承基础变量，添加 Download 独有的变量。
 *
 * ## 基础变量（继承自 BaseNamingVariables）
 * - `{name}` - 文件名（不含扩展名）
 * - `{ext}` - 文件扩展名
 * - `{date}` - 日期（YYYY-MM-DD）
 * - `{timestamp}` - 时间戳
 * - `{md5}` - 完整 MD5 哈希
 * - `{md5_8}` - MD5 前 8 位
 * - `{md5_16}` - MD5 前 16 位
 *
 * ## Download 独有变量
 * - `{sequence}` - 序号（自动递增，3 位补零）
 *
 * @remarks
 * ## 破坏性变更说明
 *
 * - `{original}` 已重命名为 `{name}`，与 Upload 保持一致
 * - `{hash}` 已重命名为 `{md5_8}`，明确表示 MD5 算法
 * - `{date}` 格式从 `YYYYMMDD` 改为 `YYYY-MM-DD`
 */
export interface NamingVariables extends BaseNamingVariables {
    /** 序号（自动递增，3 位补零） */
    sequence: string;
}

// ==================== 下载配置 ====================

/**
 * 下载选项
 * @public
 */
export interface DownloadOptions {
    /** 输出目录（必填） */
    outputDir: string;

    /** 命名模板，默认 "{name}{ext}" */
    namingTemplate?: string;

    /** 只下载指定域名的图片 */
    domain?: string;

    /** 并发数，默认 5 */
    concurrency?: number;

    /** 是否覆盖已存在的文件 */
    overwrite?: boolean;

    /** 文件过滤器 */
    filter?: DownloadFilter;

    /** 进度回调 */
    onProgress?: (progress: DownloadProgress) => void;

    /** 调试模式 */
    debug?: boolean;
}

/**
 * 文件过滤器
 */
export interface DownloadFilter {
    /** 允许的扩展名列表 */
    extensions?: string[];

    /** 最大文件大小（字节） */
    maxSize?: number;

    /** 最小文件大小（字节） */
    minSize?: number;

    /** 自定义过滤函数 */
    custom?: (meta: { url: string; size?: number }) => boolean;
}

// ==================== 内部配置 ====================

/**
 * 内部下载配置（包含适配器）
 */
export interface InternalDownloadConfig {
    /** 存储适配器（可选，用于私有存储下载） */
    adapter?: IStorageAdapter;

    /** 下载选项 */
    options: DownloadOptions;
}

// ==================== 结果类型 ====================

/**
 * 单个下载结果
 */
export interface DownloadItem {
    /** 原始 URL */
    originalUrl: string;

    /** 本地文件路径 */
    localPath: string;

    /** 文件名 */
    fileName: string;

    /** 文件大小（字节） */
    size: number;

    /** 是否成功 */
    success: boolean;

    /** 错误信息 */
    error?: string;

    /** 是否跳过 */
    skipped?: boolean;
}

/**
 * 下载结果
 * @public
 */
export interface DownloadResult {
    /** 总数 */
    total: number;

    /** 成功数 */
    success: number;

    /** 失败数 */
    failed: number;

    /** 跳过数 */
    skipped: number;

    /** 下载项列表 */
    items: DownloadItem[];

    /** 错误列表 */
    errors: Array<{ url: string; error: string }>;
}

/**
 * 下载进度
 */
export interface DownloadProgress {
    /** 当前索引 */
    current: number;

    /** 总数 */
    total: number;

    /** 文件名 */
    fileName: string;

    /** 已下载字节数 */
    bytesDownloaded: number;

    /** 总字节数 */
    totalBytes: number;

    /** 状态 */
    status: "downloading" | "completed" | "failed" | "skipped";
}

// ==================== URL 信息 ====================

/**
 * 解析后的 URL 信息
 */
export interface ParsedUrlInfo {
    /** 原始 URL */
    originalUrl: string;

    /** URL 对象 */
    url: URL;

    /** 文件名（不含扩展名） */
    baseName: string;

    /** 扩展名（含点） */
    ext: string;

    /** 是否匹配指定域名 */
    isMatch: boolean;

    /** 远程路径（相对于存储根） */
    remotePath?: string;
}
