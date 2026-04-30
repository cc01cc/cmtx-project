/**
 * convert-images Rule 命令
 */

import { executeRuleCommand } from "./execute-rule.js";

export async function convertImagesRuleCommand(): Promise<void> {
    await executeRuleCommand("convert-images");
}
