/**
 * CMTX 配置加载器
 *
 * @module config/loader
 * @description
 * 支持从 YAML 文件加载 CMTX 配置，支持环境变量模板注入。
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import * as yaml from "js-yaml";
import { consoleLogger } from "@cmtx/core";
import { substituteEnvVarsInObject } from "../utils/env-substitution.js";
import type { CmtxConfig, CmtxStorageConfig } from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";

/**
 * 配置加载选项
 */
export interface LoaderOptions {
    /** 是否启用详细日志 */
    verbose?: boolean;
    /** 自定义环境变量解析器 */
    envResolver?: (name: string) => string | undefined;
}

/**
 * 验证敏感字段的环境变量使用
 */
function validateSensitiveField(
    storageId: string,
    key: string,
    value: string,
    resolver: (name: string) => string | undefined,
    sensitiveFields: string[],
): void {
    if (sensitiveFields.includes(key) && typeof value === "string") {
        if (!value.includes("${")) {
            consoleLogger.warn(`敏感字段建议使用环境变量：storages.${storageId}.config.${key}`);
            return;
        }
        const match = value.match(/\$\{([^}:-]+)(?::-[^}]*)?\}/);
        if (match) {
            const varName = match[1];
            if (resolver(varName) === undefined) {
                consoleLogger.warn(`环境变量未设置：${varName}，将使用原始值`);
            }
        }
    }
}

/**
 * 配置加载器类
 */
export class ConfigLoader {
    private readonly options: LoaderOptions;

    constructor(options: LoaderOptions = {}) {
        this.options = options;
    }

    /**
     * 从文件加载配置
     * @param configPath - 配置文件路径
     * @returns 解析后的配置
     */
    async loadFromFile(configPath: string): Promise<CmtxConfig> {
        const absolutePath = this.resolvePath(configPath);
        const content = await readFile(absolutePath, "utf-8");
        return this.loadFromString(content);
    }

    /**
     * 从字符串加载配置
     * @param content - YAML 内容
     * @returns 解析后的配置
     */
    loadFromString(content: string): CmtxConfig {
        const rawConfig = yaml.load(content) as Record<string, unknown>;
        const config = this.parseConfig(rawConfig);
        // 在解析后替换环境变量，使用自定义解析器或默认 process.env
        return substituteEnvVarsInObject(config, this.options.envResolver);
    }

    /**
     * 保存配置到文件
     * @param configPath - 配置文件路径
     * @param config - 配置对象
     */
    async saveToFile(configPath: string, config: CmtxConfig): Promise<void> {
        const absolutePath = this.resolvePath(configPath);

        // Ensure directory exists
        const dir = dirname(absolutePath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        const content = yaml.dump(config, {
            indent: 2,
            lineWidth: 120,
            noRefs: true,
            sortKeys: false,
        });

        await writeFile(absolutePath, content, "utf-8");
    }

    /**
     * 解析配置
     * @param raw - 原始配置对象
     * @returns 解析后的配置
     */
    private parseConfig(raw: Record<string, unknown>): CmtxConfig {
        // 验证 version
        if (!raw.version || typeof raw.version !== "string") {
            throw new Error("配置缺少 version 字段");
        }

        const config: CmtxConfig = {
            version: raw.version as string,
        };

        // 解析 storages（可选）
        if (raw.storages) {
            config.storages = this.parseStorages(raw.storages as Record<string, unknown>);
        }

        // 解析 presignedUrls（可选）
        if (raw.presignedUrls) {
            config.presignedUrls = this.parsePresignedUrls(
                raw.presignedUrls as Record<string, unknown>,
            );
        }

        // 解析 rules（可选）
        if (raw.rules) {
            config.rules = raw.rules as Record<string, Record<string, unknown>>;
        }

        // 解析 presets（可选）
        // PresetConfig 可以是 string[] 或 PresetConfigFull
        if (raw.presets) {
            config.presets = raw.presets as Record<
                string,
                | string[]
                | {
                      id: string;
                      name: string;
                      description?: string;
                      steps: Array<{
                          id: string;
                          enabled?: boolean;
                          config?: Record<string, unknown>;
                      }>;
                  }
            >;
        }

        return config;
    }

    /**
     * 解析存储池配置
     */
    private parseStorages(raw: Record<string, unknown>): Record<string, CmtxStorageConfig> {
        const storages: Record<string, CmtxStorageConfig> = {};

        // 敏感字段列表，这些字段必须使用环境变量
        const sensitiveFields = [
            "accessKeyId",
            "accessKeySecret",
            "secretKey",
            "secretId",
            "password",
            "token",
        ];

        // 获取环境变量解析器
        const resolver = this.options.envResolver || ((name) => process.env[name]);

        for (const [storageId, storage] of Object.entries(raw)) {
            if (!storage || typeof storage !== "object") {
                throw new Error(`storages.${storageId} 必须是对象类型`);
            }

            const storageObj = storage as Record<string, unknown>;

            if (!storageObj.adapter || typeof storageObj.adapter !== "string") {
                throw new Error(`storages.${storageId}.adapter 是必需的字符串字段`);
            }

            if (!storageObj.config || typeof storageObj.config !== "object") {
                throw new Error(`storages.${storageId}.config 是必需的对象字段`);
            }

            const configObj = storageObj.config as Record<string, string>;

            // 验证敏感字段是否使用环境变量
            for (const [key, value] of Object.entries(configObj)) {
                validateSensitiveField(storageId, key, value, resolver, sensitiveFields);
            }

            storages[storageId] = {
                adapter: storageObj.adapter as string,
                config: configObj,
            };
        }

        return storages;
    }

    /**
     * 解析预签名 URL 配置
     */
    private parsePresignedUrls(raw: Record<string, unknown>): Record<string, unknown> {
        const config: Record<string, unknown> = {};

        if (raw.expire !== undefined) {
            config.expire = raw.expire;
        }

        if (raw.maxRetryCount !== undefined) {
            config.maxRetryCount = raw.maxRetryCount;
        }

        if (raw.imageFormat !== undefined) {
            config.imageFormat = raw.imageFormat;
        }

        if (raw.domains && Array.isArray(raw.domains)) {
            const domains: Record<string, unknown>[] = [];
            for (const [index, entry] of (raw.domains as Record<string, unknown>[]).entries()) {
                if (!entry || typeof entry !== "object") {
                    throw new Error(`presignedUrls.domains[${index}] 必须是对象类型`);
                }
                if (typeof entry.domain !== "string") {
                    throw new Error(`presignedUrls.domains[${index}].domain 是必需的字符串字段`);
                }
                if (typeof entry.useStorage !== "string") {
                    throw new Error(
                        `presignedUrls.domains[${index}].useStorage 是必需的字符串字段`,
                    );
                }
                domains.push(entry);
            }
            config.domains = domains;
        }

        return config;
    }

    /**
     * 解析路径
     */
    private resolvePath(configPath: string): string {
        if (configPath.startsWith("/") || configPath.includes(":\\")) {
            return configPath;
        }
        return join(process.cwd(), configPath);
    }

    /**
     * 查找默认配置文件路径
     * 在当前目录及其父目录中查找 cmtx.config.yaml 或 .cmtx/config.yaml
     * @returns 默认配置文件路径，如果未找到则返回 undefined
     */
    async findDefaultConfig(): Promise<string | undefined> {
        let currentDir = process.cwd();

        // 向上遍历目录树，最多 10 层
        for (let i = 0; i < 10; i++) {
            // 检查当前目录
            const configPath1 = join(currentDir, "cmtx.config.yaml");
            if (existsSync(configPath1)) {
                return configPath1;
            }

            const configPath2 = join(currentDir, ".cmtx", "config.yaml");
            if (existsSync(configPath2)) {
                return configPath2;
            }

            // 移动到父目录
            const parentDir = dirname(currentDir);
            if (parentDir === currentDir) {
                // 已到达根目录
                break;
            }
            currentDir = parentDir;
        }

        return undefined;
    }
}

/**
 * 从文件加载配置（便捷函数）
 * @param configPath - 配置文件路径
 * @param options - 加载选项
 * @returns 解析后的配置
 */
export async function loadConfigFromFile(
    configPath: string,
    options?: LoaderOptions,
): Promise<CmtxConfig> {
    const loader = new ConfigLoader(options);
    const config = await loader.loadFromFile(configPath);
    return substituteEnvVarsInObject(config);
}

/**
 * 从字符串加载配置（便捷函数）
 * @param content - YAML 内容
 * @param options - 加载选项
 * @returns 解析后的配置
 */
export function loadConfigFromString(content: string, options?: LoaderOptions): CmtxConfig {
    const loader = new ConfigLoader(options);
    const config = loader.loadFromString(content);
    return substituteEnvVarsInObject(config);
}

/**
 * 保存配置到文件（便捷函数）
 * @param configPath - 配置文件路径
 * @param config - 配置对象
 */
export async function saveConfigToFile(configPath: string, config: CmtxConfig): Promise<void> {
    const loader = new ConfigLoader();
    await loader.saveToFile(configPath, config);
}

/**
 * 确保配置文件存在，不存在则创建默认配置
 * @param configPath - 配置文件路径
 * @returns 配置对象
 */
export async function ensureConfig(configPath: string): Promise<CmtxConfig> {
    if (existsSync(configPath)) {
        return loadConfigFromFile(configPath);
    }

    // Create default config
    await saveConfigToFile(configPath, DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
}

/**
 * 获取配置目录路径
 * @param baseDir - 基础目录
 * @param configDir - 配置目录名（可选，默认 .cmtx）
 * @returns 配置目录路径
 */
export function getConfigDirPath(baseDir: string, configDir: string = ".cmtx"): string {
    if (isAbsolute(configDir)) {
        return configDir;
    }
    return join(baseDir, configDir);
}

/**
 * 获取配置文件路径
 * @param baseDir - 基础目录
 * @param configDir - 配置目录名（可选，默认 .cmtx）
 * @returns 配置文件路径
 */
export function getConfigFilePath(baseDir: string, configDir?: string): string {
    return join(getConfigDirPath(baseDir, configDir), "config.yaml");
}

/**
 * 创建配置加载器实例（工厂函数）
 * @param options - 加载选项
 * @returns ConfigLoader 实例
 */
export function createConfigLoader(options?: LoaderOptions): ConfigLoader {
    return new ConfigLoader(options);
}
