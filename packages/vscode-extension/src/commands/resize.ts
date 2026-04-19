import { updateImageAttribute } from '@cmtx/core';
import * as vscode from 'vscode';
import { getResizeConfig, showError, showInfo, validateMarkdownEditor } from '../infra';
import {
    calculateTargetWidth,
    detectCurrentWidth,
    parseImageElements,
} from '../utils/image-processor';

export async function zoomIn(): Promise<void> {
    await zoomImage('in');
}

export async function zoomOut(): Promise<void> {
    await zoomImage('out');
}

export async function setImageWidth(): Promise<void> {
    const editor = validateMarkdownEditor();
    if (!editor) {
        showError('Please open a Markdown file first');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        showError('Please select text containing images');
        return;
    }

    const config = await getResizeConfig();

    const picked = await vscode.window.showQuickPick(
        config.widths.map((w) => ({ label: `${w}px`, value: w })),
        { placeHolder: 'Select image width' }
    );

    if (!picked) {
        return;
    }

    await applyWidthChange(editor, selection, picked.value);
}

async function zoomImage(direction: 'in' | 'out'): Promise<void> {
    const editor = validateMarkdownEditor();
    if (!editor) {
        showError('Please open a Markdown file first');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        showError('Please select text containing images');
        return;
    }

    const config = await getResizeConfig();
    const selectedText = editor.document.getText(selection);
    const elements = parseImageElements(selectedText);

    if (elements.length === 0) {
        showError('No images found in selection');
        return;
    }

    const currentWidth = detectCurrentWidth(elements, config.widths);
    const targetWidth = calculateTargetWidth(currentWidth, direction, config.widths);

    await applyWidthChange(editor, selection, targetWidth);
}

async function applyWidthChange(
    editor: vscode.TextEditor,
    selection: vscode.Selection,
    targetWidth: number
): Promise<void> {
    const selectedText = editor.document.getText(selection);
    const elements = parseImageElements(selectedText);

    if (elements.length === 0) {
        showError('No images found in selection');
        return;
    }

    // Check for markdown images that need conversion
    const markdownElements = elements.filter((e) => e.type === 'markdown');
    const htmlElements = elements.filter((e) => e.type === 'html');

    // If there are markdown images, show quick pick for confirmation
    if (markdownElements.length > 0) {
        const result = await vscode.window.showQuickPick(
            [
                {
                    label: 'Convert & Set Width',
                    description: `Convert Markdown to HTML and set width to ${targetWidth}px`,
                },
                {
                    label: 'Cancel',
                    description: 'Keep Markdown format (width cannot be set)',
                },
            ],
            {
                placeHolder: `Markdown syntax doesn't support width attributes. Select an action:`,
                ignoreFocusOut: false,
            }
        );

        if (!result || result.label !== 'Convert & Set Width') {
            return; // User cancelled
        }
    }

    let newText = selectedText;

    // Process markdown elements - convert to HTML with width
    for (const element of markdownElements) {
        const newHtml = `<img src="${element.src}" alt="${element.alt || ''}" width="${targetWidth}">`;
        newText = newText.replace(element.originalText, newHtml);
    }

    // Process HTML elements - update width attribute
    for (const element of htmlElements) {
        const newHtml = updateImageAttribute(element.originalText, 'width', targetWidth.toString());
        newText = newText.replace(element.originalText, newHtml);
    }

    await editor.edit((editBuilder) => {
        editBuilder.replace(selection, newText);
    });

    showInfo(`Set image width to ${targetWidth}px`);
}
