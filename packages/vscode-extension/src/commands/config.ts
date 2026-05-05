import { existsSync } from "node:fs";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
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

        await copySchemaFile(workspaceFolder);

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

export async function updateConfigSchema(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        await showError("Please open a workspace folder first");
        return;
    }

    const configDir = getConfigDirPath(workspaceFolder);
    if (!existsSync(configDir)) {
        await showError("Configuration directory (.cmtx) not found. Create a configuration first.");
        return;
    }

    await copySchemaFile(workspaceFolder);
}

async function copySchemaFile(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    const configDir = getConfigDirPath(workspaceFolder);

    // Copy schema file to config directory for editor IntelliSense
    const schemaCandidates = [
        // Path when running as bundled extension (__dirname = dist/)
        join(
            __dirname,
            "..",
            "..",
            "node_modules",
            "@cmtx",
            "asset",
            "dist",
            "config",
            "cmtx.schema.json",
        ),
        // Path when running from monorepo root (F5 dev with workspace)
        join(
            __dirname,
            "..",
            "..",
            "..",
            "node_modules",
            "@cmtx",
            "asset",
            "dist",
            "config",
            "cmtx.schema.json",
        ),
    ];

    let schemaSource: string | undefined;
    for (const candidate of schemaCandidates) {
        if (existsSync(candidate)) {
            schemaSource = candidate;
            break;
        }
    }

    if (schemaSource) {
        const schemaDest = join(configDir, "config.schema.json");
        try {
            if (!existsSync(configDir)) {
                await mkdir(configDir, { recursive: true });
            }
            await copyFile(schemaSource, schemaDest);
            void showInfo(`Schema file updated at ${schemaDest}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void showWarning(`Failed to copy schema file: ${message}`);
        }
    } else {
        void showWarning(
            "Schema file (cmtx.schema.json) not found. " +
                "Build @cmtx/asset first: pnpm build --filter @cmtx/asset",
        );
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
