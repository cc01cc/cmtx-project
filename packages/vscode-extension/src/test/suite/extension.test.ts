import * as assert from "node:assert";
import * as vscode from "vscode";

// Extension ID is publisher.name
// For @cmtx/vscode-extension with publisher cc01cc, the ID is cc01cc.@cmtx/vscode-extension
const EXTENSION_ID = "cc01cc.@cmtx/vscode-extension";

suite("Extension Integration Tests", () => {
    suiteTeardown(() => {
        vscode.window.showInformationMessage("All tests done!");
    });

    test("Extension should be present", () => {
        const extension = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(extension, `Extension ${EXTENSION_ID} should be present`);
    });

    test("Extension should activate", async () => {
        const extension = vscode.extensions.getExtension(EXTENSION_ID);
        if (extension) {
            await extension.activate();
            assert.ok(extension.isActive, "Extension should be active");
        } else {
            assert.fail(`Extension ${EXTENSION_ID} not found`);
        }
    });
});
