import * as vscode from 'vscode';
import { getUploadConfig } from '../infra';

export class StatusBarController {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'cmtx.configInit';
        this.update();
        this.statusBarItem.show();
    }

    async update(): Promise<void> {
        const config = await getUploadConfig();

        if (config.providerConfig.bucket && config.providerConfig.region) {
            this.statusBarItem.text = `$(cloud) CMTX: ${config.providerConfig.bucket}`;
            this.statusBarItem.tooltip = `CMTX configured for ${config.providerConfig.provider}`;
        } else {
            this.statusBarItem.text = '$(cloud) CMTX: Not configured';
            this.statusBarItem.tooltip = 'Click to initialize configuration';
        }
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}
