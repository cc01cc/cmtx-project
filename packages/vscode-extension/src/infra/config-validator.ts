import { ValidationResult, validateConfig as validateConfigFromAsset } from "@cmtx/asset/config";
import * as vscode from "vscode";
import type { CmtxConfig } from "@cmtx/asset/config";
import { showWarning } from "./notification.js";

/**
 * Validate CMTX configuration using @cmtx/asset validator
 */
export function validateConfig(config: CmtxConfig): ValidationResult {
    return validateConfigFromAsset(config);
}

/**
 * Show configuration validation errors in VSCode UI
 */
export async function showConfigValidationErrors(result: ValidationResult): Promise<void> {
    if (!result.hasErrors()) return;

    const errors = result.errors;
    const errorCount = errors.filter((e) => e.severity === "error").length;
    const warningCount = errors.filter((e) => e.severity === "warning").length;

    const items = errors.map((e) => ({
        label: `[${e.severity.toUpperCase()}] ${e.path}`,
        description: e.message,
        error: e,
    }));

    const selectedLabel = await showWarning(
        `Configuration has ${errorCount} errors and ${warningCount} warnings`,
        items.map((item) => item.label),
    );

    if (selectedLabel) {
        const selected = items.find((item) => item.label === selectedLabel);
        if (selected) {
            const action = await showWarning(`${selected.error.path}: ${selected.error.message}`, [
                "Edit Config",
                "Dismiss",
            ]);

            if (action === "Edit Config") {
                vscode.commands.executeCommand("cmtx.configEdit");
            }
        }
    }
}
