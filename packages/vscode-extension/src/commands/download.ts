import { createDownloadService } from "@cmtx/asset/download";
import * as vscode from "vscode";
import { showError, showInfo, validateMarkdownEditor } from "../infra/index.js";

export async function downloadImages(): Promise<void> {
    const editor = validateMarkdownEditor();
    if (!editor) {
        await showError("Please open a Markdown file first");
        return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (!workspaceFolder) {
        await showError("Please open a workspace folder");
        return;
    }

    const outputDir = await vscode.window.showInputBox({
        prompt: "Enter output directory for downloaded images",
        value: "./images",
        placeHolder: "./images",
    });

    if (!outputDir) {
        return;
    }

    const filePath = editor.document.uri.fsPath;

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "Downloading images...",
                cancellable: true,
            },
            async (progress, token) => {
                const service = createDownloadService({
                    options: {
                        outputDir,
                        concurrency: 5,
                        onProgress: (p) => {
                            progress.report({
                                message: `${p.current}/${p.total}: ${p.fileName}`,
                            });
                        },
                    },
                });

                const result = await service.downloadFromMarkdown(filePath);

                if (token.isCancellationRequested) {
                    return;
                }

                if (result.failed > 0) {
                    await showError(
                        `Downloaded ${result.success}/${result.total}, ${result.failed} failed`,
                    );
                } else {
                    await showInfo(`Downloaded ${result.success} images to ${outputDir}`);
                }
            },
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await showError(`Download failed: ${message}`);
    }
}
