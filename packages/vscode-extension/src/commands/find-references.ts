import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as vscode from 'vscode';
import { showError, showInfo } from '../infra';

export async function findImageReferences(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        showError('Please open a Markdown file first');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    const imageUrl = extractImageUrl(selectedText);
    if (!imageUrl) {
        showError('Please select an image (Markdown or HTML format)');
        return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (!workspaceFolder) {
        showError('Please open a workspace folder');
        return;
    }

    const searchDir = workspaceFolder.uri.fsPath;

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Searching for image references...',
                cancellable: false,
            },
            async () => {
                const references = await findReferences(imageUrl, searchDir);

                if (references.length === 0) {
                    showInfo('No references found');
                    return;
                }

                const output = vscode.window.createOutputChannel('CMTX: Image References');
                output.clear();
                output.appendLine(`=== References to: ${imageUrl} ===\n`);

                for (const ref of references) {
                    output.appendLine(`${ref.file}:${ref.line}:${ref.column}`);
                    output.appendLine(`  ${ref.text}`);
                    output.appendLine('');
                }

                output.show();
                showInfo(`Found ${references.length} references`);
            }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showError(`Search failed: ${message}`);
    }
}

function extractImageUrl(text: string): string | null {
    const markdownMatch = text.match(/!\[[^\]]*\]\(([^)]+)\)/);
    if (markdownMatch) {
        return markdownMatch[1];
    }

    const htmlMatch = text.match(/<img[^>]+src=['"]([^'"]+)['"]/);
    if (htmlMatch) {
        return htmlMatch[1];
    }

    return null;
}

interface Reference {
    file: string;
    line: number;
    column: number;
    text: string;
}

async function searchMarkdownFiles(): Promise<vscode.Uri[]> {
    return vscode.workspace.findFiles('**/*.md', '**/node_modules/**');
}

function matchImagePatterns(line: string, fileName: string): RegExpMatchArray | null {
    const patterns = [
        new RegExp(`!\\[[^\\]]*\\]\\([^)]*${escapeRegex(fileName)}[^)]*\\)`),
        new RegExp(`<img[^>]*src=['"][^'"]*${escapeRegex(fileName)}[^'"]*['"][^>]*>`),
    ];

    for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
            return match;
        }
    }
    return null;
}

async function findReferencesInFile(
    file: vscode.Uri,
    fileName: string,
    searchDir: string
): Promise<Reference[]> {
    const references: Reference[] = [];

    try {
        const content = await readFile(file.fsPath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes(fileName) || line.includes(fileName.split('/').pop() || '')) {
                const match = matchImagePatterns(line, fileName);
                if (match && match.index !== undefined) {
                    references.push({
                        file: path.relative(searchDir, file.fsPath),
                        line: i + 1,
                        column: match.index + 1,
                        text: match[0],
                    });
                }
            }
        }
    } catch {
        // Skip files that can't be read
    }

    return references;
}

async function findReferences(imageUrl: string, searchDir: string): Promise<Reference[]> {
    const references: Reference[] = [];
    const files = await searchMarkdownFiles();
    const fileName = imageUrl.split('/').pop() || imageUrl;

    for (const file of files) {
        const fileRefs = await findReferencesInFile(file, fileName, searchDir);
        references.push(...fileRefs);
    }

    return references;
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
