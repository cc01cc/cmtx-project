/**
 * 重新设计的参数结构 - 模块化、清晰的配置方式
 */

import type { IStorageAdapter } from '@cmtx/storage';

// ==================== 核心上传配置 ====================
export interface StorageConfig {
    /** 云存储适配器 */
    adapter: IStorageAdapter;

    /** 上传到远程存储的前缀路径 */
    uploadPrefix?: string;

    /** 上传前缀（别名，保持向后兼容） */
    prefix?: string;

    /** 命名模板 */
    namingTemplate?: string;
}

// ==================== 替换配置 ====================
export interface ReplaceConfig {
    /**
     * 字段替换模板
     * key: 字段名 ('src' | 'alt' | 'title')
     * value: 替换模板字符串
     */
    fields: Record<string, string>;

    /**
     * 全局模板上下文
     * 提供给所有字段模板使用的变量
     */
    context?: Record<string, string>;
}

// ==================== 删除配置 ====================
export interface DeleteConfig {
    /** 是否删除本地图片 */
    enabled: boolean;

    /** 删除范围的根目录绝对路径 */
    rootPath?: string;

    /** 删除策略 */
    strategy?: 'trash' | 'move' | 'hard-delete';

    /** 当 strategy 为 trash 时的目标目录 */
    trashDir?: string;

    /** 最大重试次数 */
    maxRetries?: number;

    /** 删除选项（保持向后兼容） */
    options?: {
        strategy?: 'trash' | 'move' | 'hard-delete';
        trashDir?: string;
        maxRetries?: number;
    };
}

// ==================== 事件和日志配置 ====================
export interface EventConfig {
    /** 上传流程事件回调 */
    onProgress?: (event: UploadEvent) => void;

    /** 日志回调 */
    logger?: LoggerCallback;
}

// ==================== 主配置接口 ====================
export interface UploadConfig {
    /** 存储配置 */
    storage: StorageConfig;

    /** 替换配置 */
    replace?: ReplaceConfig;

    /** 删除配置 */
    delete?: DeleteConfig;

    /** 事件配置 */
    events?: EventConfig;

    /** 输出图片格式 */
    imageFormat?: 'markdown' | 'html';
}

// ==================== 默认配置 ====================
export const DEFAULT_REPLACE_CONFIG: ReplaceConfig = {
    fields: {
        src: '{cloudSrc}',
        alt: '{originalAlt}',
    },
};

export const DEFAULT_DELETE_CONFIG: DeleteConfig = {
    enabled: false,
};

// ==================== 配置构建器 ====================
export class ConfigBuilder {
    private readonly config: Partial<UploadConfig> = {};

    /**
     * 设置存储配置
     */
    storage(
        adapter: IStorageAdapter,
        options?: {
            uploadPrefix?: string;
            namingTemplate?: string;
        }
    ): this {
        this.config.storage = {
            adapter,
            uploadPrefix: options?.uploadPrefix,
            namingTemplate: options?.namingTemplate,
        };
        return this;
    }

    /**
     * 设置替换配置
     */
    replace(config: ReplaceConfig): this {
        this.config.replace = config;
        return this;
    }

    /**
     * 快速设置字段模板
     */
    fieldTemplates(templates: Record<string, string>): this {
        this.config.replace = { fields: templates };
        return this;
    }

    /**
     * 设置删除配置
     */
    delete(
        rootPathOrOptions:
            | string
            | {
                  strategy?: 'trash' | 'move' | 'hard-delete';
                  trashDir?: string;
                  maxRetries?: number;
              },
        options?: {
            strategy?: 'trash' | 'move' | 'hard-delete';
            trashDir?: string;
            maxRetries?: number;
        }
    ): this {
        if (typeof rootPathOrOptions === 'string') {
            this.config.delete = {
                enabled: true,
                rootPath: rootPathOrOptions,
                strategy: options?.strategy,
                trashDir: options?.trashDir,
                maxRetries: options?.maxRetries,
            };
        } else {
            this.config.delete = {
                enabled: true,
                ...rootPathOrOptions,
            };
        }
        return this;
    }

    /**
     * 设置事件配置
     */
    events(onProgress?: (event: UploadEvent) => void, logger?: LoggerCallback): this {
        this.config.events = { onProgress, logger };
        return this;
    }

    /**
     * 构建最终配置
     */
    build(): UploadConfig {
        if (!this.config.storage) {
            throw new Error('Storage configuration is required');
        }

        return {
            storage: this.config.storage,
            replace: this.config.replace || DEFAULT_REPLACE_CONFIG,
            delete: this.config.delete || DEFAULT_DELETE_CONFIG,
            events: this.config.events,
        };
    }
}

// ==================== 类型定义 ====================
import type { LoggerCallback } from '@cmtx/core';
import type { UploadEvent } from './types.js';
