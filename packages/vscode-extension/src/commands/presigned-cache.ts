import * as vscode from "vscode";
import { showInfo } from "../infra/notification.js";
import { clearPresignedCache } from "../providers/markdown-preview.js";

export async function clearPresignedCacheCommand(): Promise<void> {
    clearPresignedCache();

    await vscode.commands.executeCommand("markdown.preview.refresh");

    await showInfo("Presigned URL cache cleared. Preview refreshing...");
}
