import * as vscode from "vscode";
import { FileService } from "@cmtx/asset/file";
import { VSCodeFileAccessor } from "../infra/vscode-file-accessor.js";
import { showError, showInfo } from "../infra/notification.js";

const accessor = new VSCodeFileAccessor();
const fileService = new FileService(accessor);

export async function pruneDirectoryCommand(uri: vscode.Uri): Promise<void> {
    const dirPath = uri.fsPath;

    const analysis = await fileService.analyzeDirectory(dirPath);

    const orphanedImages = analysis.images.filter((img) => img.type === "local" && img.orphan);

    if (orphanedImages.length === 0) {
        await showInfo("No unreferenced images found in the selected directory");
        return;
    }

    const totalSizeKB = Math.round(
        orphanedImages.reduce((sum, img) => sum + (img.type === "local" ? img.fileSize : 0), 0) /
            1024,
    );

    const items = orphanedImages.map((img) => ({
        label: img.type === "local" ? (img.src.split("/").pop() ?? img.src) : img.src,
        description: `${img.type === "local" ? `${Math.round(img.fileSize / 1024)}KB` : ""}`,
        detail: img.type === "local" ? img.absPath : undefined,
    }));

    const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: `Select images to delete (${orphanedImages.length} orphaned, ~${totalSizeKB}KB)`,
    });

    if (!selected || selected.length === 0) {
        return;
    }

    const confirmMsg =
        selected.length === orphanedImages.length
            ? `Delete all ${selected.length} unreferenced images (~${totalSizeKB}KB)?`
            : `Delete ${selected.length} selected unreferenced images?`;

    const confirmed = await vscode.window.showWarningMessage(confirmMsg, { modal: true }, "Delete");

    if (confirmed !== "Delete") {
        return;
    }

    let deletedCount = 0;
    let errorCount = 0;

    for (const item of selected) {
        if (!item.detail) continue;
        try {
            const result = await fileService.deleteLocalImage(item.detail, {
                strategy: "trash",
            });
            if (result.status === "success") {
                deletedCount++;
            } else {
                errorCount++;
            }
        } catch {
            errorCount++;
        }
    }

    if (errorCount > 0) {
        await showError(`Deleted ${deletedCount} image(s), failed ${errorCount}`);
    } else {
        await showInfo(`Deleted ${deletedCount} unreferenced image(s)`);
    }
}
