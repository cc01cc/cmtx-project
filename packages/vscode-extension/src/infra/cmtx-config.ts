import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import type {
    CmtxConfig,
    CmtxPresignedUrlConfig,
    CmtxPresignedUrlDomain,
    CmtxStorageConfig,
    CmtxUploadConfig,
} from "@cmtx/asset/config";
import {
    ConfigLoader,
    generateDefaultConfig,
    saveConfigToFile,
    substituteEnvVarsInObject,
} from "@cmtx/asset/config";
import type { PresetConfig, RuleConfig } from "@cmtx/publish";
import * as vscode from "vscode";
import { getModuleLogger } from "./unified-logger.js";

const logger = getModuleLogger("cmtx-config");

/**
 * Preset 配置（简洁版或完整版）
 */
export type PresetValue = string[] | PresetConfig;

export function getConfigDirPath(workspaceFolder: vscode.WorkspaceFolder): string {
    const config = vscode.workspace.getConfiguration("cmtx");
    const configDir = config.get<string>("configDir", ".cmtx");

    if (isAbsolute(configDir)) {
        return configDir;
    }

    return join(workspaceFolder.uri.fsPath, configDir);
}

export function getConfigFilePath(workspaceFolder: vscode.WorkspaceFolder): string {
    return join(getConfigDirPath(workspaceFolder), "config.yaml");
}

type LogFn = (message: string) => void;

function logStorageConfig(config: CmtxConfig, logToChannel: LogFn): void {
    if (!config.storages || Object.keys(config.storages).length === 0) return;

    logToChannel("[CMTX] [config] INFO: Storages:");
    for (const [storageId, storage] of Object.entries(config.storages)) {
        logToChannel(`[CMTX] [config] INFO:   [${storageId}]`);
        logToChannel(`[CMTX] [config] INFO:     Adapter: ${storage.adapter}`);
        logToChannel(`[CMTX] [config] INFO:     Region: ${storage.config.region || "(not set)"}`);
        logToChannel(`[CMTX] [config] INFO:     Bucket: ${storage.config.bucket || "(not set)"}`);
        const keyId = storage.config.accessKeyId;
        const keyPreview = keyId ? `${keyId.substring(0, 6)}...${keyId.slice(-4)}` : "not set";
        const keySecret = storage.config.accessKeySecret;
        const secretPreview = keySecret
            ? `${keySecret.substring(0, 4)}...${keySecret.slice(-4)}`
            : "not set";
        logToChannel(`[CMTX] [config] INFO:     Access Key: ${keyPreview}`);
        logToChannel(`[CMTX] [config] INFO:     Access Secret: ${secretPreview}`);
    }
    logToChannel("[CMTX] [config] INFO:   Upload Prefix: " + (config.upload?.prefix || "(none)"));
    logToChannel("");
    const useStorage = config.upload?.useStorage || "default";
    logger.info(`Storages: ${Object.keys(config.storages).join(", ")}, useStorage=${useStorage}`);
}

function logUploadConfig(config: CmtxConfig, logToChannel: LogFn): void {
    if (!config.upload) return;

    logToChannel("[CMTX] [config] INFO: Upload:");
    logToChannel(
        `[CMTX] [config] INFO:   Image Format: ${config.upload.imageFormat ?? "markdown"}`,
    );
    logToChannel(`[CMTX] [config] INFO:   Batch Limit: ${config.upload.batchLimit ?? 5}`);
    logToChannel(`[CMTX] [config] INFO:   Auto: ${config.upload.auto ?? false}`);
    logToChannel("");
    logger.info(
        `Upload: imageFormat=${
            config.upload.imageFormat ?? "markdown"
        }, batchLimit=${config.upload.batchLimit ?? 5}`,
    );
}

function logPresignedUrlsConfig(config: CmtxConfig, logToChannel: LogFn): void {
    if (!config.presignedUrls) return;

    logToChannel("[CMTX] [config] INFO: Presigned URLs:");
    logToChannel(`[CMTX] [config] INFO:   Expire: ${config.presignedUrls.expire ?? 600}s`);
    logToChannel(`[CMTX] [config] INFO:   Max Retry: ${config.presignedUrls.maxRetryCount ?? 3}`);
    logToChannel("");
    logger.info(
        `PresignedURLs: expire=${
            config.presignedUrls.expire ?? 600
        }s, maxRetry=${config.presignedUrls.maxRetryCount ?? 3}`,
    );
}

function logResizeConfig(config: CmtxConfig, logToChannel: LogFn): void {
    if (!config.resize) return;

    logToChannel("[CMTX] [config] INFO: Resize:");
    if (config.resize.widths?.length) {
        logToChannel(`[CMTX] [config] INFO:   Widths: [${config.resize.widths.join(", ")}]`);
    }
    logToChannel("");
    logger.info(`Resize: widths=[${config.resize.widths?.join(", ") ?? ""}]`);
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

    logToChannel("[CMTX] [config] INFO: === Configuration Loaded ===");
    logToChannel(`[CMTX] [config] INFO: Time: ${new Date().toLocaleString()}`);
    logToChannel("");
    logger.info("=== Configuration Loaded ===");
    logger.info(`Version: ${config.version}`);

    logStorageConfig(config, logToChannel);
    logUploadConfig(config, logToChannel);
    logPresignedUrlsConfig(config, logToChannel);
    logResizeConfig(config, logToChannel);

    logToChannel("[CMTX] [config] INFO: ========================");
    logger.info("========================");
}

export async function loadCmtxConfig(
    workspaceFolder: vscode.WorkspaceFolder,
    outputChannel?: vscode.OutputChannel,
): Promise<CmtxConfig | undefined> {
    const configPath = getConfigFilePath(workspaceFolder);

    if (!existsSync(configPath)) {
        logger.info(`Config file not found: ${configPath}`);
        return undefined;
    }

    try {
        const loader = new ConfigLoader();
        const config = await loader.loadFromFile(configPath);
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
            `Failed to load CMTX config: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

export async function saveCmtxConfig(
    workspaceFolder: vscode.WorkspaceFolder,
    config: CmtxConfig,
): Promise<void> {
    const configDir = getConfigDirPath(workspaceFolder);
    const configPath = join(configDir, "config.yaml");

    try {
        // Ensure directory exists
        if (!existsSync(configDir)) {
            await mkdir(configDir, { recursive: true });
        }

        await saveConfigToFile(configPath, config);
        logger.info(`Saved config to: ${configPath}`);
    } catch (error) {
        logger.error(`Failed to save config to ${configPath}:`, error);
        throw new Error(
            `Failed to save CMTX config: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

export async function ensureCmtxConfig(
    workspaceFolder: vscode.WorkspaceFolder,
    outputChannel?: vscode.OutputChannel,
): Promise<CmtxConfig> {
    const existing = await loadCmtxConfig(workspaceFolder, outputChannel);
    if (existing) {
        return existing;
    }

    // Create default config using template from @cmtx/asset
    const defaultConfigContent = generateDefaultConfig();
    const configDir = getConfigDirPath(workspaceFolder);
    const configPath = join(configDir, "config.yaml");

    // Ensure directory exists
    if (!existsSync(configDir)) {
        await mkdir(configDir, { recursive: true });
    }

    await writeFile(configPath, defaultConfigContent, "utf-8");

    // Load and return the config
    const config = await loadCmtxConfig(workspaceFolder, outputChannel);
    return config!;
}

export function getStorageConfig(
    config: CmtxConfig,
    storageId?: string,
): CmtxStorageConfig | undefined {
    const useStorageId = storageId || config.upload?.useStorage || "default";
    return config.storages?.[useStorageId];
}

export function getUploadConfigFromCmtx(config: CmtxConfig): CmtxUploadConfig {
    return {
        imageFormat: config.upload?.imageFormat ?? "markdown",
        batchLimit: config.upload?.batchLimit ?? 5,
        imageAltTemplate: config.upload?.imageAltTemplate ?? "",
        namingTemplate: config.upload?.namingTemplate ?? "{name}.{ext}",
        auto: config.upload?.auto ?? false,
        conflictStrategy: config.upload?.conflictStrategy ?? "skip",
        useStorage: config.upload?.useStorage ?? "default",
        prefix: config.upload?.prefix ?? "",
    };
}

export function getResizeWidths(config: CmtxConfig): number[] {
    return config.resize?.widths ?? [360, 480, 640, 800, 960, 1200];
}

export function getResizeDomains(
    config: CmtxConfig,
): Array<{ domain: string; provider: "aliyun-oss" | "tencent-cos" | "html" }> {
    const domains = config.resize?.domains ?? [];
    return domains.map((d) => ({
        domain: d.domain,
        provider: (d.provider || "html") as "aliyun-oss" | "tencent-cos" | "html",
    }));
}

export function getPresignedUrlSettings(
    config: CmtxConfig,
): Omit<CmtxPresignedUrlConfig, "domains"> {
    return {
        expire: config.presignedUrls?.expire ?? 600,
        maxRetryCount: config.presignedUrls?.maxRetryCount ?? 3,
        imageFormat: config.presignedUrls?.imageFormat ?? "all",
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
    const ruleConfig = config.rules?.["add-section-numbers"];
    return {
        minLevel: (ruleConfig?.minLevel as number) ?? 2,
        maxLevel: (ruleConfig?.maxLevel as number) ?? 6,
        startLevel: (ruleConfig?.startLevel as number) ?? 2,
        separator: (ruleConfig?.separator as string) ?? ".",
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
    outputChannel?: vscode.OutputChannel,
): Promise<void> {
    const config = await ensureCmtxConfig(workspaceFolder, outputChannel);

    config.presets = config.presets ?? {};
    config.presets[presetName] = preset;

    await saveCmtxConfig(workspaceFolder, config);
}

export function getWorkspaceFolderForDocument(
    document: vscode.TextDocument,
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

/**
 * 获取全局 Rules 配置
 */
export function getGlobalRulesConfig(config: CmtxConfig): Record<string, RuleConfig> {
    return config.rules || {};
}

export function setupConfigListener(callback?: () => void): vscode.Disposable {
    const logger = getModuleLogger("config");
    try {
        callback?.();
        return vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("cmtx")) {
                callback?.();
                logger.info("Configuration updated");
            }
        });
    } catch (error) {
        logger.error("Failed to setup config listener:", error);
        return { dispose: () => {} };
    }
}
