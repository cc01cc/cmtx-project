import * as vscode from "vscode";
import {
    getCurrentWorkspaceFolder,
    getStorageConfig,
    loadCmtxConfig,
} from "../infra/cmtx-config.js";
import { showError, showInfo, showWarning } from "../infra/notification.js";
import { getModuleLogger } from "../infra/unified-logger.js";

const logger = getModuleLogger("delete");

interface DeleteContext {
    editor: vscode.TextEditor;
    document: vscode.TextDocument;
    workspaceFolder: vscode.WorkspaceFolder;
    imagePath: string;
    isLocal: boolean;
}

interface DeleteTarget {
    path: string;
    isLocal: boolean;
    referencedIn: string[];
}

interface ValidationResult {
    valid: boolean;
    context?: DeleteContext;
}

async function validateDeleteContext(): Promise<ValidationResult> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        await showError("No active editor");
        return { valid: false };
    }

    const document = editor.document;
    if (document.languageId !== "markdown") {
        await showError("Active document is not a Markdown file");
        return { valid: false };
    }

    const workspaceFolder = getCurrentWorkspaceFolder();
    if (!workspaceFolder) {
        await showError("Please open a workspace folder");
        return { valid: false };
    }

    const position = editor.selection.active;
    const line = document.lineAt(position.line).text;
    const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);

    if (!imageMatch) {
        await showError("No image found at cursor position");
        return { valid: false };
    }

    const imagePath = imageMatch[2];
    const isLocal = !imagePath.startsWith("http");

    return {
        valid: true,
        context: { editor, document, workspaceFolder, imagePath, isLocal },
    };
}

async function checkImageStorage(context: DeleteContext): Promise<boolean> {
    if (context.isLocal) {
        return true;
    }

    const cmtxConfig = await loadCmtxConfig(context.workspaceFolder);
    const storage = cmtxConfig ? getStorageConfig(cmtxConfig) : undefined;

    if (!storage) {
        await showError("No storage configuration found. Cannot delete remote images.");
        return false;
    }

    const isInOurStorage = context.imagePath.includes(storage.config.bucket ?? "");
    if (!isInOurStorage) {
        await showWarning("This remote image is not in your configured storage. Cannot delete.");
        return false;
    }

    return true;
}

async function executeDeleteFlow(context: DeleteContext): Promise<void> {
    const { imagePath, isLocal, workspaceFolder } = context;

    const referencedIn = await findImageReferences(context.document, imagePath, workspaceFolder);

    const target: DeleteTarget = {
        path: imagePath,
        isLocal,
        referencedIn: referencedIn.map((doc) => doc.uri.fsPath),
    };

    const confirmed = await showDeleteConfirmation(target);
    if (!confirmed) {
        await showInfo("Delete cancelled");
        return;
    }

    await performDelete(target, workspaceFolder);
    await showInfo(`Successfully deleted: ${imagePath}`);
}

export async function deleteImage(): Promise<void> {
    const validation = await validateDeleteContext();
    if (!validation.valid) {
        return;
    }

    const context = validation.context as DeleteContext;

    try {
        const canDelete = await checkImageStorage(context);
        if (!canDelete) {
            return;
        }

        await executeDeleteFlow(context);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Failed to delete image:", error);
        await showError(`Failed to delete image: ${message}`);
    }
}

async function findImageReferences(
    _currentDocument: vscode.TextDocument,
    imagePath: string,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<vscode.TextDocument[]> {
    const referencingDocs: vscode.TextDocument[] = [];

    // Search all markdown files in workspace
    const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceFolder, "**/*.md"),
        "**/node_modules/**",
    );

    for (const file of files) {
        const doc = await vscode.workspace.openTextDocument(file);
        const content = doc.getText();

        // Check if this document references the image
        if (content.includes(imagePath)) {
            referencingDocs.push(doc);
        }
    }

    return referencingDocs;
}

async function showDeleteConfirmation(target: DeleteTarget): Promise<boolean> {
    const location = target.isLocal ? "Local file" : "Remote storage";
    const referenceCount = target.referencedIn.length;

    let message = `Delete ${target.isLocal ? "local" : "remote"} image?\n\n`;
    message += `Path: ${target.path}\n`;
    message += `Location: ${location}\n`;

    if (referenceCount > 1) {
        message += `\n⚠️ This image is referenced in ${referenceCount} files!`;
        message += "\nDeleting it will break these references.";
    } else if (referenceCount === 1) {
        message += "\n✓ This image is only referenced in the current file.";
    }

    const items = ["Delete", "Cancel"];

    // Add "Force Delete" option for images with multiple references
    if (referenceCount > 1) {
        items.unshift("Force Delete (break references)");
    }

    const result = await showWarning(message, items, { modal: true });

    return result === "Delete" || result === "Force Delete (break references)";
}

async function performDelete(
    target: DeleteTarget,
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<void> {
    if (target.isLocal) {
        // Delete local file
        const fs = await import("node:fs/promises");
        const path = await import("node:path");

        const fullPath = path.isAbsolute(target.path)
            ? target.path
            : path.join(workspaceFolder.uri.fsPath, target.path);

        await fs.unlink(fullPath);
        logger.info(`Deleted local file: ${fullPath}`);
    } else {
        // Delete from remote storage
        // This would require implementing storage adapter deletion
        // For now, show a message that manual deletion is needed
        await showWarning(
            "Remote image deletion requires storage adapter implementation. " +
                "Please delete manually from your storage console.",
        );
    }

    // Remove references from all files
    for (const filePath of target.referencedIn) {
        const doc = await vscode.workspace.openTextDocument(filePath);
        const edit = new vscode.WorkspaceEdit();
        const content = doc.getText();

        // Find and remove image references
        const imageRegex = new RegExp(`!\\[[^\\]]*\\]\\(${escapeRegExp(target.path)}\\)`, "g");
        const matches = content.matchAll(imageRegex);

        for (const match of matches) {
            if (match.index === undefined) {
                continue;
            }
            const startPos = doc.positionAt(match.index);
            const endPos = doc.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);

            edit.delete(doc.uri, range);
        }

        await vscode.workspace.applyEdit(edit);
        await doc.save();
    }
}

function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
