/* eslint-disable no-console */

/**
 * Unified Logger Module
 *
 * @module unified-logger
 * @description
 * 统一的日志记录器，同时输出到 Output Channel、DEBUG CONSOLE 和文件日志。
 * 确保三个输出目标的格式和内容完全一致。
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
 * - Output Channel（VS Code 输出面板）
 * - DEBUG CONSOLE（调试控制台）
 * - File Log（文件日志，支持轮转）
 *
 * ### 日志格式
 * ```
 * [CMTX] [module] LEVEL: message
 * ```
 *
 * ### 文件日志格式
 * ```
 * [YYYY-MM-DD HH:mm:ss.SSS] [CMTX] [module] LEVEL: message
 * ```
 *
 * @example
 * ```typescript
 * // 获取全局 logger
 * import { getUnifiedLogger } from './infra/unified-logger';
 *
 * const logger = getUnifiedLogger();
 * logger.info('Application started');
 *
 * // 获取模块 logger
 * import { getModuleLogger } from './infra/unified-logger';
 *
 * const moduleLogger = getModuleLogger('upload');
 * moduleLogger.info('Starting upload pipeline');
 *
 * // 初始化文件日志
 * import { initFileLogging } from './infra/unified-logger';
 * initFileLogging('.cmtx/logs');
 * ```
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { Logger } from "@cmtx/core";
import type * as vscode from "vscode";

/** 日志级别 */
type LogLevel = "debug" | "info" | "warn" | "error";

/** Console 方法映射 */
const CONSOLE_METHODS: Record<LogLevel, keyof Console> = {
    debug: "debug",
    info: "info",
    warn: "warn",
    error: "error",
};

/** 文件日志选项 */
export interface FileLogOptions {
    /** 单文件最大大小（字节），默认 10MB */
    maxFileSize?: number;
    /** 保留天数，默认 7 天 */
    retentionDays?: number;
}

/** 文件日志管理器 */
class FileLogManager {
    private logDir: string;
    private maxFileSize: number;
    private retentionDays: number;
    private currentLogFile: string | null = null;
    private currentFileSize: number = 0;

    constructor(logDir: string, options?: FileLogOptions) {
        this.logDir = logDir;
        this.maxFileSize = options?.maxFileSize ?? 10 * 1024 * 1024; // 默认 10MB
        this.retentionDays = options?.retentionDays ?? 7; // 默认 7 天
    }

    /**
     * 初始化日志目录
     */
    initialize(): void {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        this.cleanupOldLogs();
        this.rotateLogFile();
    }

    /**
     * 写入日志到文件
     */
    write(level: LogLevel, module: string | undefined, args: unknown[]): void {
        if (!this.currentLogFile) {
            return;
        }

        const timestamp = new Date().toISOString().replace("T", " ").slice(0, 23);
        const scope = module ? `[${module}]` : "";
        const rendered = args.map(stringifyArg).join(" ");
        const message = `[${timestamp}] [CMTX] ${scope} ${level.toUpperCase()}: ${rendered}`.trim();

        try {
            this.checkFileSize();
            fs.appendFileSync(this.currentLogFile, message + "\n", "utf8");
            this.currentFileSize += message.length + 1;
        } catch {
            // 静默忽略文件写入错误
        }
    }

    /**
     * 检查文件大小并轮转
     */
    private checkFileSize(): void {
        if (this.currentFileSize >= this.maxFileSize) {
            this.rotateLogFile();
        }
    }

    /**
     * 轮转日志文件
     */
    private rotateLogFile(): void {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const baseName = `cmtx-${today}.log`;
        const logFile = path.join(this.logDir, baseName);

        if (this.currentLogFile === logFile && fs.existsSync(logFile)) {
            const stats = fs.statSync(logFile);
            if (stats.size < this.maxFileSize) {
                this.currentFileSize = stats.size;
                return;
            }
        }

        // 检查是否需要创建带序号的文件
        if (fs.existsSync(logFile)) {
            const stats = fs.statSync(logFile);
            if (stats.size >= this.maxFileSize) {
                // 找到下一个可用的序号
                let index = 1;
                while (fs.existsSync(path.join(this.logDir, `cmtx-${today}.${index}.log`))) {
                    index++;
                }
                this.currentLogFile = path.join(this.logDir, `cmtx-${today}.${index}.log`);
            } else {
                this.currentLogFile = logFile;
            }
        } else {
            this.currentLogFile = logFile;
        }

        this.currentFileSize = 0;
    }

    /**
     * 清理过期日志
     */
    private cleanupOldLogs(): void {
        try {
            const files = fs.readdirSync(this.logDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

            for (const file of files) {
                if (!file.startsWith("cmtx-") || !file.endsWith(".log")) {
                    continue;
                }

                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);

                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch {
            // 静默忽略清理错误
        }
    }
}

// 全局文件日志管理器实例
let fileLogManager: FileLogManager | null = null;

/**
 * 初始化文件日志
 *
 * @param logDir - 日志目录路径（如 .cmtx/logs）
 * @param options - 文件日志选项
 */
export function initFileLogging(logDir: string, options?: FileLogOptions): void {
    fileLogManager = new FileLogManager(logDir, options);
    fileLogManager.initialize();
}

/**
 * 将参数转换为字符串
 */
function stringifyArg(value: unknown): string {
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.stack ?? value.message;
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

/**
 * 格式化日志消息
 *
 * @param level - 日志级别
 * @param module - 模块名称（可选）
 * @param args - 日志参数
 * @returns 格式化后的日志消息
 */
function formatMessage(level: LogLevel, module: string | undefined, args: unknown[]): string {
    const scope = module ? `[${module}]` : "";
    const rendered = args.map(stringifyArg).join(" ");
    return `[CMTX] ${scope} ${level.toUpperCase()}: ${rendered}`.trim();
}

/**
 * 统一日志记录器类
 *
 * 同时输出到 Output Channel、DEBUG CONSOLE 和文件日志，确保格式一致。
 */
/** 内部日志记录函数类型 */
type InternalLogFn = (level: LogLevel, module: string | undefined, args: unknown[]) => void;

export class UnifiedLogger implements Logger {
    private outputChannel: vscode.OutputChannel | null = null;

    /**
     * 设置 Output Channel
     *
     * @param channel - VS Code Output Channel
     */
    setOutputChannel(channel: vscode.OutputChannel): void {
        this.outputChannel = channel;
    }

    /**
     * 内部日志记录方法
     */
    private doLog(level: LogLevel, module: string | undefined, args: unknown[]): void {
        const message = formatMessage(level, module, args);

        // 输出到 Output Channel
        this.outputChannel?.appendLine(message);

        // 输出到 DEBUG CONSOLE（统一格式）
        const consoleMethod = CONSOLE_METHODS[level];
        this.invokeConsoleMethod(consoleMethod, message);

        // 输出到文件日志
        fileLogManager?.write(level, module, args);
    }

    /**
     * 获取内部日志记录函数（供 ModuleLogger 使用）
     */
    getInternalLogFn(): InternalLogFn {
        return (level, module, args) => {
            this.doLog(level, module, args);
        };
    }

    /**
     * 调用 Console 方法（类型安全）
     */
    private invokeConsoleMethod(method: keyof Console, message: string): void {
        switch (method) {
            case "debug":
                console.debug(message);
                break;
            case "info":
                console.info(message);
                break;
            case "warn":
                console.warn(message);
                break;
            case "error":
                console.error(message);
                break;
        }
    }

    /**
     * 记录调试级别日志
     */
    debug(message: string, ...args: unknown[]): void {
        this.doLog("debug", undefined, [message, ...args]);
    }

    /**
     * 记录信息级别日志
     */
    info(message: string, ...args: unknown[]): void {
        this.doLog("info", undefined, [message, ...args]);
    }

    /**
     * 记录警告级别日志
     */
    warn(message: string, ...args: unknown[]): void {
        this.doLog("warn", undefined, [message, ...args]);
    }

    /**
     * 记录错误级别日志
     */
    error(message: string, ...args: unknown[]): void {
        this.doLog("error", undefined, [message, ...args]);
    }

    /**
     * 创建模块日志记录器
     *
     * @param module - 模块名称
     * @returns 模块日志记录器
     */
    forModule(module: string): ModuleLogger {
        return new ModuleLogger(this, module);
    }
}

/**
 * 模块日志记录器类
 *
 * 带有模块名称的日志记录器，自动在日志中添加模块标识。
 */
export class ModuleLogger {
    private internalLog: InternalLogFn;

    /**
     * 创建模块日志记录器
     *
     * @param parent - 父级 UnifiedLogger
     * @param module - 模块名称
     */
    constructor(
        parent: UnifiedLogger,
        private module: string,
    ) {
        this.internalLog = parent.getInternalLogFn();
    }

    /**
     * 记录日志（内部方法）
     */
    private log(level: LogLevel, args: unknown[]): void {
        this.internalLog(level, this.module, args);
    }

    /**
     * 记录调试级别日志
     */
    debug(...args: unknown[]): void {
        this.log("debug", args);
    }

    /**
     * 记录信息级别日志
     */
    info(...args: unknown[]): void {
        this.log("info", args);
    }

    /**
     * 记录警告级别日志
     */
    warn(...args: unknown[]): void {
        this.log("warn", args);
    }

    /**
     * 记录错误级别日志
     */
    error(...args: unknown[]): void {
        this.log("error", args);
    }
}

// 全局单例
const unifiedLogger = new UnifiedLogger();

/**
 * 获取全局 UnifiedLogger 实例
 *
 * @returns UnifiedLogger 单例
 */
export function getUnifiedLogger(): UnifiedLogger {
    return unifiedLogger;
}

/**
 * 获取模块日志记录器
 *
 * @param module - 模块名称
 * @returns 模块日志记录器
 */
export function getModuleLogger(module: string): ModuleLogger {
    return unifiedLogger.forModule(module);
}
