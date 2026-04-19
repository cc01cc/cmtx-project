import { formatHtmlImage, formatMarkdownImage, parseImages } from '@cmtx/core';
import * as vscode from 'vscode';
import { showError, showInfo, validateMarkdownEditor } from '../infra';

export async function formatToHtml(): Promise<void> {
    await formatImages('html');
}

export async function formatToMarkdown(): Promise<void> {
    await formatImages('markdown');
}

async function formatImages(targetFormat: 'html' | 'markdown'): Promise<void> {
    const editor = validateMarkdownEditor();
    if (!editor) {
        showError('Please open a Markdown file first');
        return;
    }

    const document = editor.document;
    const content = document.getText();
    const images = parseImages(content);

    if (images.length === 0) {
        showInfo('No images found in the document');
        return;
    }

    const sourceFormat = targetFormat === 'markdown' ? 'html' : 'md';
    const imagesToConvert = images.filter((img) => img.syntax === sourceFormat);

    if (imagesToConvert.length === 0) {
        showInfo(`All images are already in ${targetFormat} format`);
        return;
    }

    let newContent = content;
    let convertedCount = 0;

    for (const img of imagesToConvert) {
        const newImage =
            targetFormat === 'html'
                ? formatHtmlImage({ src: img.src, alt: img.alt || '' })
                : formatMarkdownImage({ src: img.src, alt: img.alt || '' });
        newContent = newContent.replace(img.raw, newImage);
        convertedCount++;
    }

    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(content.length));
    edit.replace(document.uri, fullRange, newContent);
    await vscode.workspace.applyEdit(edit);

    showInfo(`Converted ${convertedCount} images to ${targetFormat} format`);
}
