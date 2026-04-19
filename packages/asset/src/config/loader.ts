/**
 * 配置加载器
 *
 * @module config/loader
 * @description
 * 支持 YAML 配置文件加载，支持环境变量模板注入。
 * 敏感字段必须使用环境变量模板语法 ${VAR_NAME}，非敏感字段支持明文或环境变量模板。
 *
 * @remarks
 * ## 配置格式
 *
 * ```yaml
 * source:
 *   customDomain: source-bucket.oss-cn-hangzhou.aliyuncs.com
 *   credentials:
 *     accessKeyId: ${SOURCE_ACCESS_KEY_ID}
 *     accessKeySecret: ${SOURCE_ACCESS_KEY_SECRET}
 *     region: ${SOURCE_REGION}
 *     bucket: ${SOURCE_BUCKET}
 *
 * target:
 *   customDomain: cdn.example.com
 *   credentials:
 *     accessKeyId: ${TARGET_ACCESS_KEY_ID}
 *     accessKeySecret: ${TARGET_ACCESS_KEY_SECRET}
 *     region: ${TARGET_REGION}
 *     bucket: ${TARGET_BUCKET}
 *   prefix: blog/
 *   namingStrategy: preserve
 *   overwrite: false
 *
 * options:
 *   concurrency: 5
 *   tempDir: /tmp/cmtx-transfer
 * ```
 *
 * ## 安全说明
 *
 * - 敏感字段（accessKeyId, accessKeySecret）必须使用环境变量模板 ${VAR_NAME}
 * - 非敏感字段（region, bucket）支持明文或环境变量模板
 * - 敏感字段使用明文凭证会被拒绝并抛出错误
 * - 环境变量名称可以自定义，不限于特定命名
 */

import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import * as yaml from 'js-yaml';
import type { CloudCredentials, TransferConfig } from '../transfer/types.js';

/**
 * 配置加载选项
 */
export interface LoaderOptions {
    /** 是否启用详细日志 */
    verbose?: boolean;

    /** 自定义环境变量解析器 */
    envResolver?: (name: string) => string | undefined;

    /** 当前解析的凭证字段上下文（用于错误提示） */
    credentialContext?: 'source' | 'target';
}

/**
 * 配置加载器
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
    async loadFromFile(configPath: string): Promise<TransferConfig> {
        const absolutePath = this.resolvePath(configPath);
        const content = await fs.readFile(absolutePath, 'utf-8');
        return this.loadFromString(content);
    }

    /**
     * 从字符串加载配置
     * @param content - YAML 内容
     * @returns 解析后的配置
     */
    loadFromString(content: string): TransferConfig {
        const rawConfig = yaml.load(content) as Record<string, unknown>;
        return this.parseConfig(rawConfig);
    }

    /**
     * 解析配置
     * @param raw - 原始配置对象
     * @returns 解析后的配置
     */
    private parseConfig(raw: Record<string, unknown>): TransferConfig {
        // 验证基本结构
        if (!raw.source || typeof raw.source !== 'object') {
            throw new Error('配置缺少 source 字段');
        }
        if (!raw.target || typeof raw.target !== 'object') {
            throw new Error('配置缺少 target 字段');
        }

        const sourceRaw = raw.source as Record<string, unknown>;
        const targetRaw = raw.target as Record<string, unknown>;

        // 解析 source credentials
        if (!sourceRaw.credentials || typeof sourceRaw.credentials !== 'object') {
            throw new Error('source.credentials 是必需的');
        }

        // 解析 target credentials
        if (!targetRaw.credentials || typeof targetRaw.credentials !== 'object') {
            throw new Error('target.credentials 是必需的');
        }

        // 解析凭证（带环境变量模板解析和明文检测）
        const sourceCredentials = this.resolveCredentials(
            sourceRaw.credentials as Record<string, string>,
            'source'
        );
        const targetCredentials = this.resolveCredentials(
            targetRaw.credentials as Record<string, string>,
            'target'
        );

        // 构建最终配置
        const config: TransferConfig = {
            source: {
                customDomain: this.resolveValue(sourceRaw.customDomain),
                credentials: sourceCredentials,
                useSignedUrl: sourceRaw.useSignedUrl as boolean | undefined,
                signedUrlExpires: sourceRaw.signedUrlExpires as number | undefined,
            },
            target: {
                customDomain: this.resolveValue(targetRaw.customDomain),
                credentials: targetCredentials,
                prefix: this.resolveValue(targetRaw.prefix),
                namingStrategy: targetRaw.namingStrategy as
                    | 'preserve'
                    | 'timestamp'
                    | 'hash'
                    | 'uuid'
                    | undefined,
                overwrite: targetRaw.overwrite as boolean | undefined,
            },
        };

        // 解析 options（如果存在）
        if (raw.options && typeof raw.options === 'object') {
            const optionsRaw = raw.options as Record<string, unknown>;
            config.options = {
                concurrency: optionsRaw.concurrency as number | undefined,
                maxConcurrentDownloads: optionsRaw.maxConcurrentDownloads as number | undefined,
                tempDir: this.resolveValue(optionsRaw.tempDir),
                debug: optionsRaw.debug as boolean | undefined,
            };

            // 解析 filter
            if (optionsRaw.filter && typeof optionsRaw.filter === 'object') {
                const filterRaw = optionsRaw.filter as Record<string, unknown>;
                config.options.filter = {
                    extensions: filterRaw.extensions as string[] | undefined,
                    maxSize: filterRaw.maxSize as number | undefined,
                    minSize: filterRaw.minSize as number | undefined,
                };
            }
        }

        return config;
    }

    /**
     * 解析凭证配置
     * @param credentials - 原始凭证对象
     * @param context - 凭证上下文（source 或 target）
     * @returns 解析后的凭证配置
     */
    private resolveCredentials(
        credentials: Record<string, string>,
        context: 'source' | 'target'
    ): CloudCredentials {
        const provider = (credentials.provider as CloudCredentials['provider']) || 'aliyun-oss';
        const prefix = context === 'source' ? 'SOURCE' : 'TARGET';

        switch (provider) {
            case 'aliyun-oss':
                return {
                    provider: 'aliyun-oss',
                    accessKeyId: this.resolveCredentialField(
                        credentials.accessKeyId,
                        `${prefix}_ACCESS_KEY_ID`,
                        true,
                        'aliyun-oss'
                    ),
                    accessKeySecret: this.resolveCredentialField(
                        credentials.accessKeySecret,
                        `${prefix}_ACCESS_KEY_SECRET`,
                        true,
                        'aliyun-oss'
                    ),
                    region: this.resolveCredentialField(
                        credentials.region,
                        `${prefix}_REGION`,
                        false,
                        'aliyun-oss'
                    ),
                    bucket: this.resolveCredentialField(
                        credentials.bucket,
                        `${prefix}_BUCKET`,
                        false,
                        'aliyun-oss'
                    ),
                    stsToken: credentials.stsToken
                        ? this.resolveCredentialField(
                              credentials.stsToken,
                              `${prefix}_STS_TOKEN`,
                              true,
                              'aliyun-oss'
                          )
                        : undefined,
                };

            case 'tencent-cos':
                return {
                    provider: 'tencent-cos',
                    secretId: this.resolveCredentialField(
                        credentials.secretId,
                        `${prefix}_SECRET_ID`,
                        true,
                        'tencent-cos'
                    ),
                    secretKey: this.resolveCredentialField(
                        credentials.secretKey,
                        `${prefix}_SECRET_KEY`,
                        true,
                        'tencent-cos'
                    ),
                    region: this.resolveCredentialField(
                        credentials.region,
                        `${prefix}_REGION`,
                        false,
                        'tencent-cos'
                    ),
                    bucket: this.resolveCredentialField(
                        credentials.bucket,
                        `${prefix}_BUCKET`,
                        false,
                        'tencent-cos'
                    ),
                    sessionToken: credentials.sessionToken
                        ? this.resolveCredentialField(
                              credentials.sessionToken,
                              `${prefix}_SESSION_TOKEN`,
                              true,
                              'tencent-cos'
                          )
                        : undefined,
                };

            default:
                throw new Error(
                    `不支持的云服务商: ${provider}\n支持的云服务商: aliyun-oss, tencent-cos`
                );
        }
    }

    /**
     * 解析凭证字段
     * 敏感字段必须使用环境变量模板 ${VAR_NAME}
     * 非敏感字段支持环境变量模板或明文
     *
     * @param value - 字段值
     * @param defaultEnvName - 默认环境变量名（用于错误提示）
     * @param isSensitive - 是否为敏感字段
     * @param provider - 云服务商类型
     * @returns 解析后的值
     * @throws {Error} 当环境变量未设置或敏感字段使用明文凭证时
     */
    private resolveCredentialField(
        value: string | undefined,
        defaultEnvName: string,
        isSensitive: boolean,
        _provider: CloudCredentials['provider']
    ): string {
        if (value === undefined || value === null || value === '') {
            throw new Error(`凭证字段不能为空，请使用环境变量模板: \${${defaultEnvName}}`);
        }

        // 检查是否是环境变量模板 ${VAR_NAME}
        const match = value.match(/^\$\{([^}]+)\}$/);
        if (match) {
            const envVarName = match[1];
            const resolver = this.options.envResolver ?? ((name: string) => process.env[name]);
            const envValue = resolver(envVarName);

            if (envValue === undefined || envValue === '') {
                throw new Error(
                    `环境变量未设置: ${envVarName}\n` +
                        `请设置环境变量后重试:\n` +
                        `  export ${envVarName}=your_value`
                );
            }

            if (this.options.verbose) {
                console.log(`[INFO] 已解析环境变量: ${envVarName}`);
            }

            return envValue;
        }

        // 如果是敏感字段，拒绝明文凭证
        if (isSensitive) {
            throw new Error(
                `敏感字段不支持明文凭证，请使用环境变量模板: \${ENV_VAR_NAME}\n` +
                    `当前值: "${value.substring(0, 10)}${value.length > 10 ? '...' : ''}"\n` +
                    `建议改为: \${${defaultEnvName}}\n\n` +
                    `设置环境变量示例:\n` +
                    `  export ${defaultEnvName}=your_value`
            );
        }

        // 非敏感字段允许明文值
        if (this.options.verbose) {
            console.log(`[INFO] 使用明文值: ${defaultEnvName.replace(/_/, ' ').toLowerCase()}`);
        }
        return value;
    }

    /**
     * 解析普通值（支持环境变量模板）
     * @param value - 原始值
     * @returns 解析后的值
     */
    private resolveValue(value: unknown): string | undefined {
        if (value === undefined || value === null) {
            return undefined;
        }

        if (typeof value !== 'string') {
            return String(value);
        }

        // 解析环境变量模板
        return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
            const resolver = this.options.envResolver ?? ((name: string) => process.env[name]);
            const envValue = resolver(varName);

            if (envValue === undefined) {
                if (this.options.verbose) {
                    console.warn(`[WARN] 环境变量未设置: ${varName}，保留原值`);
                }
                return match;
            }

            return envValue;
        });
    }

    /**
     * 解析路径
     * @param configPath - 配置文件路径
     * @returns 绝对路径
     */
    private resolvePath(configPath: string): string {
        if (configPath.startsWith('/') || configPath.includes(':\\')) {
            return configPath;
        }
        return resolve(process.cwd(), configPath);
    }
}

/**
 * 创建配置加载器
 * @param options - 加载选项
 * @returns ConfigLoader 实例
 */
export function createConfigLoader(options?: LoaderOptions): ConfigLoader {
    return new ConfigLoader(options);
}

/**
 * 从文件加载配置
 * @param configPath - 配置文件路径
 * @param options - 加载选项
 * @returns 解析后的配置
 */
export async function loadConfigFromFile(
    configPath: string,
    options?: LoaderOptions
): Promise<TransferConfig> {
    const loader = createConfigLoader(options);
    return loader.loadFromFile(configPath);
}

/**
 * 从字符串加载配置
 * @param content - YAML 内容
 * @param options - 加载选项
 * @returns 解析后的配置
 */
export function loadConfigFromString(content: string, options?: LoaderOptions): TransferConfig {
    const loader = createConfigLoader(options);
    return loader.loadFromString(content);
}
