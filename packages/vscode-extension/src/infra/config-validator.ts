import * as vscode from 'vscode';
import type { CmtxConfig } from './cmtx-config';

export interface ConfigValidationError {
    path: string;
    message: string;
    severity: 'error' | 'warning';
}

function validateVersion(config: CmtxConfig): ConfigValidationError[] {
    if (!config.version) {
        return [
            {
                path: 'version',
                message: 'Version is required',
                severity: 'error',
            },
        ];
    }
    return [];
}

function validateUpload(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    if (!config.upload) return errors;

    if (config.upload.batchLimit !== undefined && config.upload.batchLimit < 1) {
        errors.push({
            path: 'upload.batchLimit',
            message: 'Batch limit must be at least 1',
            severity: 'error',
        });
    }

    if (config.upload.imageFormat && !['markdown', 'html'].includes(config.upload.imageFormat)) {
        errors.push({
            path: 'upload.imageFormat',
            message: 'Image format must be "markdown" or "html"',
            severity: 'error',
        });
    }

    return errors;
}

function validateResize(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    if (!config.resize?.widths) return errors;

    if (!Array.isArray(config.resize.widths)) {
        return [
            {
                path: 'resize.widths',
                message: 'Widths must be an array',
                severity: 'error',
            },
        ];
    }

    if (config.resize.widths.some((w) => typeof w !== 'number' || w < 1)) {
        errors.push({
            path: 'resize.widths',
            message: 'All widths must be positive numbers',
            severity: 'error',
        });
    }

    return errors;
}

function validatePresignedUrls(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    if (!config.presignedUrls) return errors;

    if (config.presignedUrls.expire !== undefined && config.presignedUrls.expire < 60) {
        errors.push({
            path: 'presignedUrls.expire',
            message: 'Expiration time should be at least 60 seconds',
            severity: 'warning',
        });
    }

    if (
        config.presignedUrls.maxRetryCount !== undefined &&
        config.presignedUrls.maxRetryCount < 0
    ) {
        errors.push({
            path: 'presignedUrls.maxRetryCount',
            message: 'Max retry count must be non-negative',
            severity: 'error',
        });
    }

    if (
        config.presignedUrls.imageFormat &&
        !['markdown', 'html', 'all'].includes(config.presignedUrls.imageFormat)
    ) {
        errors.push({
            path: 'presignedUrls.imageFormat',
            message: 'Image format must be "markdown", "html", or "all"',
            severity: 'error',
        });
    }

    return errors;
}

function validateStorage(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    if (!config.storage) return errors;

    if (!config.storage.adapter) {
        errors.push({
            path: 'storage.adapter',
            message: 'Storage adapter is required',
            severity: 'error',
        });
    }

    if (!config.storage.config) {
        errors.push({
            path: 'storage.config',
            message: 'Storage config is required',
            severity: 'error',
        });
        return errors;
    }

    for (const [key, value] of Object.entries(config.storage.config)) {
        if (typeof value === 'string' && value.includes('${')) {
            const match = value.match(/\$\{([^}]+)\}/);
            if (match) {
                const varName = match[1].split(':-')[0];
                if (!process.env[varName]) {
                    errors.push({
                        path: `storage.config.${key}`,
                        message: `Environment variable ${varName} is not set. Use CMTX_ prefix for CMTX-specific vars (e.g., CMTX_ALIYUN_ACCESS_KEY_ID)`,
                        severity: 'warning',
                    });
                }
            }
        }
    }

    return errors;
}

export function validateConfig(config: CmtxConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    errors.push(...validateVersion(config));
    errors.push(...validateUpload(config));
    errors.push(...validateResize(config));
    errors.push(...validatePresignedUrls(config));
    errors.push(...validateStorage(config));
    return errors;
}

export async function showConfigValidationErrors(errors: ConfigValidationError[]): Promise<void> {
    if (errors.length === 0) return;

    const errorCount = errors.filter((e) => e.severity === 'error').length;
    const warningCount = errors.filter((e) => e.severity === 'warning').length;

    const items = errors.map((e) => ({
        label: `[${e.severity.toUpperCase()}] ${e.path}`,
        description: e.message,
        error: e,
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Configuration has ${errorCount} errors and ${warningCount} warnings`,
    });

    if (selected) {
        const action = await vscode.window.showWarningMessage(
            `${selected.error.path}: ${selected.error.message}`,
            'Edit Config',
            'Dismiss'
        );

        if (action === 'Edit Config') {
            vscode.commands.executeCommand('cmtx.configEdit');
        }
    }
}

export function formatValidationErrors(errors: ConfigValidationError[]): string {
    if (errors.length === 0) {
        return 'Configuration is valid';
    }

    const errorCount = errors.filter((e) => e.severity === 'error').length;
    const warningCount = errors.filter((e) => e.severity === 'warning').length;

    const lines = [
        `Configuration validation: ${errorCount} errors, ${warningCount} warnings`,
        ...errors.map((e) => `[${e.severity.toUpperCase()}] ${e.path}: ${e.message}`),
    ];

    return lines.join('\n');
}
