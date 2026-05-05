#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * @cmtx/cli - CLI 入口点
 *
 * 全局命令行工具，支持 Markdown 图片的扫描、上传、查询和管理
 */

import { cli } from "../src/cli.js";

void cli.parseAsync(process.argv.slice(2)).catch((error: unknown) => {
    console.error((error as Error).message);
    process.exit(1);
});
