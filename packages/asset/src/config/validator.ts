/**
 * 配置验证器
 *
 * @module config/validator
 * @description
 * 验证传输配置的完整性和有效性。
 *
 * @remarks
 * 验证规则:
 * - 源存储和目标存储必须配置
 * - 凭证配置必须包含必需的字段
 * - 自定义域名格式必须有效
 * - 命名策略必须是支持的值
 */

import type { CloudCredentials } from '../transfer/types.js';

/**
 * 验证错误
 */
export class ValidationError extends Error {
    constructor(
        message: string,
        public readonly path: string
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * 配置验证结果
 *
 * @description
 * 扩展自 @cmtx/core 的 ValidationResult，添加详细的路径信息。
 */
export interface ConfigValidationResult {
    /** 是否有效 */
    valid: boolean;

    /** 错误列表 */
    errors: Array<{ path: string; message: string }>;
}

/**
 * 配置验证器
 */
export class ConfigValidator {
    private errors: Array<{ path: string; message: string }> = [];

    /**
     * 验证完整配置
     * @param config - 传输配置
     * @returns 验证结果
     */
    validate(config: unknown): ConfigValidationResult {
        this.errors = [];

        if (!config || typeof config !== 'object') {
            this.addError('root', '配置必须是对象类型');
            return { valid: false, errors: this.errors };
        }

        const cfg = config as Record<string, unknown>;

        // 验证源存储配置
        if (!cfg.source) {
            this.addError('source', '缺少源存储配置 (source)');
        } else {
            this.validateSourceConfig(cfg.source, 'source');
        }

        // 验证目标存储配置
        if (!cfg.target) {
            this.addError('target', '缺少目标存储配置 (target)');
        } else {
            this.validateTargetConfig(cfg.target, 'target');
        }

        // 验证选项
        if (cfg.options) {
            this.validateOptions(cfg.options, 'options');
        }

        return {
            valid: this.errors.length === 0,
            errors: this.errors,
        };
    }

    /**
     * 验证源存储配置
     * @param source - 源配置
     * @param path - 当前路径
     */
    private validateSourceConfig(source: unknown, path: string): void {
        if (!source || typeof source !== 'object') {
            this.addError(path, '源存储配置必须是对象类型');
            return;
        }

        const cfg = source as Record<string, unknown>;

        // 验证凭证配置
        if (!cfg.credentials) {
            this.addError(`${path}.credentials`, '源存储必须配置凭证 (credentials)');
        } else {
            this.validateCredentials(cfg.credentials as CloudCredentials, `${path}.credentials`);
        }

        // 验证自定义域名
        if (cfg.customDomain !== undefined) {
            this.validateUrl(cfg.customDomain as string, `${path}.customDomain`);
        }

        // 验证签名 URL 过期时间
        if (cfg.signedUrlExpires !== undefined) {
            this.validatePositiveNumber(cfg.signedUrlExpires as number, `${path}.signedUrlExpires`);
        }
    }

    /**
     * 验证目标存储配置
     * @param target - 目标配置
     * @param path - 当前路径
     */
    private validateTargetConfig(target: unknown, path: string): void {
        if (!target || typeof target !== 'object') {
            this.addError(path, '目标存储配置必须是对象类型');
            return;
        }

        const cfg = target as Record<string, unknown>;

        // 验证凭证配置
        if (!cfg.credentials) {
            this.addError(`${path}.credentials`, '目标存储必须配置凭证 (credentials)');
        } else {
            this.validateCredentials(cfg.credentials as CloudCredentials, `${path}.credentials`);
        }

        // 验证自定义域名
        if (cfg.customDomain !== undefined) {
            this.validateUrl(cfg.customDomain as string, `${path}.customDomain`);
        }

        // 验证前缀
        if (cfg.prefix !== undefined && typeof cfg.prefix !== 'string') {
            this.addError(`${path}.prefix`, '前缀必须是字符串类型');
        }

        // 验证命名策略
        if (cfg.namingStrategy !== undefined) {
            const validStrategies = ['preserve', 'timestamp', 'hash', 'uuid'];
            if (!validStrategies.includes(cfg.namingStrategy as string)) {
                this.addError(
                    `${path}.namingStrategy`,
                    `无效的命名策略: ${cfg.namingStrategy}，有效值为: ${validStrategies.join(', ')}`
                );
            }
        }

        // 验证覆盖选项
        if (cfg.overwrite !== undefined && typeof cfg.overwrite !== 'boolean') {
            this.addError(`${path}.overwrite`, 'overwrite 必须是布尔类型');
        }
    }

    /**
     * 验证敏感字段（必须使用环境变量模板）
     */
    private validateSensitiveField(
        creds: Record<string, unknown>,
        fieldName: string,
        path: string
    ): void {
        if (!creds[fieldName] || typeof creds[fieldName] !== 'string') {
            this.addError(`${path}.${fieldName}`, `${fieldName} 是必需的字符串字段`);
            return;
        }
        const value = creds[fieldName] as string;
        if (!this.isEnvVarTemplate(value)) {
            this.addError(
                `${path}.${fieldName}`,
                `敏感字段 ${fieldName} 必须使用环境变量模板 \${VAR_NAME}，不支持明文凭证`
            );
        }
    }

    /**
     * 验证凭证配置
     * 敏感字段（accessKeyId, accessKeySecret）必须使用环境变量模板
     * 非敏感字段（region, bucket）支持明文或环境变量模板
     *
     * @param credentials - 凭证配置
     * @param path - 当前路径
     */
    private validateCredentials(credentials: unknown, path: string): void {
        if (!credentials || typeof credentials !== 'object') {
            this.addError(path, '凭证配置必须是对象类型');
            return;
        }

        const creds = credentials as Record<string, unknown>;

        // 验证敏感字段
        this.validateSensitiveField(creds, 'accessKeyId', path);
        this.validateSensitiveField(creds, 'accessKeySecret', path);

        // 验证非敏感字段
        if (!creds.region || typeof creds.region !== 'string') {
            this.addError(`${path}.region`, 'region 是必需的字符串字段');
        }

        if (!creds.bucket || typeof creds.bucket !== 'string') {
            this.addError(`${path}.bucket`, 'bucket 是必需的字符串字段');
        }
    }

    /**
     * 检查值是否为环境变量模板格式 ${VAR_NAME}
     * @param value - 要检查的值
     * @returns 是否为环境变量模板
     */
    private isEnvVarTemplate(value: string): boolean {
        return /^\$\{[^}]+\}$/.test(value);
    }

    /**
     * 验证传输选项
     * @param options - 选项配置
     * @param path - 当前路径
     */
    private validateOptions(options: unknown, path: string): void {
        if (!options || typeof options !== 'object') {
            this.addError(path, '选项必须是对象类型');
            return;
        }

        const opts = options as Record<string, unknown>;

        // 验证并发数
        if (opts.concurrency !== undefined) {
            this.validatePositiveInteger(opts.concurrency as number, `${path}.concurrency`);
        }

        // 验证最大并发下载数
        if (opts.maxConcurrentDownloads !== undefined) {
            this.validatePositiveInteger(
                opts.maxConcurrentDownloads as number,
                `${path}.maxConcurrentDownloads`
            );
        }

        // 验证临时目录
        if (opts.tempDir !== undefined && typeof opts.tempDir !== 'string') {
            this.addError(`${path}.tempDir`, '临时目录必须是字符串类型');
        }

        // 验证过滤器
        if (opts.filter) {
            this.validateFilter(opts.filter, `${path}.filter`);
        }

        // 验证调试模式
        if (opts.debug !== undefined && typeof opts.debug !== 'boolean') {
            this.addError(`${path}.debug`, 'debug 必须是布尔类型');
        }
    }

    /**
     * 验证扩展名字段
     */
    private validateExtensions(extensions: unknown, path: string): void {
        if (!Array.isArray(extensions)) {
            this.addError(`${path}.extensions`, '扩展名必须是数组类型');
            return;
        }
        for (let i = 0; i < extensions.length; i++) {
            if (typeof extensions[i] !== 'string') {
                this.addError(`${path}.extensions[${i}]`, '扩展名必须是字符串类型');
            }
        }
    }

    /**
     * 验证文件过滤器
     * @param filter - 过滤器配置
     * @param path - 当前路径
     */
    private validateFilter(filter: unknown, path: string): void {
        if (!filter || typeof filter !== 'object') {
            this.addError(path, '过滤器必须是对象类型');
            return;
        }

        const f = filter as Record<string, unknown>;

        // 验证扩展名
        if (f.extensions !== undefined) {
            this.validateExtensions(f.extensions, path);
        }

        // 验证最大文件大小
        if (f.maxSize !== undefined) {
            this.validatePositiveNumber(f.maxSize as number, `${path}.maxSize`);
        }

        // 验证最小文件大小
        if (f.minSize !== undefined) {
            this.validatePositiveNumber(f.minSize as number, `${path}.minSize`);
        }

        // 验证自定义过滤函数
        if (f.custom !== undefined && typeof f.custom !== 'function') {
            this.addError(`${path}.custom`, '自定义过滤器必须是函数类型');
        }
    }

    /**
     * 验证 URL 格式
     * @param url - URL 字符串
     * @param path - 当前路径
     */
    private validateUrl(url: string, path: string): void {
        if (typeof url !== 'string') {
            this.addError(path, 'URL 必须是字符串类型');
            return;
        }

        try {
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                this.addError(path, 'URL 必须使用 http 或 https 协议');
            }
        } catch {
            this.addError(path, '无效的 URL 格式');
        }
    }

    /**
     * 验证正数
     * @param value - 数值
     * @param path - 当前路径
     */
    private validatePositiveNumber(value: number, path: string): void {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            this.addError(path, '必须是数字类型');
            return;
        }

        if (value <= 0) {
            this.addError(path, '必须是正数');
        }
    }

    /**
     * 验证正整数
     * @param value - 数值
     * @param path - 当前路径
     */
    private validatePositiveInteger(value: number, path: string): void {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            this.addError(path, '必须是数字类型');
            return;
        }

        if (!Number.isInteger(value) || value <= 0) {
            this.addError(path, '必须是正整数');
        }
    }

    /**
     * 添加错误
     * @param path - 错误路径
     * @param message - 错误消息
     */
    private addError(path: string, message: string): void {
        this.errors.push({ path, message });
    }
}

/**
 * 创建配置验证器
 * @returns ConfigValidator 实例
 */
export function createConfigValidator(): ConfigValidator {
    return new ConfigValidator();
}

/**
 * 验证配置
 * @param config - 传输配置
 * @returns 验证结果
 */
export function validateConfig(config: unknown): ConfigValidationResult {
    const validator = createConfigValidator();
    return validator.validate(config);
}

/**
 * 验证配置并抛出错误
 * @param config - 传输配置
 * @throws ValidationError 当验证失败时
 */
export function validateConfigOrThrow(config: unknown): void {
    const result = validateConfig(config);
    if (!result.valid) {
        const firstError = result.errors[0];
        throw new ValidationError(firstError.message, firstError.path);
    }
}
