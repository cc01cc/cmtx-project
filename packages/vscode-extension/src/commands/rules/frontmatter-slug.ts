import { executeRuleCommand } from "./execute-rule.js";

export async function frontmatterSlugRuleCommand(): Promise<void> {
    await executeRuleCommand("frontmatter-slug");
}
