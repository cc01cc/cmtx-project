import * as vscode from 'vscode';
import { clearPresignedCache } from '../providers/markdown-preview';

export async function clearPresignedCacheCommand(): Promise<void> {
    clearPresignedCache();

    await vscode.commands.executeCommand('markdown.preview.refresh');

    vscode.window.showInformationMessage('Presigned URL cache cleared. Preview refreshing...');
}
