/**
 * promote-headings Rule 命令
 */

import { executeRuleCommand } from "./execute-rule.js";

export async function promoteHeadingsRuleCommand(): Promise<void> {
    await executeRuleCommand("promote-headings");
}
