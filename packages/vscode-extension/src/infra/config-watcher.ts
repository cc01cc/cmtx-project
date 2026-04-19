import * as vscode from 'vscode';
import { getCurrentWorkspaceFolder, loadCmtxConfig } from './cmtx-config';
import { getLogger } from './logger';

const logger = getLogger('config-watcher');

// Shared output channel - set by extension.ts
let sharedOutputChannel: vscode.OutputChannel | undefined;

/**
 * Set the shared output channel from extension.ts
 */
export function setOutputChannel(channel: vscode.OutputChannel): void {
    sharedOutputChannel = channel;
}

/**
 * Create a file system watcher for .cmtx/config.yaml
 * Notifies user when config changes (requires window reload to apply)
 */
export function createConfigWatcher(context: vscode.ExtensionContext): vscode.Disposable {
    const workspaceFolder = getCurrentWorkspaceFolder();
    if (!workspaceFolder) {
        logger.info('No workspace folder, skipping config watcher');
        return { dispose: () => {} };
    }

    // Create pattern for .cmtx/config.yaml
    const configPattern = new vscode.RelativePattern(workspaceFolder, '.cmtx/config.yaml');

    logger.info(`Creating config watcher for: ${configPattern.pattern}`);

    const watcher = vscode.workspace.createFileSystemWatcher(configPattern);

    // Handle file changes - notify user to reload
    watcher.onDidChange(async (uri) => {
        logger.info(`Config file changed: ${uri.fsPath}`);
        await notifyConfigChanged();
    });

    // Handle file creation - notify user to reload
    watcher.onDidCreate(async (uri) => {
        logger.info(`Config file created: ${uri.fsPath}`);
        await notifyConfigChanged();
    });

    // Handle file deletion - just log
    watcher.onDidDelete((uri) => {
        logger.info(`Config file deleted: ${uri.fsPath}`);
    });

    // Register to context for auto-disposal
    context.subscriptions.push(watcher);

    logger.info('Config watcher created successfully');

    return watcher;
}

/**
 * Notify user that config has changed and needs reload
 */
async function notifyConfigChanged(): Promise<void> {
    const action = await vscode.window.showQuickPick(['立即重载窗口', '稍后手动重载'], {
        placeHolder: 'CMTX 配置文件已修改，需要重新加载窗口才能生效',
        ignoreFocusOut: true,
    });
    if (action === '立即重载窗口') {
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
}

/**
 * Load config from disk (no caching)
 */
export async function loadConfig(
    workspaceFolder: vscode.WorkspaceFolder
): Promise<Awaited<ReturnType<typeof loadCmtxConfig>>> {
    try {
        const config = await loadCmtxConfig(workspaceFolder, sharedOutputChannel);
        return config;
    } catch (error) {
        logger.error('Failed to load config:', error);
        return undefined;
    }
}

/**
 * Manual refresh command handler - notifies user to reload window
 */
export async function refreshConfig(): Promise<void> {
    const workspaceFolder = getCurrentWorkspaceFolder();
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('Please open a workspace folder first');
        return;
    }

    try {
        // Load config to validate it
        const config = await loadCmtxConfig(workspaceFolder, sharedOutputChannel);
        if (config) {
            // Notify user to reload
            const action = await vscode.window.showQuickPick(['立即重载窗口', '稍后手动重载'], {
                placeHolder: 'CMTX 配置已刷新，需要重新加载窗口才能生效',
                ignoreFocusOut: true,
            });
            if (action === '立即重载窗口') {
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Failed to refresh config:', error);
        vscode.window.showErrorMessage(`Failed to refresh CMTX config: ${message}`);
    }
}
