import * as vscode from "vscode";
import { resolvePresignedUrlOptions } from "@cmtx/asset/config";
import { showInfo } from "../infra/notification.js";
import { getCurrentWorkspaceFolder, loadCmtxConfig } from "../infra/cmtx-config.js";
import { deactivatePresignedUrl, reloadPresignedUrlConfig } from "../providers/markdown-preview.js";

/**
 * Toggle presigned URL feature on/off.
 *
 * Reads the current `cmtx.presignedUrls.enabled` setting, flips it,
 * persists the new value globally, activates or deactivates the
 * presigned URL adapter accordingly, and refreshes the Markdown preview.
 */
export async function togglePresignedUrlsCommand(): Promise<void> {
    const config = vscode.workspace.getConfiguration("cmtx");
    const current = config.get<boolean>("presignedUrls.enabled", true);
    const newValue = !current;

    await config.update("presignedUrls.enabled", newValue, vscode.ConfigurationTarget.Global);

    if (newValue) {
        const workspaceFolder = getCurrentWorkspaceFolder();
        if (workspaceFolder) {
            const cmtxConfig = await loadCmtxConfig(workspaceFolder);
            if (cmtxConfig?.presignedUrls) {
                const options = resolvePresignedUrlOptions(
                    cmtxConfig.presignedUrls,
                    cmtxConfig.storages,
                );
                reloadPresignedUrlConfig(options, vscode.window.createOutputChannel("CMTX"));
            }
        }
    } else {
        deactivatePresignedUrl();
    }

    await vscode.commands.executeCommand("markdown.preview.refresh");

    const label = newValue ? "enabled" : "disabled";
    await showInfo(`Presigned URLs ${label}. Preview refreshed.`);
}
