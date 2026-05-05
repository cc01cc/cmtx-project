/**
 * 重构后的核心配置结构
 *
 * @module types
 * @description
 * 定义上传包所需的所有类型接口和配置结构。
 *
 * @remarks
 * ## 核心类型
 *
 * ### 配置相关
 * - {@link UploadConfig} - 主配置接口
 * - {@link StorageConfig} - 存储配置
 * - {@link ReplaceConfig} - 替换配置
 * - {@link EventConfig} - 事件配置
 *
 * ### 结果相关
 * - {@link UploadResult} - 上传结果
 * - {@link DeduplicationInfo} - 去重信息
 * - {@link FailedItem} - 失败项详情
 *
 * ### 工具类型
 * - {@link ConfigBuilder} - 配置构建器
 * - {@link UploadEvent} - 事件类型
 *
 * ## 设计原则
 *
 * - **模块化**：配置按功能分离
 * - **可扩展**：接口设计支持未来扩展
 * - **类型安全**：完整的 TypeScript 类型定义
 * - **向后兼容**：保持 API 稳定性
 *
 * @see {@link UploadConfig} - 主配置结构
 * @see {@link ConfigBuilder} - 配置构建器
 * @see {@link @cmtx/storage} - 存储适配器（独立包）
 */

import type { ReplaceConfig, UploadConfig } from "./config.js";

// 重新导出配置类型和类，方便其他模块使用
export type { EventConfig, ReplaceConfig, StorageConfig, UploadConfig } from "./config.js";

export { ConfigBuilder } from "./config.js";

// 类型别名，用于服务模块的导入
export type ReplaceOptions = ReplaceConfig;

/**
 * 云端图片映射信息
 */
export interface ImageCloudMapBody {
    name: string;
    remotePath: string;
    url: string;
    nameTemplateVariables: Record<string, string>;
}

// ==================== 上传结果类型 ====================

/**
 * 唯一图片结果
 */
export interface UniqueImageResult {
    /** 图片绝对路径 */
    absPath: string;

    /** 云端 URL（如果上传成功） */
    cloudUrl?: string;

    /** 引用数量 */
    referenceCount: number;

    /** 引用此图片的文件列表（去重） */
    files: string[];
}

export type UploadEventType =
    /** 上传完成事件 */
    | "upload:complete"
    /** 上传错误事件 */
    | "upload:error"
    /** 替换完成事件 */
    | "replace:complete"
    /** 删除完成事件 */
    | "delete:complete";

export interface UploadEvent {
    /** 事件类型 */
    type: UploadEventType;

    /** 时间戳 */
    timestamp: number;

    /** 事件数据 */
    data?: {
        /** 本地文件路径 */
        localPath?: string;

        /** 云端 URL */
        cloudUrl?: string;

        /** 错误对象 */
        error?: Error;

        /** 是否来自缓存 */
        cached?: boolean;
    };
}

// ==================== 上传结果类型 ====================

/**
 * 上传选项
 * @public
 */
export interface UploadOptions {
    /**
     * 是否将处理后的内容写入文件
     * @default false
     */
    writeFile?: boolean;
}

export interface FailedItem {
    /** 本地图片的绝对路径 */
    localPath: string;

    /** 失败发生的阶段 */
    stage: "upload" | "replace" | "delete";

    /** 失败原因 */
    error: string;
}

export interface DeduplicationInfo {
    /** 唯一的本地文件数（实际上传数） */
    uniqueFiles: number;

    /** 所有图片引用总数（包括重复引用） */
    totalReferences: number;

    /** 重复引用的数量（totalReferences - uniqueFiles） */
    duplicateCount: number;

    /** 全局去重节省的上传数量（来自其他 Markdown 文件的缓存） */
    globalDedupSaved?: number;
}

/**
 * 上传结果
 * @public
 */
export interface UploadResult {
    /** 是否成功（至少上传了一张图片） */
    success: boolean;

    /** 成功上传的图片数 */
    uploaded: number;

    /** 成功替换的图片数 */
    replaced: number;

    /** 成功删除的本地图片数 */
    deleted: number;

    /** 处理后的 Markdown 内容 */
    content: string;

    /** 去重信息（当存在重复引用时返回） */
    deduplicationInfo?: DeduplicationInfo;

    /** 失败的图片详情列表（仅在有失败时返回） */
    failed?: FailedItem[];
}

/**
 * @internal
 * 事件回调类型
 */
export type UploadEventCallback = (event: UploadEvent) => void;

/**
 * @internal
 * 验证错误信息
 */
export interface ValidationError {
    /** 字段名 */
    field: string;

    /** 错误信息 */
    message: string;
}

// ==================== 冲突处理策略类型 ====================

/**
 * 冲突处理动作
 * @public
 */
export type ConflictAction = "skip" | "replace" | "download";

/**
 * 冲突处理策略
 * @public
 * @description
 * 定义文件冲突时的处理策略，在上传开始前一次性选择，避免多次回调。
 */
export type ConflictResolutionStrategy =
    /** 全部跳过：保留远程版本，不上传本地文件 */
    | { type: "skip-all" }
    /** 全部替换：上传本地文件，覆盖远程版本 */
    | { type: "replace-all" };

/**
 * 上传结果 - 成功上传的项
 * @public
 */
export interface UploadedItem {
    /** 本地图片的绝对路径 */
    localPath: string;

    /** 远程路径 */
    remotePath: string;

    /** 云端 URL */
    url: string;

    /** 动作类型 */
    action: "uploaded" | "replaced";
}

/**
 * 上传结果 - 跳过的项
 * @public
 */
export interface SkippedItem {
    /** 远程路径 */
    remotePath: string;

    /** 跳过原因 */
    reason: "file-exists" | "configured-skip";
}

/**
 * 上传结果 - 下载的项
 * @public
 */
export interface DownloadedItem {
    /** 远程路径 */
    remotePath: string;

    /** 下载到的本地路径 */
    localPath: string;
}

/**
 * 上传结果 - 失败的项
 * @public
 */
export interface FailedItemDetail {
    /** 本地图片的绝对路径 */
    localPath: string;

    /** 失败发生的阶段 */
    stage: "upload" | "download" | "delete";

    /** 失败原因 */
    error: string;
}

/**
 * 完整的上传结果（支持冲突处理）
 * @public
 * @description
 * 包含详细的处理结果，用于生成日志报告。
 */
export interface DetailedUploadResult {
    /** 是否成功（至少上传、替换或下载了一项） */
    success: boolean;

    /** 成功上传的图片数 */
    uploaded: number;

    /** 成功替换的图片数 */
    replaced: number;

    /** 成功删除的本地图片数 */
    deleted: number;

    /** 处理后的 Markdown 内容 */
    content: string;

    /** 成功上传的项列表 */
    uploadedItems: UploadedItem[];

    /** 跳过的项列表 */
    skippedItems: SkippedItem[];

    /** 下载的项列表 */
    downloadedItems: DownloadedItem[];

    /** 失败的项列表 */
    failedItems: FailedItemDetail[];
}
