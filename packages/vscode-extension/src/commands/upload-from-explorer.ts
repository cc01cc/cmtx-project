import { FileService } from "@cmtx/asset/file";
import { publishAndReplaceFile, publishAndReplaceDirectory } from "@cmtx/rule-engine/node";
import * as vscode from "vscode";
import { createUploadConfig } from "../infra/upload-config.js";
import { VSCodeFileAccessor } from "../infra/vscode-file-accessor.js";
import { showError, showInfo } from "../infra/notification.js";

const accessor = new VSCodeFileAccessor();
const fileService = new FileService(accessor);

async function doUpload(
    label: string,
    fn: () => Promise<{ modified: boolean; uploaded: number; messages?: string[] }>,
): Promise<void> {
    let messages: string[] | undefined;
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `CMTX: ${label}...`,
            cancellable: true,
        },
        async (_progress, token) => {
            const result = await fn();
            if (token.isCancellationRequested) return;
            messages = result.messages;
        },
    );
    if (messages && messages.length > 0) {
        void showInfo(messages.join("; "));
    }
}

export async function uploadFileFromExplorer(uri: vscode.Uri): Promise<void> {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
        await showError("No workspace folder found for the selected file");
        return;
    }

    const uploadConfig = await createUploadConfig(workspaceFolder);
    if (!uploadConfig) {
        await showError(
            "Storage not configured. Please create a .cmtx/config.yaml with storage settings.",
        );
        return;
    }

    const matches = await fileService.filterImagesFromFile(uri.fsPath);
    const localMatches = matches.filter((m) => m.type === "local");

    if (localMatches.length === 0) {
        await showInfo("No local images found in the selected file");
        return;
    }

    await doUpload("Uploading images", async () => {
        const result = await publishAndReplaceFile(
            uri.fsPath,
            {
                adapter: uploadConfig.adapter,
                namingTemplate: uploadConfig.namingTemplate,
                prefix: uploadConfig.prefix,
                conflictStrategy: { type: "skip-all" },
            },
            accessor,
        );
        return { modified: result.modified, uploaded: result.uploaded, messages: result.messages };
    });
}

export async function uploadDirectoryFromExplorer(uri: vscode.Uri): Promise<void> {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
        await showError("No workspace folder found for the selected directory");
        return;
    }

    const uploadConfig = await createUploadConfig(workspaceFolder);
    if (!uploadConfig) {
        await showError(
            "Storage not configured. Please create a .cmtx/config.yaml with storage settings.",
        );
        return;
    }

    const matches = await fileService.filterImagesFromDirectory(uri.fsPath);
    const localMatches = matches.filter((m) => m.type === "local");

    if (localMatches.length === 0) {
        await showInfo("No local images found in the selected directory");
        return;
    }

    // Collect unique md file paths
    const mdFiles = [...new Set(localMatches.map((m) => m.filePath))];

    await doUpload("Uploading images", async () => {
        const result = await publishAndReplaceDirectory(
            mdFiles,
            {
                adapter: uploadConfig.adapter,
                namingTemplate: uploadConfig.namingTemplate,
                prefix: uploadConfig.prefix,
                conflictStrategy: { type: "skip-all" },
            },
            accessor,
        );
        return {
            modified: result.updatedFiles.length > 0,
            uploaded: result.totalUploaded,
            messages: result.messages,
        };
    });
}
