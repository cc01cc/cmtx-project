import * as vscode from 'vscode';

export function validateEditor(languageId?: string): vscode.TextEditor | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return undefined;
    }

    if (languageId && editor.document.languageId !== languageId) {
        return undefined;
    }

    return editor;
}

export function validateMarkdownEditor(): vscode.TextEditor | undefined {
    return validateEditor('markdown');
}

export async function applyDocumentChanges(
    document: vscode.TextDocument,
    text: string,
    newText: string,
    hasChanges: boolean,
    token: vscode.CancellationToken
): Promise<void> {
    if (hasChanges && !token.isCancellationRequested) {
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );
        edit.replace(document.uri, fullRange, newText);
        await vscode.workspace.applyEdit(edit);
    }
}

export async function applyEditsIfNeeded(
    document: vscode.TextDocument,
    edits: vscode.TextEdit[],
    hasChanges: boolean,
    token: vscode.CancellationToken
): Promise<void> {
    if (hasChanges && edits.length > 0 && !token.isCancellationRequested) {
        const edit = new vscode.WorkspaceEdit();
        for (const e of edits) {
            edit.replace(document.uri, e.range, e.newText);
        }
        await vscode.workspace.applyEdit(edit);
    }
}

export function showError(message: string): void {
    vscode.window.showErrorMessage(message);
}

export function showInfo(message: string): void {
    vscode.window.showInformationMessage(message);
}

export function showWarning(message: string): void {
    vscode.window.showWarningMessage(message);
}

export async function confirm(message: string, confirmLabel = 'Yes'): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(message, confirmLabel, 'Cancel');
    return result === confirmLabel;
}
