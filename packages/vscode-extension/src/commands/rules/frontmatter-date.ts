/**
 * frontmatter-date Rule 命令
 */

import { executeRuleCommand } from "./execute-rule.js";

export async function frontmatterDateRuleCommand(): Promise<void> {
    await executeRuleCommand("frontmatter-date");
}
