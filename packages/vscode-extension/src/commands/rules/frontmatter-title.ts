/**
 * frontmatter-title Rule 命令
 */

import { executeRuleCommand } from "./execute-rule.js";

export async function frontmatterTitleRuleCommand(): Promise<void> {
    await executeRuleCommand("frontmatter-title");
}
