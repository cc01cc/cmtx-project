import { updateImageAttribute } from "@cmtx/core";
import * as vscode from "vscode";
import { validateMarkdownEditor } from "../infra/editor.js";
import {
    getCurrentWorkspaceFolder,
    getResizeWidths,
    loadCmtxConfig,
} from "../infra/cmtx-config.js";
import { showError, showInfo } from "../infra/notification.js";
import {
    calculateTargetWidth,
    detectCurrentWidth,
    parseImageElements,
} from "../utils/image-processor.js";

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

    await applyWidthChange(editor, selection, picked.value);
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
    const selectedText = editor.document.getText(selection);
    const elements = parseImageElements(selectedText);

    if (elements.length === 0) {
        await showError("No images found in selection");
        return;
    }

    const currentWidth = detectCurrentWidth(elements, widths);
    const targetWidth = calculateTargetWidth(currentWidth, direction, widths);

    await applyWidthChange(editor, selection, targetWidth);
}

async function applyWidthChange(
    editor: vscode.TextEditor,
    selection: vscode.Selection,
    targetWidth: number,
): Promise<void> {
    const selectedText = editor.document.getText(selection);
    const elements = parseImageElements(selectedText);

    if (elements.length === 0) {
        await showError("No images found in selection");
        return;
    }

    // Check for markdown images that need conversion
    const markdownElements = elements.filter((e) => e.type === "markdown");
    const htmlElements = elements.filter((e) => e.type === "html");

    // If there are markdown images, show quick pick for confirmation
    if (markdownElements.length > 0) {
        const result = await vscode.window.showQuickPick(
            [
                {
                    label: "Convert & Set Width",
                    description: `Convert Markdown to HTML and set width to ${targetWidth}px`,
                },
                {
                    label: "Cancel",
                    description: "Keep Markdown format (width cannot be set)",
                },
            ],
            {
                placeHolder: `Markdown syntax doesn't support width attributes. Select an action:`,
                ignoreFocusOut: false,
            },
        );

        if (!result || result.label !== "Convert & Set Width") {
            return; // User cancelled
        }
    }

    let newText = selectedText;

    // Process markdown elements - convert to HTML with width
    for (const element of markdownElements) {
        const newHtml = `<img src="${element.src}" alt="${element.alt || ""}" width="${targetWidth}">`;
        newText = newText.replace(element.originalText, newHtml);
    }

    // Process HTML elements - update width attribute
    for (const element of htmlElements) {
        const newHtml = updateImageAttribute(element.originalText, "width", targetWidth.toString());
        newText = newText.replace(element.originalText, newHtml);
    }

    await editor.edit((editBuilder) => {
        editBuilder.replace(selection, newText);
    });

    await showInfo(`Set image width to ${targetWidth}px`);
}
