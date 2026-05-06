import type { Service } from "@cmtx/asset";
import {
    createRuleEngineContext,
    type RuleContext,
    type RuleEngine,
    type RuleResult,
} from "@cmtx/rule-engine";
import {
    createUploadService,
    createDownloadAssetsService,
    createTransferAssetsService,
} from "@cmtx/asset";
import { dirname } from "node:path";
import * as vscode from "vscode";
import { createStorageAdapterAsync, createVsCodeContainer } from "../../container.js";
import {
    getCurrentWorkspaceFolder,
    getDownloadConfigFromCmtx,
    getGlobalRulesConfig,
    getStorageConfig,
    getTransferConfigFromCmtx,
    getUploadConfigFromCmtx,
    loadCmtxConfig,
} from "../../infra/cmtx-config.js";
import { showError, showInfo } from "../../infra/notification.js";
import { getModuleLogger } from "../../infra/unified-logger.js";
import { CounterManager } from "../../utils/counter-manager.js";

const logger = getModuleLogger("execute-rule");

interface ValidatedEditor {
    editor: vscode.TextEditor;
    workspaceFolder: vscode.WorkspaceFolder;
}

interface RuleEngineServices {
    engine: RuleEngine;
    container: ReturnType<typeof createVsCodeContainer>;
}

function validateMarkdownEditor(): ValidatedEditor | null {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        void showError("No active editor");
        return null;
    }

    if (editor.document.languageId !== "markdown") {
        void showError("This command only works with Markdown files");
        return null;
    }

    const workspaceFolder = getCurrentWorkspaceFolder();
    if (!workspaceFolder) {
        void showError("Please open a workspace folder");
        return null;
    }

    return { editor, workspaceFolder };
}

async function setupRuleEngineServices(
    config: Awaited<ReturnType<typeof loadCmtxConfig>>,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<RuleEngineServices> {
    const { engine } = createRuleEngineContext();
    const container = createVsCodeContainer(workspaceFolder, config ?? null);

    if (!config) {
        return { engine, container };
    }

    const storageConfig = getStorageConfig(config);
    if (!storageConfig) {
        return { engine, container };
    }

    const storageAdapter = await createStorageAdapterAsync(storageConfig);

    await setupUploadService(container, config, storageAdapter, storageConfig);
    await setupDownloadService(container, config, storageConfig);
    await setupTransferService(container, config, storageConfig);

    const aiConfig = config.ai as { models?: Record<string, unknown> } | undefined;
    const aiModels = aiConfig?.models;
    if (aiModels) {
        const modelKeys = Object.keys(aiModels);
        logger.debug(`[setupRuleEngineServices] 发现 AI 模型配置: ${modelKeys.join(", ")}`);
        container.register({
            id: "aiService",
            getModelConfig: (id: string) => {
                const cfg = aiModels[id] ?? undefined;
                logger.debug(
                    `[setupRuleEngineServices/getModelConfig] id="${id}" -> ${cfg ? "找到" : "未找到"}`,
                );
                return cfg;
            },
        } as Service);
        logger.debug("[setupRuleEngineServices] aiService 已注册到容器");
    } else {
        logger.debug(
            "[setupRuleEngineServices] 未找到 AI 模型配置 (config.ai 或 config.ai.models 为空)",
        );
    }

    return { engine, container };
}

function resolveStorageConfig(
    config: NonNullable<Awaited<ReturnType<typeof loadCmtxConfig>>>,
    useStorage: string | undefined,
    fallback: NonNullable<ReturnType<typeof getStorageConfig>>,
): NonNullable<ReturnType<typeof getStorageConfig>> | null {
    if (!useStorage || useStorage === "default") {
        return fallback;
    }
    return config.storages?.[useStorage] ?? null;
}

async function setupUploadService(
    container: ReturnType<typeof createVsCodeContainer>,
    config: NonNullable<Awaited<ReturnType<typeof loadCmtxConfig>>>,
    adapter: Awaited<ReturnType<typeof createStorageAdapterAsync>>,
    _storageConfig: NonNullable<ReturnType<typeof getStorageConfig>>,
): Promise<void> {
    const uploadConfig = getUploadConfigFromCmtx(config);
    const uploadService = createUploadService({
        adapter,
        prefix: (uploadConfig.prefix as string) || "",
        namingTemplate: uploadConfig.namingTemplate as string | undefined,
        domain: (uploadConfig.domain as string) || undefined,
    });
    container.register(uploadService);
}

async function setupDownloadService(
    container: ReturnType<typeof createVsCodeContainer>,
    config: NonNullable<Awaited<ReturnType<typeof loadCmtxConfig>>>,
    storageConfig: NonNullable<ReturnType<typeof getStorageConfig>>,
): Promise<void> {
    const downloadConfig = getDownloadConfigFromCmtx(config);
    const downloadStorageConfig = resolveStorageConfig(
        config,
        downloadConfig.useStorage,
        storageConfig,
    );
    if (!downloadStorageConfig) {
        return;
    }

    const downloadAdapter = await createStorageAdapterAsync(downloadStorageConfig);
    const downloadService = createDownloadAssetsService({
        sourceAdapters: [{ domain: "*", adapter: downloadAdapter }],
    });
    container.register(downloadService);
}

async function setupTransferService(
    container: ReturnType<typeof createVsCodeContainer>,
    config: NonNullable<Awaited<ReturnType<typeof loadCmtxConfig>>>,
    storageConfig: NonNullable<ReturnType<typeof getStorageConfig>>,
): Promise<void> {
    const transferConfig = getTransferConfigFromCmtx(config);
    const targetStorageConfig = resolveStorageConfig(
        config,
        transferConfig.targetStorage.useStorage,
        storageConfig,
    );
    if (!targetStorageConfig) {
        return;
    }

    const sourceAdapters: Array<{
        domain: string;
        adapter: Awaited<ReturnType<typeof createStorageAdapterAsync>>;
    }> = [];
    for (const src of transferConfig.sourceStorages) {
        const srcCfg = resolveStorageConfig(config, src.useStorage, storageConfig);
        if (srcCfg) {
            const adapter = await createStorageAdapterAsync(srcCfg);
            sourceAdapters.push({ domain: src.domain || "*", adapter });
        }
    }
    if (sourceAdapters.length === 0) {
        const defaultAdapter = await createStorageAdapterAsync(targetStorageConfig);
        sourceAdapters.push({ domain: "*", adapter: defaultAdapter });
    }

    const targetAdapter = await createStorageAdapterAsync(targetStorageConfig);
    const transferService = createTransferAssetsService({
        sourceAdapters,
        targetAdapter,
        targetDomain: transferConfig.targetStorage.domain || undefined,
        targetPrefix: transferConfig.prefix || "",
        namingTemplate: transferConfig.namingTemplate,
    });
    container.register(transferService);
}

function buildRuleContext(
    editor: vscode.TextEditor,
    _workspaceFolder: vscode.WorkspaceFolder,
    container: ReturnType<typeof createVsCodeContainer>,
    ruleLogger?: ReturnType<typeof getModuleLogger>,
): RuleContext {
    return {
        document: editor.document.getText(),
        filePath: editor.document.uri.fsPath,
        baseDirectory: dirname(editor.document.uri.fsPath),
        services: container,
        logger: ruleLogger,
    };
}

function applyDocumentEdit(
    editor: vscode.TextEditor,
    newContent: string,
    currentContent?: string,
): void {
    if (newContent === (currentContent ?? editor.document.getText())) {
        return;
    }

    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
        editor.document.positionAt(0),
        editor.document.positionAt(editor.document.getText().length),
    );
    edit.replace(editor.document.uri, fullRange, newContent);
    void vscode.workspace.applyEdit(edit);
}

function resolveConflictStrategy(uploadConfig: Record<string, unknown>): Record<string, unknown> {
    const strategy = (uploadConfig.conflictStrategy as string) ?? "skip";
    if (strategy === "overwrite") {
        return { type: "replace-all" };
    }
    return { type: "skip-all" };
}

async function executeRuleWithProgress(
    engine: RuleEngine,
    ruleId: string,
    context: RuleContext,
    config: Record<string, unknown>,
    editor: vscode.TextEditor,
): Promise<RuleResult> {
    return await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Executing rule: ${ruleId}...`,
            cancellable: false,
        },
        async () => {
            const result = await engine.executeRule(ruleId, context, config);
            applyDocumentEdit(editor, result.content, editor.document.getText());
            return result;
        },
    );
}

function notifyRuleCompletion(ruleId: string, result: RuleResult): void {
    const messages = result.messages || [];
    if (messages.length > 0) {
        const message = messages.join("; ");
        logger.info(`[Rule:${ruleId}] ${message}`);
        void showInfo(message);
    } else {
        const defaultMsg = `Rule "${ruleId}" executed successfully`;
        logger.info(`[Rule:${ruleId}] ${defaultMsg}`);
        void showInfo(defaultMsg);
    }
}

export async function executeRuleCommand(
    ruleId: string,
    ruleConfig?: Record<string, unknown>,
): Promise<void> {
    const validated = validateMarkdownEditor();
    if (!validated) {
        return;
    }

    const { editor, workspaceFolder } = validated;

    try {
        const config = await loadCmtxConfig(workspaceFolder);
        const globalRulesConfig = config ? getGlobalRulesConfig(config) : {};
        const ruleDefaultConfig = globalRulesConfig[ruleId] || {};
        const mergedConfig = { ...ruleDefaultConfig, ...ruleConfig };

        const { engine, container } = await setupRuleEngineServices(config, workspaceFolder);

        if (ruleId === "frontmatter-id") {
            const counterManager = new CounterManager(workspaceFolder.uri.fsPath);
            (mergedConfig as Record<string, unknown>).peekCounterValue = async (
                counterId: string,
            ) => {
                return await counterManager.get(counterId);
            };
            (mergedConfig as Record<string, unknown>).commitCounterValue = async (
                counterId: string,
            ) => {
                await counterManager.incrementAndGet(counterId);
            };
        }

        const context = buildRuleContext(editor, workspaceFolder, container, logger);

        if (ruleId === "upload-images") {
            const uploadConfig = config ? getUploadConfigFromCmtx(config) : {};
            const strategyConfig = resolveConflictStrategy(uploadConfig);
            (context as Record<string, unknown>).conflictStrategy = strategyConfig;
            (mergedConfig as Record<string, unknown>).conflictStrategy = strategyConfig;
        }

        const result = await executeRuleWithProgress(engine, ruleId, context, mergedConfig, editor);
        notifyRuleCompletion(ruleId, result);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to execute rule ${ruleId}:`, error);
        await showError(`Failed to execute rule "${ruleId}": ${message}`);
    }
}

export async function executePresetCommand(presetId: string): Promise<void> {
    const validated = validateMarkdownEditor();
    if (!validated) {
        return;
    }

    const { editor, workspaceFolder } = validated;

    try {
        const config = await loadCmtxConfig(workspaceFolder);
        if (!config?.presets?.[presetId]) {
            await showError(`Preset "${presetId}" not found in configuration`);
            return;
        }

        const preset = config.presets[presetId];
        const { engine, container } = await setupRuleEngineServices(config, workspaceFolder);

        const needCounter =
            typeof preset === "object" &&
            "steps" in preset &&
            preset.steps.some((s) => s.id === "frontmatter-id");

        if (needCounter) {
            const counterManager = new CounterManager(workspaceFolder.uri.fsPath);
            (preset as unknown as Record<string, unknown>).getNextCounterValue = async () => {
                return await counterManager.incrementAndGet("global");
            };
        }

        const context = buildRuleContext(editor, workspaceFolder, container, logger);

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Applying preset: ${presetId}...`,
                cancellable: false,
            },
            async () => {
                const result = await engine.executePreset(preset, context);
                applyDocumentEdit(editor, result.content, editor.document.getText());

                const modifiedRules = result.results.filter((r) => r.result.modified);
                await showInfo(
                    `Preset "${presetId}" applied: ${modifiedRules.length}/${result.results.length} rules modified`,
                );
            },
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to apply preset ${presetId}:`, error);
        await showError(`Failed to apply preset "${presetId}": ${message}`);
    }
}

export async function transferImagesRuleCommand(): Promise<void> {
    await executeRuleCommand("transfer-images", {
        transfer: true,
    });
}
