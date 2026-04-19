import { filterImagesFromFile, type ImageMatch } from '@cmtx/core';
import * as vscode from 'vscode';
import { showError, showInfo, validateMarkdownEditor } from '../infra';

interface ImageCategories {
    local: ImageMatch[];
    web: ImageMatch[];
}

function categorizeImages(images: ImageMatch[]): ImageCategories {
    return {
        local: images.filter((img) => img.type === 'local'),
        web: images.filter((img) => img.type === 'web'),
    };
}

function generateImageReport(images: ImageMatch[], categories: ImageCategories): string {
    const lines: string[] = [];

    lines.push('=== Image Analysis Report ===\n');
    lines.push(`Total images: ${images.length}`);
    lines.push(`Local images: ${categories.local.length}`);
    lines.push(`Web images: ${categories.web.length}`);
    lines.push('');

    if (categories.local.length > 0) {
        lines.push('--- Local Images ---');
        for (const img of categories.local) {
            const path = 'absLocalPath' in img ? img.absLocalPath : img.src;
            lines.push(`  ${path}`);
        }
        lines.push('');
    }

    if (categories.web.length > 0) {
        lines.push('--- Web Images ---');
        for (const img of categories.web) {
            lines.push(`  ${img.src}`);
        }
    }

    return lines.join('\n');
}

function displayReport(report: string, summary: string, outputChannel: vscode.OutputChannel): void {
    outputChannel.clear();
    outputChannel.appendLine(report);
    outputChannel.show();
    showInfo(summary);
}

export async function analyzeDocument(): Promise<void> {
    const editor = validateMarkdownEditor();
    if (!editor) {
        showError('Please open a Markdown file first');
        return;
    }

    const filePath = editor.document.uri.fsPath;

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing document images...',
                cancellable: false,
            },
            async () => {
                const images = await filterImagesFromFile(filePath);

                if (images.length === 0) {
                    showInfo('No images found in the document');
                    return;
                }

                const categories = categorizeImages(images);
                const report = generateImageReport(images, categories);
                const summary = `Found ${images.length} images (${categories.local.length} local, ${categories.web.length} web)`;
                const outputChannel = vscode.window.createOutputChannel('CMTX: Image Analysis');

                displayReport(report, summary, outputChannel);
            }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showError(`Analysis failed: ${message}`);
    }
}
