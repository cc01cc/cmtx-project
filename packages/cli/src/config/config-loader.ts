/**
 * CLI 配置加载器
 *
 * @description
 * 封装 @cmtx/asset 的配置加载器，添加 CLI 特定的配置类型和验证。
 */

import {
    ConfigLoader as AssetConfigLoader,
    loadConfigFromFile as assetLoadConfigFromFile,
    type CmtxConfig,
    type CmtxStorageConfig,
} from "@cmtx/asset/config";

/**
 * CLI 专用配置接口
 */
export interface CLIConfig extends CmtxConfig {
    /** 输入目录或文件 */
    input?: string;
    /** 高级选项 */
    advanced?: AdvancedConfig;
}

/**
 * 高级配置
 */
export interface AdvancedConfig {
    /** 并发数 */
    concurrency?: number;
    /** 最大文件大小 */
    maxFileSize?: number;
    /** 是否启用详细日志 */
    verbose?: boolean;
}

/**
 * CLI 配置加载器类
 * 封装 asset 包的 ConfigLoader，添加 CLI 特定功能
 */
export class ConfigLoader {
    private readonly assetLoader: AssetConfigLoader;

    constructor() {
        this.assetLoader = new AssetConfigLoader();
    }

    /**
     * 加载配置文件
     * @param configPath 配置文件路径
     * @returns 解析后的配置对象
     */
    async loadFromFile(configPath: string): Promise<CLIConfig> {
        // 使用 asset 包的加载器
        const config = await this.assetLoader.loadFromFile(configPath);

        // 转换为 CLIConfig（添加 CLI 特定字段）
        const cliConfig = config as CLIConfig;
        return cliConfig;
    }

    /**
     * 从字符串加载配置
     * @param content YAML 内容
     * @returns 解析后的配置对象
     */
    loadFromString(content: string): CLIConfig {
        const config = this.assetLoader.loadFromString(content);
        return config as CLIConfig;
    }

    /**
     * 查找默认配置文件路径
     * @returns 默认配置文件路径，如果未找到则返回 undefined
     */
    async findDefaultConfig(): Promise<string | undefined> {
        return this.assetLoader.findDefaultConfig();
    }
}

/**
 * 从文件加载配置（便捷函数）
 * @param configPath 配置文件路径
 * @returns 解析后的配置对象
 */
export async function loadConfigFromFile(configPath: string): Promise<CLIConfig> {
    const config = await assetLoadConfigFromFile(configPath);
    return config as CLIConfig;
}

// 重新导出常用类型
export type { CmtxConfig, CmtxStorageConfig };
