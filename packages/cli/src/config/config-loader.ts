/**
 * 增强版配置文件加载器
 * 增加详细的类型校验和错误处理
 */

import { promises as fs } from 'fs';
import * as yaml from 'js-yaml';
import { resolve } from 'path';

export interface CLIConfig {
    version?: string;
    input?: string;
    storage: StorageConfig;
    replace?: ReplaceConfig;
    delete?: DeleteConfig;
    advanced?: AdvancedConfig;
}

export interface StorageConfig {
    adapter: 'aliyun-oss' | 'aws-s3' | 'custom';
    config: Record<string, any>;
    prefix?: string;
    namingPattern?: string;
}

export interface ReplaceConfig {
    enabled: boolean;
    fields: Record<string, string>;
    context?: Record<string, string>;
}

export interface DeleteConfig {
    enabled: boolean;
    strategy: 'trash' | 'move' | 'hard-delete';
    trashDir?: string;
    rootPath?: string;
}

export interface AdvancedConfig {
    concurrency?: number;
    maxFileSize?: number;
    verbose?: boolean;
}

export class ConfigLoader {
    /**
     * 加载配置文件
     * @param configPath 配置文件路径
     * @returns 解析后的配置对象
     */
    async loadFromFile(configPath: string): Promise<CLIConfig> {
        try {
            const absolutePath = this.resolveConfigPath(configPath);
            const content = await fs.readFile(absolutePath, 'utf-8');

            // 检查 YAML 格式问题
            this.checkYAMLParsingIssues(content);

            const config = yaml.load(content) as any;

            // 验证配置结构
            this.validateStructure(config);

            // 验证配置类型
            this.validateTypes(config);

            // 解析环境变量
            const resolvedConfig = this.resolveEnvironmentVariables(config);

            return resolvedConfig as CLIConfig;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new Error(`配置文件未找到：${configPath}`);
            }
            throw new Error(`配置文件解析失败：${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 检查常见的 YAML 解析问题
     */
    private checkYAMLParsingIssues(content: string): void {
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineNumber = i + 1;

            // 检查模板变量未加引号的问题
            if (line.includes(': {') && line.includes('}') && !line.includes(':"{') && !line.includes(":'{")) {
                const fieldName = line.split(':')[0].trim();
                throw new Error(
                    `配置文件第 ${lineNumber} 行格式错误: 字段 "${fieldName}" 的值 "${line.split(':')[1].trim()}" 应该用引号包围。\n` +
                        `建议改为: ${fieldName}: "{${line.split('{')[1].split('}')[0]}}"`
                );
            }

            // 检查其他常见 YAML 问题
            if (line.includes('{') && line.includes('}') && !line.includes('"') && !line.includes("'")) {
                console.warn(`[WARN] 第 ${lineNumber} 行可能存在问题: ${line}`);
            }
        }
    }

    /**
     * 验证配置结构完整性
     */
    private validateStructure(config: any): void {
        if (!config.storage) {
            throw new Error('配置文件缺少必需的 storage 配置');
        }

        if (!config.storage.adapter) {
            throw new Error('storage 配置缺少 adapter 字段');
        }

        if (!config.storage.config) {
            throw new Error('storage 配置缺少 config 字段');
        }

        // 验证 replace 配置结构
        if (config.replace) {
            if (typeof config.replace.enabled !== 'boolean') {
                throw new Error('replace.enabled 必须是布尔值 (true/false)');
            }

            if (!config.replace.fields) {
                throw new Error('replace 配置缺少 fields 字段');
            }

            if (typeof config.replace.fields !== 'object') {
                throw new Error('replace.fields 必须是对象类型');
            }
        }

        // 验证 delete 配置结构
        if (config.delete) {
            if (typeof config.delete.enabled !== 'boolean') {
                throw new Error('delete.enabled 必须是布尔值 (true/false)');
            }
        }
    }

    /**
     * 验证配置数据类型
     */
    private validateTypes(config: any): void {
        // 验证 storage 配置类型
        if (config.storage) {
            // 验证 adapter 类型
            const validAdapters = ['aliyun-oss', 'aws-s3', 'custom'];
            if (!validAdapters.includes(config.storage.adapter)) {
                throw new Error(`无效的 adapter 值: ${config.storage.adapter}。有效值为: ${validAdapters.join(', ')}`);
            }

            // 验证 config 字段类型
            if (typeof config.storage.config !== 'object') {
                throw new Error('storage.config 必须是对象类型');
            }

            // 验证字符串字段
            if (config.storage.prefix && typeof config.storage.prefix !== 'string') {
                throw new Error('storage.prefix 必须是字符串类型');
            }

            if (config.storage.namingPattern && typeof config.storage.namingPattern !== 'string') {
                throw new Error('storage.namingPattern 必须是字符串类型');
            }
        }

        // 验证 replace 配置类型
        if (config.replace) {
            // 验证 fields 中的值都是字符串
            for (const [field, value] of Object.entries(config.replace.fields)) {
                if (typeof value !== 'string') {
                    throw new Error(`replace.fields.${field} 必须是字符串类型，当前值为: ${JSON.stringify(value)}`);
                }

                // 检查是否可能是未加引号的模板变量
                if (typeof value === 'object' && value !== null) {
                    const objKeys = Object.keys(value);
                    throw new Error(
                        `replace.fields.${field} 的值 "${objKeys[0]}" 应该用引号包围。\n` +
                            `建议改为: ${field}: "{${objKeys[0]}}"`
                    );
                }
            }
        }

        // 验证 delete 配置类型
        if (config.delete) {
            const validStrategies = ['trash', 'move', 'hard-delete'];
            if (config.delete.strategy && !validStrategies.includes(config.delete.strategy)) {
                throw new Error(
                    `无效的 delete.strategy 值: ${config.delete.strategy}。有效值为: ${validStrategies.join(', ')}`
                );
            }
        }
    }

    /**
     * 解析默认配置文件路径
     */
    async findDefaultConfig(): Promise<string | null> {
        const possiblePaths = ['./cmtx.config.yaml', './cmtx.config.yml', './.cmtx.yaml', './.cmtx.yml'];

        for (const path of possiblePaths) {
            try {
                const absolutePath = resolve(path);
                await fs.access(absolutePath);
                return absolutePath;
            } catch {
                // 文件不存在，继续检查下一个
            }
        }

        return null;
    }

    /**
     * 解析配置中的环境变量
     */
    private resolveEnvironmentVariables(config: any): any {
        if (typeof config === 'string') {
            return this.resolveStringVariables(config);
        }

        if (Array.isArray(config)) {
            return config.map((item) => this.resolveEnvironmentVariables(item));
        }

        if (typeof config === 'object' && config !== null) {
            const resolved: any = {};
            for (const [key, value] of Object.entries(config)) {
                resolved[key] = this.resolveEnvironmentVariables(value);
            }
            return resolved;
        }

        return config;
    }

    /**
     * 解析字符串中的环境变量
     * 支持 ${VAR_NAME} 语法
     */
    private resolveStringVariables(str: string): string {
        return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
            const value = process.env[varName];
            if (value === undefined) {
                console.warn(`[WARN] 环境变量未设置：${varName}`);
                return match; // 保留原始变量名
            }
            return value;
        });
    }

    /**
     * 解析配置文件路径
     */
    private resolveConfigPath(configPath: string): string {
        if (configPath.startsWith('/') || configPath.includes(':\\')) {
            // 绝对路径
            return configPath;
        }
        // 相对路径，相对于当前工作目录
        return resolve(configPath);
    }
}
