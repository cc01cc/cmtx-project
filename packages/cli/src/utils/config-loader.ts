/**
 * 配置文件加载器
 *
 * 支持多个位置：
 * 1. --config 指定的路径
 * 2. ./cmtx.config.ts（当前目录）
 * 3. ./.cmtxrc.json（当前目录）
 * 4. ~/.cmtxrc.json（用户主目录）
 * 5. /etc/cmtx/.cmtxrc.json（系统全局，仅 Linux/Mac）
 */

import { readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { platform } from 'node:process';

import type { CmtxConfig } from '../types/cli.js';

/**
 * 加载配置文件
 */
export async function loadConfig(configPath?: string): Promise<CmtxConfig> {
    const searchPaths = buildSearchPaths(configPath);

    for (const path of searchPaths) {
        try {
            const exists = await fileExists(path);
            if (!exists) continue;

            if (path.endsWith('.json')) {
                const content = await readFile(path, 'utf-8');
                return JSON.parse(content) as CmtxConfig;
            }

            if (path.endsWith('.ts')) {
                // 动态导入 TypeScript 配置文件（需要 tsx 或其他加载器）
                // 这里简化为返回空配置，实际实现可使用 tsx 或 esbuild
                return {};
            }
        } catch {
            // 忽略读取错误，继续尝试下一个路径
        }
    }

    return {};
}

/**
 * 构建配置文件搜索路径
 */
function buildSearchPaths(configPath?: string): string[] {
    const paths: string[] = [];

    if (configPath) {
        paths.push(resolve(configPath));
    }

    // 当前目录
    paths.push(resolve('cmtx.config.ts'));
    paths.push(resolve('.cmtxrc.json'));

    // 用户主目录
    const home = homedir();
    paths.push(join(home, '.cmtxrc.json'));

    // 系统全局（仅 Linux/Mac）
    if (platform !== 'win32') {
        paths.push('/etc/cmtx/.cmtxrc.json');
    }

    return paths;
}

/**
 * 检查文件是否存在
 */
async function fileExists(filePath: string): Promise<boolean> {
    try {
        await stat(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * 将环境变量与配置合并（环境变量优先）
 */
export function mergeWithEnv(config: CmtxConfig): CmtxConfig {
    const merged = { ...config };

    if (process.env.CMTX_PROJECT_ROOT) {
        merged.projectRoot = process.env.CMTX_PROJECT_ROOT;
    }

    if (process.env.CMTX_OSS_BUCKET) {
        if (!merged.adapters) merged.adapters = {};
        if (!merged.adapters.oss) merged.adapters.oss = {};
        (merged.adapters.oss as Record<string, unknown>).bucket = process.env.CMTX_OSS_BUCKET;
    }

    if (process.env.CMTX_DEFAULT_ADAPTER) {
        merged.defaultAdapter = process.env.CMTX_DEFAULT_ADAPTER;
    }

    return merged;
}
