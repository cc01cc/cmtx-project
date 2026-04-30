/**
 * Upload 配置适配器
 */

import { getCurrentStorageConfig } from "./config.js";
import type { UploadConfig } from "./types.js";

export class ConfigAdapter {
    private constructor() {
        // 私有构造函数，防止实例化
    }

    static getStorageAdapter(config: UploadConfig) {
        return getCurrentStorageConfig(config).adapter;
    }

    static getStoragePrefix(config: UploadConfig) {
        return config.prefix || "";
    }

    static getNamingPattern(config: UploadConfig) {
        return getCurrentStorageConfig(config).namingTemplate || "{name}{ext}";
    }

    static getOnProgress(config: UploadConfig) {
        return config.events?.onProgress;
    }

    static getLogger(config: UploadConfig) {
        return config.events?.logger;
    }

    static getDeleteOptions(config: UploadConfig) {
        return config.delete || { strategy: "trash" };
    }
}
