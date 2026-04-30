import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import * as vscode from "vscode";
import { generateDefaultConfig } from "@cmtx/asset/config";
import { showError, showWarning, showInfo } from "../infra/notification.js";

export async function initConfig(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        await showError("Please open a workspace folder first");
        return;
    }

    const configDir = getConfigDirPath(workspaceFolder);
    const configPath = getConfigFilePath(workspaceFolder);

    // Check if config already exists
    if (existsSync(configPath)) {
        const overwrite = await showWarning(`Configuration file already exists at ${configPath}`, [
            "Overwrite",
        ]);

        if (overwrite !== "Overwrite") {
            return;
        }
    }

    const configContent = generateDefaultConfig();

    try {
        // Create .cmtx directory if it doesn't exist
        if (!existsSync(configDir)) {
            await mkdir(configDir, { recursive: true });
        }

        await writeFile(configPath, configContent, "utf-8");

        const open = await showInfo(`Configuration file created at ${configPath}`, ["Open File"]);

        if (open === "Open File") {
            const doc = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(doc);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await showError(`Failed to create configuration: ${message}`);
    }
}

/**
 * 获取配置目录路径
 */
function getConfigDirPath(workspaceFolder: vscode.WorkspaceFolder): string {
    return `${workspaceFolder.uri.fsPath}/.cmtx`;
}

/**
 * 获取配置文件路径
 */
function getConfigFilePath(workspaceFolder: vscode.WorkspaceFolder): string {
    return `${workspaceFolder.uri.fsPath}/.cmtx/config.yaml`;
}
