import * as vscode from "vscode";
import { FileService } from "@cmtx/asset/file";
import { DeleteService, resolveBaseDirectory } from "@cmtx/asset";
import { VSCodeFileAccessor } from "../infra/vscode-file-accessor.js";
import { getCurrentWorkspaceFolder, loadCmtxConfig } from "../infra/cmtx-config.js";
import { showError, showInfo } from "../infra/notification.js";
import { getModuleLogger } from "../infra/unified-logger.js";

const logger = getModuleLogger("cleanup");
const accessor = new VSCodeFileAccessor();
const fileService = new FileService(accessor);

export async function cleanupDirectoryCommand(uri: vscode.Uri): Promise<void> {
    const dirPath = uri.fsPath;
    const workspaceFolder = getCurrentWorkspaceFolder();

    try {
        let baseDir = dirPath;
        if (workspaceFolder) {
            const config = await loadCmtxConfig(workspaceFolder);
            const ruleConfig = config?.rules?.["cleanup-images"] as
                | Record<string, unknown>
                | undefined;
            baseDir = resolveBaseDirectory(
                ruleConfig?.baseDirectory as string | undefined,
                dirPath,
            );
        }

        const analysis = await fileService.analyzeDirectory(baseDir);
        const orphans = analysis.images.filter(
            (img): img is import("@cmtx/asset/file").LocalImageEntry =>
                img.type === "local" && img.orphan,
        );

        if (orphans.length === 0) {
            await showInfo("No unreferenced images found");
            return;
        }

        const totalSizeKB = Math.round(orphans.reduce((sum, o) => sum + o.fileSize, 0) / 1024);

        const items = orphans.map((img) => ({
            label: img.src.split("/").pop() ?? img.src,
            description: `${Math.round(img.fileSize / 1024)}KB`,
            detail: img.absPath,
        }));

        const selected = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            placeHolder: `Select images to delete (${orphans.length} orphaned, ~${totalSizeKB}KB)`,
        });

        if (!selected || selected.length === 0) {
            return;
        }

        const deleteService = new DeleteService({ baseDirectory: baseDir });
        let deletedCount = 0;
        let errorCount = 0;

        for (const item of selected) {
            if (!item.detail) continue;
            try {
                const result = await deleteService.safeDelete(item.detail, {
                    force: true,
                    strategy: "trash",
                });
                if (result.success) {
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
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Failed to cleanup directory:", error);
        await showError(`Cleanup failed: ${message}`);
    }
}
