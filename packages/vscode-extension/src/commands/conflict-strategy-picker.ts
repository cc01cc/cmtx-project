/**
 * 冲突处理策略选择对话框
 *
 * @module conflict-strategy-picker
 * @description
 * 显示冲突处理策略选择界面，让用户选择批量处理方式。
 * 支持 3 种策略：全部跳过、全部替换、全部下载。
 */

import type { ConflictResolutionStrategy } from "@cmtx/asset";
import * as vscode from "vscode";

/**
 * 策略选择项
 */
interface StrategyQuickPickItem extends vscode.QuickPickItem {
    strategy: ConflictResolutionStrategy;
}

/**
 * 显示冲突处理策略选择对话框
 *
 * @param conflictCount - 检测到的冲突文件数
 * @returns 用户选择的策略，如果取消则返回 undefined
 */
export async function showConflictStrategyPicker(
    conflictCount: number,
): Promise<ConflictResolutionStrategy | undefined> {
    const quickPick = vscode.window.createQuickPick<StrategyQuickPickItem>();

    quickPick.title = `检测到 ${conflictCount} 个文件冲突`;
    quickPick.placeholder = "选择冲突处理策略";
    quickPick.step = 1;
    quickPick.totalSteps = 1;
    quickPick.ignoreFocusOut = true; // 防止误操作关闭

    quickPick.items = [
        {
            label: "$(debug-step-over) 全部跳过",
            description: "保留所有远程版本，不上传任何本地文件",
            detail: "远程文件冲突的本地文件将被跳过",
            strategy: { type: "skip-all" },
        },
        {
            label: "$(replace-all) 全部替换",
            description: "上传所有本地文件，覆盖远程版本",
            detail: "所有冲突文件都将被上传到远程存储",
            strategy: { type: "replace-all" },
        },
        {
            label: "$(cloud-download) 全部下载",
            description: "下载所有远程文件到指定目录",
            detail: "冲突的远程文件将下载到本地，下载后自动跳过上传",
            strategy: {
                type: "download-all",
                downloadDir: "",
                onFileExists: "skip",
            },
        },
    ];

    return new Promise((resolve) => {
        let resolved = false;

        // 确认选择
        quickPick.onDidAccept(async () => {
            const selected = quickPick.activeItems[0];
            if (!selected) return;

            const strategy = selected.strategy;

            // 如果选择"全部下载"，需要让用户选择下载目录
            if (strategy.type === "download-all") {
                const downloadDir = await showDownloadDirectoryPicker();
                if (!downloadDir) {
                    // 用户取消了目录选择，重新显示策略选择
                    quickPick.show();
                    return;
                }
                strategy.downloadDir = downloadDir;
            }

            resolved = true;
            quickPick.hide();
            resolve(strategy);
        });

        // 取消（Esc）
        quickPick.onDidHide(() => {
            if (!resolved) {
                resolve(undefined);
            }
        });

        quickPick.show();
    });
}

/**
 * 显示下载目录选择对话框
 *
 * @returns 选择的目录路径，如果取消则返回 undefined
 */
async function showDownloadDirectoryPicker(): Promise<string | undefined> {
    const folders = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        title: "选择下载目录",
        openLabel: "选择此目录",
    });

    return folders?.[0].fsPath;
}
