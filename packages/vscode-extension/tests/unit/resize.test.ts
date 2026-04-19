import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

// Mock vscode module
vi.mock('vscode', () => ({
    window: {
        showWarningMessage: vi.fn(),
        showErrorMessage: vi.fn(),
        showInformationMessage: vi.fn(),
        showQuickPick: vi.fn(),
    },
    Selection: class Selection {
        constructor(
            public anchor: { line: number; character: number },
            public active: { line: number; character: number }
        ) {}
        get isEmpty() {
            return (
                this.anchor.line === this.active.line &&
                this.anchor.character === this.active.character
            );
        }
    },
}));

// Mock @cmtx/core
vi.mock('@cmtx/core', () => ({
    updateImageAttribute: vi.fn((html, attr, value) =>
        html.replace(/width="[^"]*"/, `width="${value}"`)
    ),
}));

// Mock infra module
const mockShowError = vi.fn();
const mockShowInfo = vi.fn();
const mockValidateMarkdownEditor = vi.fn();
const mockGetResizeConfig = vi.fn();

vi.mock('../../src/infra', () => ({
    getResizeConfig: (...args: any[]) => mockGetResizeConfig(...args),
    showError: (...args: any[]) => mockShowError(...args),
    showInfo: (...args: any[]) => mockShowInfo(...args),
    validateMarkdownEditor: (...args: any[]) => mockValidateMarkdownEditor(...args),
}));

// Mock image-processor
const mockParseImageElements = vi.fn();
const mockDetectCurrentWidth = vi.fn();
const mockCalculateTargetWidth = vi.fn();

vi.mock('../../src/utils/image-processor', () => ({
    parseImageElements: (...args: any[]) => mockParseImageElements(...args),
    detectCurrentWidth: (...args: any[]) => mockDetectCurrentWidth(...args),
    calculateTargetWidth: (...args: any[]) => mockCalculateTargetWidth(...args),
}));

import { updateImageAttribute } from '@cmtx/core';

describe('resize commands', () => {
    let mockEditor: any;
    let mockDocument: any;
    let mockEditBuilder: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockEditBuilder = {
            replace: vi.fn(),
        };

        mockDocument = {
            getText: vi.fn(),
        };

        mockEditor = {
            document: mockDocument,
            selection: new vscode.Selection({ line: 0, character: 0 }, { line: 0, character: 100 }),
            edit: vi.fn().mockImplementation((callback) => {
                callback(mockEditBuilder);
                return Promise.resolve(true);
            }),
        };

        mockValidateMarkdownEditor.mockReturnValue(mockEditor);
        mockGetResizeConfig.mockResolvedValue({
            widths: [360, 480, 640, 800, 960, 1200],
            domains: [],
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('zoomIn', () => {
        it('should update HTML image width without modal dialog', async () => {
            const selectedText = '<img src="./image.png" alt="test" width="400">';
            mockDocument.getText.mockReturnValue(selectedText);
            mockParseImageElements.mockReturnValue([
                {
                    type: 'html',
                    originalText: selectedText,
                    src: './image.png',
                    alt: 'test',
                    currentWidth: 400,
                },
            ]);
            mockDetectCurrentWidth.mockReturnValue(400);
            mockCalculateTargetWidth.mockReturnValue(640);

            const { zoomIn } = await import('../../src/commands/resize');
            await zoomIn();

            // Should not show quick pick for HTML images
            expect(vscode.window.showQuickPick).not.toHaveBeenCalled();

            // Should update width attribute
            expect(updateImageAttribute).toHaveBeenCalledWith(selectedText, 'width', '640');

            // Should show success message
            expect(mockShowInfo).toHaveBeenCalledWith('Set image width to 640px');
        });

        it('should show quick pick for markdown images and convert on confirm', async () => {
            const selectedText = '![alt text](./image.png)';
            mockDocument.getText.mockReturnValue(selectedText);
            mockParseImageElements.mockReturnValue([
                {
                    type: 'markdown',
                    originalText: selectedText,
                    src: './image.png',
                    alt: 'alt text',
                },
            ]);
            mockDetectCurrentWidth.mockReturnValue(640);
            mockCalculateTargetWidth.mockReturnValue(800);

            // Mock user clicking "Convert & Set Width"
            (vscode.window.showQuickPick as any).mockResolvedValue({
                label: 'Convert & Set Width',
                description: expect.any(String),
            });

            const { zoomIn } = await import('../../src/commands/resize');
            await zoomIn();

            // Should show quick pick dialog
            expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ label: 'Convert & Set Width' }),
                    expect.objectContaining({ label: 'Cancel' }),
                ]),
                expect.objectContaining({
                    placeHolder: expect.stringContaining('Markdown syntax'),
                })
            );

            // Should convert markdown to HTML with width
            expect(mockEditBuilder.replace).toHaveBeenCalledWith(
                mockEditor.selection,
                '<img src="./image.png" alt="alt text" width="800">'
            );

            // Should show success message
            expect(mockShowInfo).toHaveBeenCalledWith('Set image width to 800px');
        });

        it('should cancel operation when user clicks Cancel', async () => {
            const selectedText = '![alt text](./image.png)';
            mockDocument.getText.mockReturnValue(selectedText);
            mockParseImageElements.mockReturnValue([
                {
                    type: 'markdown',
                    originalText: selectedText,
                    src: './image.png',
                    alt: 'alt text',
                },
            ]);
            mockDetectCurrentWidth.mockReturnValue(640);
            mockCalculateTargetWidth.mockReturnValue(800);

            // Mock user clicking "Cancel"
            (vscode.window.showQuickPick as any).mockResolvedValue({
                label: 'Cancel',
                description: expect.any(String),
            });

            const { zoomIn } = await import('../../src/commands/resize');
            await zoomIn();

            // Should show quick pick dialog
            expect(vscode.window.showQuickPick).toHaveBeenCalled();

            // Should NOT modify document
            expect(mockEditBuilder.replace).not.toHaveBeenCalled();

            // Should NOT show success message
            expect(mockShowInfo).not.toHaveBeenCalled();
        });

        it('should handle mixed markdown and HTML images', async () => {
            const selectedText =
                '![md image](./a.png) and <img src="./b.png" alt="html" width="400">';
            mockDocument.getText.mockReturnValue(selectedText);
            mockParseImageElements.mockReturnValue([
                {
                    type: 'markdown',
                    originalText: '![md image](./a.png)',
                    src: './a.png',
                    alt: 'md image',
                },
                {
                    type: 'html',
                    originalText: '<img src="./b.png" alt="html" width="400">',
                    src: './b.png',
                    alt: 'html',
                    currentWidth: 400,
                },
            ]);
            mockDetectCurrentWidth.mockReturnValue(400);
            mockCalculateTargetWidth.mockReturnValue(640);

            // Mock user clicking "Convert & Set Width"
            (vscode.window.showQuickPick as any).mockResolvedValue({
                label: 'Convert & Set Width',
                description: expect.any(String),
            });

            const { zoomIn } = await import('../../src/commands/resize');
            await zoomIn();

            // Should show quick pick dialog only once
            expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(1);

            // Should replace with converted HTML
            expect(mockEditBuilder.replace).toHaveBeenCalled();
            const replacedText = mockEditBuilder.replace.mock.calls[0][1];

            // Markdown should be converted to HTML with width
            expect(replacedText).toContain('<img src="./a.png" alt="md image" width="640">');

            // HTML should have width updated
            expect(replacedText).toContain('width="640"');
        });

        it('should handle multiple markdown images in selection', async () => {
            const selectedText = '![img1](./a.png) ![img2](./b.png) ![img3](./c.png)';
            mockDocument.getText.mockReturnValue(selectedText);
            mockParseImageElements.mockReturnValue([
                { type: 'markdown', originalText: '![img1](./a.png)', src: './a.png', alt: 'img1' },
                { type: 'markdown', originalText: '![img2](./b.png)', src: './b.png', alt: 'img2' },
                { type: 'markdown', originalText: '![img3](./c.png)', src: './c.png', alt: 'img3' },
            ]);
            mockDetectCurrentWidth.mockReturnValue(800);
            mockCalculateTargetWidth.mockReturnValue(960);

            // Mock user clicking "Convert & Set Width"
            (vscode.window.showQuickPick as any).mockResolvedValue({
                label: 'Convert & Set Width',
                description: expect.any(String),
            });

            const { zoomIn } = await import('../../src/commands/resize');
            await zoomIn();

            // Should show quick pick dialog only once
            expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(1);

            // All markdown images should be converted
            expect(mockEditBuilder.replace).toHaveBeenCalled();
            const replacedText = mockEditBuilder.replace.mock.calls[0][1];

            expect(replacedText).toContain('<img src="./a.png" alt="img1" width="960">');
            expect(replacedText).toContain('<img src="./b.png" alt="img2" width="960">');
            expect(replacedText).toContain('<img src="./c.png" alt="img3" width="960">');
        });

        it('should show error when no images found in selection', async () => {
            const selectedText = 'Plain text without images';
            mockDocument.getText.mockReturnValue(selectedText);
            mockParseImageElements.mockReturnValue([]);

            const { zoomIn } = await import('../../src/commands/resize');
            await zoomIn();

            // Should show error
            expect(mockShowError).toHaveBeenCalledWith('No images found in selection');

            // Should not show quick pick or modify document
            expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
            expect(mockEditBuilder.replace).not.toHaveBeenCalled();
        });

        it('should handle markdown image with empty alt text', async () => {
            const selectedText = '![](./image.png)';
            mockDocument.getText.mockReturnValue(selectedText);
            mockParseImageElements.mockReturnValue([
                { type: 'markdown', originalText: selectedText, src: './image.png', alt: '' },
            ]);
            mockDetectCurrentWidth.mockReturnValue(360);
            mockCalculateTargetWidth.mockReturnValue(480);

            // Mock user clicking "Convert & Set Width"
            (vscode.window.showQuickPick as any).mockResolvedValue({
                label: 'Convert & Set Width',
                description: expect.any(String),
            });

            const { zoomIn } = await import('../../src/commands/resize');
            await zoomIn();

            // Should convert with empty alt
            expect(mockEditBuilder.replace).toHaveBeenCalledWith(
                mockEditor.selection,
                '<img src="./image.png" alt="" width="480">'
            );
        });
    });

    describe('zoomOut', () => {
        it('should decrease width for HTML images', async () => {
            const selectedText = '<img src="./image.png" width="800">';
            mockDocument.getText.mockReturnValue(selectedText);
            mockParseImageElements.mockReturnValue([
                { type: 'html', originalText: selectedText, src: './image.png', currentWidth: 800 },
            ]);
            mockDetectCurrentWidth.mockReturnValue(800);
            mockCalculateTargetWidth.mockReturnValue(640);

            const { zoomOut } = await import('../../src/commands/resize');
            await zoomOut();

            expect(updateImageAttribute).toHaveBeenCalledWith(selectedText, 'width', '640');
            expect(mockShowInfo).toHaveBeenCalledWith('Set image width to 640px');
        });
    });

    describe('setImageWidth', () => {
        it('should set specific width for HTML images', async () => {
            const selectedText = '<img src="./image.png" width="400">';
            mockDocument.getText.mockReturnValue(selectedText);
            mockParseImageElements.mockReturnValue([
                { type: 'html', originalText: selectedText, src: './image.png', currentWidth: 400 },
            ]);

            // Mock user selecting 960px from quick pick
            (vscode.window.showQuickPick as any).mockResolvedValue({ label: '960px', value: 960 });

            const { setImageWidth } = await import('../../src/commands/resize');
            await setImageWidth();

            expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ label: '360px', value: 360 }),
                    expect.objectContaining({ label: '960px', value: 960 }),
                ]),
                expect.objectContaining({ placeHolder: 'Select image width' })
            );

            expect(updateImageAttribute).toHaveBeenCalledWith(selectedText, 'width', '960');
            expect(mockShowInfo).toHaveBeenCalledWith('Set image width to 960px');
        });

        it('should show quick pick and convert for markdown images', async () => {
            const selectedText = '![test](./image.png)';
            mockDocument.getText.mockReturnValue(selectedText);
            mockParseImageElements.mockReturnValue([
                { type: 'markdown', originalText: selectedText, src: './image.png', alt: 'test' },
            ]);

            // Mock user selecting 800px from quick pick
            (vscode.window.showQuickPick as any).mockResolvedValue({ label: '800px', value: 800 });

            // Mock user clicking "Convert & Set Width"
            (vscode.window.showQuickPick as any).mockResolvedValueOnce({
                label: '800px',
                value: 800,
            });
            (vscode.window.showQuickPick as any).mockResolvedValueOnce({
                label: 'Convert & Set Width',
                description: expect.any(String),
            });

            const { setImageWidth } = await import('../../src/commands/resize');
            await setImageWidth();

            // Should show quick pick for width selection
            expect(vscode.window.showQuickPick).toHaveBeenCalled();

            // Should convert markdown to HTML
            expect(mockEditBuilder.replace).toHaveBeenCalled();
        });

        it('should return early if user cancels quick pick', async () => {
            mockParseImageElements.mockReturnValue([
                {
                    type: 'markdown',
                    originalText: '![test](./image.png)',
                    src: './image.png',
                    alt: 'test',
                },
            ]);

            // Mock user cancelling quick pick
            (vscode.window.showQuickPick as any).mockResolvedValue(undefined);

            const { setImageWidth } = await import('../../src/commands/resize');
            await setImageWidth();

            // Should not modify document
            expect(mockEditBuilder.replace).not.toHaveBeenCalled();
        });

        it('should show error if no editor is open', async () => {
            mockValidateMarkdownEditor.mockReturnValue(null);

            const { setImageWidth } = await import('../../src/commands/resize');
            await setImageWidth();

            expect(mockShowError).toHaveBeenCalledWith('Please open a Markdown file first');
        });

        it('should show error if selection is empty', async () => {
            // Create a new selection that is empty (same anchor and active)
            mockEditor.selection = new vscode.Selection(
                { line: 0, character: 0 },
                { line: 0, character: 0 }
            );

            const { setImageWidth } = await import('../../src/commands/resize');
            await setImageWidth();

            expect(mockShowError).toHaveBeenCalledWith('Please select text containing images');
        });
    });
});
