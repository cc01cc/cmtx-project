/**
 * 规则加载器 - 从 YAML 文件加载适配规则
 *
 * @module loader
 * @description
 * 提供从 YAML 文件加载适配规则的功能，支持：
 * - 加载内置平台规则
 * - 加载自定义规则文件
 * - 注册自定义平台
 *
 * @example
 * ```typescript
 * import { loadBuiltinRules, registerPlatformFromFile } from '@cmtx/publish/rules/loader';
 *
 * // 加载内置规则
 * const rules = await loadBuiltinRules('zhihu');
 *
 * // 注册自定义平台
 * await registerPlatformFromFile('medium', './medium.yaml');
 * ```
 */

import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AdaptRule } from '../types.js';
import { parseAdaptConfig } from './parse.js';

function getRequire(): NodeJS.Require {
    // 优先使用 __filename（CJS 环境，包括 esbuild bundle 后）
    if (typeof __filename !== 'undefined') {
        return createRequire(__filename);
    }
    // 回退到 import.meta.url（ESM 环境）
    // eslint-disable-next-line sonarjs/prefer-nullish-coalescing, sonarlint/typescript-S6582
    if (typeof import.meta !== 'undefined' && import.meta.url) {
        return createRequire(import.meta.url);
    }
    return require('node:module').createRequire(__filename);
}

const require = getRequire();

function getBuiltinRulesDirPath(): string {
    // 优先使用 __dirname（CJS 环境，包括 esbuild bundle 后）
    if (typeof __dirname !== 'undefined') {
        return join(__dirname, '../builtin');
    }
    // 回退到 import.meta.url（ESM 环境）
    // eslint-disable-next-line sonarjs/prefer-nullish-coalescing, sonarlint/typescript-S6582
    if (typeof import.meta !== 'undefined' && import.meta.url) {
        return join(dirname(fileURLToPath(import.meta.url)), '../builtin');
    }
    return join(__dirname, '../builtin');
}

const BUILTIN_RULES_DIR = getBuiltinRulesDirPath();

/**
 * 加载内置平台规则
 *
 * @param platform - 平台名称（如 'wechat', 'zhihu', 'csdn'）
 * @returns 规则数组
 * @throws 如果平台规则文件不存在或解析失败
 */
export async function loadBuiltinRules(platform: string): Promise<AdaptRule[]> {
    const yamlPath = join(BUILTIN_RULES_DIR, `${platform}.yaml`);
    const content = await readFile(yamlPath, 'utf-8');
    const config = parseAdaptConfig(content, `builtin:${platform}`);
    return config.rules;
}

/**
 * 加载所有内置平台
 *
 * @returns 平台名称到规则的映射
 *
 * @public
 */
export async function loadAllBuiltinPlatforms(): Promise<Map<string, AdaptRule[]>> {
    const platforms = new Map<string, AdaptRule[]>();

    try {
        const files = await readdir(BUILTIN_RULES_DIR);

        for (const file of files) {
            if (!file.endsWith('.yaml')) continue;
            const platform = basename(file, '.yaml');
            platforms.set(platform, await loadBuiltinRules(platform));
        }
    } catch {
        // 目录不存在或读取失败，返回空 map
    }

    return platforms;
}

/**
 * 从自定义路径加载平台规则
 *
 * @param ruleFile - 规则文件路径
 * @returns 规则数组
 * @throws 如果文件不存在或解析失败
 */
export async function loadPlatformRules(ruleFile: string): Promise<AdaptRule[]> {
    const content = await readFile(ruleFile, 'utf-8');
    const config = parseAdaptConfig(content, ruleFile);
    return config.rules;
}

/**
 * 获取内置规则目录路径
 *
 * @returns 内置规则目录的绝对路径
 */
export function getBuiltinRulesDir(): string {
    return BUILTIN_RULES_DIR;
}
