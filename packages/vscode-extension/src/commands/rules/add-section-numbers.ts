/**
 * add-section-numbers Rule 命令
 */

import {
    getAddSectionNumbersConfig,
    getCurrentWorkspaceFolder,
    loadCmtxConfig,
} from "../../infra/cmtx-config.js";
import { showError } from "../../infra/notification.js";
import { executeRuleCommand } from "./execute-rule.js";

export async function addSectionNumbersRuleCommand(): Promise<void> {
    const workspaceFolder = getCurrentWorkspaceFolder();
    if (!workspaceFolder) {
        await showError("Please open a workspace folder");
        return;
    }

    const config = await loadCmtxConfig(workspaceFolder);
    const sectionNumberOptions = config ? getAddSectionNumbersConfig(config) : {};

    await executeRuleCommand("add-section-numbers", sectionNumberOptions);
}
