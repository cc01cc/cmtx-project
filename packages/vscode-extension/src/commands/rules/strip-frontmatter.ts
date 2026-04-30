/**
 * strip-frontmatter Rule 命令
 */

import { executeRuleCommand } from "./execute-rule.js";

export async function stripFrontmatterRuleCommand(): Promise<void> {
    await executeRuleCommand("strip-frontmatter");
}
