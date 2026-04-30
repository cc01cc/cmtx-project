/**
 * CLI Logger Module
 *
 * @module cli-logger
 * @description
 * 提供基于 winston 的 CLI 日志实现，支持控制台输出和文件日志按日轮转。
 *
 * @remarks
 * 这是 @cmtx/core Logger interface 的 CLI 实现。
 * 仅限 @cmtx/cli 使用，其他包应通过 @cmtx/core 的 Logger interface 接入。
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { type Logger } from "@cmtx/core";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

/**
 * CLI Logger 配置选项
 *
 * @public
 */
export interface CliLoggerOptions {
    /** 日志级别，默认 'info' */
    level?: string;
    /** 日志目录，默认系统临时目录下的 'cmtx-logs' */
    logDir?: string;
    /** 是否静默（禁用控制台输出），默认 true */
    silent?: boolean;
    /** 是否禁用文件日志，默认 false */
    disableFile?: boolean;
}

/**
 * 创建 CLI Logger 实例
 *
 * @remarks
 * 基于 winston 实现，支持控制台和文件双输出。
 * 文件日志按日轮转，保留 14 天。
 *
 * @param options - 日志配置对象，或 verbose(启用控制台输出) / quiet(禁用控制台输出) 简短参数
 * @returns 符合 @cmtx/core Logger interface 的实例
 *
 * @example
 * ```typescript
 * import { createLogger } from './utils/logger.js';
 *
 * // 对象形式
 * const logger = createLogger({ silent: false });
 *
 * // 简短参数形式（兼容旧签名）
 * const logger = createLogger(true); // verbose, 相当于 { silent: false }
 * const logger = createLogger(true, false); // verbose, 不静默
 * ```
 *
 * @public
 */
export function createLogger(options?: CliLoggerOptions | boolean, _quiet?: boolean): Logger;
export function createLogger(options: CliLoggerOptions | boolean = {}, _quiet?: boolean): Logger {
    // 兼容旧签名: createLogger(verbose: boolean, quiet: boolean)
    const opts: CliLoggerOptions = typeof options === "boolean" ? { silent: !options } : options;

    const { level = "info", logDir, silent = true, disableFile = false } = opts;

    const transports: winston.transport[] = [];

    if (!silent) {
        transports.push(new winston.transports.Console());
    }

    if (!disableFile) {
        const fileTransport = createFileTransportSafe(logDir);
        if (fileTransport) {
            transports.push(fileTransport);
        }
    }

    const winstonLogger = winston.createLogger({
        level,
        format: createFormat(),
        transports,
        exitOnError: false,
    });

    return {
        debug: (message: string, ...args: unknown[]) => {
            winstonLogger.debug(message, ...args);
        },
        info: (message: string, ...args: unknown[]) => {
            winstonLogger.info(message, ...args);
        },
        warn: (message: string, ...args: unknown[]) => {
            winstonLogger.warn(message, ...args);
        },
        error: (message: string, ...args: unknown[]) => {
            winstonLogger.error(message, ...args);
        },
    };
}

/**
 * 创建日志格式化器
 */
function createFormat(): winston.Logform.Format {
    const timestamp = winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" });
    const printf = winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaKeys = Object.keys(meta).filter(
            (k) => k !== "timestamp" && k !== "level" && k !== "message",
        );
        const metaStr =
            metaKeys.length > 0
                ? ` ${JSON.stringify(Object.fromEntries(metaKeys.map((k) => [k, (meta as Record<string, unknown>)[k]])))}`
                : "";
        return `${String(timestamp)} ${level.toUpperCase()} ${String(message)}${metaStr}`;
    });
    return winston.format.combine(timestamp, winston.format.errors({ stack: true }), printf);
}

/**
 * 安全创建文件日志传输目标
 */
function createFileTransportSafe(logDir?: string): DailyRotateFile | null {
    try {
        const dir = logDir || getDefaultLogDir();
        fs.mkdirSync(dir, { recursive: true });

        return new DailyRotateFile({
            filename: path.join(dir, "%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxFiles: "14d",
        });
    } catch {
        return null;
    }
}

/**
 * 获取默认日志目录
 */
function getDefaultLogDir(): string {
    return path.join(os.tmpdir(), "cmtx-logs");
}
