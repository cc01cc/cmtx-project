/* eslint-disable no-console */

/**
 * CMTX 配置验证器
 *
 * @module config/validator
 * @description
 * 验证 CMTX 配置的有效性和完整性。
 */

import type { CmtxConfig } from "./types.js";

/**
 * 配置验证错误
 */
/**
 * 配置验证错误
 */
export interface ConfigValidationError {
    /** 错误路径 */
    path: string;
    /** 错误消息 */
    message: string;
    /** 严重程度 */
    severity: "error" | "warning";
}

/**
 * 验证版本配置
 */
function validateVersion(config: CmtxConfig): ConfigValidationError[] {
    if (!config.version) {
        return [
            {
                path: "version",
                message: "Version is required",
                severity: "error",
            },
        ];
    }
    return [];
}

/**
 * 验证上传配置
 */
function validateUpload(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    if (!config.upload) return errors;

    if (config.upload.batchLimit !== undefined && config.upload.batchLimit < 1) {
        errors.push({
            path: "upload.batchLimit",
            message: "Batch limit must be at least 1",
            severity: "error",
        });
    }

    if (config.upload.imageFormat && !["markdown", "html"].includes(config.upload.imageFormat)) {
        errors.push({
            path: "upload.imageFormat",
            message: 'Image format must be "markdown" or "html"',
            severity: "error",
        });
    }

    if (
        config.upload.conflictStrategy &&
        !["skip", "overwrite"].includes(config.upload.conflictStrategy)
    ) {
        errors.push({
            path: "upload.conflictStrategy",
            message: 'Conflict strategy must be "skip" or "overwrite"',
            severity: "error",
        });
    }

    return errors;
}

/**
 * 验证图片缩放配置
 */
function validateResize(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    if (!config.resize?.widths) return errors;

    if (!Array.isArray(config.resize.widths)) {
        return [
            {
                path: "resize.widths",
                message: "Widths must be an array",
                severity: "error",
            },
        ];
    }

    if (config.resize.widths.some((w) => typeof w !== "number" || w < 1)) {
        errors.push({
            path: "resize.widths",
            message: "All widths must be positive numbers",
            severity: "error",
        });
    }

    return errors;
}

/**
 * 验证预签名 URL 配置
 */
function validatePresignedUrls(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    if (!config.presignedUrls) return errors;

    if (config.presignedUrls.expire !== undefined && config.presignedUrls.expire < 60) {
        errors.push({
            path: "presignedUrls.expire",
            message: "Expiration time should be at least 60 seconds",
            severity: "warning",
        });
    }

    if (
        config.presignedUrls.maxRetryCount !== undefined &&
        config.presignedUrls.maxRetryCount < 0
    ) {
        errors.push({
            path: "presignedUrls.maxRetryCount",
            message: "Max retry count must be non-negative",
            severity: "error",
        });
    }

    if (
        config.presignedUrls.imageFormat &&
        !["markdown", "html", "all"].includes(config.presignedUrls.imageFormat)
    ) {
        errors.push({
            path: "presignedUrls.imageFormat",
            message: 'Image format must be "markdown", "html", or "all"',
            severity: "error",
        });
    }

    return errors;
}

/**
 * 检查环境变量占位符
 */
function checkEnvPlaceholder(
    key: string,
    value: string,
    storageId: string,
): ConfigValidationError | null {
    if (value.includes("${")) {
        const match = value.match(/\$\{([^}]+)\}/);
        if (match) {
            const varName = match[1].split(":-")[0];
            if (!process.env[varName]) {
                return {
                    path: `storages.${storageId}.config.${key}`,
                    message: `Environment variable ${varName} is not set. Use CMTX_ prefix for CMTX-specific vars (e.g., CMTX_ALIYUN_ACCESS_KEY_ID)`,
                    severity: "warning",
                };
            }
        }
    }
    return null;
}

/**
 * 验证存储配置
 */
function validateStorage(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!config.storages || Object.keys(config.storages).length === 0) {
        errors.push({
            path: "storages",
            message: "At least one storage configuration is required",
            severity: "error",
        });
        return errors;
    }

    // 验证每个存储配置
    for (const [storageId, storage] of Object.entries(config.storages)) {
        if (!storage.adapter) {
            errors.push({
                path: `storages.${storageId}.adapter`,
                message: "Storage adapter is required",
                severity: "error",
            });
        }

        if (!storage.config) {
            errors.push({
                path: `storages.${storageId}.config`,
                message: "Storage config is required",
                severity: "error",
            });
            continue;
        }

        for (const [key, value] of Object.entries(storage.config)) {
            if (typeof value === "string") {
                const error = checkEnvPlaceholder(key, value, storageId);
                if (error) {
                    errors.push(error);
                }
            }
        }
    }

    return errors;
}

/**
 * 验证配置
 * @param config - CMTX 配置
 * @returns 验证错误列表
 */
export function validateConfig(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    errors.push(...validateVersion(config));
    errors.push(...validateUpload(config));
    errors.push(...validateResize(config));
    errors.push(...validatePresignedUrls(config));
    errors.push(...validateStorage(config));
    return errors;
}

/**
 * 配置验证器类
 */
export class ConfigValidator {
    /**
     * 验证配置
     * @param config - CMTX 配置
     * @returns 验证错误列表
     */
    validate(config: CmtxConfig): ConfigValidationError[] {
        return validateConfig(config);
    }

    /**
     * 验证配置并抛出错误（如果有错误）
     * @param config - CMTX 配置
     * @throws Error 当验证失败时
     */
    validateOrThrow(config: CmtxConfig): void {
        const errors = this.validate(config);
        const errorCount = errors.filter((e) => e.severity === "error").length;
        if (errorCount > 0) {
            throw new Error(
                `Configuration validation failed with ${errorCount} error(s):\n` +
                    errors
                        .filter((e) => e.severity === "error")
                        .map((e) => `  - ${e.path}: ${e.message}`)
                        .join("\n"),
            );
        }
    }

    /**
     * 检查配置是否有效
     * @param config - CMTX 配置
     * @returns 是否有效
     */
    isValid(config: CmtxConfig): boolean {
        const errors = this.validate(config);
        return errors.filter((e) => e.severity === "error").length === 0;
    }
}

/**
 * 格式化验证错误
 * @param errors - 验证错误列表
 * @returns 格式化后的错误字符串
 */
export function formatValidationErrors(errors: ConfigValidationError[]): string {
    if (errors.length === 0) {
        return "Configuration is valid";
    }

    const errorCount = errors.filter((e) => e.severity === "error").length;
    const warningCount = errors.filter((e) => e.severity === "warning").length;

    const lines = [
        `Configuration validation: ${errorCount} errors, ${warningCount} warnings`,
        ...errors.map((e) => `[${e.severity.toUpperCase()}] ${e.path}: ${e.message}`),
    ];

    return lines.join("\n");
}

/**
 * 验证配置并抛出错误（如果有错误）
 * @param config - CMTX 配置
 * @throws Error 当验证失败时
 */
export function validateConfigOrThrow(config: CmtxConfig): void {
    const errors = validateConfig(config);
    const errorCount = errors.filter((e) => e.severity === "error").length;
    if (errorCount > 0) {
        const errorMessages = errors
            .filter((e) => e.severity === "error")
            .map((e) => `  - ${e.path}: ${e.message}`)
            .join("\n");
        throw new Error(
            `Configuration validation failed with ${errorCount} error(s):\n${errorMessages}`,
        );
    }
}

/**
 * 创建配置验证器实例
 * @returns ConfigValidator 实例
 */
export function createConfigValidator(): ConfigValidator {
    return new ConfigValidator();
}
