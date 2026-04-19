#!/usr/bin/env node

/**
 * @cmtx/cli - CLI 入口点
 *
 * 全局命令行工具，支持 Markdown 图片的扫描、上传、查询和管理
 */

import { initLogger } from '@cmtx/core';
import { cli } from '../src/cli.js';

// 初始化 logger，启用 Console 输出
// 由于 @cmtx/core 的 logger 默认静默，CLI 需要显式启用
initLogger({ silent: false });

try {
    await cli.parseAsync(process.argv.slice(2));
} catch (error) {
    console.error((error as Error).message);
    process.exit(1);
}
