/**
 * remove-section-numbers Rule 命令
 */

import { executeRuleCommand } from "./execute-rule.js";

export async function removeSectionNumbersRuleCommand(): Promise<void> {
    await executeRuleCommand("remove-section-numbers");
}
