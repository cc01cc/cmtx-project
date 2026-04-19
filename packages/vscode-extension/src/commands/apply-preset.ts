/**
 * 应用 Preset 命令
 *
 * @module apply-preset
 * @description
 * 提供应用 Preset 到 Markdown 文档的命令。
 */

import {
    builtInRules,
    createRuleEngine,
    type PresetConfig,
    type RuleContext,
    type SimplePreset,
} from '@cmtx/publish';
import * as vscode from 'vscode';
import {
    getCurrentWorkspaceFolder,
    getPresets,
    loadCmtxConfig,
    type PresetValue,
} from '../infra/cmtx-config';
import { showError, showInfo, validateMarkdownEditor } from '../infra/editor';
import { getLogger } from '../infra/logger';

const logger = getLogger('apply-preset');

/**
 * 应用 Preset 到当前文档
 */
export async function applyPreset(): Promise<void> {
    const editor = validateMarkdownEditor();
    if (!editor) {
        showError('Please open a Markdown file first');
        return;
    }

    const workspaceFolder = getCurrentWorkspaceFolder();
    if (!workspaceFolder) {
        showError('Please open a workspace folder');
        return;
    }

    try {
        // 加载配置
        const config = await loadCmtxConfig(workspaceFolder);
        const presets = config ? getPresets(config) : {};

        if (Object.keys(presets).length === 0) {
            showError('No presets configured. Please configure presets in .cmtx/config.yaml');
            return;
        }

        // 显示 Preset 选择
        const presetItems = Object.entries(presets).map(([key, preset]) => {
            const name = typeof preset === 'object' && !Array.isArray(preset) ? preset.name : key;
            const description =
                typeof preset === 'object' && !Array.isArray(preset)
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
            placeHolder: 'Select a preset to apply',
            title: 'Apply Preset',
        });

        if (!selected) {
            showInfo('Cancelled');
            return;
        }

        // 创建 Rule 引擎并注册内置 Rules
        const engine = createRuleEngine();
        engine.registerMany(builtInRules);

        // 执行 Preset
        await executePreset(editor, selected.key, selected.preset, engine);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Failed to apply preset:', error);
        showError(`Failed to apply preset: ${message}`);
    }
}

import type { RuleEngine } from '@cmtx/publish';

/**
 * 执行 Preset
 */
async function executePreset(
    editor: vscode.TextEditor,
    presetName: string,
    preset: PresetValue,
    engine: RuleEngine
): Promise<void> {
    const document = editor.document;
    const filePath = document.uri.fsPath;
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Applying preset: ${presetName}...`,
            cancellable: false,
        },
        async () => {
            // 构建 Rule 上下文
            const context: RuleContext = {
                document: document.getText(),
                filePath,
            };

            // 执行 Preset
            const result = await engine.executePreset(
                preset as PresetConfig | SimplePreset,
                context
            );

            // 应用变更
            if (result.content !== document.getText()) {
                const edit = new vscode.WorkspaceEdit();
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );
                edit.replace(document.uri, fullRange, result.content);
                await vscode.workspace.applyEdit(edit);
            }

            // 显示结果
            const modifiedRules = result.results.filter((r) => r.result.modified);
            showInfo(
                `Preset applied: ${modifiedRules.length}/${result.results.length} rules modified`
            );
        }
    );
}
