import * as vscode from "vscode";
import { DeleteService } from "@cmtx/asset";
import { getCurrentWorkspaceFolder, loadCmtxConfig } from "../infra/cmtx-config.js";
import { showError, showInfo, showWarning } from "../infra/notification.js";
import { getModuleLogger } from "../infra/unified-logger.js";

const logger = getModuleLogger("delete");

export async function deleteImage(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        await showError("No active editor");
        return;
    }

    if (editor.document.languageId !== "markdown") {
        await showError("Active document is not a Markdown file");
        return;
    }

    const workspaceFolder = getCurrentWorkspaceFolder();
    if (!workspaceFolder) {
        await showError("Please open a workspace folder");
        return;
    }

    const position = editor.selection.active;
    const line = editor.document.lineAt(position.line).text;
    const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);

    if (!imageMatch) {
        await showError("No image found at cursor position");
        return;
    }

    const imagePath = imageMatch[2];
    const isLocal = !imagePath.startsWith("http");

    if (!isLocal) {
        await showWarning("Remote image deletion is not supported via this command");
        return;
    }

    try {
        const config = await loadCmtxConfig(workspaceFolder);
        const ruleConfig = config?.rules?.["delete-image"] as Record<string, unknown> | undefined;

        const strategy = ruleConfig?.strategy as string | undefined as
            | "trash"
            | "move"
            | "hard-delete"
            | undefined;
        const deleteService = new DeleteService({
            baseDirectory: workspaceFolder.uri.fsPath,
            options: {
                strategy: strategy ?? "trash",
                removeFromMarkdown: (ruleConfig?.removeFromMarkdown as boolean) ?? true,
                force: (ruleConfig?.force as boolean) ?? false,
            },
        });

        const fullPath = imagePath.startsWith("/")
            ? imagePath
            : vscode.Uri.joinPath(workspaceFolder.uri, imagePath).fsPath;

        const result = await deleteService.safeDelete(fullPath);

        if (result.success) {
            const msg = [`Deleted: ${imagePath}`];
            if (
                result.deleteResult?.referencesRemovedFrom &&
                result.deleteResult.referencesRemovedFrom > 0
            ) {
                msg.push(
                    `Removed references from ${result.deleteResult.referencesRemovedFrom} files`,
                );
            }
            await showInfo(msg.join("\n"));
        } else if (!result.deleted) {
            const confirmed = await showWarning(
                `Image is referenced by ${result.detail.referencedIn.length} file(s). Force delete?`,
                ["Force Delete", "Cancel"],
                { modal: true },
            );
            if (confirmed === "Force Delete") {
                const forceResult = await deleteService.safeDelete(fullPath, { force: true });
                if (forceResult.success) {
                    await showInfo(`Force deleted: ${imagePath}`);
                } else {
                    await showError(`Failed to force delete: ${imagePath}`);
                }
            }
        } else {
            await showError(`Failed to delete: ${imagePath}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Failed to delete image:", error);
        await showError(`Failed to delete image: ${message}`);
    }
}
