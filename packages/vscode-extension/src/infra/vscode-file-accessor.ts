import * as fs from "node:fs/promises";
import type { FileAccessor } from "@cmtx/asset/file";
import * as vscode from "vscode";

export class VSCodeFileAccessor implements FileAccessor {
    async readText(path: string): Promise<string> {
        const doc = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === path);
        if (doc) {
            return doc.getText();
        }
        return await fs.readFile(path, "utf-8");
    }

    async writeText(path: string, content: string): Promise<void> {
        const doc = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === path);
        if (doc) {
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                doc.positionAt(0),
                doc.positionAt(doc.getText().length),
            );
            edit.replace(doc.uri, fullRange, content);
            await vscode.workspace.applyEdit(edit);
            return;
        }
        await fs.writeFile(path, content, "utf-8");
    }
}
