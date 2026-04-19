import * as fs from 'node:fs';
import * as path from 'node:path';
import { initLogger } from '@cmtx/core';
import { loadWASM } from '@cmtx/fpe-wasm';
import type MarkdownIt from 'markdown-it';
import * as vscode from 'vscode';
import {
    addSectionNumbersCommand,
    analyzeDocument,
    applyPreset,
    applyRule,
    clearPresignedCacheCommand,
    deleteImage,
    downloadImages,
    editConfig,
    findImageReferences,
    formatToHtml,
    formatToMarkdown,
    initConfig,
    openConfigUI,
    removeSectionNumbersCommand,
    setImageWidth,
    uploadAllImages,
    uploadSelectedImages,
    zoomIn,
    zoomOut,
} from './commands';
import {
    getPresignedUrlConfig,
    setConfigWatcherOutputChannel,
    setOutputChannel,
    setupConfigListener,
} from './infra';
import { getCurrentWorkspaceFolder, loadCmtxConfig } from './infra/cmtx-config';
import { createConfigWatcher, refreshConfig } from './infra/config-watcher';
import { ImageCodeActionProvider, StatusBarController } from './providers';
import {
    deactivatePresignedUrl,
    extendMarkdownIt,
    initializePresignedUrl,
} from './providers/markdown-preview';

export async function activate(
    context: vscode.ExtensionContext
): Promise<{ extendMarkdownIt(md: MarkdownIt): MarkdownIt }> {
    // 初始化 logger，启用 Console 输出
    // 由于 @cmtx/core 的 logger 默认静默，这里需要显式启用
    initLogger({ silent: false });

    const outputChannel = vscode.window.createOutputChannel('CMTX');
    context.subscriptions.push(outputChannel);

    setOutputChannel(outputChannel);
    setConfigWatcherOutputChannel(outputChannel);

    // 加载 WASM（VS Code extension 使用 CJS bundle，import.meta.url 不可用）
    await loadWasmExtension(context, outputChannel);

    // 加载配置并输出配置日志（如果存在）
    const workspaceFolder = getCurrentWorkspaceFolder();
    if (workspaceFolder) {
        try {
            await loadCmtxConfig(workspaceFolder, outputChannel);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            outputChannel.appendLine(`Failed to load CMTX config: ${message}`);
            outputChannel.appendLine(
                'Extension will continue with default settings. Some features may be unavailable.'
            );
        }
    } else {
        outputChannel.appendLine(
            'No workspace folder detected. Extension will continue without workspace-specific configuration.'
        );
    }

    const configListener = setupConfigListener();
    context.subscriptions.push(configListener);

    const statusBar = new StatusBarController();
    context.subscriptions.push(statusBar);

    context.subscriptions.push(
        vscode.commands.registerCommand('cmtx.upload', uploadAllImages),
        vscode.commands.registerCommand('cmtx.uploadSelected', uploadSelectedImages),
        vscode.commands.registerCommand('cmtx.download', downloadImages),
        vscode.commands.registerCommand('cmtx.formatToHtml', formatToHtml),
        vscode.commands.registerCommand('cmtx.formatToMarkdown', formatToMarkdown),
        vscode.commands.registerCommand('cmtx.applyPreset', applyPreset),
        vscode.commands.registerCommand('cmtx.applyRule', applyRule),
        vscode.commands.registerCommand('cmtx.setImageWidth', setImageWidth),
        vscode.commands.registerCommand('cmtx.zoomIn', zoomIn),
        vscode.commands.registerCommand('cmtx.zoomOut', zoomOut),
        vscode.commands.registerCommand('cmtx.analyze', analyzeDocument),
        vscode.commands.registerCommand('cmtx.findReferences', findImageReferences),
        vscode.commands.registerCommand('cmtx.configInit', initConfig),
        vscode.commands.registerCommand('cmtx.configEdit', editConfig),
        vscode.commands.registerCommand('cmtx.configUI', openConfigUI),
        vscode.commands.registerCommand('cmtx.clearPresignedCache', clearPresignedCacheCommand),
        vscode.commands.registerCommand('cmtx.deleteImage', deleteImage),
        vscode.commands.registerCommand('cmtx.refreshConfig', refreshConfig),
        vscode.commands.registerCommand('cmtx.reloadWindow', async () => {
            const action = await vscode.window.showWarningMessage(
                '确定要重新加载窗口吗？这将重新加载所有扩展和编辑器。',
                '确定',
                '取消'
            );
            if (action === '确定') {
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        }),
        vscode.commands.registerCommand('cmtx.addSectionNumbers', addSectionNumbersCommand),
        vscode.commands.registerCommand('cmtx.removeSectionNumbers', removeSectionNumbersCommand)
    );

    // Create config file watcher for auto-refresh
    createConfigWatcher(context);

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { language: 'markdown', scheme: 'file' },
            new ImageCodeActionProvider(),
            {
                providedCodeActionKinds: ImageCodeActionProvider.providedCodeActionKinds,
            }
        )
    );

    // 监听配置变更，提示用户重载窗口
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('cmtx')) {
                statusBar.update();
                if (e.affectsConfiguration('cmtx.presignedUrls')) {
                    const action = await vscode.window.showQuickPick(
                        ['立即重载窗口', '稍后手动重载'],
                        {
                            placeHolder: 'Presigned URL 配置已变更，需要重新加载窗口才能生效',
                            ignoreFocusOut: true,
                        }
                    );
                    if (action === '立即重载窗口') {
                        await vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                }
            }
        })
    );

    // 初始化 presigned URL（使用当前配置）
    const presignedConfig = await getPresignedUrlConfig();
    initializePresignedUrl(presignedConfig, outputChannel);

    outputChannel.appendLine('CMTX for VS Code activated');

    return {
        extendMarkdownIt(md: MarkdownIt): MarkdownIt {
            return extendMarkdownIt(md);
        },
    };
}

async function loadWasmExtension(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
): Promise<void> {
    try {
        // VS Code extension 使用 CJS bundle，import.meta.url 不可用
        // 需要手动定位 WASM 文件（从 dist/node_modules/@cmtx/fpe-wasm/ 加载）
        const wasmPath = path.join(
            context.extensionPath,
            'dist/node_modules/@cmtx/fpe-wasm/cmtx_fpe_wasm_bg.wasm'
        );

        if (fs.existsSync(wasmPath)) {
            const wasmBuffer = fs.readFileSync(wasmPath);
            await loadWASM({ data: wasmBuffer });
            outputChannel.appendLine('WASM loaded successfully');
        } else {
            outputChannel.appendLine('WASM file not found. Encryption features will be disabled.');
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`Failed to load WASM: ${message}`);
        outputChannel.appendLine('Encryption features will be disabled.');
    }
}

export function deactivate(): void {
    deactivatePresignedUrl();
}

export { extendMarkdownIt } from './providers/markdown-preview';
