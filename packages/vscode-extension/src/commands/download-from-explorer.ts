/**
 * Explorer 右键下载命令
 *
 * @module download-from-explorer
 * @description
 * 支持在 Explorer 中右键 Markdown 文件，下载其中所有 web 图片到本地目录。
 * 不依赖存储配置，直接通过 HTTP 下载公开 URL。
 */

import { dirname } from "node:path";
import { createDownloadService } from "@cmtx/asset/download";
import * as vscode from "vscode";
import { showError, showInfo } from "../infra/notification.js";

/**
 * 从 Explorer 右键菜单下载 Markdown 文件中的 web 图片
 *
 * @param uri - 右键选中的文件 URI（由 VS Code 菜单传入）
 */
export async function downloadFromExplorer(uri: vscode.Uri): Promise<void> {
    if (uri.fsPath.endsWith(".md") === false) {
        await showError("Selected file is not a Markdown file");
        return;
    }

    const fileDir = dirname(uri.fsPath);
    const defaultOutputDir = `${fileDir}/images`;

    const outputDir = await vscode.window.showInputBox({
        prompt: "Enter output directory for downloaded images",
        value: defaultOutputDir,
        placeHolder: defaultOutputDir,
    });

    if (!outputDir) {
        return;
    }

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "CMTX: Downloading images...",
                cancellable: false,
            },
            async () => {
                const service = createDownloadService({
                    options: {
                        outputDir,
                        concurrency: 5,
                    },
                });

                const result = await service.downloadFromMarkdown(uri.fsPath);

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
