import * as assert from "node:assert";
import * as vscode from "vscode";

function extractFrontmatterField(text: string, field: string): string | undefined {
    const match = text.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return undefined;
    const frontmatter = match[1];
    const line = frontmatter
        .split("\n")
        .find((l) => l.startsWith(`${field}:`) || l.startsWith(`${field}: `));
    if (!line) return undefined;
    return line.replace(`${field}: `, "").replace(`${field}:`, "").trim();
}

suite("Rule Execution Tests", () => {
    suiteSetup(async () => {
        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    });

    suiteTeardown(async () => {
        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    });

    test("frontmatter-slug rule should add slug from title (transform strategy)", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: `---
title: "Hello World"
---

# Hello World

This is a test document.`,
            language: "markdown",
        });
        const editor = await vscode.window.showTextDocument(doc);
        const before = editor.document.getText();
        assert.ok(before.includes('title: "Hello World"'), "document should have title");
        assert.ok(!before.includes("slug:"), "document should not have slug yet");

        await vscode.commands.executeCommand("cmtx.rule.frontmatter-slug");
        assert.ok(true, "command executed without error");

        const after = editor.document.getText();
        const slug = extractFrontmatterField(after, "slug");
        assert.ok(slug, "slug field should be added to frontmatter");
        assert.strictEqual(slug, "hello-world", 'slug should be "hello-world"');

        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    }).timeout(15000);

    test("frontmatter-id rule should add id field", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: `---
title: "Test"
---

# Test`,
            language: "markdown",
        });
        await vscode.window.showTextDocument(doc);

        await vscode.commands.executeCommand("cmtx.rule.frontmatter-id");
        assert.ok(true, "command executed without error");

        const after = vscode.window.activeTextEditor?.document.getText() ?? "";
        const id = extractFrontmatterField(after, "id");
        assert.ok(id, "id field should be added to frontmatter");

        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    }).timeout(15000);

    test("frontmatter-title rule should add title field", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: `# My Document Title

Some content here.`,
            language: "markdown",
        });
        await vscode.window.showTextDocument(doc);

        await vscode.commands.executeCommand("cmtx.rule.frontmatter-title");
        assert.ok(true, "command executed without error");

        const after = vscode.window.activeTextEditor?.document.getText() ?? "";
        const title = extractFrontmatterField(after, "title");
        assert.ok(title, "title field should be added to frontmatter");

        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    }).timeout(15000);
});
