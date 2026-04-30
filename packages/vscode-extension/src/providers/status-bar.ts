import * as vscode from "vscode";
import {
    getCurrentWorkspaceFolder,
    getStorageConfig,
    loadCmtxConfig,
} from "../infra/cmtx-config.js";

export class StatusBarController {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100,
        );
        this.statusBarItem.command = "cmtx.configInit";
        void this.update();
        this.statusBarItem.show();
    }

    async update(): Promise<void> {
        const workspaceFolder = getCurrentWorkspaceFolder();
        const cmtxConfig = workspaceFolder ? await loadCmtxConfig(workspaceFolder) : undefined;
        const storage = cmtxConfig ? getStorageConfig(cmtxConfig) : undefined;

        if (storage?.config.bucket && storage?.config.region) {
            this.statusBarItem.text = `$(cloud) CMTX: ${storage.config.bucket}`;
            this.statusBarItem.tooltip = `CMTX configured for ${storage.adapter}`;
        } else {
            this.statusBarItem.text = "$(cloud) CMTX: Not configured";
            this.statusBarItem.tooltip = "Click to initialize configuration";
        }
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}
