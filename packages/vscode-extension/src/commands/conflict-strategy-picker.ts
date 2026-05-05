/**
 * 冲突处理策略选择对话框
 *
 * @module conflict-strategy-picker
 * @description
 * 显示冲突处理策略选择界面，让用户选择批量处理方式。
 * 支持 2 种策略：全部跳过、全部替换。
 */

import type { ConflictResolutionStrategy } from "@cmtx/asset";
import * as vscode from "vscode";

interface StrategyQuickPickItem extends vscode.QuickPickItem {
    strategy: ConflictResolutionStrategy;
}

export async function showConflictStrategyPicker(
    conflictCount: number,
): Promise<ConflictResolutionStrategy | undefined> {
    const quickPick = vscode.window.createQuickPick<StrategyQuickPickItem>();

    quickPick.title = `检测到 ${conflictCount} 个文件冲突`;
    quickPick.placeholder = "选择冲突处理策略";
    quickPick.step = 1;
    quickPick.totalSteps = 1;
    quickPick.ignoreFocusOut = true;

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
    ];

    return new Promise((resolve) => {
        let resolved = false;

        quickPick.onDidAccept(() => {
            const selected = quickPick.activeItems[0];
            if (!selected) return;
            resolved = true;
            quickPick.hide();
            resolve(selected.strategy);
        });

        quickPick.onDidHide(() => {
            if (!resolved) resolve(undefined);
        });

        quickPick.show();
    });
}
