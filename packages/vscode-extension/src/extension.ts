import * as fs from "node:fs";
import * as path from "node:path";
import { loadWASM } from "@cmtx/fpe-wasm";
import type MarkdownIt from "markdown-it";
import * as vscode from "vscode";
import {
    addSectionNumbersCommand,
    addSectionNumbersRuleCommand,
    applyPreset,
    clearPresignedCacheCommand,
    convertImagesRuleCommand,
    deleteImage,
    deleteImageRuleCommand,
    downloadImagesRuleCommand,
    executePresetCommand,
    executeRuleCommand,
    formatToHtml,
    frontmatterDateRuleCommand,
    frontmatterIdRuleCommand,
    frontmatterTitleRuleCommand,
    frontmatterUpdatedRuleCommand,
    initConfig,
    updateConfigSchema,
    promoteHeadingsRuleCommand,
    removeSectionNumbersCommand,
    removeSectionNumbersRuleCommand,
    resizeImageRuleCommand,
    setImageWidth,
    stripFrontmatterRuleCommand,
    togglePresignedUrlsCommand,
    uploadFileFromExplorer,
    uploadDirectoryFromExplorer,
    uploadImagesRuleCommand,
    uploadSelectedImages,
    zoomIn,
    zoomOut,
    pruneDirectoryCommand,
    downloadFromExplorer,
} from "./commands/index.js";
import {
    getUnifiedLogger,
    initFileLogging,
    setConfigWatcherOutputChannel,
    setupConfigListener,
} from "./infra/index.js";
import { showWarning, showQuickPick } from "./infra/notification.js";
import { getCurrentWorkspaceFolder, loadCmtxConfig } from "./infra/cmtx-config.js";
import { createConfigWatcher, refreshConfig } from "./infra/config-watcher.js";
import { ImageCodeActionProvider, StatusBarController } from "./providers/index.js";
import {
    deactivatePresignedUrl,
    extendMarkdownIt,
    initializePresignedUrl,
    setPresignedUrlEnabled,
} from "./providers/markdown-preview.js";
import { resolvePresignedUrlOptions } from "@cmtx/asset/config";

async function initExtensionServices(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel,
): Promise<void> {
    getUnifiedLogger().setOutputChannel(outputChannel);
    setConfigWatcherOutputChannel(outputChannel);

    const workspaceFolder = getCurrentWorkspaceFolder();

    if (workspaceFolder) {
        const logDir = path.join(workspaceFolder.uri.fsPath, ".cmtx", "logs");
        initFileLogging(logDir);
    }

    await loadWasmExtension(context);

    if (workspaceFolder) {
        try {
            await loadCmtxConfig(workspaceFolder, outputChannel);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            outputChannel.appendLine(`Failed to load CMTX config: ${message}`);
            outputChannel.appendLine(
                "Extension will continue with default settings. Some features may be unavailable.",
            );
        }
    } else {
        outputChannel.appendLine(
            "No workspace folder detected. Extension will continue without workspace-specific configuration.",
        );
    }
}

function registerCommands(context: vscode.ExtensionContext): void {
    const commandList = [
        ["cmtx.image.upload", uploadSelectedImages],
        ["cmtx.image.formatToHtml", formatToHtml],
        ["cmtx.applyPreset", applyPreset],
        ["cmtx.image.setWidth", setImageWidth],
        ["cmtx.image.zoomIn", zoomIn],
        ["cmtx.image.zoomOut", zoomOut],
        ["cmtx.configInit", initConfig],
        ["cmtx.updateConfigSchema", updateConfigSchema],
        ["cmtx.clearPresignedCache", clearPresignedCacheCommand],
        ["cmtx.togglePresignedUrls", togglePresignedUrlsCommand],
        ["cmtx.image.delete", deleteImage],
        ["cmtx.refreshConfig", refreshConfig],
        ["cmtx.addSectionNumbers", addSectionNumbersCommand],
        ["cmtx.removeSectionNumbers", removeSectionNumbersCommand],
        ["cmtx.rule.execute", executeRuleCommand],
        ["cmtx.rule.applyPreset", executePresetCommand],
        ["cmtx.rule.upload-images", uploadImagesRuleCommand],
        ["cmtx.rule.frontmatter-id", frontmatterIdRuleCommand],
        ["cmtx.rule.frontmatter-title", frontmatterTitleRuleCommand],
        ["cmtx.rule.strip-frontmatter", stripFrontmatterRuleCommand],
        ["cmtx.rule.promote-headings", promoteHeadingsRuleCommand],
        ["cmtx.rule.add-section-numbers", addSectionNumbersRuleCommand],
        ["cmtx.rule.remove-section-numbers", removeSectionNumbersRuleCommand],
        ["cmtx.rule.convert-images", convertImagesRuleCommand],
        ["cmtx.rule.frontmatter-date", frontmatterDateRuleCommand],
        ["cmtx.rule.frontmatter-updated", frontmatterUpdatedRuleCommand],
        ["cmtx.rule.download-images", downloadImagesRuleCommand],
        ["cmtx.rule.delete-image", deleteImageRuleCommand],
        ["cmtx.rule.resize-image", resizeImageRuleCommand],
        ["cmtx.explorer.uploadFile", uploadFileFromExplorer],
        ["cmtx.explorer.uploadDirectory", uploadDirectoryFromExplorer],
        ["cmtx.explorer.pruneDirectory", pruneDirectoryCommand],
        ["cmtx.explorer.downloadImages", downloadFromExplorer],
    ] as const;

    for (const [name, handler] of commandList) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        context.subscriptions.push(vscode.commands.registerCommand(name, handler as any));
    }

    context.subscriptions.push(
        vscode.commands.registerCommand("cmtx.reloadWindow", async () => {
            const action = await showWarning(
                "确定要重新加载窗口吗？这将重新加载所有扩展和编辑器。",
                ["确定", "取消"],
            );
            if (action === "确定") {
                await vscode.commands.executeCommand("workbench.action.reloadWindow");
            }
        }),
    );
}

function registerProviders(context: vscode.ExtensionContext, statusBar: StatusBarController): void {
    createConfigWatcher(context);

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { language: "markdown", scheme: "file" },
            new ImageCodeActionProvider(),
            {
                providedCodeActionKinds: ImageCodeActionProvider.providedCodeActionKinds,
            },
        ),
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration("cmtx")) {
                void statusBar.update();
                if (e.affectsConfiguration("cmtx.presignedUrls")) {
                    if (e.affectsConfiguration("cmtx.presignedUrls.enabled")) {
                        const newEnabled = vscode.workspace
                            .getConfiguration("cmtx")
                            .get<boolean>("presignedUrls.enabled", true);
                        setPresignedUrlEnabled(newEnabled);
                        await vscode.commands.executeCommand("markdown.preview.refresh");
                        return;
                    }
                    const action = await showQuickPick(
                        "Presigned URL 配置已变更，需要重新加载窗口才能生效",
                        ["立即重载窗口", "稍后手动重载"],
                    );
                    if (action === "立即重载窗口") {
                        await vscode.commands.executeCommand("workbench.action.reloadWindow");
                    }
                }
            }
        }),
    );
}

export async function activate(
    context: vscode.ExtensionContext,
): Promise<{ extendMarkdownIt(md: MarkdownIt): MarkdownIt }> {
    const outputChannel = vscode.window.createOutputChannel("CMTX");
    context.subscriptions.push(outputChannel);

    await initExtensionServices(context, outputChannel);

    const configListener = setupConfigListener();
    context.subscriptions.push(configListener);

    const statusBar = new StatusBarController();
    context.subscriptions.push(statusBar);

    registerCommands(context);
    registerProviders(context, statusBar);

    const workspaceFolder = getCurrentWorkspaceFolder();
    const cmtxConfig = workspaceFolder ? await loadCmtxConfig(workspaceFolder) : undefined;
    const presignedEnabled = vscode.workspace
        .getConfiguration("cmtx")
        .get<boolean>("presignedUrls.enabled", true);
    if (presignedEnabled && cmtxConfig?.presignedUrls) {
        const options = resolvePresignedUrlOptions(cmtxConfig.presignedUrls, cmtxConfig.storages);
        initializePresignedUrl(options, outputChannel);
    }

    outputChannel.appendLine("CMTX for VS Code activated");

    return {
        extendMarkdownIt(md: MarkdownIt): MarkdownIt {
            return extendMarkdownIt(md);
        },
    };
}

async function loadWasmExtension(context: vscode.ExtensionContext): Promise<void> {
    const logger = getUnifiedLogger().forModule("wasm-loader");

    try {
        const productionPath = path.join(context.extensionPath, "dist/cmtx_fpe_wasm_bg.wasm");
        const developmentPath = path.join(
            context.extensionPath,
            "../fpe-wasm/pkg/cmtx_fpe_wasm_bg.wasm",
        );

        const wasmPath = fs.existsSync(productionPath)
            ? productionPath
            : fs.existsSync(developmentPath)
              ? developmentPath
              : null;

        if (wasmPath) {
            logger.debug(`WASM path: ${wasmPath}`);
            const wasmBuffer = fs.readFileSync(wasmPath);
            await loadWASM({ data: wasmBuffer });
            logger.info("WASM loaded successfully");
        } else {
            logger.error("WASM file not found");
            logger.error(`Expected paths:`);
            logger.error(`  Production: ${productionPath}`);
            logger.error(`  Development: ${developmentPath}`);
            logger.error("");
            logger.error("Troubleshooting:");
            logger.error("  1. Development mode (F5):");
            logger.error("     - Run: pnpm --filter @cmtx/fpe-wasm build");
            logger.error("     - Verify: ls packages/fpe-wasm/pkg/*.wasm");
            logger.error("  2. Production mode (vsce package):");
            logger.error("     - Run: pnpm build");
            logger.error("     - Run: pnpm --filter cmtx-vscode package");
            logger.error("     - Verify: ls dist/*.wasm");
            logger.error("");
            logger.error("Encryption features will be disabled.");
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to load WASM: ${message}`);
        logger.error("Encryption features will be disabled.");
    }
}

export function deactivate(): void {
    deactivatePresignedUrl();
}

export { extendMarkdownIt } from "./providers/markdown-preview.js";
