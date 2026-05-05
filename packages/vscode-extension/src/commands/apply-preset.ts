/**
 * 应用 Preset 命令
 *
 * @module apply-preset
 * @description
 * 提供应用 Preset 到 Markdown 文档的命令。
 */
import {
    createRuleEngineContext,
    type PresetConfig,
    type RuleContext,
    type RuleEngine,
    type SimplePreset,
} from "@cmtx/rule-engine";
import { createUploadService } from "@cmtx/asset";
import * as vscode from "vscode";
import { createStorageAdapterAsync, createVsCodeContainer } from "../container.js";
import {
    getCurrentWorkspaceFolder,
    getPresets,
    getStorageConfig,
    getUploadConfigFromCmtx,
    loadCmtxConfig,
    type PresetValue,
} from "../infra/cmtx-config.js";
import { validateMarkdownEditor } from "../infra/editor.js";
import { showError, showInfo } from "../infra/notification.js";
import { getModuleLogger } from "../infra/unified-logger.js";
import { CounterManager } from "../utils/counter-manager.js";

const logger = getModuleLogger("apply-preset");

/**
 * 应用 Preset 到当前文档
 */
export async function applyPreset(): Promise<void> {
    const editor = validateMarkdownEditor();
    if (!editor) {
        await showError("Please open a Markdown file first");
        return;
    }

    const workspaceFolder = getCurrentWorkspaceFolder();
    if (!workspaceFolder) {
        await showError("Please open a workspace folder");
        return;
    }

    try {
        // 加载配置
        const config = await loadCmtxConfig(workspaceFolder);
        const presets = config ? getPresets(config) : {};

        if (Object.keys(presets).length === 0) {
            await showError("No presets configured. Please configure presets in .cmtx/config.yaml");
            return;
        }

        // 显示 Preset 选择
        const presetItems = Object.entries(presets).map(([key, preset]) => {
            const name = typeof preset === "object" && !Array.isArray(preset) ? preset.name : key;
            const description =
                typeof preset === "object" && !Array.isArray(preset)
                    ? preset.description
                    : undefined;

            return {
                label: name || key,
                description,
                key,
                preset,
            };
        });

        const selected = await vscode.window.showQuickPick(presetItems, {
            placeHolder: "Select a preset to apply",
            title: "Apply Preset",
        });

        if (!selected) {
            await showInfo("Cancelled");
            return;
        }

        // 创建 Rule 引擎并加载内置 Rules
        const { engine } = createRuleEngineContext();

        // 执行 Preset
        await executePreset({
            editor,
            presetName: selected.key,
            preset: selected.preset,
            engine,
            workspaceFolder,
            config,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Failed to apply preset:", error);
        await showError(`Failed to apply preset: ${message}`);
    }
}

interface ExecutePresetOptions {
    editor: vscode.TextEditor;
    presetName: string;
    preset: PresetValue;
    engine: RuleEngine;
    workspaceFolder: vscode.WorkspaceFolder;
    config: Awaited<ReturnType<typeof loadCmtxConfig>>;
}

/**
 * 执行 Preset
 */
async function executePreset(options: ExecutePresetOptions): Promise<void> {
    const { editor, presetName, preset, engine, workspaceFolder, config } = options;
    const document = editor.document;
    const filePath = document.uri.fsPath;

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Applying preset: ${presetName}...`,
            cancellable: false,
        },
        async () => {
            // 使用 Composition Root 创建服务容器
            const container = createVsCodeContainer(workspaceFolder, config ?? null);

            // 注册存储服务（如果配置了）
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
                }
            }

            // 检查是否需要计数器服务
            const needCounter =
                typeof preset === "object" &&
                "steps" in preset &&
                preset.steps.some((s) => s.id === "frontmatter-id");

            // 为 frontmatter-id 规则准备计数器回调（在规则内部验证通过后才递增）
            if (needCounter) {
                const counterManager = new CounterManager(workspaceFolder.uri.fsPath);
                const counterName = "global";
                (preset as unknown as Record<string, unknown>).getNextCounterValue = async () => {
                    return await counterManager.incrementAndGet(counterName);
                };
            }

            // 构建 Rule 上下文
            const context: RuleContext = {
                document: document.getText(),
                filePath,
                baseDirectory: workspaceFolder.uri.fsPath,
                services: container,
            };

            // 执行 Preset
            const result = await engine.executePreset(
                preset as PresetConfig | SimplePreset,
                context,
            );

            // 应用变更
            if (result.content !== document.getText()) {
                const edit = new vscode.WorkspaceEdit();
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length),
                );
                edit.replace(document.uri, fullRange, result.content);
                await vscode.workspace.applyEdit(edit);
            }

            // 显示结果
            const modifiedRules = result.results.filter((r) => r.result.modified);
            await showInfo(
                `Preset applied: ${modifiedRules.length}/${result.results.length} rules modified`,
            );
        },
    );
}
