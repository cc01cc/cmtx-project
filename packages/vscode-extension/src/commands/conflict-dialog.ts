import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { IStorageAdapter } from '@cmtx/storage';
import * as vscode from 'vscode';

/**
 * 文件冲突信息
 */
export interface ConflictFile {
    /** 文件名 */
    fileName: string;
    /** 远程路径 */
    remotePath: string;
    /** 本地路径 */
    localPath: string;
    /** 预期的远程 URL */
    remoteUrl: string;
}

/**
 * 用户选择的操作类型
 */
export type ConflictAction = 'skip' | 'replace' | 'download';

/**
 * 冲突处理结果
 */
export interface ConflictResolution {
    /** 选中的文件 */
    selectedFiles: ConflictFile[];
    /** 执行的操作 */
    action: ConflictAction;
    /** 下载目录（仅当 action 为 download 时有效） */
    downloadDir?: string;
}

/**
 * 下载结果
 */
export interface DownloadResult {
    /** 成功下载的文件数 */
    downloaded: number;
    /** 跳过的文件数（已存在） */
    skipped: number;
    /** 下载目录 */
    downloadDir: string;
    /** 错误信息 */
    errors?: string[];
}

/**
 * QuickPick 项类型 - 用于选择文件
 */
interface FileQuickPickItem extends vscode.QuickPickItem {
    conflictFile: ConflictFile;
}

/**
 * QuickPick 项类型 - 用于选择操作
 */
interface ActionQuickPickItem extends vscode.QuickPickItem {
    action: ConflictAction;
}

/**
 * 生成随机字符串
 */
function generateRandomString(length: number): string {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
}

/**
 * 显示文件冲突处理对话框（两步或三步流程）
 *
 * 单文件冲突：直接显示操作选择
 * 多文件冲突：先选择文件，再选择操作
 * 选择下载时：额外显示下载目录选择
 *
 * @param conflicts - 冲突文件列表
 * @param baseDir - 用于生成默认下载目录的基础目录
 * @returns 用户的选择结果，如果取消则返回 undefined
 */
export async function showConflictResolutionDialog(
    conflicts: ConflictFile[],
    baseDir: string
): Promise<ConflictResolution | undefined> {
    // 单文件冲突：直接选择操作
    if (conflicts.length === 1) {
        const action = await showActionPicker(conflicts, conflicts);
        if (!action) return undefined;

        // 如果选择下载，显示下载目录选择
        if (action === 'download') {
            const downloadDir = await showDownloadDirPicker(baseDir);
            if (!downloadDir) return undefined;
            return {
                selectedFiles: conflicts,
                action,
                downloadDir,
            };
        }

        return {
            selectedFiles: conflicts,
            action,
        };
    }

    // 多文件冲突：两步流程
    // 第一步：选择文件
    const selectedFiles = await showFilePicker(conflicts);
    if (!selectedFiles || selectedFiles.length === 0) {
        return undefined;
    }

    // 第二步：选择操作
    const action = await showActionPicker(selectedFiles, conflicts);
    if (!action) return undefined;

    // 如果选择下载，显示下载目录选择（第三步）
    if (action === 'download') {
        const downloadDir = await showDownloadDirPicker(baseDir);
        if (!downloadDir) return undefined;
        return {
            selectedFiles,
            action,
            downloadDir,
        };
    }

    return {
        selectedFiles,
        action,
    };
}

/**
 * 第一步：选择文件
 */
async function showFilePicker(conflicts: ConflictFile[]): Promise<ConflictFile[] | undefined> {
    const quickPick = vscode.window.createQuickPick<FileQuickPickItem>();

    quickPick.canSelectMany = true;
    quickPick.title = `${conflicts.length} 个文件已存在于远程存储`;
    quickPick.placeholder = '选择要处理的文件 (Ctrl+A 全选, 空格切换, Enter 确认)';
    quickPick.ignoreFocusOut = true; // 点击外部不关闭

    // 创建列表项
    quickPick.items = conflicts.map((conflict) => ({
        label: conflict.fileName,
        description: `远程: ${conflict.remotePath}`,
        conflictFile: conflict,
        picked: true, // 默认全选
    }));

    // 初始全选
    quickPick.selectedItems = quickPick.items;

    return new Promise((resolve) => {
        let resolved = false;

        // 确认选择（Enter）
        quickPick.onDidAccept(() => {
            const selected = Array.from(quickPick.selectedItems);
            if (selected.length === 0) {
                vscode.window.showWarningMessage('请至少选择一个文件');
                return;
            }
            resolved = true;
            quickPick.hide();
            resolve(selected.map((item) => item.conflictFile));
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
 * 第二步：选择操作
 */
async function showActionPicker(
    selectedFiles: ConflictFile[],
    allConflicts: ConflictFile[]
): Promise<ConflictAction | undefined> {
    const quickPick = vscode.window.createQuickPick<ActionQuickPickItem>();

    quickPick.canSelectMany = false;
    quickPick.title =
        selectedFiles.length === allConflicts.length
            ? `对全部 ${selectedFiles.length} 个文件执行操作`
            : `对选中的 ${selectedFiles.length} 个文件执行操作`;
    quickPick.placeholder = '选择操作 (Enter 确认, Esc 取消)';
    quickPick.ignoreFocusOut = true; // 点击外部不关闭

    // 创建操作选项
    quickPick.items = [
        {
            label: '$(debug-step-over) 跳过',
            description: '保留远程版本，不上传本地文件',
            action: 'skip',
        },
        {
            label: '$(replace-all) 替换',
            description: '上传本地文件，覆盖远程版本',
            action: 'replace',
        },
        {
            label: '$(cloud-download) 下载',
            description: '下载远程文件到指定目录',
            action: 'download',
        },
    ];

    return new Promise((resolve) => {
        let resolved = false;

        // 确认选择（Enter）
        quickPick.onDidAccept(() => {
            const selected = quickPick.selectedItems[0];
            if (selected) {
                resolved = true;
                quickPick.hide();
                resolve(selected.action);
            }
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
 * 第三步：选择下载目录（当用户选择下载时）
 */
async function showDownloadDirPicker(baseDir: string): Promise<string | undefined> {
    // 生成默认目录名：tmp-随机字符
    const randomSuffix = generateRandomString(8);
    const defaultDir = path.join(baseDir, `tmp-${randomSuffix}`);

    const items: vscode.QuickPickItem[] = [
        {
            label: '$(folder) 使用默认目录',
            description: defaultDir,
        },
        {
            label: '$(folder-opened) 浏览...',
            description: '选择其他目录',
        },
    ];

    const selected = await vscode.window.showQuickPick(items, {
        title: '选择远程图片下载目录',
        placeHolder: '选择下载目录（目录不存在将自动创建）',
        ignoreFocusOut: true, // 点击外部不关闭
    });

    if (!selected) return undefined;

    if (selected.label.includes('浏览')) {
        // 打开文件夹选择对话框
        const uri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: '选择下载目录',
        });
        return uri?.[0]?.fsPath;
    }

    return defaultDir;
}

/**
 * 下载远程文件到本地目录
 *
 * @param files - 要下载的文件列表
 * @param downloadDir - 下载目录
 * @param adapter - 存储适配器，用于直接下载
 * @returns 下载结果
 */
export async function downloadRemoteFiles(
    files: ConflictFile[],
    downloadDir: string,
    adapter: IStorageAdapter
): Promise<DownloadResult> {
    // 确保目录存在
    await fs.mkdir(downloadDir, { recursive: true });

    let downloaded = 0;
    let skipped = 0;
    const errors: string[] = [];

    // 检查 adapter 是否支持下载
    if (!adapter.downloadToFile) {
        return {
            downloaded: 0,
            skipped: 0,
            downloadDir,
            errors: ['adapter 不支持 downloadToFile'],
        };
    }

    for (const file of files) {
        const localPath = path.join(downloadDir, file.fileName);

        // 检查文件是否已存在
        try {
            await fs.access(localPath);
            skipped++; // 文件已存在，跳过
            continue;
        } catch {
            // 文件不存在，继续下载
        }

        // 使用 adapter 直接下载（不需要 signed URL）
        try {
            await adapter.downloadToFile(file.remotePath, localPath);
            downloaded++;
        } catch (error) {
            errors.push(
                `${file.fileName}: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    return { downloaded, skipped, downloadDir, errors };
}
