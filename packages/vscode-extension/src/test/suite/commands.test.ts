import * as assert from "node:assert";
import * as vscode from "vscode";

suite("Command Integration Tests", () => {
    suiteSetup(async () => {
        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    });

    suiteTeardown(async () => {
        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    });

    test("All commands should be registered", async () => {
        const commands = await vscode.commands.getCommands(true);

        const expectedCommands = [
            "cmtx.upload",
            "cmtx.image.upload",
            "cmtx.image.formatToHtml",
            "cmtx.formatToMarkdown",
            "cmtx.image.setWidth",
            "cmtx.image.zoomIn",
            "cmtx.image.zoomOut",
            "cmtx.adapt",
            "cmtx.analyze",
            "cmtx.findReferences",
            "cmtx.configInit",
        ];

        for (const cmd of expectedCommands) {
            assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
        }
    });

    test("Upload command should show error when no markdown file", async () => {
        await vscode.commands.executeCommand("cmtx.upload");
    });

    test("Format to HTML command should show error when no markdown file", async () => {
        await vscode.commands.executeCommand("cmtx.image.formatToHtml");
    });

    test("Analyze command should show error when no markdown file", async () => {
        await vscode.commands.executeCommand("cmtx.analyze");
    });

    test("Command should handle non-markdown file", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: "const x = 1;",
            language: "javascript",
        });
        await vscode.window.showTextDocument(doc);

        await vscode.commands.executeCommand("cmtx.upload");

        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    });
});
