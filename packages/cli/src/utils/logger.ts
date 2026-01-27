/**
 * 日志系统
 *
 * 支持多种日志级别和着色输出
 */

import chalk from "chalk";
import type { Logger } from "../types/cli.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * 日志级别优先级
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * 创建日志函数
 */
export function createLogger(verbose: boolean = false, quiet: boolean = false): Logger {
  let minLevel: number;
  if (quiet) {
    minLevel = 2; // error only
  } else if (verbose) {
    minLevel = 0; // all
  } else {
    minLevel = 1; // info+
  }

  return (level: LogLevel, message: string, meta?: unknown) => {
    if (LOG_LEVELS[level] < minLevel) {
      return;
    }

    const timestamp = new Date().toISOString().slice(11, 19);
    let prefix: string;

    switch (level) {
      case "debug":
        prefix = chalk.gray(`[${timestamp}] ℹ`);
        break;
      case "info":
        prefix = chalk.blue(`[${timestamp}] ℹ`);
        break;
      case "warn":
        prefix = chalk.yellow(`[${timestamp}] ⚠`);
        break;
      case "error":
        prefix = chalk.red(`[${timestamp}] ✗`);
        break;
    }

    console.log(`${prefix} ${message}`);

    if (meta && verbose) {
      console.log(chalk.gray(JSON.stringify(meta, null, 2)));
    }
  };
}

/**
 * 为 @cmtx/core 和 @cmtx/upload 创建 logger 回调
 */
export function createLibraryLogger(verbose: boolean = false): (level: string, message: string, meta?: unknown) => void {
  const logger = createLogger(verbose);

  return (level: string, message: string, meta?: unknown) => {
    logger(level as LogLevel, message, meta);
  };
}
