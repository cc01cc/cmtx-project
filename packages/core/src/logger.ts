/**
 * Logger Module
 *
 * @module logger
 * @description
 * 提供日志记录功能，基于 winston 实现。
 *
 * @remarks
 * ## 功能概述
 *
 * 提供统一的日志记录接口，支持控制台和文件输出。
 * 文件日志支持按日轮转，自动清理过期日志。
 *
 * ## 核心功能
 *
 * ### 日志级别
 * - `debug` - 调试信息
 * - `info` - 一般信息
 * - `warn` - 警告信息
 * - `error` - 错误信息
 *
 * ### 输出目标
 * - 控制台输出（带颜色）
 * - 文件输出（按日轮转，保留 14 天）
 *
 * ### 日志格式
 * ```
 * 2024-01-01 12:00:00 INFO [ModuleName] Message
 * ```
 *
 * @example
 * ```typescript
 * import { initLogger, getLogger } from '@cmtx/core';
 *
 * // 初始化日志（应用层调用，传入配置）
 * initLogger({
 *     level: 'debug',
 *     logDir: '/var/log/myapp',
 * });
 *
 * const logger = getLogger('MyModule');
 * logger.info('Application started');
 * logger.error('Something went wrong');
 * ```
 *
 * @see {@link initLogger} - 初始化日志系统
 * @see {@link getLogger} - 获取 logger 实例
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

let loggerInstance: winston.Logger | null = null;
let _loggerOptions: LoggerOptions = {};

/**
 * 日志配置选项
 * @public
 */
export interface LoggerOptions {
    /**
     * 日志级别
     * @default 'info'
     */
    level?: string;

    /**
     * 日志目录
     * @default 临时目录下的 'cmtx-logs'
     */
    logDir?: string;

    /**
     * 是否静默（禁用控制台输出）
     * @default true
     */
    silent?: boolean;

    /**
     * 是否禁用文件日志
     * @default false
     */
    disableFile?: boolean;
}

/**
 * 初始化日志系统
 *
 * @param options - 日志配置选项
 *
 * @example
 * ```typescript
 * // 基本使用
 * initLogger({
 *     level: 'debug',
 *     logDir: '/var/log/myapp',
 * });
 *
 * // 静默模式（仅文件日志）
 * initLogger({
 *     level: 'info',
 *     silent: true,
 * });
 *
 * // 禁用文件日志（仅控制台）
 * initLogger({
 *     level: 'debug',
 *     disableFile: true,
 * });
 * ```
 * @public
 */
export function initLogger(options: LoggerOptions = {}): void {
    _loggerOptions = options;

    // 默认 silent = true，需要显式启用 Console 输出
    const { level = 'info', logDir, silent = true, disableFile = false } = options;

    const transports: winston.transport[] = [];

    // 只有明确设置 silent: false 时才添加 Console
    if (!silent) {
        transports.push(new winston.transports.Console());
    }

    if (!disableFile) {
        const fileTransport = createFileTransportSafe(logDir);
        if (fileTransport) {
            transports.push(fileTransport);
        }
    }

    // 如果已存在 logger，清除并重新配置
    if (loggerInstance) {
        loggerInstance.clear();
        transports.forEach((t) => {
            if (loggerInstance) {
                loggerInstance.add(t);
            }
        });
        loggerInstance.level = level;
    } else {
        loggerInstance = winston.createLogger({
            level,
            format: createFormat(),
            transports,
            exitOnError: false,
        });
    }
}

/**
 * 获取 logger 实例
 *
 * @param moduleName - 可选的模块名称，用于标识日志来源
 * @returns winston logger 实例
 *
 * @example
 * ```typescript
 * const logger = getLogger('MyModule');
 * logger.info('Message');
 *
 * // 或者不带模块名称
 * const globalLogger = getLogger();
 * ```
 * @public
 */
export function getLogger(moduleName?: string): winston.Logger {
    if (!loggerInstance) {
        // 默认创建静默的 logger（不输出到 Console，只输出到文件）
        const transports: winston.transport[] = [];

        // 只添加文件 transport，不添加 Console
        const fileTransport = createFileTransportSafe(undefined);
        if (fileTransport) {
            transports.push(fileTransport);
        }

        loggerInstance = winston.createLogger({
            level: 'info',
            format: createFormat(),
            transports,
            exitOnError: false,
        });
    }

    if (moduleName) {
        return loggerInstance.child({ module: moduleName });
    }

    return loggerInstance;
}

/**
 * 创建日志格式化器
 *
 * @internal
 */
function createFormat(): winston.Logform.Format {
    const timestamp = winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' });
    const printf = winston.format.printf(({ level, message, timestamp, module, ...meta }) => {
        const mod = module ? `[${module}]` : '';
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta, null, 2)}` : '';
        return `${timestamp} ${level.toUpperCase()} ${mod} ${message}${metaStr}`;
    });

    return winston.format.combine(timestamp, winston.format.errors({ stack: true }), printf);
}

/**
 * 安全创建文件日志传输目标
 *
 * @internal
 */
function createFileTransportSafe(logDir?: string): DailyRotateFile | null {
    try {
        const dir = logDir || getDefaultLogDir();
        fs.mkdirSync(dir, { recursive: true });

        return new DailyRotateFile({
            filename: path.join(dir, '%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxFiles: '14d',
        });
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`[cmtx/core] Disable file logging: ${reason}`);
        return null;
    }
}

/**
 * 获取默认日志目录
 *
 * @internal
 */
function getDefaultLogDir(): string {
    return path.join(os.tmpdir(), 'cmtx-logs');
}

// 自定义 Logger 类型，避免直接引用 winston 的 Logger 类型导致的文档警告
/**
 * CMTX Logger 类型
 * @public
 */
export type CmtxLogger = winston.Logger;
