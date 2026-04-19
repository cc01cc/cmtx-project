/**
 * 章节编号命令模块
 *
 * @module section-numbers
 * @description
 * 提供 VS Code 命令实现，用于添加、更新和移除 Markdown 文档的章节编号。
 *
 * @remarks
 * ## 参考
 *
 * 本模块的实现参考了 Markdown All in One 扩展的设计：
 * - 仓库: https://github.com/yzhang-gh/vscode-markdown
 * - 版本: v3.6.3
 * - License: MIT License
 */

import { addSectionNumbers, removeSectionNumbers } from '@cmtx/core';
import * as vscode from 'vscode';
import { ensureCmtxConfig, getAddSectionNumbersConfig } from '../infra/cmtx-config';

/**
 * 为当前文档添加/更新章节编号
 *
 * @remarks
 * 该命令会：
 * 1. 获取当前活动的文本编辑器
 * 2. 检查是否为 Markdown 文档
 * 3. 调用 addSectionNumbers 函数添加编号
 * 4. 使用 WorkspaceEdit 批量应用修改
 *
 * @public
 * @category 命令
 */
export async function addSectionNumbersCommand(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    // 检查是否为 Markdown 文档
    if (editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('This command only works with Markdown files');
        return;
    }

    const document = editor.document;
    const content = document.getText();

    try {
        // 读取配置
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        let sectionNumberOptions = {};
        if (workspaceFolder) {
            const config = await ensureCmtxConfig(workspaceFolder);
            sectionNumberOptions = getAddSectionNumbersConfig(config);
        }

        const result = addSectionNumbers(content, sectionNumberOptions);

        if (!result.modified) {
            vscode.window.showInformationMessage('No headings found to number');
            return;
        }

        // 使用 WorkspaceEdit 批量应用修改
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(content.length)
        );
        edit.replace(document.uri, fullRange, result.content);

        await vscode.workspace.applyEdit(edit);
        await document.save();

        vscode.window.showInformationMessage(
            `Added section numbers to ${result.headingsCount} headings`
        );
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to add section numbers: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * 移除当前文档的章节编号
 *
 * @remarks
 * 该命令会：
 * 1. 获取当前活动的文本编辑器
 * 2. 检查是否为 Markdown 文档
 * 3. 调用 removeSectionNumbers 函数移除编号
 * 4. 使用 WorkspaceEdit 批量应用修改
 *
 * @public
 * @category 命令
 */
export async function removeSectionNumbersCommand(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
    }

    // 检查是否为 Markdown 文档
    if (editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('This command only works with Markdown files');
        return;
    }

    const document = editor.document;
    const content = document.getText();

    try {
        const result = removeSectionNumbers(content);

        if (!result.modified) {
            vscode.window.showInformationMessage('No section numbers found to remove');
            return;
        }

        // 使用 WorkspaceEdit 批量应用修改
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(content.length)
        );
        edit.replace(document.uri, fullRange, result.content);

        await vscode.workspace.applyEdit(edit);
        await document.save();

        vscode.window.showInformationMessage(
            `Removed section numbers from ${result.headingsCount} headings`
        );
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to remove section numbers: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}
