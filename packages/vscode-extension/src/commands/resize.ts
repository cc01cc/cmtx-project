import * as vscode from "vscode";
import { validateMarkdownEditor } from "../infra/editor.js";
import {
    getCurrentWorkspaceFolder,
    getResizeWidths,
    loadCmtxConfig,
} from "../infra/cmtx-config.js";
import { showError, showInfo } from "../infra/notification.js";
import { executeRuleCommand } from "./rules/execute-rule.js";

export async function zoomIn(): Promise<void> {
    await zoomImage("in");
}

export async function zoomOut(): Promise<void> {
    await zoomImage("out");
}

async function getWidths(): Promise<number[]> {
    const workspaceFolder = getCurrentWorkspaceFolder();
    const cmtxConfig = workspaceFolder ? await loadCmtxConfig(workspaceFolder) : undefined;
    return cmtxConfig ? getResizeWidths(cmtxConfig) : [360, 480, 640, 800, 960, 1200];
}

export async function setImageWidth(): Promise<void> {
    const editor = validateMarkdownEditor();
    if (!editor) {
        await showError("Please open a Markdown file first");
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        await showError("Please select text containing images");
        return;
    }

    const widths = await getWidths();
    const picked = await vscode.window.showQuickPick(
        widths.map((w) => ({ label: `${w}px`, value: w })),
        { placeHolder: "Select image width" },
    );

    if (!picked) {
        return;
    }

    await executeRuleCommand("resize-image", {
        resize: true,
        targetWidth: picked.value,
        selection: {
            startOffset: editor.document.offsetAt(selection.start),
            endOffset: editor.document.offsetAt(selection.end),
        },
    });

    await showInfo(`Set image width to ${picked.value}px`);
}

async function zoomImage(direction: "in" | "out"): Promise<void> {
    const editor = validateMarkdownEditor();
    if (!editor) {
        await showError("Please open a Markdown file first");
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        await showError("Please select text containing images");
        return;
    }

    const widths = await getWidths();

    await executeRuleCommand("resize-image", {
        resize: true,
        direction,
        availableWidths: widths,
        selection: {
            startOffset: editor.document.offsetAt(selection.start),
            endOffset: editor.document.offsetAt(selection.end),
        },
    });

    await showInfo(`Zoomed image (${direction})`);
}
