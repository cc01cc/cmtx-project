import { filterImagesInText, isWebSource } from "@cmtx/core";
import * as vscode from "vscode";
import { showError, showInfo } from "../infra/notification.js";
import {
    getCurrentWorkspaceFolder,
    getStorageConfig,
    loadCmtxConfig,
} from "../infra/cmtx-config.js";
import { executeRuleCommand } from "./rules/execute-rule.js";

/**
 * Flag to prevent concurrent uploads
 */
let isUploading = false;

/**
 * 上传选区中的本地图片到云端存储
 *
 * @description
 * 使用 Rule 引擎执行上传，支持冲突检测和解决对话框。
 */
export async function uploadSelectedImages(): Promise<void> {
    // Prevent concurrent uploads
    if (isUploading) {
        await showInfo("上传正在进行中，请稍候...");
        return;
    }

    isUploading = true;

    try {
        await doUploadSelectedImages();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await showError(`上传失败：${message}`);
    } finally {
        isUploading = false;
    }
}

async function doUploadSelectedImages(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "markdown") {
        await showError("Please open a Markdown file first");
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        await showError("Please select text containing images");
        return;
    }

    const selectedText = editor.document.getText(selection);
    if (!selectedText.trim()) {
        await showError("Selected text is empty");
        return;
    }

    // Validate: Check if selection contains local images
    const imagesInSelection = filterImagesInText(selectedText);
    const localImages = imagesInSelection.filter((img) => !isWebSource(img.src));

    if (localImages.length === 0) {
        await showError("选区中没有可上传的本地图片。请选择包含本地图片路径的文本区域。");
        return;
    }

    const workspaceFolder = getCurrentWorkspaceFolder();
    const cmtxConfig = workspaceFolder ? await loadCmtxConfig(workspaceFolder) : undefined;
    const storage = cmtxConfig ? getStorageConfig(cmtxConfig) : undefined;

    if (!storage?.config.bucket || !storage?.config.region) {
        await showError("Please configure cloud storage settings first");
        return;
    }

    // 构建选区配置
    const uploadConfig = {
        upload: true,
        selection: {
            startOffset: editor.document.offsetAt(selection.start),
            endOffset: editor.document.offsetAt(selection.end),
        },
    };

    // 调用 Rule 引擎执行上传
    await executeRuleCommand("upload-images", uploadConfig as Record<string, unknown>);

    // 清除选区
    editor.selection = new vscode.Selection(0, 0, 0, 0);
}
