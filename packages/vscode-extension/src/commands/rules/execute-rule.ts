import { createAssetService, createDefaultRuleEngine, type RuleContext } from "@cmtx/publish";
import * as vscode from "vscode";
import { createStorageAdapterAsync, createVsCodeContainer } from "../../container.js";
import {
    getCurrentWorkspaceFolder,
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
    engine: ReturnType<typeof createDefaultRuleEngine>;
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
    const engine = createDefaultRuleEngine();
    const container = createVsCodeContainer(workspaceFolder, config ?? null);

    if (config) {
        const storageConfig = getStorageConfig(config);
        if (storageConfig) {
            const adapter = await createStorageAdapterAsync(storageConfig);
            const uploadConfig = getUploadConfigFromCmtx(config);
            const assetService = createAssetService({
                adapter,
                prefix: uploadConfig.prefix || "",
                namingTemplate: uploadConfig.namingTemplate,
            });
            container.register(assetService);
        }
    }

    return { engine, container };
}

function buildRuleContext(
    editor: vscode.TextEditor,
    workspaceFolder: vscode.WorkspaceFolder,
    container: ReturnType<typeof createVsCodeContainer>,
): RuleContext {
    return {
        document: editor.document.getText(),
        filePath: editor.document.uri.fsPath,
        baseDirectory: workspaceFolder.uri.fsPath,
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
            const configConflictStrategy = uploadConfig.conflictStrategy ?? "skip";

            let strategyConfig: Record<string, unknown> = {};
            if (configConflictStrategy === "skip") {
                strategyConfig = { type: "skip-all" };
            } else if (configConflictStrategy === "overwrite") {
                strategyConfig = { type: "replace-all" };
            }

            if (Object.keys(strategyConfig).length > 0) {
                (context as Record<string, unknown>).conflictStrategy = strategyConfig;
                (mergedConfig as Record<string, unknown>).conflictStrategy = strategyConfig;
            }
        }

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Executing rule: ${ruleId}...`,
                cancellable: false,
            },
            async () => {
                const result = await engine.executeRule(ruleId, context, mergedConfig);
                applyDocumentEdit(editor, result.content, editor.document.getText());

                const messages = result.messages || [];
                if (messages.length > 0) {
                    const message = messages.join("; ");
                    logger.info(`[Rule:${ruleId}] ${message}`);
                } else {
                    logger.info(`[Rule:${ruleId}] Rule "${ruleId}" executed successfully`);
                }
            },
        );
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
