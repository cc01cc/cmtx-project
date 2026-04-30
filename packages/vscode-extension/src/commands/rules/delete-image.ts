/**
 * delete-image Rule 命令
 */

import { getCurrentWorkspaceFolder, loadCmtxConfig } from "../../infra/cmtx-config.js";
import { showError } from "../../infra/notification.js";
import { executeRuleCommand } from "./execute-rule.js";

export async function deleteImageRuleCommand(): Promise<void> {
    const workspaceFolder = getCurrentWorkspaceFolder();
    if (!workspaceFolder) {
        await showError("Please open a workspace folder");
        return;
    }

    const config = await loadCmtxConfig(workspaceFolder);
    const ruleConfig = config?.rules?.["delete-image"];

    await executeRuleCommand("delete-image", ruleConfig);
}
