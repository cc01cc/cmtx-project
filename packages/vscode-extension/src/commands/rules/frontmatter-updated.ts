/**
 * frontmatter-updated Rule 命令
 */

import { executeRuleCommand } from "./execute-rule.js";

export async function frontmatterUpdatedRuleCommand(): Promise<void> {
    await executeRuleCommand("frontmatter-updated");
}
