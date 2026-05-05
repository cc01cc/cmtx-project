import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";

vi.mock("vscode", () => ({
    window: {
        showWarningMessage: vi.fn(),
        showErrorMessage: vi.fn(),
        showInformationMessage: vi.fn(),
        showQuickPick: vi.fn(),
    },
    Selection: class Selection {
        constructor(
            public anchor: { line: number; character: number },
            public active: { line: number; character: number },
        ) {}
        get isEmpty() {
            return (
                this.anchor.line === this.active.line &&
                this.anchor.character === this.active.character
            );
        }
        get start() {
            return this.anchor;
        }
        get end() {
            return this.active;
        }
    },
}));

const mockValidateMarkdownEditor = vi.fn();
const mockLoadCmtxConfig = vi.fn();
const mockGetResizeWidths = vi.fn();
const mockExecuteRuleCommand = vi.fn();

vi.mock("../../src/infra/editor.js", () => ({
    validateMarkdownEditor: (...args: any[]) => mockValidateMarkdownEditor(...args),
}));

vi.mock("../../src/infra/cmtx-config.js", () => ({
    getCurrentWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: "/test" } })),
    loadCmtxConfig: (...args: any[]) => mockLoadCmtxConfig(...args),
    getResizeWidths: (...args: any[]) => mockGetResizeWidths(...args),
}));

const mockShowError = vi.fn();
const mockShowInfo = vi.fn();

vi.mock("../../src/infra/notification.js", () => ({
    showError: (...args: any[]) => mockShowError(...args),
    showInfo: (...args: any[]) => mockShowInfo(...args),
}));

vi.mock("../../src/commands/rules/execute-rule.js", () => ({
    executeRuleCommand: (...args: any[]) => mockExecuteRuleCommand(...args),
}));

describe("resize commands", () => {
    let mockEditor: any;
    let mockDocument: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockDocument = {
            getText: vi.fn(),
            offsetAt: vi.fn((pos: any) => pos.character),
        };

        mockEditor = {
            document: mockDocument,
            selection: new vscode.Selection({ line: 0, character: 0 }, { line: 0, character: 100 }),
        };

        mockValidateMarkdownEditor.mockReturnValue(mockEditor);
        mockLoadCmtxConfig.mockResolvedValue({
            rules: {
                "resize-image": {
                    widths: [360, 480, 640, 800, 960, 1200],
                    domains: [],
                },
            },
        });
        mockGetResizeWidths.mockReturnValue([360, 480, 640, 800, 960, 1200]);
        mockExecuteRuleCommand.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("zoomIn", () => {
        it("should call executeRuleCommand with direction=in", async () => {
            const { zoomIn } = await import("../../src/commands/resize");
            await zoomIn();

            expect(mockExecuteRuleCommand).toHaveBeenCalledWith("resize-image", {
                resize: true,
                direction: "in",
                availableWidths: [360, 480, 640, 800, 960, 1200],
                selection: {
                    startOffset: 0,
                    endOffset: 100,
                },
            });
            expect(mockShowInfo).toHaveBeenCalledWith("Zoomed image (in)");
        });

        it("should show error when selection is empty", async () => {
            mockEditor.selection = new vscode.Selection(
                { line: 0, character: 0 },
                { line: 0, character: 0 },
            );

            const { zoomIn } = await import("../../src/commands/resize");
            await zoomIn();

            expect(mockShowError).toHaveBeenCalledWith("Please select text containing images");
            expect(mockExecuteRuleCommand).not.toHaveBeenCalled();
        });

        it("should show error when no editor is open", async () => {
            mockValidateMarkdownEditor.mockReturnValue(null);

            const { zoomIn } = await import("../../src/commands/resize");
            await zoomIn();

            expect(mockShowError).toHaveBeenCalledWith("Please open a Markdown file first");
        });
    });

    describe("zoomOut", () => {
        it("should call executeRuleCommand with direction=out", async () => {
            const { zoomOut } = await import("../../src/commands/resize");
            await zoomOut();

            expect(mockExecuteRuleCommand).toHaveBeenCalledWith("resize-image", {
                resize: true,
                direction: "out",
                availableWidths: [360, 480, 640, 800, 960, 1200],
                selection: {
                    startOffset: 0,
                    endOffset: 100,
                },
            });
            expect(mockShowInfo).toHaveBeenCalledWith("Zoomed image (out)");
        });
    });

    describe("setImageWidth", () => {
        it("should call executeRuleCommand with targetWidth from quick pick", async () => {
            (vscode.window.showQuickPick as any).mockResolvedValue({
                label: "960px",
                value: 960,
            });

            const { setImageWidth } = await import("../../src/commands/resize");
            await setImageWidth();

            expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ label: "360px", value: 360 }),
                    expect.objectContaining({ label: "960px", value: 960 }),
                ]),
                expect.objectContaining({ placeHolder: "Select image width" }),
            );

            expect(mockExecuteRuleCommand).toHaveBeenCalledWith("resize-image", {
                resize: true,
                targetWidth: 960,
                selection: {
                    startOffset: 0,
                    endOffset: 100,
                },
            });
            expect(mockShowInfo).toHaveBeenCalledWith("Set image width to 960px");
        });

        it("should return early if user cancels quick pick", async () => {
            (vscode.window.showQuickPick as any).mockResolvedValue(undefined);

            const { setImageWidth } = await import("../../src/commands/resize");
            await setImageWidth();

            expect(mockExecuteRuleCommand).not.toHaveBeenCalled();
        });

        it("should show error if selection is empty", async () => {
            mockEditor.selection = new vscode.Selection(
                { line: 0, character: 0 },
                { line: 0, character: 0 },
            );

            const { setImageWidth } = await import("../../src/commands/resize");
            await setImageWidth();

            expect(mockShowError).toHaveBeenCalledWith("Please select text containing images");
        });

        it("should show error if no editor is open", async () => {
            mockValidateMarkdownEditor.mockReturnValue(null);

            const { setImageWidth } = await import("../../src/commands/resize");
            await setImageWidth();

            expect(mockShowError).toHaveBeenCalledWith("Please open a Markdown file first");
        });
    });
});
