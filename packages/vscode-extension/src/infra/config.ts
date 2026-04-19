import * as vscode from 'vscode';
import type { CloudStorageConfig } from '../utils/config-parser';
import type { CmtxConfig, CmtxPresignedUrlDomain } from './cmtx-config';
import {
    getCurrentWorkspaceFolder,
    getPresignedUrlDomains,
    getPresignedUrlSettings,
    getResizeDomains,
    getResizeWidths,
    getStorageConfig,
    getUploadConfigFromCmtx,
    loadCmtxConfig,
} from './cmtx-config';
import { getLogger } from './logger';

export type { CloudStorageConfig };

export interface UploadConfig {
    imageFormat: 'markdown' | 'html';
    batchLimit: number;
    providerConfig: CloudStorageConfig;
    imageAltTemplate: string;
    fileWriteTimeout: number;
    auto: boolean;
    keepLocalImages: boolean;
    namingTemplate?: string;
}

export interface ResizeConfig {
    widths: number[];
    domains: Array<{
        domain: string;
        provider: 'aliyun-oss' | 'tencent-cos' | 'html';
    }>;
}

export interface PresignedUrlConfig {
    imageFormat: 'markdown' | 'html' | 'all';
    expire: number;
    maxRetryCount: number;
    providerConfigs: CloudStorageConfig[];
}

function createDefaultUploadConfig(): UploadConfig {
    return {
        imageFormat: 'markdown',
        batchLimit: 5,
        providerConfig: {
            provider: 'aliyun-oss',
            domain: '',
            bucket: '',
            region: '',
        },
        imageAltTemplate: '',
        fileWriteTimeout: 10000,
        auto: false,
        keepLocalImages: true,
        namingTemplate: '{name}.{ext}',
    };
}

function mergeCmtxConfig(defaultConfig: UploadConfig, cmtxConfig: CmtxConfig): UploadConfig {
    const configFromFile = getUploadConfigFromCmtx(cmtxConfig);

    return {
        ...defaultConfig,
        imageFormat: configFromFile.imageFormat ?? 'markdown',
        batchLimit: configFromFile.batchLimit ?? 5,
        imageAltTemplate: configFromFile.imageAltTemplate ?? '',
        namingTemplate: configFromFile.namingTemplate ?? '{name}.{ext}',
        auto: configFromFile.auto ?? false,
        keepLocalImages: configFromFile.keepLocalImages ?? true,
    };
}

function extractStorageConfig(cmtxConfig: CmtxConfig, defaultConfig: UploadConfig): UploadConfig {
    const storage = getStorageConfig(cmtxConfig);

    if (!storage) {
        return defaultConfig;
    }

    return {
        ...defaultConfig,
        providerConfig: {
            provider: storage.adapter as 'aliyun-oss' | 'tencent-cos',
            domain: storage.config.bucket
                ? `${storage.config.bucket}.${storage.config.region}.aliyuncs.com`
                : '',
            bucket: storage.config.bucket || '',
            region: storage.config.region || '',
            accessKeyId: storage.config.accessKeyId,
            accessKeySecret: storage.config.accessKeySecret,
        },
    };
}

export async function getUploadConfig(): Promise<UploadConfig> {
    const workspaceFolder = getCurrentWorkspaceFolder();
    let uploadConfig = createDefaultUploadConfig();

    if (!workspaceFolder) {
        return uploadConfig;
    }

    try {
        const cmtxConfig = await loadCmtxConfig(workspaceFolder);
        if (cmtxConfig) {
            uploadConfig = mergeCmtxConfig(uploadConfig, cmtxConfig);
            uploadConfig = extractStorageConfig(cmtxConfig, uploadConfig);
        }
    } catch (error) {
        const logger = getLogger('config');
        const message = error instanceof Error ? error.message : String(error);
        logger.error('getUploadConfig failed:', message);
    }

    return uploadConfig;
}

export async function getResizeConfig(): Promise<ResizeConfig> {
    const workspaceFolder = getCurrentWorkspaceFolder();

    const resizeConfig: ResizeConfig = {
        widths: [360, 480, 640, 800, 960, 1200],
        domains: [],
    };

    if (!workspaceFolder) {
        return resizeConfig;
    }

    try {
        const cmtxConfig = await loadCmtxConfig(workspaceFolder);
        if (cmtxConfig) {
            resizeConfig.widths = getResizeWidths(cmtxConfig);
            const domains = getResizeDomains(cmtxConfig);
            if (domains.length > 0) {
                resizeConfig.domains = domains as Array<{
                    domain: string;
                    provider: 'aliyun-oss' | 'tencent-cos' | 'html';
                }>;
            }
        }
    } catch (error) {
        const logger = getLogger('config');
        const message = error instanceof Error ? error.message : String(error);
        logger.error('getResizeConfig failed:', message);
        // Use default config
    }

    return resizeConfig;
}

export async function getPresignedUrlConfig(): Promise<PresignedUrlConfig> {
    const workspaceFolder = getCurrentWorkspaceFolder();

    let presignedConfig: PresignedUrlConfig = {
        imageFormat: 'all',
        expire: 600,
        maxRetryCount: 3,
        providerConfigs: [],
    };

    if (!workspaceFolder) {
        return presignedConfig;
    }

    try {
        const cmtxConfig = await loadCmtxConfig(workspaceFolder);
        if (cmtxConfig) {
            const settings = getPresignedUrlSettings(cmtxConfig);
            presignedConfig = {
                ...presignedConfig,
                imageFormat: settings.imageFormat ?? 'all',
                expire: settings.expire ?? 600,
                maxRetryCount: settings.maxRetryCount ?? 3,
            };

            const domains = getPresignedUrlDomains(cmtxConfig);
            if (domains.length > 0) {
                presignedConfig.providerConfigs = domains.map((d: CmtxPresignedUrlDomain) => ({
                    provider: d.provider as 'aliyun-oss' | 'tencent-cos',
                    domain: d.domain,
                    bucket: d.bucket || '',
                    region: d.region || '',
                    path: d.path,
                    forceHttps: d.forceHttps,
                    accessKeyId: d.accessKeyId,
                    accessKeySecret: d.accessKeySecret,
                }));
            }
        }
    } catch (error) {
        const logger = getLogger('config');
        const message = error instanceof Error ? error.message : String(error);
        logger.error('getPresignedUrlConfig failed:', message);
        // Use default config
    }

    return presignedConfig;
}

export function setupConfigListener(callback?: () => void): vscode.Disposable {
    const logger = getLogger('config');
    try {
        callback?.();
        return vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('cmtx')) {
                callback?.();
                logger.info('Configuration updated');
            }
        });
    } catch (error) {
        logger.error('Failed to setup config listener:', error);
        return { dispose: () => {} };
    }
}
