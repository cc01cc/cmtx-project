/**
 * Upload 配置适配器
 */

import type { UploadConfig } from './types.js';

export class ConfigAdapter {
    private constructor() {
        // 私有构造函数，防止实例化
    }

    static getStorageAdapter(config: UploadConfig) {
        return config.storage.adapter;
    }

    static getStoragePrefix(config: UploadConfig) {
        return config.storage.prefix || '';
    }

    static getNamingPattern(config: UploadConfig) {
        return config.storage.namingTemplate || '{name}{ext}';
    }

    // deduplicate 已移除 - 现在统一采用去重上传
    // 保留此方法为向后兼容，始终返回 true
    static getDeduplicateEnabled(_config: UploadConfig) {
        return true;
    }

    static getOnProgress(config: UploadConfig) {
        return config.events?.onProgress;
    }

    static getLogger(config: UploadConfig) {
        return config.events?.logger;
    }

    static getDeleteRootPath(config: UploadConfig) {
        return config.delete?.rootPath || '';
    }

    static getDeleteOptions(config: UploadConfig) {
        return config.delete || { strategy: 'trash' };
    }
}
