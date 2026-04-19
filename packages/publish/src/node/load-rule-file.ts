import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseAdaptConfig } from '../rules/parse.js';
import type { AdaptConfig } from '../types.js';

/**
 * 从磁盘加载并校验规则文件。
 */
export async function loadAdaptConfigFromFile(ruleFile: string): Promise<AdaptConfig> {
    const fullPath = resolve(ruleFile);
    let rawText: string;

    try {
        rawText = await readFile(fullPath, 'utf-8');
    } catch (error) {
        throw new Error(
            `Cannot read rule file "${ruleFile}": ${error instanceof Error ? error.message : String(error)}`
        );
    }

    return parseAdaptConfig(rawText, `Rule file "${ruleFile}"`);
}
