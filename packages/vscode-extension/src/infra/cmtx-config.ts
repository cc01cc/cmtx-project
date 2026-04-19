import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import type { PresetConfig, RuleConfig } from '@cmtx/publish';
import yaml from 'js-yaml';
import * as vscode from 'vscode';
import { substituteEnvVarsInObject } from './env-substitution';
import { getLogger } from './logger';

const logger = getLogger('cmtx-config');

// 重新导出以保持向后兼容
export type { PresetConfig, RuleConfig };

/**
 * Preset 配置（简洁版或完整版）
 */
export type PresetValue = string[] | PresetConfig;

export interface CmtxStorageConfig {
    adapter: string;
    config: Record<string, string>;
    prefix?: string;
    namingPattern?: string;
}

export interface CmtxUploadConfig {
    imageFormat?: 'markdown' | 'html';
    batchLimit?: number;
    imageAltTemplate?: string;
    namingTemplate?: string;
    auto?: boolean;
    keepLocalImages?: boolean;
}

export interface CmtxPresignedUrlDomain {
    domain: string;
    provider: string;
    bucket?: string;
    region?: string;
    path?: string;
    forceHttps?: boolean;
    accessKeyId?: string;
    accessKeySecret?: string;
}

export interface CmtxPresignedUrlConfig {
    expire?: number;
    maxRetryCount?: number;
    imageFormat?: 'markdown' | 'html' | 'all';
    domains?: CmtxPresignedUrlDomain[];
}

export interface CmtxResizeConfig {
    widths?: number[];
    domains?: Array<{
        domain: string;
        provider: string;
    }>;
}

/**
 * CMTX 配置
 */
export interface CmtxConfig {
    version: string;
    upload?: CmtxUploadConfig;
    storage?: CmtxStorageConfig;
    presignedUrls?: CmtxPresignedUrlConfig;
    resize?: CmtxResizeConfig;
    /** 全局 Rules 配置 */
    rules?: Record<string, RuleConfig>;
    /** Presets（Rule 集合） */
    presets?: Record<string, PresetValue>;
}

const DEFAULT_CONFIG: CmtxConfig = {
    version: 'v2',
    upload: {
        imageFormat: 'markdown',
        batchLimit: 5,
        imageAltTemplate: '',
        namingTemplate: '{name}.{ext}',
        auto: false,
        keepLocalImages: true,
    },
    resize: {
        widths: [360, 480, 640, 800, 960, 1200],
        domains: [],
    },
    presignedUrls: {
        expire: 600,
        maxRetryCount: 3,
        imageFormat: 'all',
        domains: [],
    },
    rules: {
        'strip-frontmatter': {},
        'promote-headings': {
            levels: 1,
        },
        'text-replace': {
            match: '',
            replace: '',
            flags: 'gm',
        },
        'convert-images': {
            convertToHtml: false,
        },
        'upload-images': {
            width: 800,
        },
        'add-section-numbers': {
            minLevel: 2,
            maxLevel: 6,
            startLevel: 2,
            separator: '.',
        },
        'remove-section-numbers': {},
        'frontmatter-title': {
            headingLevel: 1,
        },
        'frontmatter-date': {},
        'frontmatter-updated': {},
        'frontmatter-id': {
            encryptionKey: '',
        },
        autocorrect: {
            configPath: '.autocorrectrc',
            strict: false,
        },
    },
    presets: {
        zhihu: [
            'strip-frontmatter',
            'promote-headings',
            'add-section-numbers',
            'upload-images',
            'frontmatter-id',
            'frontmatter-date',
        ],
        wechat: [
            'strip-frontmatter',
            'promote-headings',
            'add-section-numbers',
            'convert-images',
            'upload-images',
            'frontmatter-id',
            'frontmatter-date',
        ],
        csdn: ['strip-frontmatter', 'add-section-numbers', 'upload-images', 'frontmatter-date'],
        juejin: [
            'strip-frontmatter',
            'promote-headings',
            'add-section-numbers',
            'upload-images',
            'frontmatter-date',
        ],
        cnblogs: [
            'strip-frontmatter',
            'promote-headings',
            'add-section-numbers',
            'upload-images',
            'frontmatter-id',
            'frontmatter-date',
        ],
    },
};

export function getConfigDirPath(workspaceFolder: vscode.WorkspaceFolder): string {
    const config = vscode.workspace.getConfiguration('cmtx');
    const configDir = config.get<string>('configDir', '.cmtx');

    if (isAbsolute(configDir)) {
        return configDir;
    }

    return join(workspaceFolder.uri.fsPath, configDir);
}

export function getConfigFilePath(workspaceFolder: vscode.WorkspaceFolder): string {
    return join(getConfigDirPath(workspaceFolder), 'config.yaml');
}

type LogFn = (message: string) => void;

function logStorageConfig(config: CmtxConfig, logToChannel: LogFn): void {
    if (!config.storage) return;

    const keyId = config.storage.config.accessKeyId;
    const keyPreview = keyId ? `${keyId.substring(0, 6)}...${keyId.slice(-4)}` : 'not set';
    const keySecret = config.storage.config.accessKeySecret;
    const secretPreview = keySecret
        ? `${keySecret.substring(0, 4)}...${keySecret.slice(-4)}`
        : 'not set';

    logToChannel('[CMTX] [config] INFO: Storage:');
    logToChannel(`[CMTX] [config] INFO:   Adapter: ${config.storage.adapter}`);
    logToChannel(`[CMTX] [config] INFO:   Region: ${config.storage.config.region || '(not set)'}`);
    logToChannel(`[CMTX] [config] INFO:   Bucket: ${config.storage.config.bucket || '(not set)'}`);
    logToChannel(`[CMTX] [config] INFO:   Prefix: ${config.storage.prefix || '(none)'}`);
    logToChannel(`[CMTX] [config] INFO:   Access Key: ${keyPreview}`);
    logToChannel(`[CMTX] [config] INFO:   Access Secret: ${secretPreview}`);
    logToChannel('');
    logger.info(
        `Storage: adapter=${config.storage.adapter}, region=${config.storage.config.region}, bucket=${config.storage.config.bucket}`
    );
}

function logUploadConfig(config: CmtxConfig, logToChannel: LogFn): void {
    if (!config.upload) return;

    logToChannel('[CMTX] [config] INFO: Upload:');
    logToChannel(
        `[CMTX] [config] INFO:   Image Format: ${config.upload.imageFormat ?? 'markdown'}`
    );
    logToChannel(`[CMTX] [config] INFO:   Batch Limit: ${config.upload.batchLimit ?? 5}`);
    logToChannel(`[CMTX] [config] INFO:   Auto: ${config.upload.auto ?? false}`);
    logToChannel('');
    logger.info(
        `Upload: imageFormat=${config.upload.imageFormat ?? 'markdown'}, batchLimit=${config.upload.batchLimit ?? 5}`
    );
}

function logPresignedUrlsConfig(config: CmtxConfig, logToChannel: LogFn): void {
    if (!config.presignedUrls) return;

    logToChannel('[CMTX] [config] INFO: Presigned URLs:');
    logToChannel(`[CMTX] [config] INFO:   Expire: ${config.presignedUrls.expire ?? 600}s`);
    logToChannel(`[CMTX] [config] INFO:   Max Retry: ${config.presignedUrls.maxRetryCount ?? 3}`);
    logToChannel('');
    logger.info(
        `PresignedURLs: expire=${config.presignedUrls.expire ?? 600}s, maxRetry=${config.presignedUrls.maxRetryCount ?? 3}`
    );
}

function logResizeConfig(config: CmtxConfig, logToChannel: LogFn): void {
    if (!config.resize) return;

    logToChannel('[CMTX] [config] INFO: Resize:');
    if (config.resize.widths?.length) {
        logToChannel(`[CMTX] [config] INFO:   Widths: [${config.resize.widths.join(', ')}]`);
    }
    logToChannel('');
    logger.info(`Resize: widths=[${config.resize.widths?.join(', ') ?? ''}]`);
}

/**
 * Log configuration details to output channel and logger
 */
function logConfigDetails(config: CmtxConfig, outputChannel?: vscode.OutputChannel): void {
    const logToChannel = (message: string) => {
        if (outputChannel) {
            outputChannel.appendLine(message);
        }
    };

    logToChannel('[CMTX] [config] INFO: === Configuration Loaded ===');
    logToChannel(`[CMTX] [config] INFO: Time: ${new Date().toLocaleString()}`);
    logToChannel('');
    logger.info('=== Configuration Loaded ===');
    logger.info(`Version: ${config.version}`);

    logStorageConfig(config, logToChannel);
    logUploadConfig(config, logToChannel);
    logPresignedUrlsConfig(config, logToChannel);
    logResizeConfig(config, logToChannel);

    logToChannel('[CMTX] [config] INFO: ========================');
    logger.info('========================');
}

export async function loadCmtxConfig(
    workspaceFolder: vscode.WorkspaceFolder,
    outputChannel?: vscode.OutputChannel
): Promise<CmtxConfig | undefined> {
    const configPath = getConfigFilePath(workspaceFolder);

    if (!existsSync(configPath)) {
        logger.info(`Config file not found: ${configPath}`);
        return undefined;
    }

    try {
        const content = await readFile(configPath, 'utf-8');
        const config = yaml.load(content) as CmtxConfig;

        // Substitute environment variables
        const substitutedConfig = substituteEnvVarsInObject(config);

        logger.info(`Loaded config from: ${configPath}`);

        // 如果提供了 outputChannel，输出配置日志
        if (outputChannel) {
            logConfigDetails(substitutedConfig, outputChannel);
        }

        return substitutedConfig;
    } catch (error) {
        logger.error(`Failed to load config from ${configPath}:`, error);
        throw new Error(
            `Failed to load CMTX config: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

export async function saveCmtxConfig(
    workspaceFolder: vscode.WorkspaceFolder,
    config: CmtxConfig
): Promise<void> {
    const configDir = getConfigDirPath(workspaceFolder);
    const configPath = join(configDir, 'config.yaml');

    try {
        // Ensure directory exists
        if (!existsSync(configDir)) {
            await mkdir(configDir, { recursive: true });
        }

        const content = yaml.dump(config, {
            indent: 2,
            lineWidth: 120,
            noRefs: true,
            sortKeys: false,
        });

        await writeFile(configPath, content, 'utf-8');
        logger.info(`Saved config to: ${configPath}`);
    } catch (error) {
        logger.error(`Failed to save config to ${configPath}:`, error);
        throw new Error(
            `Failed to save CMTX config: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

export async function ensureCmtxConfig(
    workspaceFolder: vscode.WorkspaceFolder,
    outputChannel?: vscode.OutputChannel
): Promise<CmtxConfig> {
    const existing = await loadCmtxConfig(workspaceFolder, outputChannel);
    if (existing) {
        return existing;
    }

    // Create default config
    await saveCmtxConfig(workspaceFolder, DEFAULT_CONFIG);

    // 输出默认配置日志
    if (outputChannel) {
        logConfigDetails(DEFAULT_CONFIG, outputChannel);
    }

    return DEFAULT_CONFIG;
}

export function getStorageConfig(config: CmtxConfig): CmtxStorageConfig | undefined {
    return config.storage;
}

export function getUploadConfigFromCmtx(config: CmtxConfig): CmtxUploadConfig {
    return {
        imageFormat: config.upload?.imageFormat ?? 'markdown',
        batchLimit: config.upload?.batchLimit ?? 5,
        imageAltTemplate: config.upload?.imageAltTemplate ?? '',
        namingTemplate: config.upload?.namingTemplate ?? '{name}.{ext}',
        auto: config.upload?.auto ?? false,
        keepLocalImages: config.upload?.keepLocalImages ?? true,
    };
}

export function getResizeWidths(config: CmtxConfig): number[] {
    return config.resize?.widths ?? [360, 480, 640, 800, 960, 1200];
}

export function getResizeDomains(config: CmtxConfig): Array<{ domain: string; provider: string }> {
    return config.resize?.domains ?? [];
}

export function getPresignedUrlSettings(
    config: CmtxConfig
): Omit<CmtxPresignedUrlConfig, 'domains'> {
    return {
        expire: config.presignedUrls?.expire ?? 600,
        maxRetryCount: config.presignedUrls?.maxRetryCount ?? 3,
        imageFormat: config.presignedUrls?.imageFormat ?? 'all',
    };
}

export function getPresignedUrlDomains(config: CmtxConfig): CmtxPresignedUrlDomain[] {
    return config.presignedUrls?.domains ?? [];
}

/**
 * 获取 add-section-numbers 规则配置
 */
export function getAddSectionNumbersConfig(config: CmtxConfig): {
    minLevel: number;
    maxLevel: number;
    startLevel: number;
    separator: string;
} {
    const ruleConfig = config.rules?.['add-section-numbers'];
    return {
        minLevel: (ruleConfig?.minLevel as number) ?? 2,
        maxLevel: (ruleConfig?.maxLevel as number) ?? 6,
        startLevel: (ruleConfig?.startLevel as number) ?? 2,
        separator: (ruleConfig?.separator as string) ?? '.',
    };
}

/**
 * 获取 Presets 配置
 */
export function getPresets(config: CmtxConfig): Record<string, PresetValue> {
    return config.presets ?? {};
}

/**
 * 保存 Preset 配置
 */
export async function savePreset(
    workspaceFolder: vscode.WorkspaceFolder,
    presetName: string,
    preset: PresetValue,
    outputChannel?: vscode.OutputChannel
): Promise<void> {
    const config = await ensureCmtxConfig(workspaceFolder, outputChannel);

    config.presets = config.presets ?? {};
    config.presets[presetName] = preset;

    await saveCmtxConfig(workspaceFolder, config);
}

export function getWorkspaceFolderForDocument(
    document: vscode.TextDocument
): vscode.WorkspaceFolder | undefined {
    return vscode.workspace.getWorkspaceFolder(document.uri);
}

export function getCurrentWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        return getWorkspaceFolderForDocument(editor.document);
    }

    // Fallback to first workspace folder
    return vscode.workspace.workspaceFolders?.[0];
}
