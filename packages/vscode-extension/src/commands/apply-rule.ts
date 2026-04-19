/**
 * 应用单个 Rule 命令
 *
 * @module apply-rule
 * @description
 * 提供应用单个 Rule 到 Markdown 文档的命令。
 */

import type { RuleEngine } from '@cmtx/publish';
import { builtInRules, createRuleEngine, type RuleContext } from '@cmtx/publish';
import * as vscode from 'vscode';
import { showError, showInfo, validateMarkdownEditor } from '../infra/editor';
import { getLogger } from '../infra/logger';

const logger = getLogger('apply-rule');

/**
 * 应用单个 Rule 到当前文档
 */
export async function applyRule(): Promise<void> {
    const editor = validateMarkdownEditor();
    if (!editor) {
        showError('Please open a Markdown file first');
        return;
    }

    try {
        // 创建 Rule 引擎并注册内置 Rules
        const engine = createRuleEngine();
        engine.registerMany(builtInRules);

        // 获取所有 Rule ID
        const ruleIds = engine.getAllRuleIds();

        // 显示 Rule 选择
        const ruleItems = ruleIds.map((id) => {
            const rule = engine.getRule(id);
            return {
                label: rule?.name || id,
                description: rule?.description,
                id,
            };
        });

        const selected = await vscode.window.showQuickPick(ruleItems, {
            placeHolder: 'Select a rule to apply',
            title: 'Apply Rule',
        });

        if (!selected) {
            showInfo('Cancelled');
            return;
        }

        // 执行 Rule
        await executeRule(editor, selected.id, engine);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Failed to apply rule:', error);
        showError(`Failed to apply rule: ${message}`);
    }
}

/**
 * 执行 Rule
 */
async function executeRule(
    editor: vscode.TextEditor,
    ruleId: string,
    engine: RuleEngine
): Promise<void> {
    const document = editor.document;
    const filePath = document.uri.fsPath;
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Applying rule: ${ruleId}...`,
            cancellable: false,
        },
        async () => {
            // 构建 Rule 上下文
            const context: RuleContext = {
                document: document.getText(),
                filePath,
            };

            // 执行 Rule
            const result = await engine.executeRule(ruleId, context);

            // 应用变更
            if (result.modified && result.content !== document.getText()) {
                const edit = new vscode.WorkspaceEdit();
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );
                edit.replace(document.uri, fullRange, result.content);
                await vscode.workspace.applyEdit(edit);
            }

            // 显示结果
            const messages = result.messages?.join('; ') || 'No changes';
            showInfo(`Rule applied: ${messages}`);
        }
    );
}
