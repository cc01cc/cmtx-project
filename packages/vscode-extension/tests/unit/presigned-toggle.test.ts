import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
    workspace: {
        getConfiguration: vi.fn(),
    },
    window: {
        createOutputChannel: vi.fn(),
    },
    commands: {
        executeCommand: vi.fn(),
    },
    ConfigurationTarget: {
        Global: 1,
    },
}));

vi.mock("../../src/infra/notification.js", () => ({
    showInfo: vi.fn(),
}));

vi.mock("../../src/infra/cmtx-config.js", () => ({
    getCurrentWorkspaceFolder: vi.fn(),
    loadCmtxConfig: vi.fn(),
}));

vi.mock("../../src/providers/markdown-preview.js", () => ({
    deactivatePresignedUrl: vi.fn(),
    reloadPresignedUrlConfig: vi.fn(),
}));

vi.mock("@cmtx/asset/config", () => ({
    resolvePresignedUrlOptions: vi.fn(() => ({
        storageConfigs: {},
        domains: [],
        expire: 600,
        maxRetryCount: 3,
    })),
}));

import * as vscode from "vscode";
import { showInfo } from "../../src/infra/notification.js";
import { getCurrentWorkspaceFolder, loadCmtxConfig } from "../../src/infra/cmtx-config.js";
import {
    deactivatePresignedUrl,
    reloadPresignedUrlConfig,
} from "../../src/providers/markdown-preview.js";
import { togglePresignedUrlsCommand } from "../../src/commands/presigned-toggle";

describe("presigned-toggle", () => {
    const mockGetConfiguration = vi.mocked(vscode.workspace.getConfiguration);
    const mockExecuteCommand = vi.mocked(vscode.commands.executeCommand);
    const mockShowInfo = vi.mocked(showInfo);
    const mockGetCurrentWorkspaceFolder = vi.mocked(getCurrentWorkspaceFolder);
    const mockLoadCmtxConfig = vi.mocked(loadCmtxConfig);
    const mockDeactivatePresignedUrl = vi.mocked(deactivatePresignedUrl);
    const mockReloadPresignedUrlConfig = vi.mocked(reloadPresignedUrlConfig);

    let mockConfig: ReturnType<typeof vscode.workspace.getConfiguration>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockConfig = {
            get: vi.fn(),
            update: vi.fn(),
            inspect: vi.fn(),
            has: vi.fn(),
        } as unknown as ReturnType<typeof vscode.workspace.getConfiguration>;

        mockGetConfiguration.mockReturnValue(mockConfig);
        mockExecuteCommand.mockResolvedValue(undefined);
        mockShowInfo.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("toggle from enabled to disabled", () => {
        it("should deactivate presigned URL and refresh preview", async () => {
            mockConfig.get.mockReturnValue(true);
            mockConfig.update.mockResolvedValue(undefined);

            await togglePresignedUrlsCommand();

            expect(mockConfig.get).toHaveBeenCalledWith("presignedUrls.enabled", true);
            expect(mockConfig.update).toHaveBeenCalledWith(
                "presignedUrls.enabled",
                false,
                vscode.ConfigurationTarget.Global,
            );
            expect(mockDeactivatePresignedUrl).toHaveBeenCalled();
            expect(mockExecuteCommand).toHaveBeenCalledWith("markdown.preview.refresh");
            expect(mockShowInfo).toHaveBeenCalledWith(
                "Presigned URLs disabled. Preview refreshed.",
            );
        });
    });

    describe("toggle from disabled to enabled", () => {
        it("should reload presigned URL config and refresh preview", async () => {
            mockConfig.get.mockReturnValue(false);
            mockConfig.update.mockResolvedValue(undefined);

            const mockWorkspaceFolder = { uri: { fsPath: "/test" } } as vscode.WorkspaceFolder;
            mockGetCurrentWorkspaceFolder.mockReturnValue(mockWorkspaceFolder);
            mockLoadCmtxConfig.mockResolvedValue({
                presignedUrls: {
                    domains: [
                        {
                            domain: "test.oss-cn-hangzhou.aliyuncs.com",
                            provider: "aliyun-oss",
                        },
                    ],
                },
            } as any);
            mockReloadPresignedUrlConfig.mockReturnValue(undefined);

            await togglePresignedUrlsCommand();

            expect(mockConfig.get).toHaveBeenCalledWith("presignedUrls.enabled", true);
            expect(mockConfig.update).toHaveBeenCalledWith(
                "presignedUrls.enabled",
                true,
                vscode.ConfigurationTarget.Global,
            );
            expect(mockReloadPresignedUrlConfig).toHaveBeenCalled();
            expect(mockExecuteCommand).toHaveBeenCalledWith("markdown.preview.refresh");
            expect(mockShowInfo).toHaveBeenCalledWith("Presigned URLs enabled. Preview refreshed.");
        });
    });

    describe("toggle when no workspace folder", () => {
        it("should still update setting and refresh preview", async () => {
            mockConfig.get.mockReturnValue(false);
            mockConfig.update.mockResolvedValue(undefined);
            mockGetCurrentWorkspaceFolder.mockReturnValue(undefined);

            await togglePresignedUrlsCommand();

            expect(mockConfig.update).toHaveBeenCalled();
            expect(mockDeactivatePresignedUrl).not.toHaveBeenCalled();
            expect(mockReloadPresignedUrlConfig).not.toHaveBeenCalled();
            expect(mockExecuteCommand).toHaveBeenCalledWith("markdown.preview.refresh");
        });
    });

    describe("toggle when config has no presignedUrls", () => {
        it("should update setting and refresh without reload", async () => {
            mockConfig.get.mockReturnValue(false);
            mockConfig.update.mockResolvedValue(undefined);

            const mockWorkspaceFolder = { uri: { fsPath: "/test" } } as vscode.WorkspaceFolder;
            mockGetCurrentWorkspaceFolder.mockReturnValue(mockWorkspaceFolder);
            mockLoadCmtxConfig.mockResolvedValue({} as any);

            await togglePresignedUrlsCommand();

            expect(mockConfig.update).toHaveBeenCalled();
            expect(mockReloadPresignedUrlConfig).not.toHaveBeenCalled();
            expect(mockExecuteCommand).toHaveBeenCalledWith("markdown.preview.refresh");
        });
    });
});
