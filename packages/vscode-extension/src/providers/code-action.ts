import { parseImages } from "@cmtx/core";
import * as vscode from "vscode";

export class ImageCodeActionProvider implements vscode.CodeActionProvider {
    static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        _context: vscode.CodeActionContext,
        _token: vscode.CancellationToken,
    ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        const text = document.getText(range);
        const images = parseImages(text);

        if (images.length === 0) {
            return [];
        }

        const actions: vscode.CodeAction[] = [];

        const uploadAction = new vscode.CodeAction(
            "Upload images to cloud storage",
            vscode.CodeActionKind.QuickFix,
        );
        uploadAction.command = {
            command: "cmtx.image.upload",
            title: "Upload selected images",
        };
        actions.push(uploadAction);

        const resizeAction = new vscode.CodeAction(
            "Set image width",
            vscode.CodeActionKind.QuickFix,
        );
        resizeAction.command = {
            command: "cmtx.image.setWidth",
            title: "Set image width",
        };
        actions.push(resizeAction);

        const formatToHtmlAction = new vscode.CodeAction(
            "Convert to HTML format",
            vscode.CodeActionKind.QuickFix,
        );
        formatToHtmlAction.command = {
            command: "cmtx.image.formatToHtml",
            title: "Convert to HTML format",
        };
        actions.push(formatToHtmlAction);

        return actions;
    }
}
