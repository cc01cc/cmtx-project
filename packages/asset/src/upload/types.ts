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
 * - {@link StorageOptions} - 存储配置
 * - {@link ReplaceOptions} - 替换配置
 * - {@link DeleteOptions} - 删除配置
 * - {@link EventOptions} - 事件配置
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

import type { IStorageAdapter } from '@cmtx/storage';
import type {
    DeleteConfig,
    EventConfig,
    ReplaceConfig,
    StorageConfig,
    UploadConfig,
} from './config.js';
import { DEFAULT_DELETE_CONFIG, DEFAULT_REPLACE_CONFIG } from './config.js';

// 重新导出配置类型，方便其他模块使用
export type { UploadConfig } from './config.js';

/**
 * 云端图片映射信息
 */
export interface ImageCloudMapBody {
    name: string;
    remotePath: string;
    url: string;
    nameTemplateVariables: Record<string, string>;
}

// ==================== 配置类型（统一使用 config.ts 定义） ====================
// 为了向后兼容，保留类型别名
export type StorageOptions = StorageConfig;
export type ReplaceOptions = ReplaceConfig;
export type DeleteOptions = DeleteConfig;
export type EventOptions = EventConfig;

// ==================== 配置构建器 ====================
/**
 * 上传配置构建器
 * @public
 */
export class ConfigBuilder {
    private readonly config: Partial<UploadConfig> = {};

    /**
     * 设置存储配置
     * @param adapter - 存储适配器
     * @param options - 存储选项
     * @returns this - 支持链式调用
     */
    storage(
        adapter: IStorageAdapter,
        options?: {
            prefix?: string;
            namingTemplate?: string;
        }
    ): this {
        this.config.storage = {
            adapter,
            prefix: options?.prefix,
            namingTemplate: options?.namingTemplate,
        };
        return this;
    }

    /**
     * 设置完整的替换配置
     * @param options - 替换选项
     * @returns this - 支持链式调用
     */
    replace(options: ReplaceOptions): this {
        this.config.replace = options;
        return this;
    }

    /**
     * 设置字段替换模板（快捷方法）
     * @param patterns - 字段到模板的映射
     * @returns this - 支持链式调用
     * @example
     * ```typescript
     * builder.fieldTemplates({
     *   src: '{cloudSrc}',
     *   alt: '{originalAlt} - Updated'
     * });
     * ```
     */
    fieldTemplates(patterns: Record<string, string>): this {
        this.config.replace = { fields: patterns };
        return this;
    }

    /**
     * 设置删除配置
     * @param options - 删除选项（直接使用 core 的 DeleteFileOptions）
     * @returns this - 支持链式调用
     */
    delete(options: DeleteOptions): this {
        this.config.delete = options;
        return this;
    }

    /**
     * 设置事件回调
     * @param onProgress - 进度回调函数
     * @param logger - 日志回调函数
     * @returns this - 支持链式调用
     */
    events(
        onProgress?: (event: UploadEvent) => void,
        logger?: import('@cmtx/core').LoggerCallback
    ): this {
        this.config.events = { onProgress, logger };
        return this;
    }

    /**
     * 构建最终配置
     * @returns UploadConfig - 完整的上传配置
     * @throws {Error} 当缺少必需的存储配置时
     */
    build(): UploadConfig {
        if (!this.config.storage) {
            throw new Error('Storage configuration is required');
        }

        // 提供合理的默认配置
        const replaceConfig = this.config.replace ?? DEFAULT_REPLACE_CONFIG;
        const deleteConfig = this.config.delete ?? DEFAULT_DELETE_CONFIG;

        return {
            storage: this.config.storage,
            replace: replaceConfig,
            delete: deleteConfig,
            events: this.config.events,
        };
    }
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
    | 'upload:complete'
    /** 上传错误事件 */
    | 'upload:error'
    /** 替换完成事件 */
    | 'replace:complete'
    /** 删除完成事件 */
    | 'delete:complete';

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
    stage: 'upload' | 'replace' | 'delete';

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
