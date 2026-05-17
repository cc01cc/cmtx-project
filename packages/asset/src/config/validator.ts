/* eslint-disable no-console */

import type { CmtxConfig } from "./types.js";

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
 * 配置验证结果
 */
export class ValidationResult {
    constructor(public errors: ConfigValidationError[]) {}

    /** 是否存在错误 */
    hasErrors(): boolean {
        return this.errors.length > 0;
    }

    /** 是否存在 severity === 'error' 的致命错误 */
    hasFatal(): boolean {
        return this.errors.some((e) => e.severity === "error");
    }

    /** 格式化错误为可读字符串 */
    format(): string {
        return formatValidationErrors(this.errors);
    }
}

/**
 * 验证 CMTX 配置
 *
 * @param config - 待验证的配置
 * @returns 验证结果
 */
export function validateConfig(config: CmtxConfig): ValidationResult {
    const errors = _validateConfig(config);
    return new ValidationResult(errors);
}

// ==================== 内部验证函数 ====================

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

function validateUpload(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    const uploadRule = config.rules?.["upload-images"];
    if (!uploadRule) return errors;

    const concurrency = (uploadRule.concurrency ?? uploadRule.batchLimit) as number | undefined;
    if (concurrency !== undefined && concurrency < 1) {
        errors.push({
            path: "rules.upload-images.concurrency",
            message: "Concurrency must be at least 1",
            severity: "error",
        });
    }

    if (uploadRule.batchLimit !== undefined) {
        errors.push({
            path: "rules.upload-images.batchLimit",
            message: "batchLimit has been renamed to concurrency, please update your config",
            severity: "warning",
        });
    }

    const imageFormat = uploadRule.imageFormat as string | undefined;
    if (imageFormat && !["markdown", "html"].includes(imageFormat)) {
        errors.push({
            path: "rules.upload-images.imageFormat",
            message: 'Image format must be "markdown" or "html"',
            severity: "error",
        });
    }

    const conflictStrategy = uploadRule.conflictStrategy as string | undefined;
    if (conflictStrategy && !["skip", "overwrite"].includes(conflictStrategy)) {
        errors.push({
            path: "rules.upload-images.conflictStrategy",
            message: 'Conflict strategy must be "skip" or "overwrite"',
            severity: "error",
        });
    }

    return errors;
}

function validateDownload(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    const rule = config.rules?.["download-images"];
    if (!rule) return errors;

    const concurrency = rule.concurrency as number | undefined;
    if (concurrency !== undefined && concurrency < 1) {
        errors.push({
            path: "rules.download-images.concurrency",
            message: "Concurrency must be at least 1",
            severity: "error",
        });
    }

    const overwrite = rule.overwrite as boolean | undefined;
    if (overwrite !== undefined && typeof overwrite !== "boolean") {
        errors.push({
            path: "rules.download-images.overwrite",
            message: "Overwrite must be a boolean",
            severity: "error",
        });
    }

    return errors;
}

function validateTransfer(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    const rule = config.rules?.["transfer-images"];
    if (!rule) return errors;

    const concurrency = rule.concurrency as number | undefined;
    if (concurrency !== undefined && concurrency < 1) {
        errors.push({
            path: "rules.transfer-images.concurrency",
            message: "Concurrency must be at least 1",
            severity: "error",
        });
    }

    const maxConcurrentDownloads = rule.maxConcurrentDownloads as number | undefined;
    if (maxConcurrentDownloads !== undefined && maxConcurrentDownloads < 1) {
        errors.push({
            path: "rules.transfer-images.maxConcurrentDownloads",
            message: "maxConcurrentDownloads must be at least 1",
            severity: "error",
        });
    }

    const deleteSource = rule.deleteSource as boolean | undefined;
    if (deleteSource !== undefined && typeof deleteSource !== "boolean") {
        errors.push({
            path: "rules.transfer-images.deleteSource",
            message: "deleteSource must be a boolean",
            severity: "error",
        });
    }

    const overwrite = rule.overwrite as boolean | undefined;
    if (overwrite !== undefined && typeof overwrite !== "boolean") {
        errors.push({
            path: "rules.transfer-images.overwrite",
            message: "overwrite must be a boolean",
            severity: "error",
        });
    }

    return errors;
}

function validateDeleteStrategy(strategy: unknown, path: string): ConfigValidationError | null {
    if (strategy !== undefined && !["trash", "move", "hard-delete"].includes(strategy as string)) {
        return {
            path,
            message: 'Strategy must be "trash", "move", or "hard-delete"',
            severity: "error",
        };
    }
    return null;
}

function validateDelete(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    const rule = config.rules?.["delete-image"];
    if (!rule) return errors;

    const strategyError = validateDeleteStrategy(rule.strategy, "rules.delete-image.strategy");
    if (strategyError) errors.push(strategyError);

    const removeFromMarkdown = rule.removeFromMarkdown as boolean | undefined;
    if (removeFromMarkdown !== undefined && typeof removeFromMarkdown !== "boolean") {
        errors.push({
            path: "rules.delete-image.removeFromMarkdown",
            message: "removeFromMarkdown must be a boolean",
            severity: "error",
        });
    }

    const force = rule.force as boolean | undefined;
    if (force !== undefined && typeof force !== "boolean") {
        errors.push({
            path: "rules.delete-image.force",
            message: "force must be a boolean",
            severity: "error",
        });
    }

    return errors;
}

function validateCleanup(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    const rule = config.rules?.["cleanup-images"];
    if (!rule) return errors;

    const strategyError = validateDeleteStrategy(rule.strategy, "rules.cleanup-images.strategy");
    if (strategyError) errors.push(strategyError);

    const force = rule.force as boolean | undefined;
    if (force !== undefined && typeof force !== "boolean") {
        errors.push({
            path: "rules.cleanup-images.force",
            message: "force must be a boolean",
            severity: "error",
        });
    }

    return errors;
}

function validateResize(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    const resizeRule = config.rules?.["resize-image"];
    if (!resizeRule) return errors;

    const oldWidths = resizeRule.availableWidths;
    if (oldWidths !== undefined) {
        errors.push({
            path: "rules.resize-image.availableWidths",
            message: "availableWidths has been renamed to widths, please update your config",
            severity: "warning",
        });
    }

    const widths = resizeRule.widths;
    if (widths === undefined) return errors;

    if (!Array.isArray(widths)) {
        return [
            {
                path: "rules.resize-image.widths",
                message: "Widths must be an array",
                severity: "error",
            },
        ];
    }

    if (widths.some((w: unknown) => typeof w !== "number" || w < 1)) {
        errors.push({
            path: "rules.resize-image.widths",
            message: "All widths must be positive numbers",
            severity: "error",
        });
    }

    return errors;
}

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
 * 验证 CMTX 配置（内部实现，返回裸数组）
 */
function _validateConfig(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    errors.push(...validateVersion(config));
    errors.push(...validateUpload(config));
    errors.push(...validateDownload(config));
    errors.push(...validateTransfer(config));
    errors.push(...validateDelete(config));
    errors.push(...validateCleanup(config));
    errors.push(...validateResize(config));
    errors.push(...validatePresignedUrls(config));
    errors.push(...validateStorage(config));
    return errors;
}

/**
 * 配置验证器类
 */
export class ConfigValidator {
    validate(config: CmtxConfig): ValidationResult {
        return validateConfig(config);
    }

    /**
     * 验证配置并抛出错误（如果有错误）
     */
    validateOrThrow(config: CmtxConfig): void {
        const result = this.validate(config);
        if (result.hasFatal()) {
            const errorMessages = result.errors
                .filter((e) => e.severity === "error")
                .map((e) => `  - ${e.path}: ${e.message}`)
                .join("\n");
            throw new Error(
                `Configuration validation failed with ${result.errors.filter((e) => e.severity === "error").length} error(s):\n${errorMessages}`,
            );
        }
    }

    /**
     * 检查配置是否有效
     */
    isValid(config: CmtxConfig): boolean {
        const result = this.validate(config);
        return !result.hasFatal();
    }
}

/**
 * 验证配置并抛出错误（如果有错误）
 */
export function validateConfigOrThrow(config: CmtxConfig): void {
    const result = validateConfig(config);
    if (result.hasFatal()) {
        throw new Error(result.format());
    }
}

/**
 * 创建配置验证器实例
 */
export function createConfigValidator(): ConfigValidator {
    return new ConfigValidator();
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
