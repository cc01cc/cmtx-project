import {
    createRuleEngineContext,
    type RuleContext,
    type RuleEngine,
    type RuleResult,
} from "@cmtx/rule-engine";
import { createUploadService, createDownloadAssetsService } from "@cmtx/asset";
import { dirname } from "node:path";
import * as vscode from "vscode";
import { createStorageAdapterAsync, createVsCodeContainer } from "../../container.js";
import {
    getCurrentWorkspaceFolder,
    getDownloadConfigFromCmtx,
    getGlobalRulesConfig,
    getStorageConfig,
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

    if (config) {
        const storageConfig = getStorageConfig(config);
        if (storageConfig) {
            const adapter = await createStorageAdapterAsync(storageConfig);
            const uploadConfig = getUploadConfigFromCmtx(config);
            const uploadService = createUploadService({
                adapter,
                prefix: (uploadConfig.prefix as string) || "",
                namingTemplate: uploadConfig.namingTemplate as string | undefined,
            });
            container.register(uploadService);

            // 注册 DownloadAssetsService
            const downloadConfig = getDownloadConfigFromCmtx(config);
            const downloadStorageId = downloadConfig.useStorage;
            const downloadStorageConfig =
                downloadStorageId !== "default"
                    ? config.storages?.[downloadStorageId]
                    : storageConfig;

            if (downloadStorageConfig) {
                const downloadAdapter = await createStorageAdapterAsync(downloadStorageConfig);
                const downloadService = createDownloadAssetsService({
                    sourceAdapters: [{ domain: "*", adapter: downloadAdapter }],
                });
                container.register(downloadService);
            }
        }
    }

    return { engine, container };
}

function buildRuleContext(
    editor: vscode.TextEditor,
    _workspaceFolder: vscode.WorkspaceFolder,
    container: ReturnType<typeof createVsCodeContainer>,
): RuleContext {
    return {
        document: editor.document.getText(),
        filePath: editor.document.uri.fsPath,
        baseDirectory: dirname(editor.document.uri.fsPath),
        services: container,
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
            const counterName = (ruleConfig?.counter as { name?: string })?.name || "global";
            (mergedConfig as Record<string, unknown>).getNextCounterValue = async () => {
                return await counterManager.incrementAndGet(counterName);
            };
        }

        const context = buildRuleContext(editor, workspaceFolder, container);

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

        const context = buildRuleContext(editor, workspaceFolder, container);

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
