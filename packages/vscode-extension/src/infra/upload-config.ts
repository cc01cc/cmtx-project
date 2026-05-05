import type { IStorageAdapter } from "@cmtx/storage";
import { createStorageAdapterAsync } from "../container.js";
import { getStorageConfig, getUploadConfigFromCmtx, loadCmtxConfig } from "./cmtx-config.js";
import * as vscode from "vscode";

export interface ExplorerUploadConfig {
    adapter: IStorageAdapter;
    namingTemplate: string;
    prefix: string;
    conflictStrategy: { type: "skip-all" | "replace-all" };
}

export async function createUploadConfig(
    workspaceFolder: vscode.WorkspaceFolder,
): Promise<ExplorerUploadConfig | undefined> {
    const cmtxConfig = await loadCmtxConfig(workspaceFolder);
    if (!cmtxConfig) {
        return undefined;
    }

    const storageConfig = getStorageConfig(cmtxConfig);
    if (!storageConfig) {
        return undefined;
    }

    const adapter = await createStorageAdapterAsync(storageConfig);
    const uploadParams = getUploadConfigFromCmtx(cmtxConfig);
    const strategy = (uploadParams.conflictStrategy as string) ?? "skip";

    return {
        adapter,
        namingTemplate: (uploadParams.namingTemplate as string) ?? "{name}.{ext}",
        prefix: (uploadParams.prefix as string) ?? "",
        conflictStrategy: strategy === "overwrite" ? { type: "replace-all" } : { type: "skip-all" },
    };
}
