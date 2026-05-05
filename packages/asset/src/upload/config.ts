/**
 * 存储池配置 - Storage Pool Configuration
 * 支持多个 storage provider，通过 ID 标识
 */

import type { IStorageAdapter } from "@cmtx/storage";

// ==================== 单个存储配置 ====================
export interface StorageConfig {
    /** 云存储适配器 */
    adapter: IStorageAdapter;

    /** 命名模板 */
    namingTemplate?: string;
}

// ==================== 存储池配置 ====================
/** 存储池：Map<storage ID, StorageConfig> */
export type StoragePoolConfig = Record<string, StorageConfig>;

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

// ==================== 事件和日志配置 ====================
export interface EventConfig {
    /** 上传流程事件回调 */
    onProgress?: (event: UploadEvent) => void;

    /** 日志记录器 */
    logger?: Logger;
}

// ==================== 主配置接口 ====================
export interface UploadConfig {
    /** 存储池配置 */
    storages: StoragePoolConfig;

    /** 指定使用哪个 storage (storage ID)，默认 'default' */
    useStorage?: string;

    /** 上传到远程存储的前缀路径（可选，默认 '' 表示 bucket 根目录） */
    prefix?: string;

    /** 替换配置 */
    replace?: ReplaceConfig;

    /** 事件配置 */
    events?: EventConfig;

    /** 输出图片格式 */
    imageFormat?: "markdown" | "html";
}

// ==================== 默认配置 ====================
export const DEFAULT_REPLACE_CONFIG: ReplaceConfig = {
    fields: {
        src: "{cloudSrc}",
        alt: "{originalAlt}",
    },
};

// ==================== 配置构建器 ====================
export class ConfigBuilder {
    private readonly config: Partial<UploadConfig> = {};

    /**
     * 设置存储池配置
     */
    storages(storagePool: StoragePoolConfig): this {
        this.config.storages = storagePool;
        return this;
    }

    /**
     * 设置使用的 storage (by ID)
     */
    useStorage(storageId: string): this {
        this.config.useStorage = storageId;
        return this;
    }

    /**
     * 设置上传前缀
     */
    prefix(prefix: string): this {
        this.config.prefix = prefix;
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
     * 设置事件配置
     */
    events(onProgress?: (event: UploadEvent) => void, logger?: Logger): this {
        this.config.events = { onProgress, logger };
        return this;
    }

    /**
     * 构建最终配置
     */
    build(): UploadConfig {
        if (!this.config.storages) {
            throw new Error("Storage pool configuration is required");
        }

        if (!this.config.useStorage && Object.keys(this.config.storages).length === 0) {
            throw new Error("At least one storage must be defined in the pool");
        }

        return {
            storages: this.config.storages,
            useStorage: this.config.useStorage || "default",
            prefix: this.config.prefix || "",
            replace: this.config.replace || DEFAULT_REPLACE_CONFIG,
            events: this.config.events,
        };
    }
}

// ==================== Helper 函数 ====================
/**
 * 获取 UploadConfig 中当前使用的 storage 配置
 * @param config - UploadConfig
 * @returns 当前使用的 StorageConfig
 */
export function getCurrentStorageConfig(config: UploadConfig): StorageConfig {
    const storageId = config.useStorage || "default";
    const storage = config.storages[storageId];
    if (!storage) {
        throw new Error(
            `Storage '${storageId}' not found in storage pool. Available: ${Object.keys(
                config.storages,
            ).join(", ")}`,
        );
    }
    return storage;
}

// ==================== 类型定义 ====================
import type { Logger } from "@cmtx/core";
import type { UploadEvent } from "./types.js";
