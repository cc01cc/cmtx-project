import { vi } from 'vitest';

const mockCommands = {
    executeCommand: vi.fn().mockResolvedValue(undefined),
    registerCommand: vi.fn(),
};

const mockWindow = {
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    createOutputChannel: vi.fn(() => ({
        appendLine: vi.fn(),
        show: vi.fn(),
        dispose: vi.fn(),
    })),
    showTextDocument: vi.fn(),
    activeTextEditor: undefined,
};

const mockWorkspace = {
    getConfiguration: vi.fn(() => ({
        get: vi.fn((key: string, defaultValue: unknown) => defaultValue),
    })),
    onDidChangeConfiguration: vi.fn(),
    openTextDocument: vi.fn(),
    workspaceFolders: undefined,
};

const mockUri = {
    parse: vi.fn((str: string) => ({ toString: () => str })),
    file: vi.fn((path: string) => ({ fsPath: path })),
};

const ExtensionMode = {
    Production: 1,
    Development: 2,
    Test: 3,
};

export const commands = mockCommands;
export const window = mockWindow;
export const workspace = mockWorkspace;
export const Uri = mockUri;
export { ExtensionMode };

export default {
    commands: mockCommands,
    window: mockWindow,
    workspace: mockWorkspace,
    Uri: mockUri,
    ExtensionMode,
};
